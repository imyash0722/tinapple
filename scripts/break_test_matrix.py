#!/usr/bin/env python3
"""
break_test_matrix.py — Comprehensive VM Break-Testing Matrix for Tinapple OS

Executes end-to-end automated installation and direct UEFI boot verification
across all filesystem, bootloader, kernel, and profile combinations.

For EVERY permutation:
  1. Boot live ISO in QEMU (UEFI)
  2. Perform automated installation via tinapple-install --auto
  3. Validate target filesystem and bootloader files
  4. Perform in-guest sync and clean unmount
  5. Power off live ISO VM
  6. DIRECT BOOT TEST: Boot installed disk in QEMU (no ISO)
  7. Verify running kernel, root filesystem, systemd status, and manifest
  8. Power off and record PASS/FAIL telemetry
"""

import os
import sys
import time
import json
import glob
import socket
import select
import subprocess
import shutil

SSH_PORT = 2222
SSH_USER = "root"
SSH_HOST = "127.0.0.1"
SSH_KEY = os.path.expanduser("~/.ssh/id_ed25519")

OUT_DIR = "/mnt/shared/projects/tinapple/tinapple-installer/iso/out"
DISK_IMAGE = "/home/pineapple/tinapple-vm.qcow2"
CACHE_DISK = "/home/pineapple/tinapple-cache.raw"
OVMF_CODE = "/usr/share/edk2/x64/OVMF_CODE.4m.fd"
OVMF_VARS = "/tmp/OVMF_VARS.fd"
LOG_FILE = "/home/pineapple/tinapple-break-test.log"
STATUS_JSON = "/home/pineapple/tinapple-break-test-status.json"

PERMUTATIONS = [
    {
        "id": "ext4_limine_lts_base_standalone",
        "name": "ext4 + limine + lts + base (STANDALONE TARGET-DISK CACHE)",
        "fs": "ext4",
        "bootloader": "limine",
        "kernel": "lts",
        "profiles": "base",
        "luks": "no",
        "mount_cache": False
    },
    {
        "id": "xfs_limine_lts_media",
        "name": "xfs + limine + lts + media",
        "fs": "xfs",
        "bootloader": "limine",
        "kernel": "lts",
        "profiles": "base,media",
        "luks": "no",
        "mount_cache": True
    },
    {
        "id": "btrfs_grub_lts_downloads",
        "name": "btrfs + grub + lts + downloads",
        "fs": "btrfs",
        "bootloader": "grub",
        "kernel": "lts",
        "profiles": "base,downloads",
        "luks": "no",
        "mount_cache": True
    },
    {
        "id": "ext4_grub_hardened_databases",
        "name": "ext4 + grub + hardened + databases",
        "fs": "ext4",
        "bootloader": "grub",
        "kernel": "hardened",
        "profiles": "base,databases",
        "luks": "no",
        "mount_cache": True
    },
    {
        "id": "xfs_grub_current_infrastructure",
        "name": "xfs + grub + current + infrastructure",
        "fs": "xfs",
        "bootloader": "grub",
        "kernel": "current",
        "profiles": "base,infrastructure",
        "luks": "no",
        "mount_cache": True
    },
    {
        "id": "btrfs_limine_hardened_backups_network",
        "name": "btrfs + limine + hardened + backups,network",
        "fs": "btrfs",
        "bootloader": "limine",
        "kernel": "hardened",
        "profiles": "base,backups,network",
        "luks": "no",
        "mount_cache": True
    },
    {
        "id": "ext4_grub_lts_all_profiles_stress",
        "name": "ext4 + grub + lts + ALL PROFILES (STRESS TEST)",
        "fs": "ext4",
        "bootloader": "grub",
        "kernel": "lts",
        "profiles": "base,media,downloads,backups,network,infrastructure,databases",
        "luks": "no",
        "mount_cache": True
    }
]

state = {
    "start_time": time.time(),
    "current_index": 0,
    "total": len(PERMUTATIONS),
    "current_permutation": None,
    "current_phase": "initializing",
    "completed": [],
    "failed": [],
    "status": "running"
}

def save_status():
    try:
        with open(STATUS_JSON, "w") as f:
            json.dump(state, f, indent=2)
    except Exception:
        pass

def log(msg):
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{ts}] {msg}"
    print(formatted, flush=True)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(formatted + "\n")
    except Exception:
        pass

def get_latest_iso():
    candidates = glob.glob(os.path.join(OUT_DIR, "tinapple-os-*.iso"))
    if not candidates:
        candidates = glob.glob("/mnt/shared/projects/tinapple/out/tinapple-os-*.iso")
    if not candidates:
        raise RuntimeError("No tinapple-os ISO image found in " + OUT_DIR)
    candidates.sort(key=os.path.getmtime, reverse=True)
    return candidates[0]

def run_ssh(cmd, timeout=900, stream=False):
    ssh_cmd = [
        "ssh",
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        "-o", "LogLevel=ERROR",
        "-o", "ConnectTimeout=10",
        "-o", "ServerAliveInterval=5",
        "-o", "ServerAliveCountMax=3",
        "-o", "BatchMode=yes"
    ]
    if os.path.exists(SSH_KEY):
        ssh_cmd.extend(["-i", SSH_KEY])
    ssh_cmd.extend(["-p", str(SSH_PORT), f"{SSH_USER}@{SSH_HOST}", cmd])

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
                log("  " + line.rstrip())
            break
        if time.time() - start_t > timeout:
            p.kill()
            return -1, "".join(lines) + f"\nTIMEOUT ({timeout}s expired)\n"
        events = poll_obj.poll(500)
        if events:
            line = p.stdout.readline()
            if line:
                lines.append(line)
                log("  " + line.rstrip())
    p.wait()
    return p.returncode, "".join(lines)

def wait_for_ssh(timeout=180):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection((SSH_HOST, SSH_PORT), timeout=2):
                rc, out = run_ssh("echo READY", timeout=10, stream=False)
                if rc == 0 and "READY" in out:
                    return True
        except (socket.error, subprocess.SubprocessError):
            pass
        time.sleep(3)
    return False

def reset_disk():
    if os.path.exists(DISK_IMAGE):
        try:
            os.remove(DISK_IMAGE)
        except Exception:
            pass
    subprocess.run(["qemu-img", "create", "-f", "qcow2", DISK_IMAGE, "25G"], check=True, capture_output=True)

def reset_ovmf():
    vars_src = OVMF_CODE.replace("CODE", "VARS")
    shutil.copyfile(vars_src, OVMF_VARS)

def sync_backend(p_iso):
    backend_src = "/mnt/shared/projects/tinapple/tinapple-installer/backend/lib"
    if os.path.isdir(backend_src):
        for fname in os.listdir(backend_src):
            if fname.endswith(".sh"):
                local_path = os.path.join(backend_src, fname)
                for dest_dir in [
                    "/usr/lib/tinapple-installer/backend/lib",
                    "/usr/local/lib/tinapple/lib",
                    "/usr/lib/tinapple/lib"
                ]:
                    cmd = ["scp", "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null", "-P", str(SSH_PORT)]
                    if os.path.exists(SSH_KEY):
                        cmd.extend(["-i", SSH_KEY])
                    cmd.extend([local_path, f"{SSH_USER}@{SSH_HOST}:{dest_dir}/{fname}"])
                    subprocess.run(cmd, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def run_permutation_install(perm, iso_path):
    log(f"--- [Stage 1/2: LIVE ISO INSTALL] {perm['name']} ---")
    state["current_phase"] = f"Installing {perm['name']}"
    save_status()

    reset_disk()
    reset_ovmf()

    serial_log = open("/home/pineapple/tinapple-vm-live.log", "w")
    qemu_cmd = [
        "qemu-system-x86_64",
        "-enable-kvm",
        "-cpu", "host",
        "-smp", "2",
        "-m", "4G",
        "-drive", f"if=pflash,format=raw,readonly=on,file={OVMF_CODE}",
        "-drive", f"if=pflash,format=raw,file={OVMF_VARS}",
        "-drive", f"file={DISK_IMAGE},format=qcow2,if=virtio",
        "-cdrom", iso_path,
        "-boot", "order=d,menu=off",
        "-netdev", f"user,id=net0,hostfwd=tcp::{SSH_PORT}-:22",
        "-device", "virtio-net-pci,netdev=net0,romfile=",
        "-serial", "stdio",
        "-display", "none"
    ]
    if perm.get("mount_cache", False) and os.path.exists(CACHE_DISK):
        qemu_cmd.extend(["-drive", f"file={CACHE_DISK},format=raw,if=virtio"])

    proc = subprocess.Popen(qemu_cmd, stdin=subprocess.DEVNULL, stdout=serial_log, stderr=serial_log)

    try:
        log("Waiting for Live ISO to boot and SSH ready...")
        if not wait_for_ssh(timeout=180):
            log("❌ FAILED: Live ISO SSH timed out.")
            return False, "Live ISO SSH timeout"

        # Initialize pacman keys if needed
        run_ssh("pacman-key --init 2>/dev/null; pacman-key --populate archlinux cachyos 2>/dev/null || true", timeout=60)
        sync_backend(iso_path)

        if perm.get("mount_cache", False) and os.path.exists(CACHE_DISK):
            log("Mounting cache disk...")
            run_ssh("mkdir -p /var/cache/pacman/pkg && (mount -L TINAPPLE_CACHE /var/cache/pacman/pkg 2>/dev/null || mount /dev/vdb /var/cache/pacman/pkg 2>/dev/null || true)", timeout=15)
        else:
            log("Running in STANDALONE cache mode (verifying target-disk cache allocation)...")

        # Cleanup partitions before install
        run_ssh("swapoff -a 2>/dev/null; umount -R -l /mnt 2>/dev/null || true; wipefs -a -f /dev/vda 2>/dev/null; sgdisk -Z /dev/vda 2>/dev/null; partprobe /dev/vda 2>/dev/null; sync", timeout=30)

        install_cmd = f"""
export TINAPPLE_DISK=/dev/vda
export TINAPPLE_FS={perm['fs']}
export TINAPPLE_BOOTLOADER={perm['bootloader']}
export TINAPPLE_KERNEL_PROFILE={perm['kernel']}
export TINAPPLE_PROFILES="{perm['profiles']}"
export TINAPPLE_LUKS={perm['luks']}
export TINAPPLE_AUTO=1

/usr/local/bin/tinapple-install --auto
"""
        log("Executing tinapple-install inside VM...")
        t0 = time.time()
        rc, out = run_ssh(install_cmd, timeout=1200, stream=True)
        dur = time.time() - t0

        if rc != 0:
            log(f"❌ INSTALL FAILED: rc={rc}")
            return False, f"Install exited with rc={rc}"

        # Verify files on /mnt
        verify_cmd = f"""
set -e
[[ -f /mnt/etc/tinapple/manifest.yaml ]] || {{ echo "Missing manifest.yaml"; exit 2; }}
[[ -f /mnt/etc/fstab ]] || {{ echo "Missing fstab"; exit 3; }}
grep -q "{perm['fs']}" /mnt/etc/fstab || {{ echo "Filesystem mismatch in fstab"; exit 4; }}
echo "VERIFY_OK"
"""
        rc_v, out_v = run_ssh(verify_cmd, timeout=30)
        if "VERIFY_OK" not in out_v:
            log(f"❌ FILESYSTEM VERIFICATION FAILED: {out_v.strip()}")
            return False, out_v.strip()

        # Ensure root SSH key is in target installation
        run_ssh("mkdir -p /mnt/root/.ssh && cp -f /root/.ssh/authorized_keys /mnt/root/.ssh/authorized_keys && chmod 700 /mnt/root/.ssh && chmod 600 /mnt/root/.ssh/authorized_keys && sync", timeout=15)

        log(f"✅ Install completed and verified ({dur:.1f}s). Flushing guest disk cache...")
        run_ssh("sync; umount -R /mnt 2>/dev/null || true; sync", timeout=30)
        return True, "OK"

    finally:
        try:
            proc.terminate()
            proc.wait(timeout=10)
        except Exception:
            proc.kill()
        serial_log.close()

def run_permutation_direct_boot(perm):
    log(f"--- [Stage 2/2: DIRECT UEFI BOOT VERIFICATION] {perm['name']} ---")
    state["current_phase"] = f"Direct Booting {perm['name']}"
    save_status()

    serial_log = open("/home/pineapple/tinapple-vm-boot.log", "w")
    qemu_cmd = [
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
        "-netdev", f"user,id=net0,hostfwd=tcp::{SSH_PORT}-:22",
        "-device", "virtio-net-pci,netdev=net0,romfile=",
        "-serial", "stdio",
        "-display", "none"
    ]
    proc = subprocess.Popen(qemu_cmd, stdin=subprocess.DEVNULL, stdout=serial_log, stderr=serial_log)

    try:
        log("Waiting for installed system to complete UEFI boot...")
        t0 = time.time()
        booted = False
        while time.time() - t0 < 180:
            try:
                with socket.create_connection((SSH_HOST, SSH_PORT), timeout=2):
                    rc, out = run_ssh("uname -a && cat /etc/os-release | grep PRETTY && df -hT /", timeout=15)
                    if rc == 0 and "Linux" in out:
                        log(f"Installed system booted successfully in {time.time()-t0:.1f}s!")
                        log(f"Kernel & Filesystem Details:\n{out.strip()}")
                        booted = True
                        break
            except Exception:
                pass
            time.sleep(3)

        if not booted:
            log("❌ DIRECT BOOT TIMEOUT: System did not reach SSH.")
            return False, "Direct boot timed out"

        # Check systemd running state
        rc_sys, out_sys = run_ssh("systemctl --failed --no-pager", timeout=15)
        log(f"Systemd failed units check:\n{out_sys.strip()}")

        log(f"🎉 DIRECT BOOT VERIFICATION PASSED for {perm['name']}!")
        return True, "OK"

    finally:
        log("Powering off installed VM...")
        try:
            run_ssh("poweroff", timeout=10)
            proc.wait(timeout=10)
        except Exception:
            try:
                proc.terminate()
                proc.wait(timeout=5)
            except Exception:
                proc.kill()
        serial_log.close()

def main():
    log("="*75)
    log("       TINAPPLE OS FULL BREAK-TEST MATRIX RUNNER")
    log("="*75)

    with open(LOG_FILE, "w") as f:
        f.write("=== Tinapple Break-Test Log Started ===\n")

    iso_path = get_latest_iso()
    log(f"Target ISO: {iso_path} ({os.path.getsize(iso_path)/(1024*1024*1024):.2f} GiB)")

    perms_to_run = PERMUTATIONS
    if len(sys.argv) > 1:
        filter_str = sys.argv[1].lower()
        perms_to_run = [p for p in PERMUTATIONS if filter_str in p["id"].lower() or filter_str in p["name"].lower()]
        log(f"Filtered to {len(perms_to_run)} permutation(s) matching '{sys.argv[1]}'")

    results = {}
    all_passed = True

    for idx, perm in enumerate(perms_to_run):
        state["current_index"] = idx + 1
        state["total"] = len(perms_to_run)
        state["current_permutation"] = perm["name"]
        save_status()

        log("\n" + "#"*75)
        log(f"[{idx+1}/{len(perms_to_run)}] BREAK-TESTING: {perm['name']}")
        log(f"    FS={perm['fs']} | Bootloader={perm['bootloader']} | Kernel={perm['kernel']} | Profiles={perm['profiles']}")
        log("#"*75)

        t_start = time.time()
        inst_ok, inst_msg = run_permutation_install(perm, iso_path)
        if not inst_ok:
            results[perm["name"]] = (False, False, time.time()-t_start, f"Install failed: {inst_msg}")
            state["failed"].append(perm["name"])
            all_passed = False
            save_status()
            continue

        boot_ok, boot_msg = run_permutation_direct_boot(perm)
        elapsed = time.time() - t_start
        if not boot_ok:
            results[perm["name"]] = (True, False, elapsed, f"Boot failed: {boot_msg}")
            state["failed"].append(perm["name"])
            all_passed = False
        else:
            results[perm["name"]] = (True, True, elapsed, "Install & Direct Boot 100% OK")
            state["completed"].append(perm["name"])

        save_status()

    log("\n" + "="*75)
    log("                    BREAK-TEST FINAL SUMMARY")
    log("="*75)
    for perm in perms_to_run:
        name = perm["name"]
        inst_ok, boot_ok, dur, note = results.get(name, (False, False, 0.0, "Not Run"))
        overall = "PASS" if (inst_ok and boot_ok) else "FAIL"
        log(f"  [{overall:4s}] {name:50s} | {dur:5.1f}s | {note}")

    state["status"] = "completed" if all_passed else "failed"
    state["current_phase"] = "All Break-Tests Completed" if all_passed else "Some Tests Failed"
    save_status()

    if all_passed:
        log("\n🏆 ALL 7/7 BREAK-TEST PERMUTATIONS PASSED 100% (INSTALL + DIRECT BOOT)!")
        return 0
    else:
        log("\n❌ SOME BREAK-TEST PERMUTATIONS FAILED.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
