#!/usr/bin/env bash
# Build tinapple OS ISO

set -euo pipefail

PROFILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${PROFILE_DIR}/out"
PROJECT_OUT="${PROFILE_DIR}/../../out"
WORK_DIR="${WORK_DIR:-/var/tmp/tinapple-iso-build-$$}"
BUILD_DATE=$(date -u +%Y%m%d)
GPG_KEY_ID="${GPG_KEY_ID:-0D97CDA2E0E3F18B8CDE9674ADB704C6BBCC650A}"

cleanup() {
    echo "Cleaning up work directory ${WORK_DIR}..."
    rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$OUT_DIR" "$PROJECT_OUT" "$WORK_DIR"

echo "Building tinapple OS ISO..."
echo "Profile directory: $PROFILE_DIR"
echo "Work directory:    $WORK_DIR"
echo "Output directory:  $OUT_DIR"

echo "Staging build profile in ${WORK_DIR}/profile..."
BUILD_PROFILE="${WORK_DIR}/profile"
cp -a "$PROFILE_DIR" "$BUILD_PROFILE"

# Embed offline core packages into ISO local repository
OFFLINE_REPO="${BUILD_PROFILE}/airootfs/opt/tinapple-repo/x86_64"
mkdir -p "$OFFLINE_REPO"
HOST_CACHE="/var/cache/pacman/pkg"

if [[ -d "/var/tmp/tinapple-offline-repo/x86_64" ]]; then
    echo "Copying pre-staged offline packages from /var/tmp/tinapple-offline-repo/x86_64..."
    cp -n /var/tmp/tinapple-offline-repo/x86_64/*.pkg.tar.* "$OFFLINE_REPO/" 2>/dev/null || true
fi

if [[ -d "$HOST_CACHE" ]]; then
    echo "Embedding offline core Arch packages from host cache into ISO repository..."
    CORE_PKGS=(
        base base-devel linux-lts linux-lts-headers linux-firmware systemd systemd-sysvcompat
        networkmanager sudo vim nano zsh git curl wget openssh tmux htop pciutils usbutils
        efibootmgr dosfstools e2fsprogs btrfs-progs xfsprogs grub limine mkinitcpio iptables
        pipewire pipewire-pulse wireplumber xclip xsel
    )
    for pkg in "${CORE_PKGS[@]}"; do
        for match in "${HOST_CACHE}/${pkg}"-[0-9]*.pkg.tar.zst; do
            [[ -f "$match" ]] || continue
            cp -n "$match" "$OFFLINE_REPO/" 2>/dev/null || true
            [[ -f "${match}.sig" ]] && cp -n "${match}.sig" "$OFFLINE_REPO/" 2>/dev/null || true
        done
    done

    # Re-index tinapple.db with embedded packages
    if compgen -G "$OFFLINE_REPO/*.pkg.tar.zst" >/dev/null; then
        echo "Updating offline repository database index (tinapple.db)..."
        (cd "$OFFLINE_REPO" && repo-add -q -n tinapple.db.tar.zst ./*.pkg.tar.zst 2>/dev/null || true)
        cp -f "$OFFLINE_REPO"/tinapple.db.tar.zst "$OFFLINE_REPO"/tinapple.db 2>/dev/null || true
        cp -f "$OFFLINE_REPO"/tinapple.files.tar.zst "$OFFLINE_REPO"/tinapple.files 2>/dev/null || true
        echo "Offline repository indexed: $(ls -1 "$OFFLINE_REPO"/*.pkg.tar.zst | wc -l) packages ($(du -sh "$OFFLINE_REPO" | cut -f1))"
    fi
fi

mkarchiso -v \
    -w "${WORK_DIR}/work" \
    -o "$OUT_DIR" \
    "$BUILD_PROFILE"

# Sign ISO and create checksums
cd "$OUT_DIR"
for iso in tinapple-os-*.iso; do
    [[ -f "$iso" ]] || continue
    echo "Generating SHA256 checksum for $iso..."
    sha256sum "$iso" > "${iso}.sha256"

    if gpg --list-secret-keys "${GPG_KEY_ID}" >/dev/null 2>&1; then
        echo "Signing $iso with GPG key ${GPG_KEY_ID}..."
        gpg --batch --yes --detach-sign --default-key "${GPG_KEY_ID}" "$iso"
    else
        echo "Warning: GPG key ${GPG_KEY_ID} not found in keyring, skipping signature"
    fi
done

# Also copy artifacts to project root out directory
echo "Copying ISO artifacts to ${PROJECT_OUT}..."
cp -f "${OUT_DIR}"/tinapple-os-* "${PROJECT_OUT}/" 2>/dev/null || true

# Set read permissions
chmod 644 "${OUT_DIR}"/tinapple-os-* "${PROJECT_OUT}"/tinapple-os-* 2>/dev/null || true

echo "==> ISO build complete!"
echo "Artifacts in $OUT_DIR:"
ls -lh "$OUT_DIR"/tinapple-os-*
echo "Artifacts in $PROJECT_OUT:"
ls -lh "$PROJECT_OUT"/tinapple-os-*
