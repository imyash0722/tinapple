# Task F: Final Integration Test & Polish

## Tasks

### 1. Full ISO Build
```bash
cd /mnt/shared/projects/tinapple/tinapple-installer/iso
sudo ./build.sh
```

### 2. QEMU Test (BIOS + UEFI)
```bash
# BIOS
qemu-system-x86_64 -cdrom out/tinapple-os-*.iso -m 2G -enable-kvm -boot d

# UEFI
qemu-system-x86_64 \
  -drive if=pflash,format=raw,readonly=on,file=/usr/share/edk2/x64/OVMF_CODE.4m.fd \
  -drive if=pflash,format=raw,file=/tmp/OVMF_VARS.fd \
  -cdrom out/tinapple-os-*.iso -m 2G -enable-kvm
```

### 3. Verify
- [x] ISO builds without errors
- [x] ISO boots in QEMU (both BIOS and UEFI)
- [x] tinapple-install TUI launches with Tinapple branding
- [x] Real installation completes (disk → pacstrap → bootloader)
- [x] System boots after install
- [x] GPG signature verifies
- [x] Tinapple branding throughout

## Success Criteria
- [x] Full install completes in < 10 min
- [x] Reboot boots into installed system
- [x] TUI shows real progress (not fake)
- [x] Tinapple branding throughout
- [x] Both BIOS and UEFI boot
EOF