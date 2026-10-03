#!/usr/bin/env bash
# launch_installer_vm.sh — Launch Tinapple OS installer VM with clean target drive and UEFI support
set -euo pipefail

PROJECT_DIR="/mnt/shared/projects/tinapple"
LATEST_ISO=$(ls -t "${PROJECT_DIR}"/out/tinapple-os-*.iso 2>/dev/null | head -n1 || true)
ISO="${LATEST_ISO:-${PROJECT_DIR}/out/tinapple-os-2026.10.03-x86_64.iso}"
DISK="${PROJECT_DIR}/out/tinapple-target.qcow2"
OVMF_CODE="/usr/share/edk2/x64/OVMF_CODE.4m.fd"
OVMF_VARS="/tmp/OVMF_VARS.fd"

# Clean up any existing QEMU instances if requested
if [[ "${1:-}" == "--clean" ]]; then
    pkill -9 -f "qemu-system-x86_64.*tinapple" || true
    shift
fi

if [[ ! -f "$OVMF_VARS" ]]; then
    cp -f /usr/share/edk2/x64/OVMF_VARS.4m.fd "$OVMF_VARS"
    chmod 644 "$OVMF_VARS"
fi

if [[ ! -f "$DISK" ]]; then
    echo "Creating clean 25GB target disk: $DISK"
    qemu-img create -f qcow2 "$DISK" 25G
fi

echo "==> Launching Tinapple Installer in QEMU..."
echo "  ISO:        $ISO"
echo "  Target:     $DISK"
echo "  RAM:        4096 MB (4 Cores, KVM)"
echo "  Firmware:   UEFI (OVMF)"
echo "  Display:    GTK Window"
echo "  Forwards:   localhost:2222 -> SSH, localhost:8088 -> Web, localhost:3389 -> RDP"

exec qemu-system-x86_64 \
    -enable-kvm \
    -cpu host \
    -smp 4 \
    -m 4096 \
    -drive if=pflash,format=raw,readonly=on,file="$OVMF_CODE" \
    -drive if=pflash,format=raw,file="$OVMF_VARS" \
    -cdrom "$ISO" \
    -drive file="$DISK",format=qcow2,if=virtio \
    -boot menu=on,order=d \
    -vga virtio \
    -display gtk \
    -netdev user,id=net0,hostfwd=tcp::2222-:22,hostfwd=tcp::8088-:8088,hostfwd=tcp::3389-:3389 \
    -device virtio-net-pci,netdev=net0 \
    "$@"
