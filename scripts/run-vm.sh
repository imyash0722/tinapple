#!/usr/bin/env bash
# run-vm.sh — Launch tinapple OS Virtual Machine in QEMU
# Supports both GUI desktop display and headless/serial console.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

ISO_PATH="${ISO_PATH:-$(ls -t "${ROOT_DIR}/out"/tinapple-os-*.iso 2>/dev/null | head -n 1 || true)}"
DISK_PATH="${DISK_PATH:-${ROOT_DIR}/out/tinapple-vm-disk.qcow2}"
FIRMWARE=bios
HUB_PORT=${HUB_PORT:-8088}
SSH_PORT=${SSH_PORT:-2222}
DISK_SIZE="30G"
RAM="4G"
CPUS="2"

# Parse arguments
MODE="gui"
BOOT_DEV="d" # default boot from CD-ROM

while [[ $# -gt 0 ]]; do
  case "$1" in
    --nographic|--cli|-c)
      MODE="nographic"
      shift
      ;;
    --uefi|--bios)
      FIRMWARE=${1#--}
      shift
      ;;
    --gui|-g)
      MODE="gui"
      shift
      ;;
    --disk-only|--installed)
      BOOT_DEV="c"
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --gui, -g           Launch QEMU with a graphical window (default)"
      echo "  --nographic, -c     Launch QEMU directly inside your current terminal"
      echo "  --uefi / --bios     Firmware (default BIOS); HUB_PORT/SSH_PORT override forwarding"
      echo "  --installed         Boot directly from the virtual disk (no ISO)"
      echo "  --help, -h          Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "$BOOT_DEV" == d && ! -f "$ISO_PATH" ]]; then
  echo "Error: ISO not found at $ISO_PATH" >&2
  exit 1
fi

# Create target virtual disk if missing
if [[ ! -f "$DISK_PATH" ]]; then
  echo "Creating virtual disk at $DISK_PATH ($DISK_SIZE)..."
  qemu-img create -f qcow2 "$DISK_PATH" "$DISK_SIZE"
fi

ACCEL=()
if [[ -e /dev/kvm ]] && [[ -r /dev/kvm ]] && [[ -w /dev/kvm ]]; then
  ACCEL=(-enable-kvm -cpu host)
else
  ACCEL=(-cpu max)
fi

QEMU_ARGS=(
  qemu-system-x86_64
  "${ACCEL[@]}"
  -m "$RAM"
  -smp "$CPUS"
  -drive "file=${DISK_PATH},if=virtio,format=qcow2"
  -netdev "user,id=net0,hostfwd=tcp:127.0.0.1:${SSH_PORT}-:22,hostfwd=tcp:127.0.0.1:${HUB_PORT}-:8088"
  -device "virtio-net-pci,netdev=net0"
)

if [[ "$FIRMWARE" == uefi ]]; then
  VARS_PATH="${DISK_PATH%.qcow2}-OVMF_VARS.fd"
  [[ -f "$VARS_PATH" ]] || cp /usr/share/edk2/x64/OVMF_VARS.4m.fd "$VARS_PATH"
  QEMU_ARGS+=(-drive if=pflash,format=raw,readonly=on,file=/usr/share/edk2/x64/OVMF_CODE.4m.fd
              -drive "if=pflash,format=raw,file=$VARS_PATH")
fi

if [[ "$BOOT_DEV" == "d" ]]; then
  QEMU_ARGS+=(
    -cdrom "$ISO_PATH"
    -boot d
  )
fi

if [[ "$MODE" == "gui" ]]; then
  echo "Starting tinapple OS VM in GUI mode..."
  echo "Forwarded ports: SSH -> localhost:${SSH_PORT} | Web Dashboard -> localhost:${HUB_PORT}"
  exec "${QEMU_ARGS[@]}" -vga virtio -display gtk
else
  echo "Starting tinapple OS VM in terminal mode (Ctrl+A then X to exit)..."
  exec "${QEMU_ARGS[@]}" -nographic
fi
