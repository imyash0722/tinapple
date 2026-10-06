#!/usr/bin/env bash
# scripts/populate_offline_iso_packages.sh — Stage and prepare offline core packages for the ISO build
#
# Collects core Arch & Tinapple packages into an offline repository (/var/tmp/tinapple-offline-repo)
# and indexes them with repo-add. This offline repository is embedded directly into the ISO
# by iso/build.sh so installs run 100% offline without downloading 1.7GB over Wi-Fi.

set -euo pipefail

STAGE_DIR="/var/tmp/tinapple-offline-repo/x86_64"
HOST_CACHE="/var/cache/pacman/pkg"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AIROOTFS_REPO="${PROJECT_DIR}/tinapple-installer/iso/airootfs/opt/tinapple-repo/x86_64"

mkdir -p "$STAGE_DIR"

echo "==> Staging offline packages for Tinapple ISO..."
echo "  Staging Directory:   $STAGE_DIR"
echo "  Host Pacman Cache:   $HOST_CACHE"

# 1. Copy local custom tinapple packages into staging
if [[ -d "$AIROOTFS_REPO" ]]; then
    echo "  Copying custom tinapple packages into staging..."
    cp -f "$AIROOTFS_REPO"/*.pkg.tar.* "$STAGE_DIR/" 2>/dev/null || true
fi

# 2. Core package list required for base offline installation
CORE_PACKAGES=(
    base
    base-devel
    linux-lts
    linux-lts-headers
    linux-firmware
    systemd
    systemd-sysvcompat
    networkmanager
    sudo
    vim
    nano
    zsh
    git
    curl
    wget
    openssh
    tmux
    htop
    pciutils
    usbutils
    efibootmgr
    dosfstools
    e2fsprogs
    btrfs-progs
    xfsprogs
    grub
    limine
    mkinitcpio
    iptables
    pipewire
    pipewire-pulse
    pipewire-alsa
    pipewire-jack
    wireplumber
    xclip
    xsel
    foot
    picom
    polybar
    rofi
    dunst
    sxhkd
    xorg-xinit
    xorg-xrandr
    xorg-xsetroot
    xorg-xset
    xorg-xprop
    xorg-xwininfo
    xorg-xdpyinfo
    xorg-xev
    xorg-xlsfonts
    xorg-xlsclients
    xorg-xvinfo
    xorg-xrdb
    tigervnc
    xrdp
    jellyfin-server
    jellyfin-web
    qbittorrent-nox
    transmission-cli
    restic
    borg
    rclone
    syncthing
    tailscale
    wireguard-tools
    unbound
    prometheus
    grafana
    loki
    tempo
    alertmanager
    prometheus-node-exporter
    postgresql
    mariadb
    valkey
    influxdb
)

echo "==> Gathering core packages from host pacman cache..."
COPIED=0
for pkg in "${CORE_PACKAGES[@]}"; do
    MATCH=$(ls -t "${HOST_CACHE}/${pkg}"-[0-9]*.pkg.tar.zst 2>/dev/null | head -n1 || true)
    if [[ -n "$MATCH" && -f "$MATCH" ]]; then
        BN=$(basename "$MATCH")
        if [[ ! -f "${STAGE_DIR}/${BN}" ]]; then
            cp -f "$MATCH" "${STAGE_DIR}/"
            COPIED=$((COPIED + 1))
        fi
        [[ -f "${MATCH}.sig" ]] && cp -f "${MATCH}.sig" "${STAGE_DIR}/" 2>/dev/null || true
    fi
done
echo "  Added $COPIED core packages from cache."

# 3. Add dependencies
if command -v pactree >/dev/null 2>&1; then
    echo "  Resolving dependencies from host cache..."
    DEP_PKGS=$(pactree -u -d 2 "${CORE_PACKAGES[@]}" 2>/dev/null | sort -u || true)
    DEP_COPIED=0
    for dep in $DEP_PKGS; do
        MATCH=$(ls -t "${HOST_CACHE}/${dep}"-[0-9]*.pkg.tar.zst 2>/dev/null | head -n1 || true)
        if [[ -n "$MATCH" && -f "$MATCH" ]]; then
            BN=$(basename "$MATCH")
            if [[ ! -f "${STAGE_DIR}/${BN}" ]]; then
                cp -f "$MATCH" "${STAGE_DIR}/"
                DEP_COPIED=$((DEP_COPIED + 1))
            fi
            [[ -f "${MATCH}.sig" ]] && cp -f "${MATCH}.sig" "${STAGE_DIR}/" 2>/dev/null || true
        fi
    done
    echo "  Added $DEP_COPIED dependency packages from cache."
fi

# 4. Generate repository index
echo "==> Indexing repository with repo-add..."
cd "$STAGE_DIR"
repo-add -q -n tinapple.db.tar.zst ./*.pkg.tar.zst 2>/dev/null || true
cp -f tinapple.db.tar.zst tinapple.db 2>/dev/null || true
cp -f tinapple.files.tar.zst tinapple.files 2>/dev/null || true

TOTAL_COUNT=$(ls -1 *.pkg.tar.zst | wc -l)
TOTAL_SIZE=$(du -sh "$STAGE_DIR" | cut -f1)

echo -e "\n\033[1;32m✔ Offline Package Repository Staged!\033[0m"
echo "  Location: $STAGE_DIR"
echo "  Packages: $TOTAL_COUNT archives ($TOTAL_SIZE)"
echo "  Run 'sudo ./tinapple-installer/iso/build.sh' to build the offline-capable ISO."
