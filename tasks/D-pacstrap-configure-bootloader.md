# Task D: Pacstrap, System Config, Bootloader Install

## Files to Modify/Verify
- `/mnt/shared/projects/tinapple/tinapple-installer/backend/lib/pacstrap.sh`
- `/mnt/shared/projects/tinapple/tinapple-installer/backend/lib/configure.sh`
- `/mnt/shared/projects/tinapple/tinapple-installer/backend/lib/bootloader-install.sh`
- `/mnt/shared/projects/tinapple/tinapple-installer/backend/lib/cachyos-repo.sh`
- `/mnt/shared/projects/tinapple/tinapple-installer/backend/lib/deploy.sh`

## Requirements

### 1. pacstrap.sh - Package Installation
**Environment Variables:**
- `TINAPPLE_KERNEL_PROFILE` - `lts`, `hardened`, `current`
- `TINAPPLE_CACHYOS_REPOS` - `true`/`false`
- `TINAPPLE_PROFILES` - comma-separated: `base,media,downloads,backups,network,infrastructure,databases`
- `TINAPPLE_DRYRUN` - `1` for dry-run

**Requirements:**
- Build package list from profiles:
  - `base`: base, linux-{profile}, linux-{profile}-headers, linux-firmware, systemd, networkmanager, sudo, etc.
  - `media`: jellyfin, sonarr, radarr, prowlarr, bazarr, plex, immich
  - `downloads`: qbittorrent-nox, transmission, jdownloader2, flaresolverr
  - `backups`: restic, borg, rclone, syncthing, snapraid
  - `network`: tailscale, wireguard-tools, pihole, unbound
  - `infrastructure`: prometheus, grafana, loki, tempo, alertmanager, node_exporter, cadvisor
  - `databases`: postgresql, mariadb, redis, mongodb, influxdb
- Enable CachyOS repos if `TINAPPLE_CACHYOS_REPOS=true` (x86-64-v3/v4)
- Run `pacstrap -K /mnt <packages>` with `-K` for key verification
- Handle AUR packages via paru/yay if needed

### 2. configure.sh - System Configuration
**Requirements:**
- Generate `/etc/fstab` with UUIDs (`genfstab -U /mnt`)
- Set hostname (`/etc/hostname`)
- Set locale (`/etc/locale.gen`, `locale-gen`)
- Set timezone (`ln -sf /usr/share/zoneinfo/... /etc/localtime`)
- Set hardware clock (`hwclock --systohc`)
- Create user with wheel group, set password (from manifest)
- Configure sudo: `%wheel ALL=(ALL) NOPASSWD: ALL`
- Enable systemd services:
  - `systemd-resolved`, `systemd-networkd`, `NetworkManager`
  - `tinapple-hw-detect`, `tinapple-battery-daemon`, `tinapple-thermal-daemon`, `tinapple-power-profile-apply`
  - Profile-specific services (jellyfin, qbittorrent, etc.)
- Configure mkinitcpio:
  - HOOKS: `base udev autodetect microcode modconf kms keyboard keymap consolefont block encrypt lvm2 filesystems keyboard fsck`
  - Add `archiso` hooks for live environment
  - Run `mkinitcpio -P` for all installed kernels
- Configure bootloader entries (GRUB/Limine)
- Set root password (from manifest)
- Create user with wheel group, set password

### 3. bootloader-install.sh - Bootloader Installation
**Requirements:**
- Detect firmware: `[[ -d /sys/firmware/efi ]]` → UEFI, else BIOS
- **UEFI (systemd-boot + Limine):**
  - `bootctl install --path=/boot`
  - Install limine: `limine-install /dev/sdX` (ESP)
  - Create loader entries in `/boot/loader/entries/`
  - Configure limine: `/boot/limine.conf`
  - Handle LUKS: `rd.luks.name=UUID=...` in kernel cmdline
- **BIOS (GRUB):**
  - `grub-install --target=i386-pc /dev/sdX`
  - `grub-mkconfig -o /boot/grub/grub.cfg`
  - Handle LUKS: `GRUB_ENABLE_CRYPTODISK=y`
- Handle LUKS encryption in both modes
- Generate proper kernel cmdline with root UUID, LUKS, resume, etc.

### 4. cachyos-repo.sh - CachyOS Repository Setup
**Requirements:**
- Detect CPU capabilities (`/lib/ld-linux-x86-64.so.2 --help | grep x86-64-v3`)
- Add CachyOS repos to `/etc/pacman.conf`:
  - x86-64-v3: `[cachyos-v3]`, `[cachyos-core-v3]`, `[cachyos-extra-v3]`
  - x86-64-v4: `[cachyos-v4]`, `[cachyos-core-v4]`, `[cachyos-extra-v4]`
- Set `Architecture = auto x86_64_v3` (or v4)
- Import and trust CachyOS key: `pacman-key --recv-keys F3B607488DB35A47 --keyserver keyserver.ubuntu.com && pacman-key --lsign-key F3B607488DB35A47`
- Install `cachyos-keyring`, `cachyos-mirrorlist`

### 5. deploy.sh - Config Deployment
**Requirements:**
- Generate configs from manifest using `tinapple-config-generator`
- Deploy to target system (`/mnt/etc/`, `/mnt/usr/share/tinapple/`)
- Generate Caddyfile from manifest services
- Generate systemd drop-ins for service overrides
- Generate network configuration (systemd-networkd)

## Deliverables
- Verified working `pacstrap.sh`, `configure.sh`, `bootloader-install.sh`, `cachyos-repo.sh`, `deploy.sh`
- Dry-run shows correct commands

## Verification
```bash
TINAPPLE_DRYRUN=1 /usr/lib/tinapple-installer/backend/lib/pacstrap.sh
TINAPPLE_DRYRUN=1 /usr/lib/tinapple-installer/backend/lib/configure.sh
TINAPPLE_DRYRUN=1 /usr/lib/tinapple-installer/backend/lib/bootloader-install.sh
TINAPPLE_DRYRUN=1 /usr/lib/tinapple-installer/backend/lib/cachyos-repo.sh
TINAPPLE_DRYRUN=1 /usr/lib/tinapple-installer/backend/lib/deploy.sh
make test
```

## Integration
Each stage must:
1. Source `/usr/lib/tinapple-installer/backend/lib/common.sh`
2. Export output variables for next stage
4. Return 0 on success, non-zero on failure
5. Print `@@STEP <stage>` on start, `@@DONE <stage>` on success
6. Respect `TINAPPLE_DRYRUN=1` (print commands without executing)