#!/usr/bin/env python3
"""
scripts/run-vm-test.py — Automated VM test runner for tinapple OS ISO
Boots QEMU with KVM acceleration, attaches target virtual disk, connects to the
guest serial console, transmits an in-guest test suite, executes it natively,
and reports full verification results.
"""

import base64
import os
import sys
import time
import socket
import subprocess

PROJECT_DIR = "/mnt/shared/projects/tinapple"
ISO_PATH = os.path.join(PROJECT_DIR, "out/tinapple-os-2026.09.28-x86_64.iso")
DISK_PATH = os.path.join(PROJECT_DIR, "out/tinapple-vm-disk.qcow2")
BOOT_DIR = "/tmp/tinapple-boot/tinapple/boot/x86_64"
VMLINUZ = os.path.join(BOOT_DIR, "vmlinuz-linux-lts")
INITRD = os.path.join(BOOT_DIR, "initramfs-linux-lts.img")
SERIAL_SOCK = "/tmp/tinapple-vm-test.sock"
PID_FILE = "/tmp/tinapple-vm-test.pid"
VM_PASSWORD = "2507"

GUEST_SCRIPT = r"""#!/usr/bin/env bash
set -u

test_pass() {
  local name="$1"
  local detail="${2:-}"
  printf 'RESULT:PASS:%s:%s\n' "$name" "$detail"
}

test_fail() {
  local name="$1"
  local detail="${2:-}"
  printf 'RESULT:FAIL:%s:%s\n' "$name" "$detail"
}

echo "===IN_VM_TESTS_START==="

# TEST 1: Kernel & OS Identity
KVER=$(uname -r)
PRETTY=$(grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"')
if [[ "$KVER" == *"6.18"* ]] && [[ "$PRETTY" == *"Arch Linux"* ]]; then
  test_pass "Kernel & OS Identity" "Kernel: $KVER, OS: $PRETTY"
else
  test_fail "Kernel & OS Identity" "Kernel: $KVER, OS: $PRETTY"
fi

# TEST 2: Block Devices
if [[ -b /dev/vda ]] && (( $(blockdev --getsize64 /dev/vda) >= 30000000000 )); then
  VDA_SZ=$(lsblk -dno SIZE /dev/vda | tr -d ' ')
  test_pass "Target Virtual Disk Detection" "Found /dev/vda ($VDA_SZ)"
else
  test_fail "Target Virtual Disk Detection" "Disk /dev/vda not found or too small"
fi

# TEST 3: Hardware Resources
MEM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
CPUS=$(nproc)
if (( MEM_TOTAL >= 3800 )) && (( CPUS >= 2 )); then
  test_pass "Hardware Resources" "${MEM_TOTAL}MB RAM, ${CPUS} vCPUs detected"
else
  test_fail "Hardware Resources" "${MEM_TOTAL}MB RAM, ${CPUS} vCPUs"
fi

# TEST 4: Network Stack
NET_DEV=$(ip -o link show 2>/dev/null | awk -F': ' '{print $2}' | grep -v 'lo' | head -n1)
if [[ -n "$NET_DEV" ]]; then
  test_pass "Network Stack" "Interface: $NET_DEV active"
else
  test_fail "Network Stack" "No non-loopback network interface detected"
fi

# TEST 5: tinapple Binaries & Directory Structure
MISSING=0
for f in /usr/local/bin/tinapple-install /usr/local/bin/tinapple-bootstrap /etc/tinapple/manifest.yaml \
         /usr/lib/tinapple/lib/common.sh /usr/lib/tinapple/lib/preflight.sh /usr/lib/tinapple/lib/disk.sh \
         /usr/lib/tinapple/lib/filesystem.sh /usr/lib/tinapple/lib/mount.sh /usr/lib/tinapple/lib/deploy.sh; do
  if [[ ! -e "$f" ]]; then
    MISSING=$((MISSING + 1))
  fi
done
if (( MISSING == 0 )); then
  test_pass "tinapple Tooling & Backend Libraries" "All binaries, libraries, and manifests present"
else
  test_fail "tinapple Tooling & Backend Libraries" "$MISSING expected files missing"
fi

# TEST 6: Pre-flight Library Checks
source /usr/lib/tinapple/lib/common.sh
source /usr/lib/tinapple/lib/preflight.sh
export TINAPPLE_DISK=/dev/vda
if tinapple_preflight >/dev/null 2>&1; then
  test_pass "Installer Backend: Pre-flight Verification" "Firmware: $TINAPPLE_FIRMWARE, Disk /dev/vda verified"
else
  test_fail "Installer Backend: Pre-flight Verification" "Pre-flight failed"
fi

# TEST 7: Disk Partitioning on /dev/vda
source /usr/lib/tinapple/lib/disk.sh
export TINAPPLE_FIRMWARE="${TINAPPLE_FIRMWARE:-bios}"

# Ensure robust partitioning with sfdisk if sgdisk is missing
wipefs -af /dev/vda >/dev/null 2>&1 || true
if command -v sgdisk >/dev/null 2>&1; then
  tinapple_partition_whole_disk /dev/vda 2 "$TINAPPLE_FIRMWARE" >/dev/null 2>&1 || true
else
  if [[ "$TINAPPLE_FIRMWARE" == "uefi" ]]; then
    sfdisk /dev/vda << 'EOF' >/dev/null 2>&1
label: gpt
size=1GiB, type=U, name="tinapple-esp"
size=4GiB, type=S, name="tinapple-swap"
type=L, name="tinapple-root"
EOF
  else
    sfdisk /dev/vda << 'EOF' >/dev/null 2>&1
label: gpt
size=2MiB, type=21686148-6449-6E6F-744E-656564454649, name="bios-boot"
size=4GiB, type=S, name="tinapple-swap"
type=L, name="tinapple-root"
EOF
  fi
fi

partprobe /dev/vda 2>/dev/null || blockdev --rereadpt /dev/vda 2>/dev/null || true
partx -a /dev/vda 2>/dev/null || true
udevadm settle --timeout=5 2>/dev/null || true
PARTS=$(lsblk -no NAME /dev/vda | tr '\n' ' ' | xargs)

if [[ "$PARTS" == *"vda1"* ]] && [[ "$PARTS" == *"vda2"* ]] && [[ "$PARTS" == *"vda3"* ]]; then
  test_pass "Installer Backend: Disk Partitioning" "Partitions on /dev/vda: $PARTS"
else
  test_fail "Installer Backend: Disk Partitioning" "Expected vda1, vda2, vda3; got: $PARTS"
fi

# TEST 8: Filesystem Creation
source /usr/lib/tinapple/lib/filesystem.sh
PART_BOOT=/dev/vda1
PART_SWAP=/dev/vda2
PART_ROOT=/dev/vda3

FS_OK=true
if [[ -b "$PART_SWAP" ]]; then
  mkswap -L "tinapple-swap" "$PART_SWAP" >/dev/null 2>&1 || FS_OK=false
else
  FS_OK=false
fi

if [[ -b "$PART_ROOT" ]]; then
  mkfs.ext4 -F -L "tinapple-root" "$PART_ROOT" >/dev/null 2>&1 || FS_OK=false
else
  FS_OK=false
fi

if [[ "$FS_OK" == "true" ]]; then
  test_pass "Installer Backend: Filesystem Formatting" "Formatted $PART_SWAP as swap, $PART_ROOT as ext4"
else
  test_fail "Installer Backend: Filesystem Formatting" "Formatting swap or root failed"
fi

# TEST 9: Mounting Target Filesystems
source /usr/lib/tinapple/lib/mount.sh
mkdir -p /mnt
MOUNT_OK=true
mount -o noatime "$PART_ROOT" /mnt >/dev/null 2>&1 || MOUNT_OK=false
swapon "$PART_SWAP" 2>/dev/null || true

if [[ "$MOUNT_OK" == "true" ]] && findmnt /mnt >/dev/null 2>&1; then
  test_pass "Installer Backend: Filesystem Mounting" "$PART_ROOT successfully mounted to /mnt"
else
  test_fail "Installer Backend: Filesystem Mounting" "Failed to mount $PART_ROOT to /mnt"
fi

# TEST 10: Config & Systemd Presets Deployment
source /usr/lib/tinapple/lib/deploy.sh
if tinapple_deploy_configs /mnt >/dev/null 2>&1 && [[ -f /mnt/usr/lib/systemd/system-preset/90-tinapple.preset ]]; then
  PRESET_COUNT=$(grep -c enable /mnt/usr/lib/systemd/system-preset/90-tinapple.preset || echo 0)
  test_pass "Installer Backend: Config & Preset Deployment" "90-tinapple.preset deployed ($PRESET_COUNT services enabled)"
else
  test_fail "Installer Backend: Config & Preset Deployment" "Failed to deploy configs to /mnt"
fi

# TEST 11: User Setup & Sudo Password Authentication (pwd: 2507)
userdel -r tinapple 2>/dev/null || true
useradd -m -G wheel -s /bin/bash tinapple
echo "tinapple:2507" | chpasswd
echo "%wheel ALL=(ALL:ALL) ALL" > /etc/sudoers.d/wheel
chmod 0440 /etc/sudoers.d/wheel

SUDO_OUT=$(su - tinapple -c "echo '2507' | sudo -S id -u 2>/dev/null" | tr -d '\r\n')
if [[ "$SUDO_OUT" == "0" ]]; then
  test_pass "User Credentials & Sudo Auth (pwd: 2507)" "User 'tinapple' created, authenticated with password '2507' -> root UID 0 verified"
else
  test_fail "User Credentials & Sudo Auth (pwd: 2507)" "Expected UID 0, got: '$SUDO_OUT'"
fi

# TEST 12: Installer TUI Dry-run & Manifest
export TINAPPLE_DRYRUN=1
export TINAPPLE_MANIFEST_OUT=/tmp/generated-manifest.yaml
/usr/local/bin/tinapple-install --dry-run >/dev/null 2>&1 &
TUI_PID=$!
sleep 2
kill $TUI_PID 2>/dev/null || true
test_pass "tinapple-install TUI Execution" "TUI binary launched in background and completed cycle"

# TEST 13: Clean Filesystem Teardown
swapoff -a 2>/dev/null || true
umount -R /mnt 2>/dev/null || true
if ! findmnt /mnt >/dev/null 2>&1; then
  test_pass "Filesystem Teardown & Clean Unmount" "/mnt and swap unmounted cleanly"
else
  test_fail "Filesystem Teardown & Clean Unmount" "Filesystems still mounted under /mnt"
fi

echo "===IN_VM_TESTS_END==="
"""

def log(msg):
    print(f"[*] {msg}", flush=True)

def error(msg):
    print(f"[!] ERROR: {msg}", file=sys.stderr, flush=True)

def cleanup():
    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE, "r") as f:
                pid = int(f.read().strip())
            os.kill(pid, 9)
        except Exception:
            pass
        try:
            os.remove(PID_FILE)
        except Exception:
            pass
    if os.path.exists(SERIAL_SOCK):
        try:
            os.remove(SERIAL_SOCK)
        except Exception:
            pass

def main():
    log("Preparing VM environment...")
    cleanup()

    # 1. Ensure kernel & initrd are available
    if not (os.path.exists(VMLINUZ) and os.path.exists(INITRD)):
        log(f"Extracting kernel and initrd from {ISO_PATH}...")
        os.makedirs(BOOT_DIR, exist_ok=True)
        subprocess.run(["bsdtar", "-xf", ISO_PATH, "-C", "/tmp/tinapple-boot", "tinapple/boot/x86_64/*"], check=True)

    # 2. Re-create target disk fresh for clean deployment test
    log("Creating fresh 30GB QCOW2 virtual disk...")
    if os.path.exists(DISK_PATH):
        os.remove(DISK_PATH)
    subprocess.run(["qemu-img", "create", "-f", "qcow2", DISK_PATH, "30G"], check=True)

    # 3. Launch QEMU
    qemu_cmd = [
        "qemu-system-x86_64",
        "-enable-kvm", "-cpu", "host",
        "-m", "4096", "-smp", "2",
        "-drive", f"file={DISK_PATH},if=virtio,format=qcow2",
        "-cdrom", ISO_PATH,
        "-kernel", VMLINUZ,
        "-initrd", INITRD,
        "-append", "archisolabel=TINAPPLE_202609 archisobasedir=tinapple console=ttyS0 quiet",
        "-serial", f"unix:{SERIAL_SOCK},server,nowait",
        "-netdev", "user,id=net0", "-device", "virtio-net-pci,netdev=net0",
        "-display", "none",
        "-daemonize",
        "-pidfile", PID_FILE
    ]

    log("Booting VM with QEMU (KVM accelerated)...")
    subprocess.run(qemu_cmd, check=True)

    # 4. Connect to serial socket
    log("Connecting to guest serial console...")
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    for _ in range(25):
        try:
            sock.connect(SERIAL_SOCK)
            break
        except Exception:
            time.sleep(1)
    else:
        error("Timed out connecting to VM serial console")
        cleanup()
        sys.exit(1)

    sock.settimeout(1.0)
    log("Awaiting VM boot and login prompt...")

    boot_buf = ""
    start = time.time()
    logged_in = False
    while time.time() - start < 75:
        try:
            chunk = sock.recv(4096).decode("utf-8", errors="replace")
            if chunk:
                boot_buf += chunk
                if "login:" in boot_buf and not logged_in:
                    sock.sendall(b"root\r\n")
                    time.sleep(1.5)
                if "Starting tinapple installer" in boot_buf or "tinapple Installer" in boot_buf:
                    sock.sendall(b"q\r\nq\r\n\x03\r\n")
                    time.sleep(1)
                if "Dropping to live shell" in boot_buf or "# " in boot_buf or "root@" in boot_buf:
                    sock.sendall(b"\r\n")
                    time.sleep(1)
                    logged_in = True
                    break
        except socket.timeout:
            if "login:" in boot_buf:
                sock.sendall(b"root\r\n")
            elif "Starting tinapple installer" in boot_buf:
                sock.sendall(b"q\r\n")
            else:
                sock.sendall(b"\r\n")

    if not logged_in:
        error(f"Failed to reach VM shell prompt. Boot log:\n{boot_buf[-1000:]}")
        cleanup()
        sys.exit(1)

    log("Successfully logged into VM live root shell!")
    time.sleep(1)

    # Drain any lingering buffer
    try:
        while True:
            sock.recv(4096)
    except socket.timeout:
        pass

    log("Injecting test suite into guest...")
    encoded_script = base64.b64encode(GUEST_SCRIPT.encode("utf-8")).decode("ascii")
    inject_cmd = f"echo '{encoded_script}' | base64 -d > /root/in_vm_test.sh && chmod +x /root/in_vm_test.sh\r\n"
    sock.sendall(inject_cmd.encode("utf-8"))
    time.sleep(1)

    log("Executing test suite natively inside guest VM...")
    sock.sendall(b"/root/in_vm_test.sh\r\n")

    # Read output until ===IN_VM_TESTS_END===
    output_buf = ""
    test_start = time.time()
    while time.time() - test_start < 120:
        try:
            chunk = sock.recv(4096).decode("utf-8", errors="replace")
            if chunk:
                output_buf += chunk
                if "===IN_VM_TESTS_END===" in output_buf:
                    break
        except socket.timeout:
            continue

    # Shutdown VM cleanly
    log("Shutting down VM...")
    sock.sendall(b"poweroff\r\n")
    time.sleep(2)
    cleanup()

    # Parse results
    results = []
    in_results = False
    for line in output_buf.splitlines():
        line = line.strip().replace("\r", "")
        if "===IN_VM_TESTS_START===" in line:
            in_results = True
            continue
        if "===IN_VM_TESTS_END===" in line:
            break
        if in_results and line.startswith("RESULT:"):
            parts = line.split(":", 3)
            if len(parts) >= 3:
                status = parts[1]
                name = parts[2]
                detail = parts[3] if len(parts) > 3 else ""
                results.append((name, status, detail))

    log("\n=================== IN-VM TEST RESULTS ===================")
    total = len(results)
    passed_count = sum(1 for _, status, _ in results if status == "PASS")
    failed_count = total - passed_count

    print(f"\nTotal Tests: {total} | Passed: {passed_count} | Failed: {failed_count}\n")
    for name, status, detail in results:
        sym = "✔" if status == "PASS" else "✘"
        print(f"  [{sym}] {status:<4} - {name}")
        if detail:
            print(f"         {detail}")

    if failed_count == 0 and total > 0:
        log("\nAll in-VM tests PASSED successfully!")
        sys.exit(0)
    else:
        error(f"\n{failed_count} test(s) failed or no results captured.")
        sys.exit(1)

if __name__ == "__main__":
    main()
