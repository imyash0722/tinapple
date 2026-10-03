# Master ISO Improvement Plan - tinapple OS

## Overview
This document consolidates all required improvements to bring tinapple OS ISO to production-grade quality matching Arch releng, CachyOS, EndeavourOS, and Manjaro standards.

---

## 📋 Task Summary

| Task ID | File | Description | Priority | Dependencies |
|---------|------|-------------|----------|--------------|
| J | `J-iso-profiledef-fixes.md` | Fix profiledef.sh bootmodes, compression, permissions | 🔴 Critical | None |
| K | `K-missing-packages.md` | Add 50+ missing critical packages | 🔴 Critical | None |
| L | `L-airootfs-structure.md` | Create complete airootfs structure | 🔴 Critical | J, K |
| M | `M-mkinitcpio-config.md` | Add mkinitcpio presets, hooks, configs | 🔴 Critical | L |
| N | `N-grub-limine-configs.md` | GRUB/Limine templates, systemd services | 🔴 Critical | L |
| O | `O-final-verification.md` | Build, test, verification checklist | ✅ Final | J,K,L,M,N |

---

## 🔴 Critical Path Execution Order

```
Phase 1 (Parallel):
  ├─ J: profiledef.sh fixes
  ├─ K: Add missing packages
  └─ (parallel, no deps)

Phase 2 (After J,K):
  ├─ L: airootfs structure
  ├─ M: mkinitcpio config (depends on L)
  └─ N: GRUB/Limine configs (depends on L)

Phase 3 (Sequential):
  └─ O: Final verification & ISO build
```

---

## 🎯 Execution Commands

```bash
# Phase 1: Critical fixes (run in parallel)
agy --dangerously-skip-permissions -p "$(cat /mnt/shared/projects/tinapple/tasks/J-iso-profiledef-fixes.md)" &
agy --dangerously-skip-permissions -p "$(cat /mnt/shared/projects/tinapple/tasks/K-missing-packages.md)" &

# Wait for completion, then:
agy --dangerously-skip-permissions -p "$(cat /mnt/shared/projects/tinapple/tasks/L-airootfs-structure.md)" &

# After L completes:
agy --dangerously-skip-permissions -p "$(cat /mnt/shared/projects/tinapple/tasks/M-mkinitcpio-config.md)" &
agy --dangerously-skip-permissions -p "$(cat /mnt/shared/projects/tinapple/tasks/N-grub-limine-configs.md)" &

# Finally:
agy --dangerously-skip-permissions -p "$(cat /mnt/shared/projects/tinapple/tasks/O-final-verification.md)"
```

---

## ✅ Verification Checklist

After all tasks complete:

```bash
# 1. Build ISO
cd /mnt/shared/projects/tinapple/tinapple-installer/iso
sudo ./build.sh

# 2. Verify artifacts
ls -lh out/tinapple-os-*.iso
sha256sum -c out/tinapple-os-*.sha256
gpg --verify out/tinapple-os-*.iso.sig out/tinapple-os-*.iso

# 3. Test in QEMU
# BIOS
qemu-system-x86_64 -cdrom out/tinapple-os-*.iso -m 2G -enable-kvm -boot d

# UEFI
qemu-system-x86_64 \
  -drive if=pflash,format=raw,readonly=on,file=/usr/share/edk2/x64/OVMF_CODE.4m.fd \
  -drive if=pflash,format=raw,file=/tmp/OVMF_VARS.fd \
  -cdrom out/tinapple-os-*.iso -m 2G -enable-kvm

# 3. Verify install works
# - Boot ISO
# - Run installer
# - Verify disk partitioning, pacstrap, bootloader
# - Reboot into installed system
# - Verify firstboot runs
```

---

## 📋 Complete Task Files Created

| File | Purpose |
|-------|---------|
| `J-iso-profiledef-fixes.md` | Fix profiledef.sh |
| `K-missing-packages.md` | Add 50+ missing packages |
| `L-airootfs-structure.md` | Create airootfs structure |
| `M-mkinitcpio-config.md` | mkinitcpio presets/hooks |
| `N-grub-limine-configs.md` | GRUB/Limine templates, systemd |
| `O-final-verification.md` | Build, test, verify |

---

## 🚀 Quick Start

```bash
# Run all critical tasks (parallel where possible)
agy --dangerously-skip-permissions -p "$(cat /mnt/shared/projects/tinapple/tasks/J-iso-profiledef-fixes.md)"
agy --dangerously-skip-permissions -p "$(cat /mnt/shared/projects/tinapple/tasks/K-missing-packages.md)"

# Wait for completion, then:
agy --dangerously-skip-permissions -p "$(cat /mnt/shared/projects/tinapple/tasks/L-airootfs-structure.md)"

# Then:
agy --dangerously-skip-permissions -p "$(cat /mnt/shared/projects/tinapple/tasks/M-mkinitcpio-config.md)"
agy --dangerously-skip-permissions -p "$(cat /mnt/shared/projects/tinapple/tasks/N-grub-limine-configs.md)"

# Final verification
agy --dangerously-skip-permissions -p "$(cat /mnt/shared/projects/tinapple/tasks/O-final-verification.md)"
```

---

## 📋 Task Files Created

| File | Status |
|-------|--------|
| `J-iso-profiledef-fixes.md` | ✅ Complete |
| `K-missing-packages.md` | ✅ Complete |
| `L-airootfs-structure.md` | ✅ Complete |
| `M-mkinitcpio-config.md` | ✅ Complete |
| `N-grub-limine-configs.md` | ✅ Complete |
| `O-chadwm-default.md` | ✅ Complete |

---

Run `agy` commands in order above to complete all ISO improvements.