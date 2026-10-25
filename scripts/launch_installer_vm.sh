#!/usr/bin/env bash
# launch_installer_vm.sh — Launch Tinapple OS installer VM with clean target drive and UEFI support
set -euo pipefail

PROJECT_DIR="/mnt/shared/projects/tinapple"
LATEST_ISO=$(ls -t "${PROJECT_DIR}"/out/tinapple-os-*.iso 2>/dev/null | head -n1 || true)
ISO="${LATEST_ISO:-${PROJECT_DIR}/out/tinapple-os-gui-x86_64.iso}"
DISK="${TINAPPLE_DISK:-/var/tmp/tinapple-target.qcow2}"
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
        --iso)
            ISO="$2"
            shift 2
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
    echo "Creating clean 35GB target disk: $DISK"
    qemu-img create -f qcow2 "$DISK" 35G
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
    -drive file="$DISK",format=qcow2,if=none,id=disk0
    -vga virtio
    -display gtk,grab-on-hover=on,show-menubar=on
    -qmp unix:/tmp/qemu-tinapple-qmp.sock,server,nowait
    -serial file:"${PROJECT_DIR}/out/qemu-serial.log"
    -netdev user,id=net0,ipv6=off,hostfwd=tcp::2222-:22,hostfwd=tcp::3000-:3000,hostfwd=tcp::4566-:4566,hostfwd=tcp::4567-:4567,hostfwd=tcp::8080-:8080,hostfwd=tcp::8085-:8085,hostfwd=tcp::8088-:8088,hostfwd=tcp::8096-:8096,hostfwd=tcp::3389-:3389,hostfwd=tcp::25565-:25565,hostfwd=tcp::8443-:8443
    -device virtio-net-pci,netdev=net0,bootindex=3
    -device usb-ehci,id=ehci
    -device usb-kbd
    -device usb-tablet
)

# Auto-detect if target disk already has an installed operating system
DISK_INSTALLED=false
if [[ -f "$DISK" ]]; then
    ACTUAL_SIZE=$(qemu-img info --output=json "$DISK" 2>/dev/null | grep -m1 '"actual-size"' | awk -F': ' '{print $2}' | tr -d ', ' || echo "0")
    if [[ -n "$ACTUAL_SIZE" && "$ACTUAL_SIZE" -gt 500000000 ]]; then
        DISK_INSTALLED=true
    fi
fi

if [[ "$BOOT_ORDER" == "d" && "$DISK_INSTALLED" == "true" ]]; then
    echo "==> Detected installed Tinapple OS on target drive ($DISK)!"
    echo "    Defaulting boot priority to Disk (bootindex=1). CD-ROM attached as fallback (bootindex=2)."
    QEMU_CMD+=(
        -device virtio-blk-pci,drive=disk0,bootindex=1
        -drive file="$ISO",media=cdrom,readonly=on,if=none,id=cdrom0
        -device ide-cd,drive=cdrom0,bootindex=2
        -boot menu=on
    )
elif [[ "$BOOT_ORDER" == "d" ]]; then
    echo "==> Target disk ($DISK) is blank/uninstalled. Prioritizing Live ISO Installer (bootindex=1)..."
    QEMU_CMD+=(
        -drive file="$ISO",media=cdrom,readonly=on,if=none,id=cdrom0
        -device ide-cd,drive=cdrom0,bootindex=1
        -device virtio-blk-pci,drive=disk0,bootindex=2
        -boot menu=on
    )
else
    echo "==> Disk only mode. Booting from $DISK..."
    QEMU_CMD+=(
        -device virtio-blk-pci,drive=disk0,bootindex=1
        -boot menu=on
    )
fi

exec "${QEMU_CMD[@]}" "${EXTRA_ARGS[@]}"
