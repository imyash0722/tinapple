#!/usr/bin/env python3
"""Boot the actual ISO via BIOS and UEFI and verify the live HTTP service.
No host disks are exposed. QEMU is always terminated, including on test failure.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.request


def port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


def check(iso, firmware, output, timeout):
    forwarded = port()
    with tempfile.TemporaryDirectory(prefix='tinapple-boot-') as temp:
        args = ['qemu-system-x86_64', '-m', '3G', '-smp', '2',
                '-cdrom', str(iso), '-boot', 'd', '-display', 'none',
                '-vga', 'virtio', '-monitor', 'none', '-no-reboot',
                '-serial', f'file:{output / (firmware + "-serial.log")}',
                '-netdev', f'user,id=net0,hostfwd=tcp:127.0.0.1:{forwarded}-:8088',
                '-device', 'virtio-net-pci,netdev=net0']
        args += ['-enable-kvm', '-cpu', 'host'] if os.access('/dev/kvm', os.W_OK) else ['-cpu', 'max']
        if firmware == 'uefi':
            code = Path('/usr/share/edk2/x64/OVMF_CODE.4m.fd')
            variables = Path(temp) / 'OVMF_VARS.4m.fd'
            shutil.copyfile(code.with_name('OVMF_VARS.4m.fd'), variables)
            args += ['-drive', f'if=pflash,format=raw,readonly=on,file={code}',
                     '-drive', f'if=pflash,format=raw,file={variables}']
        with (output / f'{firmware}-qemu.log').open('w') as log:
            process = subprocess.Popen(args, stdout=log, stderr=log)
            try:
                deadline = time.monotonic() + timeout
                base = f'http://127.0.0.1:{forwarded}'
                while time.monotonic() < deadline:
                    if process.poll() is not None:
                        raise RuntimeError(f'{firmware}: QEMU exited {process.returncode}')
                    try:
                        with urllib.request.urlopen(base + '/api/v1/system/info', timeout=3) as response:
                            info = json.load(response)
                        break
                    except (OSError, ValueError):
                        time.sleep(2)
                else:
                    raise RuntimeError(f'{firmware}: Hub did not start within {timeout}s')
                for path in ['/', '/wallpapers/tinapple-orange-wallpaper.png']:
                    with urllib.request.urlopen(base + path, timeout=10) as response:
                        if response.status != 200:
                            raise RuntimeError(f'{firmware}: {path} returned {response.status}')
                (output / f'{firmware}-info.json').write_text(json.dumps(info, indent=2) + '\n')
                print(f'{firmware}: PASS — API, Hub and wallpaper HTTP 200', flush=True)
            finally:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('iso', type=Path)
    parser.add_argument('--output', type=Path, default=Path('out/boot-validation'))
    parser.add_argument('--timeout', type=int, default=300)
    parser.add_argument('--firmware', choices=['bios', 'uefi', 'both'], default='both')
    options = parser.parse_args()
    if not options.iso.is_file():
        parser.error('ISO does not exist')
    options.output.mkdir(parents=True, exist_ok=True)
    for firmware in (['bios', 'uefi'] if options.firmware == 'both' else [options.firmware]):
        check(options.iso.resolve(), firmware, options.output.resolve(), options.timeout)
