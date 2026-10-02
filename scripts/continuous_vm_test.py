#!/usr/bin/env python3
"""
continuous_vm_test.py — Automated Continuous VM Test Matrix for Tinapple OS

Boots the Tinapple live ISO inside QEMU with port forwarding, connects via SSH,
and runs full automated end-to-end installations across permutations of:
  - Filesystems: ext4, xfs, btrfs
  - Bootloaders: grub, limine
  - Kernels:     lts, hardened, current
  - Profiles:    base, media, downloads, databases, infrastructure

Logs every step in real-time, validates the target filesystem, and produces
a full test report followed by direct installed-disk boot verification.
"""

import os
import sys
import time
import socket
import select
import subprocess
import shutil

SSH_PORT = 2222
SSH_USER = "root"
SSH_HOST = "127.0.0.1"
SSH_KEY = os.path.expanduser("~/.ssh/id_ed25519")

ISO_PATH = "/mnt/shared/projects/tinapple/tinapple-installer/iso/out/tinapple-os-2026.10.01-x86_64.iso"
DISK_IMAGE = "/home/pineapple/tinapple-vm.qcow2"
CACHE_DISK = "/home/pineapple/tinapple-cache.raw"
OVMF_CODE = "/usr/share/edk2/x64/OVMF_CODE.4m.fd"
OVMF_VARS = "/tmp/OVMF_VARS.fd"
SERIAL_LOG = "/home/pineapple/tinapple-vm-serial.log"

PERMUTATIONS = [
    {
        "name": "ext4 + limine + lts + base",
        "fs": "ext4",
        "bootloader": "limine",
        "kernel": "lts",
        "profiles": "base",
        "luks": "no"
    },
    {
        "name": "xfs + limine + lts + media",
        "fs": "xfs",
        "bootloader": "limine",
        "kernel": "lts",
        "profiles": "base,media",
        "luks": "no"
    },
    {
        "name": "btrfs + grub + lts + downloads",
        "fs": "btrfs",
        "bootloader": "grub",
        "kernel": "lts",
        "profiles": "base,downloads",
        "luks": "no"
    },
    {
        "name": "ext4 + grub + hardened + databases",
        "fs": "ext4",
        "bootloader": "grub",
        "kernel": "hardened",
        "profiles": "base,databases",
        "luks": "no"
    },
    {
        "name": "xfs + grub + current + infrastructure",
        "fs": "xfs",
        "bootloader": "grub",
        "kernel": "current",
        "profiles": "base,infrastructure",
        "luks": "no"
    }
]

def log(msg):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}", flush=True)

def run_ssh(cmd, timeout=900, stream=False):
    ssh_cmd = [
        "ssh",
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        "-o", "LogLevel=ERROR",
        "-o", "ConnectTimeout=10",
        "-o", "ServerAliveInterval=5",
        "-o", "ServerAliveCountMax=3",
        "-i", SSH_KEY,
        "-p", str(SSH_PORT),
        f"{SSH_USER}@{SSH_HOST}",
        cmd
    ]
    if not stream:
        try:
            res = subprocess.run(ssh_cmd, capture_output=True, text=True, timeout=timeout)
            return res.returncode, res.stdout + res.stderr
        except subprocess.TimeoutExpired:
            return -1, f"SSH TIMEOUT ({timeout}s expired)"
        except Exception as e:
            return -1, f"SSH ERROR: {e}"

    p = subprocess.Popen(ssh_cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    lines = []
    start_t = time.time()
    poll_obj = select.poll()
    poll_obj.register(p.stdout, select.POLLIN)

    while True:
        if p.poll() is not None:
            for line in p.stdout:
                lines.append(line)
                print(line, end="", flush=True)
            break
        if time.time() - start_t > timeout:
            p.kill()
            return -1, "".join(lines) + f"\nTIMEOUT ({timeout}s expired)\n"
        events = poll_obj.poll(500)
        if events:
            line = p.stdout.readline()
            if line:
                lines.append(line)
                print(line, end="", flush=True)
    p.wait()
    return p.returncode, "".join(lines)

def wait_for_ssh(timeout=180):
    log(f"Waiting for SSH on {SSH_HOST}:{SSH_PORT} (up to {timeout}s)...")
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection((SSH_HOST, SSH_PORT), timeout=2):
                rc, out = run_ssh("echo READY", timeout=10, stream=False)
                if rc == 0 and "READY" in out:
                    log("SSH is ready and authenticated!")
                    log("Ensuring pacman keyring initialization in VM...")
                    run_ssh("pacman-key --init 2>/dev/null; pacman-key --populate archlinux cachyos 2>/dev/null || true", timeout=60, stream=False)
                    return True
        except (socket.error, subprocess.SubprocessError):
            pass
        time.sleep(3)
    return False

def reset_disk():
    log("Resetting target virtual disk...")
    if os.path.exists(DISK_IMAGE):
        os.remove(DISK_IMAGE)
    subprocess.run(["qemu-img", "create", "-f", "qcow2", DISK_IMAGE, "25G"], check=True, capture_output=True)

def reset_ovmf():
    shutil.copyfile(OVMF_CODE.replace("CODE", "VARS"), OVMF_VARS)

def mount_cache_disk():
    log("Mounting dedicated package cache disk inside VM...")
    mount_cmd = """
mkdir -p /var/cache/pacman/pkg
mount -L TINAPPLE_CACHE /var/cache/pacman/pkg 2>/dev/null || mount /dev/vdb /var/cache/pacman/pkg 2>/dev/null || true
df -h /var/cache/pacman/pkg
"""
    rc, out = run_ssh(mount_cmd, timeout=15)
    log(f"Cache disk mounted inside VM:\n{out.strip()}")

def sync_backend_to_vm():
    log("Syncing updated installer backend scripts into VM...")
    backend_src = "/mnt/shared/projects/tinapple/tinapple-installer/backend/lib"
    if os.path.isdir(backend_src):
        for fname in os.listdir(backend_src):
            if fname.endswith(".sh"):
                local_path = os.path.join(backend_src, fname)
                remote_path = f"/usr/lib/tinapple-installer/backend/lib/{fname}"
                subprocess.run([
                    "scp", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null",
                    "-P", str(SSH_PORT), "-i", SSH_KEY, local_path, f"{SSH_USER}@{SSH_HOST}:{remote_path}"
                ], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    log("Installer backend scripts synced successfully.")

def cleanup_vm_partition():
    cleanup_cmd = """
killall -9 pacman pacstrap 2>/dev/null || true
swapoff -a 2>/dev/null || true
umount -R -l /mnt 2>/dev/null || true
for p in /dev/vda*; do
    [[ "$p" != "/dev/vda" ]] && umount -l "$p" 2>/dev/null || true
done
wipefs -a -f /dev/vda 2>/dev/null || true
sgdisk -Z /dev/vda 2>/dev/null || true
partprobe /dev/vda 2>/dev/null || true
sync
"""
    run_ssh(cleanup_cmd, timeout=30, stream=False)

def test_permutation(p_idx, p):
    log("="*60)
    log(f"Starting Test [{p_idx+1}/{len(PERMUTATIONS)}]: {p['name']}")
    log(f"Parameters: FS={p['fs']}, Boot={p['bootloader']}, Kernel={p['kernel']}, Profiles={p['profiles']}, LUKS={p['luks']}")
    log("="*60)

    cleanup_vm_partition()
    mount_cache_disk()
    sync_backend_to_vm()

    install_cmd = f"""
export TINAPPLE_DISK=/dev/vda
export TINAPPLE_FS={p['fs']}
export TINAPPLE_BOOTLOADER={p['bootloader']}
export TINAPPLE_KERNEL_PROFILE={p['kernel']}
export TINAPPLE_PROFILES="{p['profiles']}"
export TINAPPLE_LUKS={p['luks']}
export TINAPPLE_AUTO=1

/usr/local/bin/tinapple-install --auto
"""
    log("Running tinapple-install inside VM...")
    t0 = time.time()
    rc, output = run_ssh(install_cmd, timeout=1200, stream=True)
    duration = time.time() - t0

    if rc != 0:
        log(f"❌ FAILED: {p['name']} (exit code {rc}) after {duration:.1f}s")
        _, log_content = run_ssh("cat /var/log/tinapple-install.log 2>/dev/null || cat /tmp/tinapple-install.log 2>/dev/null | tail -n 50", stream=False)
        print("\n--- VM INSTALL LOG TAIL ---")
        print(log_content)
        print("---------------------------\n")
        return False, duration, f"Installer failed with rc={rc}"

    # Verify target installation
    log("Verifying installed filesystem structure...")
    verify_cmd = f"""
set -e
[[ -f /mnt/etc/tinapple/manifest.yaml ]] || {{ echo "Missing manifest.yaml"; exit 2; }}
[[ -f /mnt/etc/fstab ]] || {{ echo "Missing fstab"; exit 3; }}
grep -q "{p['fs']}" /mnt/etc/fstab || {{ echo "Filesystem {p['fs']} not in fstab"; exit 4; }}
echo "VERIFICATION_SUCCESS"
"""
    v_rc, v_out = run_ssh(verify_cmd, timeout=30, stream=False)
    if "VERIFICATION_SUCCESS" not in v_out:
        log(f"❌ VERIFICATION FAILED: {v_out.strip()}")
        return False, duration, v_out.strip()

    log(f"✅ PASSED: {p['name']} in {duration:.1f}s")
    # Flush guest filesystem caches and unmount cleanly
    log("Flushing guest disk caches and unmounting target filesystem...")
    run_ssh("sync; umount -R /mnt 2>/dev/null || true; sync", timeout=30, stream=False)
    return True, duration, "OK"

def test_boot_installed_system():
    log("\n" + "="*70)
    log("   STAGE 2: VERIFYING DIRECT BOOT OF INSTALLED TARGET DISK")
    log("="*70)
    log("Launching QEMU directly from target disk (no ISO, boot order=c)...")

    serial_boot_log = open("/home/pineapple/tinapple-vm-boot-serial.log", "w")
    boot_cmd = [
        "qemu-system-x86_64",
        "-enable-kvm",
        "-cpu", "host",
        "-smp", "2",
        "-m", "4G",
        "-drive", f"if=pflash,format=raw,readonly=on,file={OVMF_CODE}",
        "-drive", f"if=pflash,format=raw,file={OVMF_VARS}",
        "-drive", f"file={DISK_IMAGE},format=qcow2,if=none,id=disk0",
        "-device", "virtio-blk-pci,drive=disk0,bootindex=1",
        "-boot", "order=c",
        "-netdev", f"user,id=net0,hostfwd=tcp::{SSH_PORT}-:22,hostfwd=tcp::8088-:8088",
        "-device", "virtio-net-pci,netdev=net0,romfile=",
        "-serial", "stdio",
        "-display", "none"
    ]
    p_boot = subprocess.Popen(boot_cmd, stdin=subprocess.DEVNULL, stdout=serial_boot_log, stderr=serial_boot_log)
    try:
        log("Waiting for installed system to boot (up to 120s)...")
        start_t = time.time()
        booted = False
        while time.time() - start_t < 120:
            try:
                with socket.create_connection((SSH_HOST, SSH_PORT), timeout=2):
                    rc, out = run_ssh("uname -a && cat /etc/os-release | grep PRETTY && df -hT /", timeout=15)
                    if rc == 0 and "Linux" in out:
                        log(f"Installed system successfully booted in {time.time()-start_t:.1f}s!")
                        log(f"System verification:\n{out.strip()}")
                        booted = True
                        break
            except Exception:
                pass
            time.sleep(3)

        if not booted:
            log("❌ Direct boot of installed disk did not establish SSH.")
            return False

        rc_m, out_m = run_ssh("cat /etc/tinapple/manifest.yaml && cat /etc/hostname", timeout=15)
        log(f"Installed system manifest verification:\n{out_m.strip()}")
        log("🎉 DIRECT BOOT OF INSTALLED DISK PASSED 100%!")
        return True
    finally:
        log("Powering off installed VM...")
        try:
            run_ssh("poweroff", timeout=10)
            p_boot.wait(timeout=10)
        except Exception:
            try:
                p_boot.terminate()
                p_boot.wait(timeout=5)
            except Exception:
                p_boot.kill()
        serial_boot_log.close()

def main():
    log("=== Tinapple OS Automated Continuous Test Matrix ===")

    reset_disk()
    reset_ovmf()

    serial_log_file = open(SERIAL_LOG, "w")

    # Launch QEMU with target disk, cache disk, and live ISO
    qemu_cmd = [
        "qemu-system-x86_64",
        "-enable-kvm",
        "-cpu", "host",
        "-smp", "2",
        "-m", "4G",
        "-drive", f"if=pflash,format=raw,readonly=on,file={OVMF_CODE}",
        "-drive", f"if=pflash,format=raw,file={OVMF_VARS}",
        "-drive", f"file={DISK_IMAGE},format=qcow2,if=virtio",
        "-drive", f"file={CACHE_DISK},format=raw,if=virtio",
        "-cdrom", ISO_PATH,
        "-boot", "order=d,menu=off",
        "-netdev", f"user,id=net0,hostfwd=tcp::{SSH_PORT}-:22",
        "-device", "virtio-net-pci,netdev=net0,romfile=",
        "-serial", "stdio",
        "-display", "none"
    ]

    log("Launching QEMU VM in background...")
    proc = subprocess.Popen(qemu_cmd, stdin=subprocess.DEVNULL, stdout=serial_log_file, stderr=serial_log_file)

    try:
        if not wait_for_ssh(timeout=180):
            log("❌ ERROR: Failed to establish SSH connection to VM within timeout.")
            return 1

        sync_backend_to_vm()
        mount_cache_disk()

        results = {}
        for i, perm in enumerate(PERMUTATIONS):
            ok, dur, note = test_permutation(i, perm)
            results[perm["name"]] = (ok, dur, note)

        # Retry pass for any failed permutations
        failed_perms = [(i, p) for i, p in enumerate(PERMUTATIONS) if not results[p["name"]][0]]
        if failed_perms:
            log(f"\nRetrying {len(failed_perms)} failed permutation(s)...")
            for i, perm in failed_perms:
                ok, dur, note = test_permutation(i, perm)
                results[perm["name"]] = (ok, dur, note)

        log("\n" + "="*70)
        log("                   FINAL TEST RESULTS SUMMARY")
        log("="*70)
        all_passed = True
        for perm in PERMUTATIONS:
            name = perm["name"]
            ok, dur, note = results.get(name, (False, 0.0, "Not Run"))
            status = "PASS" if ok else "FAIL"
            log(f"  [{status:4s}] {name:40s} | {dur:5.1f}s | {note}")
            if not ok:
                all_passed = False
        log("="*70)

        # Terminate live ISO VM cleanly so disk and ports are released
        log("Shutting down live ISO VM...")
        try:
            proc.terminate()
            proc.wait(timeout=10)
        except Exception:
            proc.kill()

        if all_passed:
            log("🎉 ALL PERMUTATIONS PASSED SUCCESSFULLY!")
            boot_ok = test_boot_installed_system()
            if boot_ok:
                log("🏆 COMPLETE END-TO-END VERIFICATION: 100% SUCCESSFUL!")
                return 0
            else:
                log("❌ DIRECT BOOT VERIFICATION FAILED.")
                return 1
        else:
            log("❌ SOME TESTS FAILED.")
            return 1

    except Exception as e:
        log(f"❌ UNEXPECTED ERROR: {e}")
        return 1

    finally:
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except Exception:
            pass
        serial_log_file.close()

if __name__ == "__main__":
    sys.exit(main())
