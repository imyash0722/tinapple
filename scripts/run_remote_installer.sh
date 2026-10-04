#!/usr/bin/env bash
# scripts/run_remote_installer.sh — Run Tinapple Installer or Test Matrix on a Remote Server over SSH
#
# Offloads the entire QEMU session, pacstrap download bandwidth, disk I/O, and
# compilation to your remote server machine (e.g. homelab server or VPS).
#
# Usage:
#   ./scripts/run_remote_installer.sh [OPTIONS] <user@server_host>
#
# Modes:
#   --web          (Default) Launch QEMU on remote server and tunnel Web UI to http://localhost:8088
#   --tui / --cli  Launch QEMU on remote server with interactive serial console in your terminal
#   --test-matrix  Run the parallel automated test matrix on the remote server
#   --vnc          Launch QEMU with VNC on remote server and tunnel port 5901 to localhost:5901
#
# Options:
#   --iso <path>         Local ISO file to sync to the server (defaults to newest out/*.iso)
#   --remote-dir <path>  Working directory on remote server (default: ~/tinapple-remote)
#   --sync               Force rsync of repo and ISO before starting (default: true if not present)
#   --no-sync            Skip file synchronization
#   --skip-pacstrap      Pass TINAPPLE_SKIP_PACSTRAP=1 to installer
#   --port <port>        Local port for web UI forwarding (default: 8088)
#   --ssh-port <port>    Local port for guest VM SSH forwarding (default: 2222)
#   -h, --help           Show this help message

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

REMOTE_HOST=""
MODE="web"
SYNC_FILES="auto"
SKIP_PACSTRAP=0
LOCAL_WEB_PORT=8088
LOCAL_SSH_PORT=2222
LOCAL_VNC_PORT=5901
REMOTE_DIR="~/tinapple-remote"
ISO_PATH=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --web)
            MODE="web"
            shift
            ;;
        --tui|--cli|--serial)
            MODE="tui"
            shift
            ;;
        --test-matrix|--matrix|--test)
            MODE="matrix"
            shift
            ;;
        --vnc)
            MODE="vnc"
            shift
            ;;
        --iso)
            ISO_PATH="$2"
            shift 2
            ;;
        --remote-dir)
            REMOTE_DIR="$2"
            shift 2
            ;;
        --sync)
            SYNC_FILES="always"
            shift
            ;;
        --no-sync)
            SYNC_FILES="never"
            shift
            ;;
        --skip-pacstrap)
            SKIP_PACSTRAP=1
            shift
            ;;
        --port)
            LOCAL_WEB_PORT="$2"
            shift 2
            ;;
        --ssh-port)
            LOCAL_SSH_PORT="$2"
            shift 2
            ;;
        -h|--help)
            sed -n '2,24p' "$0" | sed 's/^# \?//'
            exit 0
            ;;
        -*)
            echo "Unknown option: $1" >&2
            echo "Run $0 --help for usage." >&2
            exit 1
            ;;
        *)
            if [[ -z "$REMOTE_HOST" ]]; then
                REMOTE_HOST="$1"
            else
                echo "Unexpected argument: $1" >&2
                exit 1
            fi
            shift
            ;;
    esac
done

if [[ -z "$REMOTE_HOST" ]]; then
    # Check if known hosts contains pineapple-station or similar
    if grep -q "pineapple-station" ~/.ssh/known_hosts 2>/dev/null; then
        echo -e "\033[1;33m[!] No remote host specified.\033[0m"
        echo "Found saved host: pineapple-station"
        read -r -p "Connect to pineapple@pineapple-station? [Y/n] " answer
        if [[ "$answer" =~ ^[Nn] ]]; then
            echo "Usage: $0 <user@remote-host>"
            exit 1
        fi
        REMOTE_HOST="pineapple@pineapple-station"
    else
        echo "Usage: $0 [OPTIONS] <user@remote-host>" >&2
        echo "Run '$0 --help' for options." >&2
        exit 1
    fi
fi

# Locate latest ISO if not explicitly specified
if [[ -z "$ISO_PATH" ]]; then
    ISO_PATH=$(ls -t "${PROJECT_DIR}"/out/tinapple-os-*.iso 2>/dev/null | head -n1 || true)
    if [[ -z "$ISO_PATH" ]]; then
        ISO_PATH=$(ls -t "${PROJECT_DIR}"/tinapple-installer/iso/out/tinapple-os-*.iso 2>/dev/null | head -n1 || true)
    fi
fi

echo -e "\033[1;36m==> Tinapple Remote Server Execution\033[0m"
echo "  Remote Host:     $REMOTE_HOST"
echo "  Execution Mode:  $MODE"
echo "  Skip Pacstrap:   $([[ $SKIP_PACSTRAP -eq 1 ]] && echo 'Yes (Mock)' || echo 'No (Full 1.7GB download on server)')"

# 1. Verify SSH connectivity & remote capabilities
echo -e "\n\033[1;34m[1/3] Checking SSH connection and server capabilities...\033[0m"
REMOTE_CHECK=$(ssh -o ConnectTimeout=8 -o BatchMode=no "$REMOTE_HOST" 'bash -s' << 'EOF'
HAS_KVM=0
[[ -e /dev/kvm && -w /dev/kvm ]] && HAS_KVM=1
HAS_QEMU=0
command -v qemu-system-x86_64 >/dev/null 2>&1 && HAS_QEMU=1
HAS_PY3=0
command -v python3 >/dev/null 2>&1 && HAS_PY3=1
echo "KVM=$HAS_KVM QEMU=$HAS_QEMU PY3=$HAS_PY3 UNAME=$(uname -s -m)"
EOF
)

echo "  Remote system:   $REMOTE_CHECK"

if [[ "$REMOTE_CHECK" != *"QEMU=1"* ]]; then
    echo -e "\033[1;33m[!] Warning: qemu-system-x86_64 is not installed on remote host.\033[0m"
    echo "  Install on server: sudo pacman -S qemu-desktop (Arch) or sudo apt install qemu-system-x86 (Ubuntu/Debian)"
fi

# 2. Synchronize workspace and ISO to remote server
echo -e "\n\033[1;34m[2/3] Synchronizing scripts and installer to remote server...\033[0m"
ssh "$REMOTE_HOST" "mkdir -p $REMOTE_DIR/out $REMOTE_DIR/scripts $REMOTE_DIR/tinapple-installer"

if [[ "$SYNC_FILES" != "never" ]]; then
    echo "  Syncing scripts, backend, and configs..."
    rsync -az --exclude=".git" --exclude="__pycache__" \
        "${PROJECT_DIR}/scripts/" "$REMOTE_HOST:$REMOTE_DIR/scripts/"
    rsync -az --exclude=".git" --exclude="*.iso" \
        "${PROJECT_DIR}/tinapple-installer/" "$REMOTE_HOST:$REMOTE_DIR/tinapple-installer/"
    rsync -az "${PROJECT_DIR}/Makefile" "$REMOTE_HOST:$REMOTE_DIR/" 2>/dev/null || true

    if [[ -n "$ISO_PATH" && -f "$ISO_PATH" ]]; then
        ISO_NAME=$(basename "$ISO_PATH")
        REMOTE_HAS_ISO=$(ssh "$REMOTE_HOST" "[[ -f $REMOTE_DIR/out/$ISO_NAME ]] && echo 1 || echo 0")
        if [[ "$REMOTE_HAS_ISO" != "1" || "$SYNC_FILES" == "always" ]]; then
            echo "  Syncing ISO ($ISO_NAME, $(du -h "$ISO_PATH" | cut -f1))..."
            rsync -avz --progress "$ISO_PATH" "$REMOTE_HOST:$REMOTE_DIR/out/$ISO_NAME"
        else
            echo "  ISO $ISO_NAME already present on remote server."
        fi
    fi
fi

# 3. Execution based on selected mode
echo -e "\n\033[1;34m[3/3] Launching remote installer session...\033[0m"

ISO_BASENAME=""
[[ -n "$ISO_PATH" ]] && ISO_BASENAME=$(basename "$ISO_PATH")

case "$MODE" in
    matrix)
        echo "Running test matrix directly on remote server..."
        EXTRA_FLAGS=""
        [[ $SKIP_PACSTRAP -eq 1 ]] && EXTRA_FLAGS="--skip-pacstrap"
        ssh -t "$REMOTE_HOST" "cd $REMOTE_DIR && python3 scripts/qemu_installer_matrix.py --all --parallel 4 $EXTRA_FLAGS"
        ;;

    web)
        echo -e "\033[1;32m==> Establishing SSH Tunnel and starting remote QEMU VM...\033[0m"
        echo "  Forwarding Web UI:      http://localhost:${LOCAL_WEB_PORT}"
        echo "  Forwarding Guest SSH:   localhost:${LOCAL_SSH_PORT}"
        echo "  Pacstrap downloads will occur ENTIRELY on the server network."
        echo ""
        echo "  Press Ctrl+C to terminate the session and shut down the remote VM."
        echo ""

        # Launch QEMU on remote host and forward ports through SSH tunnel
        ssh -t -L "${LOCAL_WEB_PORT}:localhost:8088" -L "${LOCAL_SSH_PORT}:localhost:2222" "$REMOTE_HOST" "bash -s" << EOF
cd $REMOTE_DIR
TARGET_DISK="$REMOTE_DIR/out/remote-target.qcow2"
ISO="$REMOTE_DIR/out/$ISO_BASENAME"
[[ -f "\$ISO" ]] || ISO=\$(ls -t $REMOTE_DIR/out/tinapple-os-*.iso 2>/dev/null | head -n1 || true)

qemu-img create -f qcow2 "\$TARGET_DISK" 25G >/dev/null

ACCEL="-enable-kvm -cpu host"
[[ -w /dev/kvm ]] || ACCEL="-cpu max"

OVMF_ARGS=""
if [[ -f /usr/share/edk2/x64/OVMF_CODE.4m.fd ]]; then
    cp -f /usr/share/edk2/x64/OVMF_VARS.4m.fd /tmp/REMOTE_OVMF_VARS.fd 2>/dev/null || true
    OVMF_ARGS="-drive if=pflash,format=raw,readonly=on,file=/usr/share/edk2/x64/OVMF_CODE.4m.fd -drive if=pflash,format=raw,file=/tmp/REMOTE_OVMF_VARS.fd"
fi

echo "Remote VM started. Forwarding active."
exec qemu-system-x86_64 \\
    \$ACCEL \\
    -smp 4 \\
    -m 4096 \\
    \$OVMF_ARGS \\
    -cdrom "\$ISO" \\
    -drive file="\$TARGET_DISK",format=qcow2,if=virtio \\
    -boot menu=on,order=d \\
    -display none \\
    -netdev user,id=net0,ipv6=off,hostfwd=tcp:127.0.0.1:2222-:22,hostfwd=tcp:127.0.0.1:8088-:8088 \\
    -device virtio-net-pci,netdev=net0
EOF
        ;;

    tui)
        echo "Launching interactive terminal console on remote server..."
        ssh -t "$REMOTE_HOST" "bash -s" << EOF
cd $REMOTE_DIR
TARGET_DISK="$REMOTE_DIR/out/remote-target.qcow2"
ISO="$REMOTE_DIR/out/$ISO_BASENAME"
[[ -f "\$ISO" ]] || ISO=\$(ls -t $REMOTE_DIR/out/tinapple-os-*.iso 2>/dev/null | head -n1 || true)

qemu-img create -f qcow2 "\$TARGET_DISK" 25G >/dev/null

ACCEL="-enable-kvm -cpu host"
[[ -w /dev/kvm ]] || ACCEL="-cpu max"

exec qemu-system-x86_64 \\
    \$ACCEL \\
    -smp 4 \\
    -m 4096 \\
    -cdrom "\$ISO" \\
    -drive file="\$TARGET_DISK",format=qcow2,if=virtio \\
    -boot menu=on,order=d \\
    -nographic \\
    -serial mon:stdio \\
    -netdev user,id=net0,ipv6=off \\
    -device virtio-net-pci,netdev=net0
EOF
        ;;

    vnc)
        echo "Forwarding remote VNC to localhost:${LOCAL_VNC_PORT}..."
        ssh -t -L "${LOCAL_VNC_PORT}:localhost:5901" "$REMOTE_HOST" "bash -s" << EOF
cd $REMOTE_DIR
TARGET_DISK="$REMOTE_DIR/out/remote-target.qcow2"
ISO="$REMOTE_DIR/out/$ISO_BASENAME"
[[ -f "\$ISO" ]] || ISO=\$(ls -t $REMOTE_DIR/out/tinapple-os-*.iso 2>/dev/null | head -n1 || true)

qemu-img create -f qcow2 "\$TARGET_DISK" 25G >/dev/null

ACCEL="-enable-kvm -cpu host"
[[ -w /dev/kvm ]] || ACCEL="-cpu max"

exec qemu-system-x86_64 \\
    \$ACCEL \\
    -smp 4 \\
    -m 4096 \\
    -cdrom "\$ISO" \\
    -drive file="\$TARGET_DISK",format=qcow2,if=virtio \\
    -boot menu=on,order=d \\
    -vnc 127.0.0.1:1 \\
    -netdev user,id=net0,ipv6=off \\
    -device virtio-net-pci,netdev=net0
EOF
        ;;
esac
