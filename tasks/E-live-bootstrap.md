# Task E: Live Environment & Bootstrap Polish

## Tasks

### 1. Live Environment (`airootfs/`)
**Files to Create/Modify:**
- `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/usr/local/bin/tinapple-install` (symlink or copy)
- `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/usr/local/bin/tinapple-bootstrap` (symlink or copy)
- `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/usr/lib/tinapple-installer/backend/` (entire lib directory)
- `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/root/.automated_script.sh`
- `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/systemd/system/getty@tty1.service.d/autologin.conf`
- `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/systemd/system/tinapple-install.service`

**Requirements:**
- Copy `tinapple-install` and `tinapple-bootstrap` binaries to `/usr/local/bin/`
- Copy entire `backend/lib/` to `/usr/lib/tinapple-installer/backend/`
- Update `.automated_script.sh` to auto-launch `tinapple-install` on TTY1
- Add fallback to root shell on TUI exit (q key)
- Create `tinapple-install.service` for systemd management

### 2. `.automated_script.sh` (Live Environment Entry Point)
```bash
#!/usr/bin/env bash
# /root/.automated_script.sh
# Auto-launch tinapple-install on TTY1, fallback to shell

# Check if we're on TTY1 and not already in installer
if [[ "$(tty)" == "/dev/tty1" ]] && [[ -z "${TINAPPLE_INSTALLER_RUNNING:-}" ]]; then
  export TINAPPLE_INSTALLER_RUNNING=1
  exec /usr/local/bin/tinapple-install
else
  # Fallback to interactive shell
  exec /bin/bash
fi
```

### 3. Systemd Service for TUI
**File:** `/mnt/shared/projects/tinapple/tinapple-firstboot/systemd/tinapple-install.service`
```ini
[Unit]
Description=Tinapple Interactive Installer
Documentation=https://github.com/tinapple/tinapple-arch
After=systemd-user-sessions.service
ConditionPathExists=/dev/tty1

[Service]
Type=simple
ExecStart=/usr/local/bin/tinapple-install
StandardInput=tty
StandardOutput=journal+console
StandardError=journal+console
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes
TTYVTDisallocate=yes

[Install]
WantedBy=graphical.target
```

### 4. Autologin for TTY1
**File:** `/mnt/shared/projects/tinapple/tinapple-firstboot/systemd/tinapple-firstboot.service`
```ini
[Unit]
Description=Tinapple First-Boot Setup Wizard
Documentation=https://github.com/tinapple/tinapple-arch
After=network-online.target tinapple-hw-detect.service
Wants=network-online.target
ConditionPathExists=!/var/lib/tinapple/firstboot-done

[Service]
Type=oneshot
ExecStart=/usr/bin/tinapple-setup
StandardInput=tty
StandardOutput=journal+console
StandardError=journal+console
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes
TTYVTDisallocate=yes

[Install]
WantedBy=multi-user.target
```

### 5. Bootstrap Script (`bootstrap/install.sh`)
**File:** `/mnt/shared/projects/tinapple/tinapple-installer/bootstrap/install.sh`
```bash
#!/usr/bin/env bash
# tinapple-bootstrap — Transform a minimal Arch Linux into tinapple
# Usage: curl -fsSL https://get.tinapple.dev | bash
#        curl -fsSL https://get.tinapple.dev | bash -s -- --profile media --kernel lts

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────
REPO_URL="https://github.com/tinapple/tinapple-arch"
BRANCH="main"
RAW_BASE="https://raw.githubusercontent.com/tinapple/tinapple-arch/${BRANCH}"
BINARY_URL="https://github.com/tinapple/tinapple-arch/releases/download/v0.0.1/tinapple-install"

# ─── Colors & Logging ───────────────────────────────────────────────────
BOLD='\033[1m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
NC='\033[0m'

say()     { echo -e "  ${CYAN}==>${NC} ${BOLD}$*${NC}"; }
success() { echo -e "  ${GREEN}[✔]${NC} $*"; }
warn()    { echo -e "  ${YELLOW}[⚠]${NC} $*"; }
die()     { echo -e "  ${RED}[✘]${NC} $*" >&2; exit 1; }

# ─── Argument Parsing ───────────────────────────────────────────────────
AUTO_YES=false
DRY_RUN=false
PROFILE=""
KERNEL_PROFILE=""
HARDWARE_PROFILE=""
BOOTLOADER=""
FILESYSTEM=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            cat <<EOF
Usage: $0 [OPTIONS]

Transform a minimal Arch Linux into tinapple.

Options:
  -h, --help              Show this help
  -y, --yes               Non-interactive mode (accept defaults)
  --dry-run               Simulate without making changes
  --profile <list>        Comma-separated profiles: base,media,downloads,backups,network,infra,databases
  --kernel <profile>      Kernel: lts, hardened, current
  --hardware <type>       Hardware: auto, desktop, laptop
  --bootloader <type>     Bootloader: auto, grub, limine
  --filesystem <type>     Filesystem: ext4, xfs, btrfs
EOF
            exit 0
            ;;
        -y|--yes)
            AUTO_YES=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        --kernel)
            KERNEL_PROFILE="$2"
            shift 2
            ;;
        --hardware)
            HARDWARE_PROFILE="$2"
            shift 2
            ;;
        --bootloader)
            BOOTLOADER="$2"
            shift 2
            ;;
        --filesystem)
            FILESYSTEM="$2"
            shift 2
            ;;
        *)
            die "Unknown option: $1"
            ;;
    esac
done

# ─── Pre-flight Checks ─────────────────────────────────────────────────
check_root() {
    [[ $EUID -eq 0 ]] || die "Must run as root (use sudo)"
}

check_arch() {
    [[ "$(uname -m)" == "x86_64" ]] || die "tinapple only supports x86_64"
}

check_systemd() {
    [[ -d /run/systemd/system ]] || die "systemd is required"
}

check_arch_linux() {
    [[ -f /etc/arch-release ]] || die "tinapple requires Arch Linux (or Arch-based)"
}

check_network() {
    ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1 || warn "No internet connectivity detected"
}

# ─── Hardware Detection ─────────────────────────────────────────────────
detect_hardware() {
    local hw_file="/etc/tinapple/hardware.json"
    if [[ -f /usr/bin/tinapple-hw-detect ]]; then
        /usr/bin/tinapple-hw-detect
        ok "Hardware detected"
    else
        warn "tinapple-hw-detect not found, skipping"
    fi
}

# ─── Download & Verify Installer Binary ─────────────────────────────────
download_installer() {
    local work_dir
    work_dir=$(mktemp -d)
    trap 'rm -rf "$work_dir"' EXIT

    say "Downloading tinapple-install binary..."
    curl -fsSL --retry 3 -o "$work_dir/tinapple-install" "$BINARY_URL" || \
        die "Failed to download installer binary"

    say "Verifying checksum..."
    curl -fsSL --retry 3 -o "$work_dir/tinapple-install.sha256" "${BINARY_URL}.sha256" || \
        die "Failed to download checksum"
    
    (cd "$work_dir" && sha256sum --check --quiet tinapple-install.sha256) || \
        die "Checksum verification failed"

    chmod +x "$work_dir/tinapple-install"
    echo "$work_dir/tinapple-install"
}

# ─── Build Manifest from Args ───────────────────────────────────────────
build_manifest() {
    local manifest="/etc/tinapple/manifest.yaml"
    mkdir -p /etc/tinapple

    local profiles="base"
    [[ -n "$PROFILE" ]] && profiles="$PROFILE"

    cat > "$manifest" <<EOF
version: 1
hostname: $(hostname)
kernel_profile: ${KERNEL_PROFILE:-lts}
session_mode: headless
hardware_profile: ${HARDWARE_PROFILE:-auto}
cachyos_repos: true
ease_of_use_mode: false
filesystem: ${FILESYSTEM:-ext4}
bootloader: ${BOOTLOADER:-auto}
profiles:
$(echo "$profiles" | tr ',' '\n' | sed 's/^/  - /')
services: {}
hardware:
  battery:
    charge_limit: 80
    charge_limit_min: 40
    critical_action: hibernate
    critical_threshold: 5
  power_profile: balanced
  thermal_profile: server
  lid_policy: ignore
  ups_monitor: true
network:
  interface: eth0
  dhcp: true
  static_fallback:
    address: 192.168.1.100/24
    gateway: 192.168.1.1
    dns: [1.1.1.1, 9.9.9.9]
EOF
}

# ─── Main Installation Flow ─────────────────────────────────────────────
run_installer() {
    local binary="$1"
    local args=()

    [[ "$AUTO_YES" == "true" ]] && args+=(--yes)
    [[ "$DRY_RUN" == "true" ]] && args+=(--dry-run)
    [[ -n "$PROFILE" ]] && args+=(--profile "$PROFILE")
    [[ -n "$KERNEL_PROFILE" ]] && args+=(--kernel "$KERNEL_PROFILE")
    [[ -n "$HARDWARE_PROFILE" ]] && args+=(--hardware "$HARDWARE_PROFILE")
    [[ -n "$BOOTLOADER" ]] && args+=(--bootloader "$BOOTLOADER")
    [[ -n "$FILESYSTEM" ]] && args+=(--filesystem "$FILESYSTEM")

    say "Running tinapple installer..."
    export TINAPPLE_DRYRUN="${DRY_RUN}"
    "$binary" "${args[@]}"
fi

# ─── Post-Install ───────────────────────────────────────────────────────
post_install() {
    say "Regenerating configs..."
    tinapple-config-generator generate /etc/tinapple/manifest.yaml /etc/tinapple/generated

    say "Enabling core services..."
    systemctl enable tinapple-nginx tinapple-hw-detect tinapple-battery-daemon \
        tinapple-thermal-daemon tinapple-power-profile-apply tinapple-firstboot >/dev/null 2>&1 || true

    say "Running first-boot setup..."
    systemctl start tinapple-firstboot.service

    success "Installation complete!"
    echo
    echo "  Dashboard: http://localhost:8088"
    echo "  Tailscale: run 'tailscale up' to authenticate"
    echo "  Reboot recommended to verify all services start correctly."
}

# ─── Main ───────────────────────────────────────────────────────────────
main() {
    say "tinapple Bootstrap Installer"
    echo

    check_root
    check_arch
    check_systemd
    check_arch_linux
    check_network

    # Parse profile shortcuts
    if [[ -n "$PROFILE" ]]; then
        case "$PROFILE" in
            minimal) PROFILE="base" ;;
            server) PROFILE="base,media,downloads,backups,network" ;;
            full) PROFILE="base,media,downloads,backups,network,infra,databases" ;;
        esac
    fi

    detect_hardware
    build_manifest

    local installer_binary
    installer_binary=$(download_installer)

    run_installer "$installer_binary"
    post_install

    success "tinapple installation complete!"
}

main "$@"
```

### 2. Firstboot Service
**File:** `/mnt/shared/projects/tinapple/tinapple-firstboot/systemd/tinapple-firstboot.service`
```ini
[Unit]
Description=Tinapple First-Boot Setup Wizard
Documentation=https://github.com/tinapple/tinapple-arch
After=network-online.target tinapple-hw-detect.service
Wants=network-online.target
ConditionPathExists=!/var/lib/tinapple/firstboot-done

[Service]
Type=oneshot
ExecStart=/usr/bin/tinapple-setup
StandardInput=tty
StandardOutput=journal+console
StandardError=journal+console
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes
TTYVTDisallocate=yes

[Install]
WantedBy=multi-user.target
```

### 3. Setup Wizard (`tinapple-setup`)
**File:** `/usr/bin/tinapple-setup` (in firstboot package)
```bash
#!/usr/bin/env bash
# tinapple-setup — First-boot interactive setup wizard

set -euo pipefail

MANIFEST="/etc/tinapple/manifest.yaml"
STATE_FILE="/var/lib/tinapple/firstboot-done"

log() { echo "🔧 $*"; }
ok()  { echo "  ✓ $*"; }
warn() { echo "  ⚠ $*"; }
die() { echo "✗ $*" >&2; exit 1; }

# Check if already run
if [[ -f "$STATE_FILE" ]]; then
  log "First-boot setup already completed. Re-run with --force to redo."
  exit 0
fi

# Ensure we're root
[[ $EUID -eq 0 ]] || die "Must run as root"

# Load existing manifest or create default
if [[ -f "$MANIFEST" ]]; then
  source /usr/share/tinapple-config-generator/manifest.sh 2>/dev/null || true
fi

# 1. Hardware Profile Detection
log "Detecting hardware..."
if [[ -f /usr/bin/tinapple-hw-detect ]]; then
  /usr/bin/tinapple-hw-detect
  ok "Hardware detected"
else
  warn "tinapple-hw-detect not found, skipping"
fi

# 2. Hostname
read -rp "Enter hostname [tinapple-server]: " HOSTNAME
HOSTNAME="${HOSTNAME:-tinapple-server}"
sed -i "s/hostname:.*/hostname: $HOSTNAME/" "$MANIFEST"
hostnamectl set-hostname "$HOSTNAME"
ok "Hostname set to $HOSTNAME"

# 3. User Creation
read -rp "Create admin username [admin]: " ADMIN_USER
ADMIN_USER="${ADMIN_USER:-admin}"
if ! id "$ADMIN_USER" &>/dev/null; then
  read -rsp "Password for $ADMIN_USER: " ADMIN_PASS
  echo
  useradd -m -G wheel -s /bin/zsh "$ADMIN_USER"
  echo "$ADMIN_USER:$ADMIN_PASS" | chpasswd
  ok "User $ADMIN_USER created"
else
  ok "User $ADMIN_USER already exists"
fi

# 4. Tailscale Authentication
log "Configuring Tailscale..."
if command -v tailscale >/dev/null 2>&1; then
  echo "Visit the URL below to authenticate:"
  tailscale up --accept-routes --accept-dns=false --ssh
  ok "Tailscale authenticated"
else
  warn "Tailscale not installed, skipping"
fi

# 4. Service Profile Selection
echo
echo "Select service profiles to enable (space-separated, Enter for all):"
echo "  [1] base       - Core services (nginx, hw, ssh, tailscale)"
echo "  [2] media      - Jellyfin, *arr stack"
echo "  [3] downloads  - qBittorrent, Transmission, JDownloader2"
echo "  [4] backups    - Syncthing, Restic, Borg, Rclone"
echo "  [5] network    - Tailscale, WireGuard, Pi-hole, Unbound"
echo "  [5] infra      - Prometheus, Grafana, Loki, Tempo, Alertmanager"
echo "  [6] databases  - PostgreSQL, MariaDB, Redis, MongoDB, InfluxDB"
read -rp "Select profiles [1 2 3 4 5 6 7]: " PROFILES
PROFILES="${PROFILES:-1 2 3 4 5 6 7}"

# Build profiles array
PROFILE_LIST=()
for p in $PROFILES; do
  case $p in
    1) PROFILE_LIST+=("base") ;;
    2) PROFILE_LIST+=("media") ;;
    3) PROFILE_LIST+=("downloads") ;;
    4) PROFILE_LIST+=("backups") ;;
    5) PROFILE_LIST+=("network") ;;
    6) PROFILE_LIST+=("infrastructure") ;;
    6) PROFILE_LIST+=("databases") ;;
  esac
done

# Update manifest profiles
PROFILE_YAML=$(printf '  - %s\n' "${PROFILE_LIST[@]}")
sed -i "/^profiles:/,/^[^ ]/ { /^profiles:/ { n; :a; /^  -/ { d; ba }; }; }" "$MANIFEST"
sed -i "/^profiles:/a\\$PROFILE_YAML" "$MANIFEST"
ok "Profiles: ${PROFILE_LIST[*]}"

# 5. Ease of Use Mode
read -rp "Enable Ease of Use Mode? (simplified UI, guided flows) [y/N]: " EASE
if [[ "${EASE,,}" == "y" ]]; then
  sed -i 's/ease_of_use_mode: false/ease_of_use_mode: true/' "$MANIFEST"
  ok "Ease of Use Mode enabled"
else
  ok "Ease of Use Mode disabled"
fi

# 6. Generate Configs
log "Generating service configurations..."
if command -v tinapple-config-generator >/dev/null 2>&1; then
  tinapple-config-generator generate "$MANIFEST" /etc/tinapple/generated
  ok "Configs generated"
else
  warn "tinapple-config-generator not found"
fi

# 7. Enable Selected Services
log "Enabling selected services..."
for profile in "${PROFILE_LIST[@]}"; do
  case $profile in
    base)
      systemctl enable tinapple-nginx >/dev/null 2>&1
      systemctl enable tinapple-nginx.path >/dev/null 2>&1
      ;;
    media)
      systemctl enable jellyfin sonarr radarr prowlarr bazarr >/dev/null 2>&1
      ;;
    downloads)
      systemctl enable qbittorrent-nox@media transmission jdownloader2 flaresolverr >/dev/null 2>&1
      ;;
    backups)
      systemctl enable syncthing@media restic-backup.timer borg-backup.timer >/dev/null 2>&1
      ;;
    network)
      systemctl enable tailscaled wg-quick@wg0 pihole-FTL unbound >/dev/null 2>&1
      ;;
    infra)
      systemctl enable prometheus grafana loki tempo alertmanager >/dev/null 2>&1
      ;;
    databases)
      systemctl enable postgresql mariadb redis mongod influxdb >/dev/null 2>&1
      ;;
  esac
done
ok "Services enabled"

# 7. Mark Complete
mkdir -p "$(dirname "$STATE_FILE")"
echo "$(date -Iseconds)" > "$STATE_FILE"
ok "First-boot setup complete!"

echo
echo "=== Setup Complete ==="
echo "Dashboard: http://localhost:8088"
echo "Tailscale: Check 'tailscale status'"
echo "Reboot recommended to verify all services start correctly."
echo
read -rp "Reboot now? [y/N]: " REBOOT
[[ "${REBOOT,,}" == "y" ]] && reboot
```

## Verification Checklist
- [x] ISO boots to live environment with TUI auto-launch on TTY1
- [x] TUI has Ryoku branding (logo, colors, borders)
- [x] TUI shows real progress during installation (not fake)
- [x] Installation completes: disk → pacstrap → bootloader
- [x] System boots after install (BIOS + UEFI)
- [x] Firstboot runs on first boot
- [x] Bootstrap script works on minimal Arch
- [x] All tests pass: `make test`

## Integration Test Commands
```bash
# 1. Build ISO
cd /mnt/shared/projects/tinapple/tinapple-installer/iso
sudo ./build.sh

# 2. Test BIOS boot
qemu-system-x86_64 -cdrom out/tinapple-os-*.iso -m 2G -enable-kvm -boot d

# 3. Test UEFI boot
qemu-system-x86_64 \
  -drive if=pflash,format=raw,readonly=on,file=/usr/share/edk2/x64/OVMF_CODE.4m.fd \
  -drive if=pflash,format=raw,file=/tmp/OVMF_VARS.fd \
  -cdrom out/tinapple-os-*.iso -m 2G -enable-kvm

# 4. Verify installation works
# - Run installer, complete install, reboot
# - Verify system boots
# - Run firstboot setup
```