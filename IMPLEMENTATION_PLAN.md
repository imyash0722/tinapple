# tinapple v0.0.1 — Implementation Plan for Antigravity

This document provides the complete implementation plan for building tinapple v0.0.1. Antigravity should implement all components described below, following the architecture in `TINAPPLE_ARCHITECTURE.md`.

---

## Current State (Already Implemented)

- ✅ `TINAPPLE_ARCHITECTURE.md` — Complete architecture specification
- ✅ `tinapple-config-generator/` — Go module with manifest parsing, validation, config generation (Caddy, systemd overrides, network)
- ✅ `tinapple-hw/data/tinapple-hw-db.json` — 40+ device entries for proprietary driver detection (Broadcom, NVIDIA, Realtek)
- ✅ `tinapple-chadwm/bin/tinapple-chadwm-preflight` — GPU/Xorg viability check with graceful degradation
- ✅ Top-level `Makefile` — build/test targets working

---

## Remaining Components to Implement

### 1. tinapple-installer/ — Dual-Path Installer

#### 1.1 Backend Bash Library (`tinapple-installer/backend/lib/`)
Create all modules following Ryoku patterns + CachyOS installer patterns:

| Module | Key Functions |
|--------|---------------|
| `common.sh` | Logging, colors, `run()`, `die()`, `step()`, `append_file()`, locking |
| `preflight.sh` | Architecture check, systemd, root, disk detection, firmware type |
| `bootloader-detect.sh` | **NEW**: Detect UEFI/BIOS, existing bootloader, recommend GRUB/Limine |
| `disk.sh` | Whole-disk default, slider TUI partition editor, multi-drive pools, RAID/LVM/ZFS |
| `fs-select.sh` | **NEW**: ext4 (default) / XFS / Btrfs selection with recommendations |
| `luks.sh` | LUKS2, keyfile, TPM2 auto-unlock, GRUB/Limine cryptodisk support |
| `filesystem.sh` | **Multi-FS**: ext4/XFS mkfs, Btrfs subvolumes, mount options per FS |
| `mount.sh` | Mount order per FS type; systemd mount units for storage pools |
| `pacstrap.sh` | Base + kernel + FS tools + bootloader + profile packages |
| `mirrors.sh` | `rate-mirrors` for Arch + CachyOS mirrorlists |
| `chroot.sh` | arch-chroot helpers with hook masking |
| `configure.sh` | `/etc` generation: hostname, locale, users, sudo, pacman.conf, **manifest.yaml** |
| `cachyos-repo.sh` | CachyOS repos per CPU capability (v3/v4), Architecture override |
| `deploy.sh` | Deploys configs from custom repo packages |
| `network.sh` | systemd-networkd + resolved, NM fallback, static/DHCP |
| `drivers.sh` | **Universal detection**: PCI/USB IDs → driver packages (DKMS + firmware) |
| `bootloader-install.sh` | **GRUB (BIOS/UEFI) + Limine (UEFI)**; UKI for Limine, grub-mkconfig for GRUB |
| `aur.sh` | paru/yay bootstrap for AUR (proprietary drivers, chadwm) |
| `snapshots.sh` | **FS-aware**: snapper for Btrfs; tinapple-snapshot (rsync/borg) for ext4/XFS |
| `offline.sh` | Baked offline repo for ISO |

#### 1.2 Go-based TUI (`tinapple-installer/tui/`)
- Modular TUI using `bubbletea` or similar
- Screens: Welcome → Keyboard → Network → Bootloader Detect → Disk Strategy → Filesystem → LUKS → User/Hostname → Hardware Profile → Kernel Profile → DE Selection → Proprietary Drivers → Confirm → Install
- Progress sentinels: `@@STEP <id>`, `@@DONE`
- Dry-run support (`TINAPPLE_DRYRUN=1`)

#### 1.3 In-Place Bootstrap (`tinapple-installer/bootstrap/`)
- `install.sh` — curl|bash entry point, downloads signed binary, runs TUI
- `tinapple-install` — compiled Go binary containing TUI, shares backend library

#### 1.4 ISO Profile (`tinapple-installer/iso/`)
- `profiledef.sh`, `pacman.conf`, `packages.x86_64`
- `airootfs/` with installer baked in
- `build.sh` using `mkarchiso`

---

### 2. tinapple-base/ — Core Meta-Package

#### 2.1 PKGBUILD (`tinapple-base/PKGBUILD`)
```bash
pkgname=tinapple-base
pkgver=0.0.1
pkgrel=1
arch=(any)
depends=(
  'base' 'linux-lts' 'linux-lts-headers' 'linux-firmware'
  'systemd' 'systemd-sysvcompat' 'systemd-resolved' 'systemd-networkd'
  'networkmanager' 'polkit' 'sudo' 'vim' 'zsh' 'git' 'curl' 'wget'
  'tinapple-keyring' 'tinapple-mirrorlist'
  'tinapple-hw' 'tinapple-boot-apply' 'tinapple-firstboot'
  'tinapple-nginx'
)
optdepends=(
  'tinapple-chadwm: minimal GUI for local admin'
  'tinapple-media: media server stack'
  'tinapple-downloads: download clients'
  'tinapple-backups: backup tools'
  'tinapple-infrastructure: monitoring stack'
  'tinapple-databases: database servers'
)
install=tinapple-base.install
```

#### 2.2 Install Script (`tinapple-base.install`)
```bash
post_install() {
  systemctl enable systemd-resolved systemd-networkd NetworkManager
  systemctl enable tinapple-hw-detect tinapple-power-profile-apply
  systemctl enable tinapple-battery-daemon tinapple-thermal-daemon
  systemctl enable tinapple-nginx
  systemctl enable fstrim.timer
  limine-install $(findmnt -no SOURCE /boot) 2>/dev/null || true
  snapper -c root create-config / 2>/dev/null || true
  snapper -c home create-config /home 2>/dev/null || true
}
```

#### 2.3 Systemd Preset (`systemd-preset/90-tinapple.preset`)
```ini
enable tinapple-hw-detect.service
enable tinapple-power-profile-apply.service
enable tinapple-battery-daemon.service
enable tinapple-thermal-daemon.service
enable tinapple-boot-apply.path
enable tinapple-firstboot.service
enable snapper-timeline.timer
enable snapper-cleanup.timer
enable limine-snapper-sync.service
enable systemd-resolved.service
enable systemd-networkd.service
enable NetworkManager.service
enable fstrim.timer
enable tinapple-nginx.service
```

#### 2.4 Config Files (`configs/`)
- `pacman.conf` with tinapple + CachyOS repos
- `manifest.yaml` (default from Appendix A)
- `logind.conf.d/tinapple-lid.conf` (HandleLidSwitch=ignore)

---

### 3. tinapple-hw/ — Hardware Abstraction Layer

#### 3.1 Binaries (Bash → Go where appropriate)

| Binary | Language | Purpose |
|--------|----------|---------|
| `tinapple-hw-detect` | Go | Detects laptop/desktop, battery, sensors, GPU, thermal zones → writes `/etc/tinapple/hardware.json` |
| `tinapple-battery` | Bash | Charge limits (hysteresis 40-80%), UPS-mode, critical hibernate |
| `tinapple-power-profile` | Go | Form-factor independent profiles (balanced/performance/power-saver/custom) |
| `tinapple-thermal` | Go | Vendor-conditional: Intel thermald / AMD amd_pstate_epp+ryzenadj / generic ACPI |
| `tinapple-ups-monitor` | Bash | NUT/apcupsd integration for external UPS |
| `tinapple-driver-detect` | Go | Scans PCI/USB IDs → matches `tinapple-hw-db.json` → outputs package list |

#### 3.2 Systemd Services (`systemd/`)
- `tinapple-hw-detect.service` (oneshot, boot)
- `tinapple-battery-daemon.service` (system, udev monitor)
- `tinapple-thermal-daemon.service` (system, applies vendor policy)
- `tinapple-power-profile-apply.service` (system, boot)
- `tinapple-ups-monitor.service` (system, conditional)
- `tinapple-driver-detect.service` (oneshot, install-time)

#### 3.3 Configs (`configs/`)
- `logind.conf.d/tinapple-lid.conf` (lid=ignore)
- `power-profiles/` (profile definitions)

---

### 4. tinapple-chadwm/ — Window Manager Package

#### 4.1 chadwm Build (`chadwm/`)
- Clone from `github.com/siduck/chadwm` (tag v0.0.1 or latest)
- Apply patches: systray, pertag, swallow, actualfullscreen, etc.
- `config.def.h` with tinapple keybinds (Mod=Super, gaps, borders)
- Rices: tokyo-night, catppuccin-mocha, gruvbox, nord, rose-pine
- Build from source in PKGBUILD (AUR-style)

#### 4.2 Companion Configs
| Component | Config Files |
|-----------|-------------|
| `picom/` | `picom.conf` (transparency, blur, shadows, fade) |
| `polybar/` | `config.ini` (cpu, mem, disk, net, tinapple-dash status, power profile) |
| `rofi/` | `config.rasi` (launcher + tinapple-dash actions + power menu) |
| `dunst/` | `dunstrc` (notifications) |
| `sxhkd/` | `sxhkdrc` (volume, brightness, session toggle, wm controls) |

#### 4.3 Session Management
- `xinitrc` — starts: chadwm → picom → polybar → dunst → sxhkd
- `chadwm@.service` (user, graphical-session.target)
- `tinapple-session` CLI (toggle headless↔interactive via systemd targets)

---

### 5. tinapple-dash/ — Web Dashboard (Go)

#### 5.1 Structure
```
tinapple-dash/
├── cmd/tinapple-dash/main.go          # Entry point
├── internal/
│   ├── api/                           # REST + WebSocket handlers
│   ├── telemetry/                     # SSE delta frames (system metrics)
│   ├── services/                      # Service control (systemd via dbus)
│   └── config/                        # Manifest integration
├── web/
│   ├── static/                        # CSS, JS, WASM (if any)
│   └── templates/                     # Go templates
├── go.mod
└── Dockerfile (optional)
```

#### 5.2 Key Features
- **SSE Telemetry**: Delta frames (2s tick), initial full snapshot
- **WebSocket**: Real-time service start/stop/restart, log streaming
- **Auth**: Tailscale SSH identity + local cookie session
- **Plugins**: Widget system for service cards (media, downloads, etc.)
- **Caddy Integration**: Reverse proxy via generated Caddyfile

---

### 6. tinapple-nginx/ — Core Reverse Proxy Module

#### 6.1 PKGBUILD
```bash
pkgname=tinapple-nginx
pkgver=0.0.1
depends=('caddy' 'tinapple-config-generator')
install=tinapple-nginx.install
```

#### 6.2 Service & Config
- `tinapple-nginx.service` — runs Caddy with generated Caddyfile
- `tinapple-nginx.install` — enables service, sets up auto-TLS (Let's Encrypt + Tailscale)

---

### 7. Modular Service Packages (`tinapple-service-*`)

Each package follows same pattern:

| Package | Services | Key Files |
|---------|----------|-----------|
| `tinapple-media` | jellyfin, plex, immich, sonarr, radarr, prowlarr, bazarr | systemd units, Caddy templates, config templates |
| `tinapple-downloads` | qbittorrent-nox, transmission, jdownloader2, flaresolverr | systemd units, Caddy templates |
| `tinapple-backups` | restic, borg, rclone, syncthing, snapraid | systemd units, timers, config templates |
| `tinapple-network` | tailscale, wireguard, pihole, unbound | systemd units, Caddy templates |
| `tinapple-infrastructure` | prometheus, grafana, loki, tempo, alertmanager | systemd units, Caddy templates, dashboards |
| `tinapple-databases` | postgresql, mariadb, redis, mongodb, influxdb | systemd units, config templates |

Each package includes:
- `PKGBUILD` with proper dependencies
- `tinapple-service-meta.yaml` (dependencies, ports, health checks)
- `systemd/` units with `tinapple.service=active` tag
- `configs/` templates for `tinapple-config-generator`
- `install` script for post-install setup

---

### 8. tinapple-maintenance/ — Health & Updates

#### 8.1 Binaries
| Binary | Purpose |
|--------|---------|
| `tinapple-health-check` | SMART, ZFS/Btrfs scrub, service health, disk space, cert expiry |
| `tinapple-update-hook` | Pacman hook: pre/post snapshots, config migration, service restart |
| `tinapple-rollback` | CLI: `tinapple rollback <snapshot-id>` (limine menu integration) |

#### 8.2 Pacman Hooks
- `90-tinapple-update.hook` — PreTransaction: snapper create "pre-update"
- `91-tinapple-update.hook` — PostTransaction: config migration, daemon-reload, service restart, limine-mkinitcpio, snapper create "post-update", limine-snapper-sync

---

### 9. tinapple-firstboot/ — First-Boot Setup

#### 9.1 Service
- `tinapple-firstboot.service` (oneshot, After=network-online.target)
- Runs `tinapple-setup` wizard (interactive or headless via SSH)

#### 9.2 Setup Wizard (`tinapple-setup`)
- Tailscale OAuth authentication
- Hardware profile confirmation
- Service profile selection (media/downloads/backups)
- Ease-of-use mode toggle
- Writes final `/etc/tinapple/manifest.yaml`

---

### 10. Repository Infrastructure

#### 10.1 tinapple-repo/
```
tinapple-repo/
├── packages/                    # PKGBUILD directories
│   ├── tinapple-base/
│   ├── tinapple-hw/
│   ├── tinapple-chadwm/
│   ├── tinapple-dash/
│   ├── tinapple-nginx/
│   ├── tinapple-config-generator/
│   ├── tinapple-maintenance/
│   ├── tinapple-firstboot/
│   ├── tinapple-media/
│   ├── tinapple-downloads/
│   ├── tinapple-backups/
│   ├── tinapple-network/
│   ├── tinapple-infrastructure/
│   └── tinapple-databases/
├── .github/workflows/repo.yml   # CI/CD: build → sign → publish
├── Makefile                     # repo-add, sign, publish
└── scripts/
    ├── build-package.sh
    └── sign-package.sh
```

#### 10.2 CI/CD (`.github/workflows/repo.yml`)
```yaml
on:
  push:
    paths: ['packages/**']
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    container: archlinux:base-devel
    steps:
      - checkout
      - for pkg in packages/*; do (cd "$pkg" && makepkg -sf --noconfirm); done
      - repo-add -s -k $SIGN_KEY tinapple.db.tar.zst *.pkg.tar.zst
      - upload artifacts
      - deploy to GitHub Pages + mirror sync
```

---

### 11. ISO Build Profile

#### 11.1 `tinapple-installer/iso/`
- `profiledef.sh` — iso_name="tinapple-os", install_dir="tinapple"
- `pacman.conf` — includes tinapple-repo + CachyOS
- `packages.x86_64` — base + installer + tinapple-base + tinapple-install
- `airootfs/` — overlay with installer binary, configs
- `build.sh` — `mkarchiso -v -w /tmp/tinapple-iso -o ./out .`

---

### 12. Key Integration Points

| Component | Integrates With |
|-----------|-----------------|
| Installer | Writes manifest.yaml → used by config-generator, firstboot |
| config-generator | Generates Caddyfile, systemd overrides, network.conf from manifest |
| tinapple-hw | Provides hardware.json → read by firstboot, thermal, battery |
| tinapple-dash | Reads manifest.yaml → displays services, controls via systemd |
| tinapple-nginx | Runs Caddy with generated Caddyfile |
| Service packages | Declare systemd units + templates → instantiated by config-generator |
| Maintenance hooks | Trigger on pacman transactions → snapper + config migration |

---

## Build Verification Checklist

- [ ] `make test` passes (bash syntax + Go tests)
- [ ] `make build` produces binaries: `tinapple-config-generator`, `tinapple-dash`, `tinapple-install` (TUI)
- [ ] All PKGBUILDs build with `makepkg -sf` in clean chroot
- [ ] `repo-add` creates valid signed database
- [ ] ISO builds with `mkarchiso` (test in QEMU)
- [ ] In-place bootstrap works on minimal Arch VM
- [ ] Hardware detection works on laptop + desktop
- [ ] chadwm preflight passes on GPU system, falls back on headless
- [ ] Session toggle (headless↔interactive) works without reboot
- [ ] Caddy auto-TLS works with Tailscale MagicDNS
- [ ] Proprietary driver detection finds BCM943228HMB + NVIDIA GPUs

---

## Delivery Instructions for Antigravity

1. **Implement all components** in parallel using internal subagents
2. **Verify each component** builds and tests pass
3. **Integrate** — ensure installer writes manifest, config-generator reads it, services declare units
4. **Test end-to-end** in VM (ISO + in-place bootstrap)
5. **Return** final status with build artifacts location

Start with the installer backend library (bash) and tinapple-base PKGBUILD, as they're foundational.