# Task: tinapple-installer ISO Profile (Archiso)

## Status: ✅ Complete

## Goal
Create the Archiso profile for building the bootable tinapple ISO.

## Files to Create

### 1. `/mnt/shared/projects/tinapple/tinapple-installer/iso/profiledef.sh`
```bash
#!/usr/bin/env bash
# tinapple-os Archiso Profile Definition

iso_name="tinapple-os"
iso_label="TINAPPLE_$(date --date="@${SOURCE_DATE_EPOCH:-$(date +%s)}" +%Y%m)"
iso_publisher="tinapple Project <https://github.com/tinapple/tinapple-arch>"
iso_application="tinapple OS Live & Installation Appliance"
iso_version="$(date --date="@${SOURCE_DATE_EPOCH:-$(date +%s)}" +%Y.%m.%d)"
install_dir="tinapple"
buildmodes=('iso')
bootmodes=('bios.syslinux' 'uefi-x64.systemd-boot')
arch="x86_64"
pacman_conf="pacman.conf"
airootfs_image_type="squashfs"
airootfs_image_tool_options=('-comp' 'zstd' '-Xcompression-level' '19')
bootstrap_tarball_compression=('zstd' '-c' '-T0' '--auto-threads=logical' '--long' '-19')
file_permissions=(
  ["/etc/shadow"]="0:0:400"
  ["/root"]="0:0:750"
  ["/root/.automated_script.sh"]="0:0:755"
  ["/usr/local/bin/tinapple-install"]="0:0:755"
  ["/usr/local/bin/tinapple-bootstrap"]="0:0:755"
)
```

### 2. `/mnt/shared/projects/tinapple/tinapple-installer/iso/pacman.conf`
```ini
# /etc/pacman.conf for tinapple ISO build

[options]
Architecture = auto
ParallelDownloads = 10
Color
ILoveCandy
ParallelDownloads = 10
CheckSpace
SigLevel    = Required DatabaseOptional
LocalFileSigLevel = Optional

[core]
Include = /etc/pacman.d/mirrorlist

[extra]
Include = /etc/pacman.d/mirrorlist

[multilib]
Include = /etc/pacman.d/mirrorlist

# CachyOS repositories (added by installer)
# [cachyos-v3]
# Include = /etc/pacman.d/cachyos-v3-mirrorlist
# [cachyos-core-v3]
# Include = /etc/pacman.d/cachyos-v3-mirrorlist
# [cachyos-extra-v3]
# Include = /etc/pacman.d/cachyos-v3-mirrorlist

# Tinapple custom repository (added by installer)
# [tinapple]
# SigLevel = Required DatabaseOptional
# Include = /etc/pacman.d/tinapple-mirrorlist
```

### 3. `/mnt/shared/projects/tinapple/tinapple-installer/iso/packages.x86_64`
```text
# Base system
base
linux-lts
linux-lts-headers
linux-firmware
base-devel

# Filesystems
btrfs-progs
dosfstools
e2fsprogs
xfsprogs
f2fs-tools
ntfs-3g

# Encryption
cryptsetup
lvm2

# Network
networkmanager
network-manager-applet
wireguard-tools
tailscale
openssh
sudo

# Filesystem tools
btrfs-progs
e2fsprogs
dosfstools
xfsprogs
f2fs-tools

# Bootloaders
grub
efibootmgr
limine
systemd-boot

# Initramfs
mkinitcpio
dracut

# Snapshots
snapper
grub-btrfs

# Hardware
linux-firmware
amd-ucode
intel-ucode
sof-firmware
nvidia-dkms
nvidia-utils
broadcom-wl-dkms
rtl8821ce-dkms
rtl88x2bu-dkms-git

# Graphics
mesa
vulkan-radeon
vulkan-intel
nvidia
xf86-video-amdgpu
xf86-video-intel

# Audio
pipewire
pipewire-pulse
pipewire-alsa
pipewire-jack
wireplumber

# Utils
vim
zsh
git
curl
wget
rsync
reflector
pacman-contrib
man-db
man-pages
htop
btop
ncdu
tree
unzip
zip
p7zip
tar
gzip
bzip2
xz
zstd

# Installer
tinapple-install
tinapple-bootstrap
tinapple-config-generator
tinapple-hw

# Hardware abstraction
tinapple-hw

# Config generator
tinapple-config-generator

# Firstboot
tinapple-firstboot

# Maintenance
tinapple-maintenance

# Keyring
tinapple-keyring

# Mirrorlist
tinapple-mirrorlist

# CachyOS keyring (for repo)
cachyos-keyring
cachyos-mirrorlist
cachyos-v3-mirrorlist
cachyos-v4-mirrorlist

# CachyOS kernel (optional)
linux-cachyos
linux-cachyos-headers
```

### 4. `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/mkinitcpio.conf.d/tinapple.conf`
```ini
# tinapple mkinitcpio preset
HOOKS=(base udev autodetect microcode modconf kms keyboard keymap consolefont block encrypt lvm2 filesystems keyboard fsck)
COMPRESSION="zstd"
COMPRESSION_OPTIONS=(-19 -T0)
MODULES=(btrfs crc32c libcrc32c)
```

### 5. `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/mkinitcpio.d/tinapple.preset`
```ini
# tinapple mkinitcpio preset
ALL_config="/etc/mkinitcpio.conf"
ALL_kver="/boot/vmlinuz-linux-lts"

PRESETS=('default' 'fallback')

default_image="/boot/initramfs-linux-lts.img"
fallback_image="/boot/initramfs-linux-lts-fallback.img"
fallback_options="-S autodetect"
```

### 5. `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/limine.conf`
```ini
# tinapple Limine configuration
timeout: 5
default_entry: tinapple-lts

:tinapple-lts
    protocol: linux
    kernel_path: boot/vmlinuz-linux-lts
    cmdline: root=UUID=@ROOT_UUID@ rw quiet splash loglevel=3 rd.udev.log_level=3 vt.global_cursor_default=0
    module_path: boot/initramfs-linux-lts.img

:tinapple-lts-fallback
    protocol: linux
    kernel_path: boot/vmlinuz-linux-lts
    cmdline: root=UUID=@ROOT_UUID@ rw single
    module_path: boot/initramfs-linux-lts-fallback.img

:UEFI Shell v2
    protocol: efi
    path: EFI/shellx64_v2.efi

:UEFI Shell v1
    protocol: efi
    path: EFI/shellx64_v1.efi
```

### 6. `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/root/.automated_script.sh`
```bash
#!/usr/bin/env bash
# Auto-run installer on live boot

if [[ -t 0 ]] && [[ -z "${TINAPPLE_AUTO_INSTALL:-}" ]]; then
    echo "Welcome to tinapple OS Live Environment"
    echo "Run 'tinapple-install' to start the installer"
    echo "Run 'tinapple-bootstrap' for in-place install"
    exec /bin/bash
else
    exec tinapple-install
fi
```

### 7. `/mnt/shared/projects/tinapple/tinapple-installer/iso/build.sh`
```bash
#!/usr/bin/env bash
# Build tinapple OS ISO

set -euo pipefail

PROFILE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${PROFILE_DIR}/../../out"
WORK_DIR="/tmp/tinapple-iso-build-$$"
BUILD_DATE=$(date -u +%Y%m%d)

cleanup() {
    rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$OUT_DIR" "$WORK_DIR"

echo "Building tinapple OS ISO..."
mkarchiso -v \
    -w "$WORK_DIR" \
    -o "$OUT_DIR" \
    -p "tinapple-install tinapple-bootstrap tinapple-config-generator tinapple-hw tinapple-config-generator tinapple-firstboot tinapple-maintenance tinapple-hw tinapple-keyring tinapple-mirrorlist" \
    "$PROFILE_DIR"

# Sign ISO
cd "$OUT_DIR"
for iso in tinapple-os-*.iso; do
    gpg --detach-sign --default-key "${GPG_KEY_ID:-}" "$iso"
    sha256sum "$iso" > "${iso}.sha256"
done

echo "ISO built in $OUT_DIR"
ls -lh "$OUT_DIR"/tinapple-os-*.iso*
```

### 8. `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/tinapple/manifest.yaml`
```yaml
# Default manifest for live ISO
version: 1
hostname: tinapple-live
kernel_profile: lts
session_mode: interactive
hardware_profile: auto
cachyos_repos: true
ease_of_use_mode: true
filesystem: ext4
bootloader: auto
profiles:
  - base
services: {}
hardware:
  battery:
    charge_limit: 80
    charge_limit_min: 40
    critical_action: hibernate
    critical_threshold: 5
  power_profile: balanced
  thermal_profile: server
  lid_policy: ignore
  ups_monitor: true
network:
  interface: eth0
  dhcp: true
  static_fallback:
    address: 192.168.1.100/24
    gateway: 192.168.1.1
    dns: [1.1.1.1, 9.9.9.9]
```

### 9. `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/sudoers.d/tinapple`
```text
# Allow wheel group passwordless sudo
%wheel ALL=(ALL) NOPASSWD: ALL
```

### 10. `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/systemd/system/getty@tty1.service.d/autologin.conf`
```ini
[Service]
ExecStart=
ExecStart=-/usr/bin/agetty --autologin root --noclear %I \$TERM
```

## Verification
- `mkarchiso -v -w /tmp/build -o ./out .` builds ISO successfully
- ISO boots in QEMU (UEFI + BIOS)
- Installer launches automatically on boot
- Network works (DHCP + manual config)
- Disk partitioning works (auto + custom)
- LUKS encryption works
- Both GRUB and Limine boot entries work
- Firstboot runs on first boot after install