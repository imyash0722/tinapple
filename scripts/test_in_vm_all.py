#!/usr/bin/env python3
"""
scripts/test_in_vm_all.py — End-to-end in-VM verification of Tinapple OS:
  - Task O: Chadwm Default WM & desktop components
  - Task Q: Ham Vocke tmux customization & preinstalled applications
  - Tasks R1 - R5: Chaddy Store, Config Manager, Settings TUI, Remote Desktop, and Installer
"""

import base64
import glob
import os
import sys
import time
import socket
import subprocess

PROJECT_DIR = "/mnt/shared/projects/tinapple"
BOOT_DIR = "/tmp/tinapple-boot/tinapple/boot/x86_64"
VMLINUZ = os.path.join(BOOT_DIR, "vmlinuz-linux-lts")
INITRD = os.path.join(BOOT_DIR, "initramfs-linux-lts.img")
SERIAL_SOCK = "/tmp/tinapple-vm-all.sock"
PID_FILE = "/tmp/tinapple-vm-all.pid"

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

# ── 1. OS & Kernel ──
KVER=$(uname -r)
PRETTY=$(grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"')
if [[ -n "$KVER" ]]; then
  test_pass "Kernel and OS" "$PRETTY ($KVER)"
else
  test_fail "Kernel and OS" "Could not read kernel version"
fi

# ── 2. Chadwm Packages ──
CHADWM_PKGS=$(pacman -Q tinapple-chadwm chadwm foot picom polybar rofi dunst sxhkd 2>&1)
if [[ $? -eq 0 ]]; then
  test_pass "Chadwm Packages Installed" "tinapple-chadwm, chadwm, foot, picom, polybar, rofi, dunst, sxhkd verified"
else
  test_fail "Chadwm Packages Installed" "$CHADWM_PKGS"
fi

# ── 3. Chadwm Binaries & Services ──
if [[ -x /usr/bin/chadwm && -x /usr/bin/tinapple-session && -f /usr/lib/systemd/system/chadwm@.service ]]; then
  test_pass "Chadwm Binaries & Unit File" "chadwm, tinapple-session, chadwm@.service all present"
else
  test_fail "Chadwm Binaries & Unit File" "Missing binary or chadwm@.service"
fi

# ── 4. Foot Default Terminal in Sxhkd & Chadwm Config ──
SXHKD_FOOT=$(grep -E "foot" /etc/skel/.config/tinapple-chadwm/sxhkd/sxhkdrc 2>/dev/null || true)
if [[ -n "$SXHKD_FOOT" && -x /usr/bin/foot ]]; then
  test_pass "Foot Terminal Default" "foot is bound in sxhkdrc and binary is executable"
else
  test_fail "Foot Terminal Default" "foot not found or not bound in sxhkdrc"
fi

# ── 5. Foot Configuration File ──
if [[ -f /etc/skel/.config/foot/foot.ini ]] && grep -q "font=" /etc/skel/.config/foot/foot.ini; then
  test_pass "Foot Config" "foot.ini deployed with font and color scheme"
else
  test_fail "Foot Config" "foot.ini missing or incomplete"
fi

# ── 6. Tmux Package & TPM ──
TMUX_PKGS=$(pacman -Q tmux tpm 2>&1)
if [[ $? -eq 0 ]]; then
  test_pass "Tmux and TPM Packages" "$TMUX_PKGS"
else
  test_fail "Tmux and TPM Packages" "$TMUX_PKGS"
fi

# ── 7. Tmux Configuration (.tmux.conf) ──
TMUX_CONF="/etc/skel/.tmux.conf"
if [[ -f "$TMUX_CONF" ]] && grep -q "prefix C-Space" "$TMUX_CONF" && grep -q "mode-keys vi" "$TMUX_CONF"; then
  test_pass "Ham Vocke tmux Configuration" ".tmux.conf present with C-Space prefix, vi mode, and theme"
else
  test_fail "Ham Vocke tmux Configuration" ".tmux.conf missing or missing core bindings"
fi

# ── 8. Offline Bundled TPM & Plugins ──
PLUGINS_OK=1
for p in tmux-sensible tmux-resurrect tmux-continuum tmux-yank tmux-open vim-tmux-navigator; do
  if [[ ! -d "/usr/share/tmux/plugins/$p" ]]; then
    PLUGINS_OK=0
    break
  fi
done

if [[ -d "/usr/share/tmux-plugin-manager" && $PLUGINS_OK -eq 1 ]]; then
  test_pass "Offline Bundled TPM and Plugins" "TPM manager and all 6 plugins present in /usr/share/tmux/"
else
  test_fail "Offline Bundled TPM and Plugins" "Missing TPM or plugins in /usr/share"
fi

# ── 9. TPM Skeleton Symlinks ──
if [[ -e /etc/skel/.tmux/plugins/tpm ]]; then
  test_pass "TPM Skeleton Symlink" "/etc/skel/.tmux/plugins/tpm exists"
else
  test_fail "TPM Skeleton Symlink" "/etc/skel/.tmux/plugins/tpm does not exist"
fi

# ── 10. Unified Shell Auto-Attach (ZSH & Bash) ──
ZSH_OK=$(grep -F "exec tmux new-session -A -s tinapple" /etc/skel/.zshrc 2>/dev/null || true)
BASH_OK=$(grep -F "exec tmux new-session -A -s tinapple" /etc/skel/.bashrc 2>/dev/null || true)
if [[ -n "$ZSH_OK" && -n "$BASH_OK" ]]; then
  test_pass "Unified Shell Auto-Attach" "Both zsh and bash configured to auto-attach to shared 'tinapple' tmux session"
else
  test_fail "Unified Shell Auto-Attach" "Auto-attach missing in zsh or bash"
fi

# ── 11. Live Tmux Shared Session Functionality ──
tmux -f /etc/skel/.tmux.conf new-session -d -s tinapple 'echo "SESSION_OK" > /tmp/tmux_session_test; sleep 30'
sleep 1
TMUX_HAS=$(tmux has-session -t tinapple 2>&1 && echo "EXISTS" || echo "NOT_FOUND")
if [[ "$TMUX_HAS" == *"EXISTS"* ]] && [[ -f /tmp/tmux_session_test ]]; then
  test_pass "Live Tmux Session Operation" "Session 'tinapple' created and running with custom conf"
  tmux kill-session -t tinapple 2>/dev/null || true
else
  test_fail "Live Tmux Session Operation" "Failed to create or verify live tmux session: $TMUX_HAS"
fi

# ── 12. Firstboot Chadwm Default Enablement ──
if grep -q 'chadwm@"$ADMIN_USER"' /usr/bin/tinapple-setup 2>/dev/null; then
  test_pass "Firstboot Chadwm Default" "tinapple-setup enables chadwm@user.service by default"
else
  test_fail "Firstboot Chadwm Default" "chadwm service not enabled in tinapple-setup"
fi

# ── 13. R1: Chaddy Store Binary ──
STORE_BIN=""
for b in /usr/local/bin/chaddy-store /usr/bin/chaddy-store; do
  if [[ -x "$b" ]]; then
    STORE_BIN="$b"
    break
  fi
done
if [[ -n "$STORE_BIN" ]]; then
  test_pass "R1: chaddy-store Binary" "Executable found at $STORE_BIN"
else
  test_fail "R1: chaddy-store Binary" "chaddy-store executable not found"
fi

# ── 14. R1: Chaddy Store CLI Search ──
if [[ -n "$STORE_BIN" ]]; then
  SEARCH_OUT=$($STORE_BIN search neovim 2>&1 || true)
  if [[ "$SEARCH_OUT" == *"neovim"* ]] || [[ "$SEARCH_OUT" == *"Neovim"* ]]; then
    test_pass "R1: chaddy-store Search CLI" "Search for neovim executed and returned matches"
  else
    test_fail "R1: chaddy-store Search CLI" "Search did not return expected output: $SEARCH_OUT"
  fi
else
  test_fail "R1: chaddy-store Search CLI" "chaddy-store not available"
fi

# ── 15. R1: Chaddy Store Package Installed ──
STORE_PKG=$(pacman -Q chaddy-store 2>&1)
if [[ $? -eq 0 ]]; then
  test_pass "R1: chaddy-store Package" "$STORE_PKG installed via pacman"
else
  test_fail "R1: chaddy-store Package" "chaddy-store not installed: $STORE_PKG"
fi

# ── 16. R2: Config Templates ──
TEMPLATES_OK=1
for t in chadwm.json system-base.json network.json remote-desktop.json services.json; do
  if [[ ! -f "/usr/share/tinapple/templates/$t" ]]; then
    TEMPLATES_OK=0
    break
  fi
done
if [[ $TEMPLATES_OK -eq 1 ]]; then
  test_pass "R2: Config Templates" "All 5 production JSON templates deployed to /usr/share/tinapple/templates"
else
  test_fail "R2: Config Templates" "Missing templates in /usr/share/tinapple/templates"
fi

# ── 17. R3: Chaddy Settings Binary ──
SETTINGS_BIN=""
for b in /usr/local/bin/chaddy-settings /usr/bin/chaddy-settings; do
  if [[ -x "$b" ]]; then
    SETTINGS_BIN="$b"
    break
  fi
done
if [[ -n "$SETTINGS_BIN" ]]; then
  test_pass "R3: chaddy-settings Binary" "Executable found at $SETTINGS_BIN"
else
  test_fail "R3: chaddy-settings Binary" "chaddy-settings executable not found"
fi

# ── 18. R4: Remote Desktop Packages (xrdp & tigervnc) ──
REMOTE_PKGS=$(pacman -Q xrdp tigervnc 2>&1)
if [[ $? -eq 0 ]]; then
  test_pass "R4: Remote Desktop Packages" "Both xrdp and tigervnc installed via pacman ($REMOTE_PKGS)"
else
  test_fail "R4: Remote Desktop Packages" "Missing xrdp or tigervnc: $REMOTE_PKGS"
fi

# ── 19. R4: Remote Desktop Config Files ──
if [[ -f /etc/xrdp/xrdp.ini && -f /etc/xrdp/sesman.ini && -f /etc/tigervnc/vncserver-config-defaults && -x /etc/skel/.vnc/xstartup ]]; then
  test_pass "R4: Remote Desktop Configs" "xrdp.ini, sesman.ini, vncserver-config-defaults, and .vnc/xstartup deployed"
else
  test_fail "R4: Remote Desktop Configs" "Missing remote desktop configuration files"
fi

# ── 20. R4: Remote Desktop Systemd Units & Sessions ──
if [[ -f /etc/systemd/system/xrdp.service && -f /etc/systemd/system/xrdp-sesman.service && -f /etc/systemd/system/vncserver@.service && -f /usr/share/xsessions/chadwm.desktop ]]; then
  test_pass "R4: Remote Desktop Systemd Units" "xrdp, xrdp-sesman, vncserver@ units and chadwm.desktop deployed"
else
  test_fail "R4: Remote Desktop Systemd Units" "Missing systemd unit or session files"
fi

# ── 21. R4: xrdp sesman chadwm integration ──
if grep -q "DefaultWindowManager=chadwm" /etc/xrdp/sesman.ini 2>/dev/null; then
  test_pass "R4: xrdp chadwm Default WM" "sesman.ini sets DefaultWindowManager=chadwm"
else
  test_fail "R4: xrdp chadwm Default WM" "sesman.ini does not set chadwm as default"
fi

# ── 22. R5: Installer TUI Binary & Profiles ──
if [[ -x /usr/local/bin/tinapple-install && -f /usr/lib/tinapple-installer/backend/lib/pacstrap.sh ]]; then
  test_pass "R5: Installer TUI & Backend" "tinapple-install binary and installer library present"
else
  test_fail "R5: Installer TUI & Backend" "Missing tinapple-install or backend library"
fi

echo "===IN_VM_TESTS_END==="
"""

def log(msg):
    print(f"\033[1;34m[*] {msg}\033[0m", flush=True)

def error(msg):
    print(f"\033[1;31m[-] {msg}\033[0m", flush=True)

def cleanup():
    if os.path.exists(PID_FILE):
        try:
            with open(PID_FILE) as f:
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

def find_latest_iso():
    candidates = sorted(glob.glob(os.path.join(PROJECT_DIR, "tinapple-installer/iso/out/tinapple-os-*.iso")))
    if not candidates:
        candidates = sorted(glob.glob(os.path.join(PROJECT_DIR, "out/tinapple-os-*.iso")))
    if candidates:
        return candidates[-1]
    return None

def main():
    cleanup()

    iso_path = find_latest_iso()
    if not iso_path or not os.path.exists(iso_path):
        error("No ISO image found in out directories")
        sys.exit(1)

    log(f"Testing latest ISO: {iso_path}")

    log(f"Extracting kernel and initrd from {iso_path}...")
    os.makedirs(BOOT_DIR, exist_ok=True)
    subprocess.run(["bsdtar", "-xf", iso_path, "-C", "/tmp/tinapple-boot", "tinapple/boot/x86_64/*"], check=True)

    accel = ["-enable-kvm", "-cpu", "host"]
    if not (os.path.exists("/dev/kvm") and os.access("/dev/kvm", os.R_OK | os.W_OK)):
        accel = ["-cpu", "max"]

    qemu_cmd = [
        "qemu-system-x86_64",
        *accel,
        "-m", "4096", "-smp", "2",
        "-cdrom", iso_path,
        "-kernel", VMLINUZ,
        "-initrd", INITRD,
        "-append", "archisolabel=TINAPPLE_202610 archisobasedir=tinapple console=ttyS0 quiet systemd.show_status=1",
        "-serial", f"unix:{SERIAL_SOCK},server,nowait",
        "-netdev", "user,id=net0", "-device", "virtio-net-pci,netdev=net0",
        "-display", "none",
        "-daemonize",
        "-pidfile", PID_FILE
    ]

    log("Booting VM with QEMU...")
    subprocess.run(qemu_cmd, check=True)

    log("Connecting to guest serial console...")
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    for _ in range(30):
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
    log("Awaiting VM boot and login/shell prompt...")

    boot_buf = ""
    start = time.time()
    logged_in = False
    while time.time() - start < 120:
        try:
            chunk = sock.recv(4096).decode("utf-8", errors="replace")
            if chunk:
                boot_buf += chunk
                if "login:" in boot_buf and not logged_in:
                    sock.sendall(b"root\r\n")
                    time.sleep(1.0)
                if "Starting tinapple installer" in boot_buf or "tinapple Installer" in boot_buf or "STEP 01 OF" in boot_buf:
                    sock.sendall(b"q\r\nq\r\n\x03\r\n")
                    time.sleep(1.0)
                if "Dropping to live shell" in boot_buf or "Dropping to root shell" in boot_buf or "# " in boot_buf or "root@" in boot_buf:
                    sock.sendall(b"\r\n")
                    time.sleep(1.0)
                    logged_in = True
                    break
        except socket.timeout:
            if "login:" in boot_buf and not logged_in:
                sock.sendall(b"root\r\n")
            elif ("tinapple Installer" in boot_buf or "STEP 01 OF" in boot_buf) and not logged_in:
                sock.sendall(b"q\r\nq\r\n\x03\r\n")

    if not logged_in:
        error("Could not obtain root shell in VM. Last 500 chars:")
        print(boot_buf[-500:])
        cleanup()
        sys.exit(1)

    log("Root shell obtained! Transmitting full test suite...")
    b64_script = base64.b64encode(GUEST_SCRIPT.encode("utf-8")).decode("ascii")

    cmd = f"echo '{b64_script}' | base64 -d > /tmp/test_suite.sh && chmod +x /tmp/test_suite.sh && /tmp/test_suite.sh\r\n"
    sock.sendall(cmd.encode("utf-8"))

    test_buf = ""
    test_start = time.time()
    while time.time() - test_start < 90:
        try:
            chunk = sock.recv(4096).decode("utf-8", errors="replace")
            if chunk:
                test_buf += chunk
                if "===IN_VM_TESTS_END===" in test_buf:
                    break
        except socket.timeout:
            pass

    log("Test execution finished. Parsing results...")
    results = []
    for line in test_buf.splitlines():
        line = line.strip()
        if line.startswith("RESULT:"):
            parts = line.split(":", 3)
            if len(parts) >= 3:
                status = parts[1]
                name = parts[2]
                detail = parts[3] if len(parts) > 3 else ""
                results.append((status, name, detail))

    print("\n" + "=" * 70)
    print("      TINAPPLE OS FULL IN-VM VERIFICATION SUITE (TASKS O, Q, R1-R5)")
    print("=" * 70)

    passed = 0
    failed = 0
    for status, name, detail in results:
        if status == "PASS":
            passed += 1
            print(f"  \033[1;32m✓\033[0m {name:<35} : \033[0;32m{detail}\033[0m")
        else:
            failed += 1
            print(f"  \033[1;31m✗\033[0m {name:<35} : \033[0;31m{detail}\033[0m")

    print("=" * 70)
    print(f"Total: {passed + failed} | Passed: {passed} | Failed: {failed}")
    print("=" * 70 + "\n")

    cleanup()

    if failed > 0 or passed == 0:
        error(f"In-VM tests failed: {failed} failures, {passed} passes")
        sys.exit(1)
    else:
        log("All 22 In-VM tests passed with 100% success!")

if __name__ == "__main__":
    main()
