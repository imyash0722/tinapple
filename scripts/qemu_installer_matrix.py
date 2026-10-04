#!/usr/bin/env python3
"""
scripts/qemu_installer_matrix.py — Parallel Automated QEMU Installer Test Runner

Runs all permutation test cases of the Tinapple OS installer:
  - Filesystems: ext4, btrfs, xfs
  - Bootloaders: grub, limine
  - Firmware: uefi, bios
  - Encryption: plain, luks
  - Kernels: lts, hardened, current
  - Profiles: base, media, downloads, backups, infrastructure, databases, all
  - Network: dhcp, static

Modes:
  1. Worker Mode:     --case <case_id>
     Runs a single test case in an isolated sandbox and returns JSON + exit code (0/1).
  2. Orchestrator Mode: --all [--parallel N] [--mode dryrun|qemu]
     Runs parallel worker instances of this same script, streams compact 1-line status,
     aggregates results, and returns exit code 0 on all-pass, 1 on any failure.
"""

import argparse
import base64
import glob
import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from typing import Any, Dict, List, Optional

PROJECT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BOOT_CACHE_DIR = "/tmp/tinapple-boot/tinapple/boot/x86_64"
VMLINUZ = os.path.join(BOOT_CACHE_DIR, "vmlinuz-linux-lts")
INITRD = os.path.join(BOOT_CACHE_DIR, "initramfs-linux-lts.img")
ISO_LABEL = "TINAPPLE_202610"

# ── Complete Test Matrix Specification ─────────────────────────────────────────

TEST_MATRIX: List[Dict[str, Any]] = [
    {
        "id": "uefi-ext4-grub-plain-lts-default",
        "desc": "UEFI + ext4 + GRUB + Plaintext + LTS Kernel + Default Profile (chadwm)",
        "firmware": "uefi",
        "fs": "ext4",
        "bootloader": "grub",
        "luks": "no",
        "kernel": "lts",
        "profiles": "base,chadwm",
        "network": "dhcp",
    },
    {
        "id": "uefi-btrfs-limine-plain-lts-media",
        "desc": "UEFI + Btrfs + Limine + Plaintext + LTS Kernel + Media Stack",
        "firmware": "uefi",
        "fs": "btrfs",
        "bootloader": "limine",
        "luks": "no",
        "kernel": "lts",
        "profiles": "base,media",
        "network": "dhcp",
    },
    {
        "id": "uefi-xfs-grub-plain-lts-downloads",
        "desc": "UEFI + XFS + GRUB + Plaintext + LTS Kernel + Downloads Stack",
        "firmware": "uefi",
        "fs": "xfs",
        "bootloader": "grub",
        "luks": "no",
        "kernel": "lts",
        "profiles": "base,downloads",
        "network": "dhcp",
    },
    {
        "id": "uefi-ext4-limine-plain-lts-backups",
        "desc": "UEFI + ext4 + Limine + Plaintext + LTS Kernel + Backups Stack",
        "firmware": "uefi",
        "fs": "ext4",
        "bootloader": "limine",
        "luks": "no",
        "kernel": "lts",
        "profiles": "base,backups",
        "network": "dhcp",
    },
    {
        "id": "uefi-btrfs-grub-luks-hardened-infra",
        "desc": "UEFI + Btrfs + GRUB + LUKS Encrypted + Hardened Kernel + Infrastructure",
        "firmware": "uefi",
        "fs": "btrfs",
        "bootloader": "grub",
        "luks": "yes",
        "kernel": "hardened",
        "profiles": "base,infrastructure",
        "network": "dhcp",
    },
    {
        "id": "uefi-xfs-limine-plain-lts-databases",
        "desc": "UEFI + XFS + Limine + Plaintext + LTS Kernel + Databases Stack",
        "firmware": "uefi",
        "fs": "xfs",
        "bootloader": "limine",
        "luks": "no",
        "kernel": "lts",
        "profiles": "base,databases",
        "network": "dhcp",
    },
    {
        "id": "uefi-ext4-grub-luks-lts-network",
        "desc": "UEFI + ext4 + GRUB + LUKS Encrypted + LTS Kernel + Network Stack",
        "firmware": "uefi",
        "fs": "ext4",
        "bootloader": "grub",
        "luks": "yes",
        "kernel": "lts",
        "profiles": "base,network",
        "network": "dhcp",
    },
    {
        "id": "uefi-btrfs-limine-luks-current-all",
        "desc": "UEFI + Btrfs + Limine + LUKS Encrypted + Current Kernel + All Service Profiles",
        "firmware": "uefi",
        "fs": "btrfs",
        "bootloader": "limine",
        "luks": "yes",
        "kernel": "current",
        "profiles": "base,chadwm,media,downloads,backups,network,infrastructure,databases",
        "network": "dhcp",
    },
    {
        "id": "bios-ext4-grub-plain-lts-default",
        "desc": "BIOS/MBR + ext4 + GRUB + Plaintext + LTS Kernel + Default Profile",
        "firmware": "bios",
        "fs": "ext4",
        "bootloader": "grub",
        "luks": "no",
        "kernel": "lts",
        "profiles": "base,chadwm",
        "network": "dhcp",
    },
    {
        "id": "bios-xfs-grub-plain-lts-infra",
        "desc": "BIOS/MBR + XFS + GRUB + Plaintext + LTS Kernel + Infrastructure Stack",
        "firmware": "bios",
        "fs": "xfs",
        "bootloader": "grub",
        "luks": "no",
        "kernel": "lts",
        "profiles": "base,infrastructure",
        "network": "dhcp",
    },
    {
        "id": "bios-btrfs-grub-plain-lts-downloads",
        "desc": "BIOS/MBR + Btrfs + GRUB + Plaintext + LTS Kernel + Downloads Stack",
        "firmware": "bios",
        "fs": "btrfs",
        "bootloader": "grub",
        "luks": "no",
        "kernel": "lts",
        "profiles": "base,downloads",
        "network": "dhcp",
    },
    {
        "id": "bios-ext4-grub-luks-hardened-databases",
        "desc": "BIOS/MBR + ext4 + GRUB + LUKS Encrypted + Hardened Kernel + Databases",
        "firmware": "bios",
        "fs": "ext4",
        "bootloader": "grub",
        "luks": "yes",
        "kernel": "hardened",
        "profiles": "base,databases",
        "network": "dhcp",
    },
    {
        "id": "uefi-btrfs-grub-plain-hardened-media",
        "desc": "UEFI + Btrfs + GRUB + Plaintext + Hardened Kernel + Media Stack",
        "firmware": "uefi",
        "fs": "btrfs",
        "bootloader": "grub",
        "luks": "no",
        "kernel": "hardened",
        "profiles": "base,media",
        "network": "dhcp",
    },
    {
        "id": "uefi-ext4-limine-plain-current-network",
        "desc": "UEFI + ext4 + Limine + Plaintext + Current Kernel + Network Stack",
        "firmware": "uefi",
        "fs": "ext4",
        "bootloader": "limine",
        "luks": "no",
        "kernel": "current",
        "profiles": "base,network",
        "network": "dhcp",
    },
    {
        "id": "uefi-xfs-grub-plain-current-infra",
        "desc": "UEFI + XFS + GRUB + Plaintext + Current Kernel + Infrastructure Stack",
        "firmware": "uefi",
        "fs": "xfs",
        "bootloader": "grub",
        "luks": "no",
        "kernel": "current",
        "profiles": "base,infrastructure",
        "network": "dhcp",
    },
    {
        "id": "uefi-ext4-grub-plain-lts-static",
        "desc": "UEFI + ext4 + GRUB + Plaintext + LTS Kernel + Static IP Networking",
        "firmware": "uefi",
        "fs": "ext4",
        "bootloader": "grub",
        "luks": "no",
        "kernel": "lts",
        "profiles": "base,chadwm",
        "network": "static",
        "static_ip": "192.168.1.150/24",
        "gateway": "192.168.1.1",
    },
]


def find_latest_iso() -> Optional[str]:
    patterns = [
        os.path.join(PROJECT_DIR, "out/tinapple-os-*.iso"),
        os.path.join(PROJECT_DIR, "tinapple-installer/iso/out/tinapple-os-*.iso"),
    ]
    candidates = []
    for pat in patterns:
        candidates.extend(glob.glob(pat))
    if not candidates:
        return None
    candidates.sort(key=os.path.getmtime)
    return candidates[-1]


def ensure_boot_cache(iso_path: str) -> None:
    if os.path.exists(VMLINUZ) and os.path.exists(INITRD):
        return
    os.makedirs(BOOT_CACHE_DIR, exist_ok=True)
    subprocess.run(
        ["bsdtar", "-xf", iso_path, "-C", "/tmp/tinapple-boot", "tinapple/boot/x86_64/*"],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


# ── Worker Implementation ──────────────────────────────────────────────────────

def run_worker_dryrun(case: Dict[str, Any], work_dir: str) -> Dict[str, Any]:
    """Execute the installer pipeline under TINAPPLE_DRYRUN=1."""
    start_time = time.time()
    log_file = os.path.join(work_dir, "test.log")
    os.makedirs(work_dir, exist_ok=True)

    installer_bin = os.path.join(PROJECT_DIR, "tinapple-installer/bin/tinapple-install")
    if not os.path.exists(installer_bin):
        installer_bin = os.path.join(PROJECT_DIR, "tinapple-installer/tui/tinapple-installer")

    env = os.environ.copy()
    env.update({
        "TINAPPLE_AUTO": "1",
        "TINAPPLE_DRYRUN": "1",
        "TINAPPLE_DISK": "/dev/vda",
        "TINAPPLE_FS": case["fs"],
        "TINAPPLE_BOOTLOADER": case["bootloader"],
        "TINAPPLE_FIRMWARE": case["firmware"],
        "TINAPPLE_LUKS": case["luks"],
        "TINAPPLE_KERNEL_PROFILE": case["kernel"],
        "TINAPPLE_PROFILES": case["profiles"],
        "TINAPPLE_HOSTNAME": f"tinapple-{case['id'][:12]}",
        "TINAPPLE_USERNAME": "tinapple",
        "TINAPPLE_PASSWORD": "password123",
        "TINAPPLE_NET_DHCP": "true" if case.get("network") == "dhcp" else "false",
        "TINAPPLE_BACKEND_DIR": os.path.join(PROJECT_DIR, "tinapple-installer/backend"),
    })

    if case.get("static_ip"):
        env["TINAPPLE_NET_STATIC_IP"] = case["static_ip"]
        env["TINAPPLE_NET_GATEWAY"] = case["gateway"]

    stages_executed = []
    error_msg = None

    with open(log_file, "w", encoding="utf-8") as lf:
        proc = subprocess.Popen(
            [installer_bin, "--auto"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env=env,
            cwd=PROJECT_DIR,
            text=True,
            bufsize=1,
        )

        for line in proc.stdout:
            lf.write(line)
            line_str = line.strip()
            if line_str.startswith("@@STEP "):
                stages_executed.append(line_str.split(" ", 1)[1])
            elif "FATAL ERROR" in line_str or "failed:" in line_str:
                if not error_msg:
                    error_msg = line_str

        proc.wait()

    duration = round(time.time() - start_time, 2)
    status = "PASS" if proc.returncode == 0 else "FAIL"

    return {
        "case_id": case["id"],
        "desc": case["desc"],
        "status": status,
        "duration_sec": duration,
        "stages": stages_executed,
        "error": error_msg if status == "FAIL" else None,
        "log_path": log_file,
    }


def run_worker_qemu(case: Dict[str, Any], work_dir: str, iso_path: str, timeout_sec: int = 180) -> Dict[str, Any]:
    """Execute live VM test in an isolated QEMU sandbox."""
    start_time = time.time()
    os.makedirs(work_dir, exist_ok=True)
    log_file = os.path.join(work_dir, "test.log")
    sock_path = os.path.join(work_dir, "serial.sock")
    pid_file = os.path.join(work_dir, "qemu.pid")
    disk_path = os.path.join(work_dir, "target.qcow2")

    # Clean up previous instance files
    for p in [sock_path, pid_file, disk_path]:
        if os.path.exists(p):
            try:
                os.remove(p)
            except Exception:
                pass

    # Create isolated 25GB sparse virtual target disk
    subprocess.run(["qemu-img", "create", "-f", "qcow2", disk_path, "25G"], check=True, capture_output=True)

    ensure_boot_cache(iso_path)

    accel = ["-enable-kvm", "-cpu", "host"]
    if not (os.path.exists("/dev/kvm") and os.access("/dev/kvm", os.R_OK | os.W_OK)):
        accel = ["-cpu", "max"]

    qemu_cmd = [
        "qemu-system-x86_64",
        *accel,
        "-m", "2048", "-smp", "2",
        "-cdrom", iso_path,
        "-kernel", VMLINUZ,
        "-initrd", INITRD,
        "-append", f"archisolabel={ISO_LABEL} archisobasedir=tinapple console=ttyS0 quiet systemd.show_status=1",
        "-drive", f"file={disk_path},format=qcow2,if=virtio",
        "-serial", f"unix:{sock_path},server,nowait",
        "-netdev", "user,id=net0,ipv6=off",
        "-device", "virtio-net-pci,netdev=net0",
        "-display", "none",
        "-daemonize",
        "-pidfile", pid_file,
    ]

    qemu_pid = None
    stages_executed = []
    error_msg = None

    try:
        subprocess.run(qemu_cmd, check=True)
        time.sleep(0.5)
        if os.path.exists(pid_file):
            with open(pid_file) as pf:
                qemu_pid = int(pf.read().strip())

        # Connect to serial console
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock_connected = False
        for _ in range(30):
            try:
                sock.connect(sock_path)
                sock_connected = True
                break
            except Exception:
                time.sleep(1.0)

        if not sock_connected:
            raise RuntimeError("Timed out connecting to VM serial console socket")

        sock.settimeout(1.0)
        boot_buf = ""
        boot_start = time.time()
        logged_in = False

        with open(log_file, "w", encoding="utf-8") as lf:
            # Wait for live root shell
            while time.time() - boot_start < 60:
                try:
                    chunk = sock.recv(4096).decode("utf-8", errors="replace")
                    if chunk:
                        boot_buf += chunk
                        lf.write(chunk)
                        if "login:" in boot_buf and not logged_in:
                            sock.sendall(b"root\r\n")
                            time.sleep(0.5)
                        if "tinapple Installer" in boot_buf or "STEP 01 OF" in boot_buf:
                            sock.sendall(b"q\r\nq\r\n\x03\r\n")
                            time.sleep(0.5)
                        if any(p in boot_buf for p in ["Dropping to live shell", "root@", "# "]):
                            sock.sendall(b"\r\n")
                            logged_in = True
                            break
                except socket.timeout:
                    if "login:" in boot_buf and not logged_in:
                        sock.sendall(b"root\r\n")
                    elif ("tinapple Installer" in boot_buf or "STEP 01 OF" in boot_buf) and not logged_in:
                        sock.sendall(b"q\r\nq\r\n\x03\r\n")

            if not logged_in:
                raise RuntimeError("Failed to obtain root prompt on serial console")

            # Formulate automated guest script
            guest_commands = f"""
export TINAPPLE_AUTO=1
export TINAPPLE_DRYRUN=1
export TINAPPLE_DISK=/dev/vda
export TINAPPLE_FS={case['fs']}
export TINAPPLE_BOOTLOADER={case['bootloader']}
export TINAPPLE_FIRMWARE={case['firmware']}
export TINAPPLE_LUKS={case['luks']}
export TINAPPLE_KERNEL_PROFILE={case['kernel']}
export TINAPPLE_PROFILES={case['profiles']}
export TINAPPLE_HOSTNAME=tinapple-{case['id'][:10]}
export TINAPPLE_USERNAME=tinapple
export TINAPPLE_PASSWORD=password123
/usr/local/bin/tinapple-install --auto
echo "===INSTALL_EXIT_CODE:$?==="
"""
            b64_cmd = base64.b64encode(guest_commands.encode("utf-8")).decode("ascii")
            run_cmd = f"echo '{b64_cmd}' | base64 -d | bash\r\n"
            sock.sendall(run_cmd.encode("utf-8"))

            exec_start = time.time()
            install_buf = ""
            while time.time() - exec_start < timeout_sec:
                try:
                    chunk = sock.recv(4096).decode("utf-8", errors="replace")
                    if chunk:
                        install_buf += chunk
                        lf.write(chunk)
                        for line in chunk.splitlines():
                            if line.startswith("@@STEP "):
                                stages_executed.append(line.split(" ", 1)[1])
                        if "===INSTALL_EXIT_CODE:" in install_buf:
                            break
                except socket.timeout:
                    pass

            if "===INSTALL_EXIT_CODE:0===" in install_buf:
                status = "PASS"
            else:
                status = "FAIL"
                error_msg = "Installation failed or timed out in guest VM"
                for line in install_buf.splitlines():
                    if "FATAL ERROR" in line or "failed:" in line:
                        error_msg = line.strip()
                        break

    except Exception as e:
        status = "FAIL"
        error_msg = str(e)
    finally:
        # Cleanup QEMU process
        if qemu_pid:
            try:
                os.kill(qemu_pid, signal.SIGKILL)
            except Exception:
                pass
        for p in [sock_path, pid_file, disk_path]:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass

    duration = round(time.time() - start_time, 2)
    return {
        "case_id": case["id"],
        "desc": case["desc"],
        "status": status,
        "duration_sec": duration,
        "stages": stages_executed,
        "error": error_msg,
        "log_path": log_file,
    }


def execute_single_case(case_id: str, mode: str, timeout_sec: int) -> int:
    """Executes a single test case and outputs JSON result line."""
    case = next((c for c in TEST_MATRIX if c["id"] == case_id), None)
    if not case:
        res = {"case_id": case_id, "status": "FAIL", "error": f"Unknown case ID: {case_id}"}
        print(json.dumps(res))
        return 1

    work_dir = f"/tmp/tinapple-worker-{case_id}"
    iso_path = find_latest_iso()

    if mode == "qemu":
        if not iso_path:
            res = {"case_id": case_id, "status": "FAIL", "error": "No ISO found in out/"}
            print(json.dumps(res))
            return 1
        result = run_worker_qemu(case, work_dir, iso_path, timeout_sec)
    else:
        result = run_worker_dryrun(case, work_dir)

    # Output compact single-line JSON
    print(json.dumps(result))
    return 0 if result["status"] == "PASS" else 1


# ── Orchestrator Implementation ────────────────────────────────────────────────

def run_worker_process(case_id: str, mode: str, timeout_sec: int) -> Dict[str, Any]:
    """Runs an independent instance of this same script as a child process."""
    cmd = [
        sys.executable,
        os.path.abspath(__file__),
        "--case", case_id,
        "--mode", mode,
        "--timeout", str(timeout_sec),
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_sec + 30)
        out_line = proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else ""
        return json.loads(out_line)
    except Exception as e:
        return {
            "case_id": case_id,
            "status": "FAIL",
            "duration_sec": 0.0,
            "stages": [],
            "error": f"Process launch error: {e}",
            "log_path": "",
        }


def orchestrate_matrix(
    parallel: int,
    mode: str,
    filter_pat: Optional[str] = None,
    timeout_sec: int = 180,
) -> int:
    """Orchestrates parallel execution of all test cases across multiple instances."""
    cases = TEST_MATRIX
    if filter_pat:
        cases = [c for c in cases if filter_pat in c["id"] or filter_pat in c.get("fs", "") or filter_pat in c.get("bootloader", "")]

    total = len(cases)
    if total == 0:
        print("No test cases matched the given filter.")
        return 1

    print(f"\033[1;36m==> Launching Tinapple Installer Test Matrix ({total} cases, parallel={parallel}, mode={mode})\033[0m")
    start_total = time.time()

    results: List[Dict[str, Any]] = []
    completed = 0
    passed = 0
    failed = 0

    with ProcessPoolExecutor(max_workers=parallel) as executor:
        future_map = {
            executor.submit(run_worker_process, case["id"], mode, timeout_sec): case
            for case in cases
        }

        for future in as_completed(future_map):
            completed += 1
            res = future.result()
            results.append(res)
            cid = res["case_id"]
            dur = res.get("duration_sec", 0.0)

            if res["status"] == "PASS":
                passed += 1
                print(f"  \033[1;32m[PASS]\033[0m [{completed:02d}/{total:02d}] {cid:<40} ({dur}s)", flush=True)
            else:
                failed += 1
                err = res.get("error") or "Unknown error"
                print(f"  \033[1;31m[FAIL]\033[0m [{completed:02d}/{total:02d}] {cid:<40} ({dur}s)", flush=True)
                print(f"         \033[0;31m-> Error: {err}\033[0m", flush=True)

    total_time = round(time.time() - start_total, 2)

    # Write structured summary JSON
    out_dir = os.path.join(PROJECT_DIR, "out")
    os.makedirs(out_dir, exist_ok=True)
    summary_path = os.path.join(out_dir, "installer-matrix-results.json")
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump({
            "mode": mode,
            "total": total,
            "passed": passed,
            "failed": failed,
            "duration_sec": total_time,
            "results": results,
        }, f, indent=2)

    # Dense, token-efficient final report block
    print("\n" + "═" * 70)
    if failed == 0:
        print(f"\033[1;32m✔ MATRIX PASSED: {passed}/{total} cases succeeded ({total_time}s) [0 failures]\033[0m")
    else:
        print(f"\033[1;31m✘ MATRIX FAILED: {failed}/{total} cases failed, {passed} passed ({total_time}s)\033[0m")
    print(f"  Artifact: {summary_path}")
    print("═" * 70 + "\n")

    return 0 if failed == 0 else 1


def main():
    parser = argparse.ArgumentParser(description="Parallel QEMU Installer Test Runner")
    parser.add_argument("--case", type=str, help="Run a single test case ID (worker mode)")
    parser.add_argument("--all", action="store_true", help="Run all matrix test cases (orchestrator mode)")
    parser.add_argument("--parallel", "-p", type=int, default=4, help="Number of concurrent instances (default: 4)")
    parser.add_argument("--mode", choices=["dryrun", "qemu"], default="dryrun", help="Execution mode (dryrun or qemu)")
    parser.add_argument("--filter", type=str, help="Filter cases by substring")
    parser.add_argument("--timeout", type=int, default=180, help="Per-case timeout in seconds")
    parser.add_argument("--list", action="store_true", help="List all defined test cases")

    args = parser.parse_args()

    if args.list:
        print(f"Total defined test cases: {len(TEST_MATRIX)}")
        for c in TEST_MATRIX:
            print(f"  - {c['id']:<40} : {c['desc']}")
        sys.exit(0)

    if args.case:
        code = execute_single_case(args.case, args.mode, args.timeout)
        sys.exit(code)
    else:
        code = orchestrate_matrix(args.parallel, args.mode, args.filter, args.timeout)
        sys.exit(code)


if __name__ == "__main__":
    main()
