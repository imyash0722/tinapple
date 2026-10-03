# Task M: mkinitcpio Configuration - Presets, Hooks, and Config

## Goal
Add all required mkinitcpio configuration files to airootfs for proper initramfs generation.

## Files to Create

### 1. `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/mkinitcpio.d/tinapple.preset`
```bash
# mkinitcpio preset file for tinapple kernels
ALL_config="/etc/mkinitcpio.conf"
ALL_kver="/boot/vmlinuz-%PKGBASE%"

PRESETS=('default' 'fallback')

default_image="/boot/initramfs-%PKGBASE%.img"
fallback_image="/boot/initramfs-%PKGBASE%-fallback.img"
fallback_options="-S autodetect"
```

### 2. `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/mkinitcpio.d/linux-lts.preset`
```bash
# mkinitcpio preset file for linux-lts
ALL_config="/etc/mkinitcpio.conf"
ALL_kver="/boot/vmlinuz-linux-lts"

PRESETS=('default' 'fallback')

default_image="/boot/initramfs-linux-lts.img"
fallback_image="/boot/initramfs-linux-lts-fallback.img"
fallback_options="-S autodetect"
```

### 3. `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/mkinitcpio.d/linux-cachyos.preset`
```bash
# mkinitcpio preset file for linux-cachyos
ALL_config="/etc/mkinitcpio.conf"
ALL_kver="/boot/vmlinuz-linux-cachyos"

PRESETS=('default' 'fallback')

default_image="/boot/initramfs-linux-cachyos.img"
fallback_image="/boot/initramfs-linux-cachyos-fallback.img"
fallback_options="-S autodetect"
```

### 4. `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/mkinitcpio.conf.d/tinapple.conf`
```ini
# tinapple mkinitcpio configuration
HOOKS=(base udev autodetect microcode modconf kms keyboard keymap consolefont block encrypt lvm2 filesystems keyboard fsck)
COMPRESSION="zstd"
COMPRESSION_OPTIONS=(-19 -T0)
MODULES=(btrfs crc32c libcrc32c)
```

### 5. mkinitcpio-archiso hooks (copy from mkinitcpio-archiso package)
These need to be installed to airootfs/usr/lib/initcpio/
```
/usr/lib/initcpio/install/archiso
/usr/lib/initcpio/install/archiso_loop_mnt
/usr/lib/initcpio/install/archiso_pxe_common
/usr/lib/initcpio/install/archiso_pxe_http
/usr/lib/initcpio/install/archiso_pxe_nbd
/usr/lib/initcpio/install/archiso_pxe_nfs
/usr/lib/initcpio/install/archiso_pxe_pxe

/usr/lib/initcpio/hooks/archiso
/usr/lib/initcpio/hooks/archiso_loop_mnt
```

## Verification
```bash
# Check files exist
ls -la /mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/mkinitcpio.d/
ls -la /mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/mkinitcpio.conf.d/
ls -la /mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/usr/lib/initcpio/install/
ls -la /mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/usr/lib/initcpio/hooks/
```