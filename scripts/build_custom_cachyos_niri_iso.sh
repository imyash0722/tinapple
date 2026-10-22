#!/usr/bin/env bash
set -euo pipefail

echo "==> Step 1: Rebuilding airootfs.sfs..."
sudo rm -f /var/tmp/iso-custom/arch/x86_64/airootfs.sfs /var/tmp/iso-custom/arch/x86_64/airootfs.sha512
sudo mksquashfs /var/tmp/rootfs-custom /var/tmp/iso-custom/arch/x86_64/airootfs.sfs -comp zstd -b 1M -noappend

echo "==> Step 2: Generating sha512sum..."
cd /var/tmp/iso-custom/arch/x86_64
sha512sum airootfs.sfs | sudo tee airootfs.sha512 >/dev/null

echo "==> Step 3: Packing hybrid bootable ISO..."
rm -f /var/tmp/cachyos-tinapple-bspwm.iso
xorriso -as mkisofs \
  -iso-level 3 \
  -full-iso9660-filenames \
  -volid "COS_202608" \
  --modification-date=2026080915470300 \
  -isohybrid-mbr /var/tmp/iso-mbr.bin \
  -partition_cyl_align off \
  -partition_offset 16 \
  --mbr-force-bootable \
  -append_partition 2 0xef /var/tmp/iso-efi.img \
  -iso_mbr_part_type 0x00 \
  -c /boot/syslinux/boot.cat \
  -b /boot/syslinux/isolinux.bin \
  -no-emul-boot \
  -boot-load-size 4 \
  -boot-info-table \
  -isohybrid-gpt-basdat \
  -eltorito-alt-boot \
  -e --interval:appended_partition_2:all:: \
  -no-emul-boot \
  -o /var/tmp/cachyos-tinapple-bspwm.iso \
  /var/tmp/iso-custom

mkdir -p /mnt/shared/projects/tinapple/out
ln -sf /var/tmp/cachyos-tinapple-bspwm.iso /mnt/shared/projects/tinapple/out/tinapple-os-cachyos-bspwm.iso 2>/dev/null || true
echo "==> Custom ISO built successfully: /var/tmp/cachyos-tinapple-bspwm.iso"
