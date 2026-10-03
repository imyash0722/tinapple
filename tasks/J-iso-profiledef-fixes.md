# Task J: Fix ISO profiledef.sh - Critical Boot/Build Issues

## Goal
Fix profiledef.sh to match Arch releng standards and fix boot/build failures.

## Required Changes to `/mnt/shared/projects/tinapple/tinapple-installer/iso/profiledef.sh`

### 1. Fix bootmodes (CRITICAL - breaks UEFI boot)
```bash
# CURRENT (BROKEN):
bootmodes=('bios.syslinux' 'uefi.systemd-boot')

# FIX:
bootmodes=('bios.syslinux.mbr' 'uefi-x64.systemd-boot')
```

### 2. Add missing architecture declaration
```bash
arch="x86_64"
```

### 3. Add pacman.conf reference
```bash
pacman_conf="pacman.conf"
```

### 4. Fix airootfs_image_tool_options (use Arch standard xz compression)
```bash
# CURRENT:
airootfs_image_tool_options=('-comp' 'zstd' '-Xcompression-level' '19')

# FIX - Use Arch standard xz with BCJ filter:
airootfs_image_tool_options=('-comp' 'xz' '-Xbcj' 'x86' '-b' '1M' '-Xdict-size' '1M')
```

### 5. Expand file_permissions to match Arch releng
```bash
file_permissions=(
  ["/etc/shadow"]="0:0:400"
  ["/root"]="0:0:750"
  ["/root/.automated_script.sh"]="0:0:755"
  ["/usr/local/bin/tinapple-install"]="0:0:755"
  ["/usr/local/bin/tinapple-bootstrap"]="0:0:755"
  ["/usr/local/bin/tinapple-installer"]="0:0:755"
  ["/usr/local/bin/tinapple-bootstrap"]="0:0:755"
  ["/usr/local/bin/tinapple-hw-detect"]="0:0:755"
  ["/usr/lib/tinapple-installer/backend/run-stage.sh"]="0:0:755"
  ["/usr/local/bin/choose-mirror"]="0:0:755"
  ["/usr/local/bin/Installation_guide"]="0:0:755"
  ["/usr/local/bin/livecd-sound"]="0:0:755"
)
```

## Files to Modify
- `/mnt/shared/projects/tinapple/tinapple-installer/iso/profiledef.sh`

## Verification
```bash
# Test profiledef syntax
bash -n /mnt/shared/projects/tinapple/tinapple-installer/iso/profiledef.sh
```