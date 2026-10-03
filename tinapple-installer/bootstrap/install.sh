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
ok()      { echo -e "  ${GREEN}[✔]${NC} $*"; }
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
    elif [[ -f "$hw_file" ]]; then
        ok "Hardware configuration found"
        return 0
    else
        # Basic detection
        mkdir -p /etc/tinapple
        if [[ -d /sys/class/power_supply/BAT0 ]]; then
            echo '{"is_laptop": true, "has_battery": true}' > "$hw_file"
        else
            echo '{"is_laptop": false, "has_battery": false}' > "$hw_file"
        fi
        ok "Basic hardware configuration generated"
    fi
}

# ─── Download & Verify Installer Binary ─────────────────────────────────
download_installer() {
    # Check if installer binary is provided via environment or locally available
    if [[ -n "${TINAPPLE_INSTALL_BIN:-}" && -x "${TINAPPLE_INSTALL_BIN}" ]]; then
        echo "${TINAPPLE_INSTALL_BIN}"
        return 0
    fi

    if [[ -x "/usr/local/bin/tinapple-install" ]]; then
        echo "/usr/local/bin/tinapple-install"
        return 0
    fi

    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [[ -x "${script_dir}/../bin/tinapple-install" ]]; then
        echo "${script_dir}/../bin/tinapple-install"
        return 0
    elif [[ -x "${script_dir}/../bin/tinapple-tui" ]]; then
        echo "${script_dir}/../bin/tinapple-tui"
        return 0
    fi

    local work_dir
    work_dir=$(mktemp -d)
    trap 'rm -rf "$work_dir"' EXIT

    say "Downloading tinapple-install binary..."
    if curl -fsSL --retry 3 -o "$work_dir/tinapple-install" "$BINARY_URL"; then
        say "Verifying checksum..."
        if curl -fsSL --retry 3 -o "$work_dir/tinapple-install.sha256" "${BINARY_URL}.sha256"; then
            (cd "$work_dir" && sha256sum --check --quiet tinapple-install.sha256) || \
                die "Checksum verification failed"
        else
            warn "Checksum file not available, skipping verification"
        fi
        chmod +x "$work_dir/tinapple-install"
        echo "$work_dir/tinapple-install"
    else
        die "Failed to download installer binary"
    fi
}

# ─── Build Manifest from Args ───────────────────────────────────────────
build_manifest() {
    local manifest="/etc/tinapple/manifest.yaml"
    mkdir -p /etc/tinapple

    local profiles="base"
    [[ -n "$PROFILE" ]] && profiles="$PROFILE"

    cat > "$manifest" <<EOF
version: 1
hostname: $(hostname 2>/dev/null || cat /etc/hostname 2>/dev/null || uname -n)
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
}

# ─── Post-Install ───────────────────────────────────────────────────────
post_install() {
    say "Regenerating configs..."
    if command -v tinapple-config-generator >/dev/null 2>&1; then
        tinapple-config-generator generate /etc/tinapple/manifest.yaml /etc/tinapple/generated || true
    fi

    say "Installing Chaddy Store & Settings..."
    pacman -S --noconfirm chaddy-store chaddy-settings 2>/dev/null || warn "Failed to install chaddy-store/settings"

    say "Enabling core services..."
    systemctl enable tinapple-nginx tinapple-hw-detect tinapple-battery-daemon \
        tinapple-thermal-daemon tinapple-power-profile-apply tinapple-firstboot >/dev/null 2>&1 || true

    say "Running first-boot setup..."
    systemctl start tinapple-firstboot.service >/dev/null 2>&1 || true

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
