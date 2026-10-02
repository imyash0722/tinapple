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

mkarchiso -v \
    -w "$WORK_DIR" \
    -o "$OUT_DIR" \
    "$PROFILE_DIR"

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
