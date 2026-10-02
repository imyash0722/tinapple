#!/usr/bin/env bash
# flash-sandisk.sh — Safely flash Tinapple OS release ISO to USB pendrive
# Enforces strict safety checks: requires TRAN=usb, RM=1, blocks NVMe drives.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

ISO_PATH="${1:-$(ls -t "${ROOT_DIR}/out"/tinapple-os-*.iso 2>/dev/null | head -n 1)}"

if [[ -z "$ISO_PATH" || ! -f "$ISO_PATH" ]]; then
  echo "Error: No ISO image found in ${ROOT_DIR}/out/" >&2
  exit 1
fi

echo "======================================================================"
echo "               Tinapple OS USB Flashing Utility"
echo "======================================================================"
echo "Target ISO: $ISO_PATH"
echo "ISO Size:   $(du -h "$ISO_PATH" | cut -f1)"

# Check checksum if available
if [[ -f "${ISO_PATH}.sha256" ]]; then
  echo -n "Verifying SHA256 checksum... "
  (cd "$(dirname "$ISO_PATH")" && sha256sum -c "$(basename "$ISO_PATH").sha256" --quiet)
  echo "VALID [OK]"
fi

echo ""
echo "Scanning for removable USB storage devices..."

# Find candidate USB drives (TRAN=usb and RM=1)
USB_DEVICES=()
while read -r name tran rm model vendor size; do
  if [[ "$tran" == "usb" && "$rm" == "1" && "$name" != nvme* && "$name" != zram* ]]; then
    USB_DEVICES+=("/dev/$name|$vendor $model|$size")
  fi
done < <(lsblk -d -n -o NAME,TRAN,RM,MODEL,VENDOR,SIZE 2>/dev/null || true)

if [[ ${#USB_DEVICES[@]} -eq 0 ]]; then
  echo "⚠️  No removable USB drives detected!"
  echo "Please connect your SanDisk USB drive and re-run this script."
  echo ""
  echo "Current connected block devices:"
  lsblk -o NAME,SIZE,TYPE,TRAN,MODEL,VENDOR,RM
  exit 1
fi

echo "Detected removable USB device(s):"
for i in "${!USB_DEVICES[@]}"; do
  IFS='|' read -r dev desc sz <<< "${USB_DEVICES[$i]}"
  echo "  [$i] $dev ($desc, $sz)"
done

TARGET_DEV=""
if [[ ${#USB_DEVICES[@]} -eq 1 ]]; then
  IFS='|' read -r dev desc sz <<< "${USB_DEVICES[0]}"
  TARGET_DEV="$dev"
  echo ""
  echo "Selected target: $TARGET_DEV ($desc, $sz)"
else
  echo ""
  read -rp "Enter selection index [0-$((${#USB_DEVICES[@]}-1))]: " sel
  IFS='|' read -r dev desc sz <<< "${USB_DEVICES[$sel]}"
  TARGET_DEV="$dev"
fi

# Hard fail-safe against internal NVMe or system drives
if [[ "$TARGET_DEV" == *nvme* || "$TARGET_DEV" == *zram* ]]; then
  echo "FATAL: Target $TARGET_DEV is an internal NVMe / system device! Aborting." >&2
  exit 1
fi

# Double check device is not mounted
if grep -q "^${TARGET_DEV}" /proc/mounts; then
  echo "Unmounting partitions on $TARGET_DEV..."
  sudo umount "${TARGET_DEV}"* 2>/dev/null || true
fi

echo ""
echo "⚠️  WARNING: ALL DATA ON $TARGET_DEV WILL BE PERMANENTLY ERASED!"
read -rp "Are you sure you want to write $(basename "$ISO_PATH") to $TARGET_DEV? [y/N]: " confirm
if [[ "$confirm" != [yY] && "$confirm" != [yY][eE][sS] ]]; then
  echo "Flashing aborted by user."
  exit 0
fi

echo ""
echo "Writing ISO to $TARGET_DEV with dd (bs=4M)..."
sudo dd if="$ISO_PATH" of="$TARGET_DEV" bs=4M status=progress conv=fsync oflag=direct
echo "Syncing buffers..."
sync

echo ""
echo "======================================================================"
echo "🎉 Flashing completed successfully!"
echo "Target drive: $TARGET_DEV"
lsblk -o NAME,SIZE,FSTYPE,LABEL,MODEL "$TARGET_DEV"
echo "======================================================================"
