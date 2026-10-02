#!/usr/bin/env bash
# run-vm.sh — Launch tinapple OS Virtual Machine in QEMU
# Supports both GUI desktop display and headless/serial console.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

ISO_PATH="${ISO_PATH:-$(ls -t "${ROOT_DIR}/out"/tinapple-os-*.iso 2>/dev/null | head -n 1)}"
DISK_PATH="${ROOT_DIR}/out/tinapple-vm-disk.qcow2"
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

if [[ ! -f "$ISO_PATH" ]]; then
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
  -netdev "user,id=net0,hostfwd=tcp::2222-:22,hostfwd=tcp::8088-:8088"
  -device "virtio-net-pci,netdev=net0"
)

if [[ "$BOOT_DEV" == "d" ]]; then
  QEMU_ARGS+=(
    -cdrom "$ISO_PATH"
    -boot d
  )
fi

if [[ "$MODE" == "gui" ]]; then
  echo "Starting tinapple OS VM in GUI mode..."
  echo "Forwarded ports: SSH -> localhost:2222 | Web Dashboard -> localhost:8088"
  exec "${QEMU_ARGS[@]}" -vga virtio -display gtk
else
  echo "Starting tinapple OS VM in terminal mode (Ctrl+A then X to exit)..."
  exec "${QEMU_ARGS[@]}" -nographic
fi
