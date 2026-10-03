# Task L: Create Complete airootfs Structure with Required Files

## Goal
Create all missing airootfs directories and template files required for a production-ready ISO.

## Files/Directories to Create

### 1. mkinitcpio Configuration Files
```
airootfs/etc/mkinitcpio.d/tinapple.preset
airootfs/etc/mkinitcpio.d/linux-lts.preset
airootfs/etc/mkinitcpio.d/linux-cachyos.preset
airootfs/etc/mkinitcpio.conf.d/tinapple.conf
```

### 2. GRUB/Limine Configuration Templates
```
airootfs/etc/default/grub
airootfs/etc/default/grub-btrfs
airootfs/etc/default/limine
airootfs/etc/limine.conf.template
```

### 3. Systemd Service Files
```
airootfs/etc/systemd/system/tinapple-install.service
airootfs/etc/systemd/system/tinapple-firstboot.service
airootfs/etc/systemd/system/getty@tty1.service.d/autologin.conf
```

### 3. Systemd Presets
```
airootfs/usr/lib/systemd/system-preset/90-tinapple.preset
```

### 6. Caddy Config Template
```
airootfs/etc/caddy/Caddyfile.template
```

### 7. GRUB/Limine Config Templates
```
airootfs/etc/default/grub
airootfs/etc/default/grub-btrfs
airootfs/etc/default/limine
airootfs/etc/limine.conf.template
```

### 8. Systemd Presets
```
airootfs/usr/lib/systemd/system-preset/90-tinapple.preset
```

### 9. Systemd Logind Lid Policy
```
airootfs/etc/systemd/logind.conf.d/tinapple-lid.conf
```

### 10. Caddy Config Template
```
airootfs/etc/caddy/Caddyfile.template
```

### 11. GRUB/Limine Config Templates
```
airootfs/etc/default/grub
airootfs/etc/default/grub-btrfs
airootfs/etc/default/limine
airootfs/etc/limine.conf.template
```

### 12. mkinitcpio Presets
```
airootfs/etc/mkinitcpio.d/tinapple.preset
airootfs/etc/mkinitcpio.d/linux-lts.preset
airootfs/etc/mkinitcpio.d/linux-cachyos.preset
airootfs/etc/mkinitcpio.conf.d/tinapple.conf
```

### 12. Systemd Presets
```
airootfs/usr/lib/systemd/system-preset/90-tinapple.preset
```

### 13. Systemd Services
```
airootfs/etc/systemd/system/tinapple-install.service
airootfs/etc/systemd/system/tinapple-firstboot.service
airootfs/etc/systemd/system/getty@tty1.service.d/autologin.conf
```

### 12. Systemd Presets
```
airootfs/usr/lib/systemd/system-preset/90-tinapple.preset
```

### 12. Caddy Config Template
```
airootfs/etc/caddy/Caddyfile.template
```

### 13. GRUB/Limine Config Templates
```
airootfs/etc/default/grub
airootfs/etc/default/grub-btrfs
airootfs/etc/default/limine
airootfs/etc/limine.conf.template
```

## Verification
```bash
# Check all files exist
find /mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs -type f | sort
```