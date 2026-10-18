#!/usr/bin/env bash
# launch_installer_vm.sh — Launch Tinapple OS installer VM with clean target drive and UEFI support
set -euo pipefail

PROJECT_DIR="/mnt/shared/projects/tinapple"
LATEST_ISO=$(ls -t "${PROJECT_DIR}"/out/tinapple-os-*.iso 2>/dev/null | head -n1 || true)
ISO="${LATEST_ISO:-${PROJECT_DIR}/out/tinapple-os-gui-x86_64.iso}"
DISK="${PROJECT_DIR}/out/tinapple-target.qcow2"
OVMF_CODE="/usr/share/edk2/x64/OVMF_CODE.4m.fd"
OVMF_VARS="/tmp/OVMF_VARS.fd"

BOOT_ORDER="d"
BOOT_MODE="Live ISO Installer"
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --clean)
            pkill -9 -f "qemu-system-x86_64.*tinapple" || true
            shift
            ;;
        --installed|--disk)
            BOOT_ORDER="c"
            BOOT_MODE="Installed Appliance Disk"
            shift
            ;;
        *)
            EXTRA_ARGS+=("$1")
            shift
            ;;
    esac
done

if [[ ! -f "$OVMF_VARS" ]]; then
    cp -f /usr/share/edk2/x64/OVMF_VARS.4m.fd "$OVMF_VARS"
    chmod 644 "$OVMF_VARS"
fi

if [[ ! -f "$DISK" ]]; then
    echo "Creating clean 25GB target disk: $DISK"
    qemu-img create -f qcow2 "$DISK" 25G
fi

echo "==> Launching Tinapple VM in QEMU..."
echo "  Mode:       $BOOT_MODE"
echo "  Target:     $DISK"
echo "  RAM:        4096 MB (4 Cores, KVM)"
echo "  Firmware:   UEFI (OVMF)"
echo "  Display:    GTK Window"
echo "  Forwards:   localhost:2222 -> SSH, localhost:8088 -> Web, localhost:3389 -> RDP"

QEMU_CMD=(
    qemu-system-x86_64
    -enable-kvm
    -cpu host
    -smp 4
    -m 4096
    -drive if=pflash,format=raw,readonly=on,file="$OVMF_CODE"
    -drive if=pflash,format=raw,file="$OVMF_VARS"
    -drive file="$DISK",format=qcow2,if=virtio
    -vga virtio
    -display gtk
    -qmp unix:/tmp/qemu-tinapple-qmp.sock,server,nowait
    -serial file:"${PROJECT_DIR}/out/qemu-serial.log"
    -netdev user,id=net0,ipv6=off,hostfwd=tcp::2222-:22,hostfwd=tcp::3000-:3000,hostfwd=tcp::8088-:8088,hostfwd=tcp::3389-:3389
    -device virtio-net-pci,netdev=net0
)

if [[ "$BOOT_ORDER" == "d" ]]; then
    QEMU_CMD+=(
        -cdrom "$ISO"
        -boot menu=on,order=d
    )
else
    QEMU_CMD+=(
        -boot menu=on,order=c
    )
fi

exec "${QEMU_CMD[@]}" "${EXTRA_ARGS[@]}"
