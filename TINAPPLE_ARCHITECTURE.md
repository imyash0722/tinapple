# tinapple — Technical Architecture Specification

> **Complete architectural overhaul and replacement of Tinarchy with a robust, production-ready homelab operating system designed for bare-metal home servers, repurposed hardware, and laptops.**

---

## Table of Contents

1. [Legacy vs. Next-Gen Comparative Analysis](#1-legacy-vs-next-gen-comparative-analysis)
2. [Installer Specification](#2-installer-specification)
3. [Repository & Packaging Blueprint](#3-repository--packaging-blueprint)
4. [Hardware & Power Abstraction](#4-hardware--power-abstraction)
5. [Session & Window Management Architecture](#5-session--window-management-architecture)
6. [Modular Service Architecture](#6-modular-service-architecture)
7. [Remote Usability & Ease-of-Use Mode](#7-remote-usability--ease-of-use-mode)
8. [Milestone Roadmap](#8-milestone-roadmap)

---

## 1. Legacy vs. Next-Gen Comparative Analysis

### 1.1 Tinarchy — What It Was

Tinarchy (Pinedash) was a **dashboard-and-services orchestration layer** deployed via a single `install.sh` script on top of an existing Arch Linux system. Key characteristics:

| Aspect | Tinarchy Implementation |
|--------|------------------------|
| **Deployment Model** | Post-install script (`install.sh`) — clones repo, deploys configs, enables systemd units |
| **Package Management** | Direct `pacman`/`yay` calls inside installer; no custom repository |
| **Kernel Strategy** | Stock Arch `linux` only; no kernel profile selection |
| **Hardware Support** | Basic laptop lid handling (`HandleLidSwitch=ignore` in logind.conf), display sleep daemon |
| **ISO Build** | Archiso profile with baked packages; no CachyOS integration |
| **Repository Layer** | None — all packages from Arch official + AUR |
| **Configuration** | Single monolithic `install.sh` with interactive prompts; config persisted in `.env` |
| **Session Management** | TTY1 autologin + tmux; optional graphical dashboard via nginx |
| **Update Mechanism** | `git pull` + re-run installer; no atomic rollback |

**Pain Points Identified:**

1. **No first-class ISO installer** — the ISO profile existed but was not a guided, user-friendly installation path (no TUI, no disk partitioning UI, no network setup wizard).
2. **No in-place transformation** — required a pre-installed Arch base; could not "convert" a minimal Arch install cleanly.
3. **Single kernel option** — no LTS/Hardened/Current profile selection; homelab hardware (older storage controllers, proprietary NICs) suffered regressions on rolling kernels.
4. **No performance repository layer** — missed CachyOS compiler-optimized binaries (`x86-64-v3/v4`), tuned allocators, and kernel patchsets.
5. **Laptop support was ad-hoc** — `logind.conf` globally ignored lid events; no clamshell mode, no battery charge limiting, no thermal profiles, no ACPI inhibitor daemon.
6. **Configuration drift** — single `.env` file with no schema, no versioning, no migration path.
7. **No custom repository** — all homelab service configs, deployment recipes, and maintenance scripts lived in the git repo, not as installable packages with proper dependency tracking.
8. **Bootloader management** — manual GRUB/syslinux config in ISO; no UKI, no snapper/limine integration, no rollback UI.
9. **Service orchestration was implicit** — systemd units dropped in `/etc/systemd/system/` with `sed` variable substitution; no declarative service profiles, no enable/disable API.

### 1.2 tinapple — What It Becomes

tinapple is a **complete homelab operating system** with three pillars:

| Pillar | Description |
|--------|-------------|
| **Installer** | Dual-path: (a) Guided ISO (TUI) for bare metal, (b) In-place bootstrap script for existing Arch |
| **Repository** | Custom `tinapple` repo + CachyOS performance layer (`x86-64-v3/v4`) as first-class citizens |
| **Kernel Profiles** | Three selectable profiles (LTS default, Hardened, Current) with transparent guidance |

**Architectural Principles:**

- **Declarative over imperative** — system state described in package metadata and systemd presets, not shell script side effects.
- **Atomic updates with rollback** — snapper + limine UKI boot entries + CachyOS kernel manager pattern.
- **Hardware abstraction as a subsystem** — dedicated `tinapple-hw` package providing battery, thermal, power-profile, and driver-detection tools.
- **Repository as product** — custom repo hosts not just packages but **deployment profiles** (systemd presets, config templates, migration hooks).
- **Headless-first, local-admin-optional** — graphical environment is a toggleable package group, not the default.

---

## 2. Installer Specification

Based on **modular backend library patterns** (bash modules for preflight→disk→luks→fs→mount→pacstrap→configure→deploy→bootloader) and **in-place bootstrap patterns** (curl|bash → signed binary → TUI), with **CachyOS installer** patterns for bootloader detection and filesystem selection.

### 2.1 Dual-Path Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     tinapple-installer                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────┐  ┌───────────────────────────────┐  │
│  │   ISO Path (TUI)      │  │   In-Place Path (Script)      │  │
│  │   ┌─────────────────┐ │  │   ┌─────────────────────────┐ │  │
│  │   │ mkarchiso       │ │  │   │ curl | bash bootstrap   │ │  │
│  │   │ profile + archiso│ │  │   │ → downloads binary    │ │  │
│  │   └─────────────────┘ │  │   │ → runs TUI on target  │ │  │
│  └───────────────────────┘  │   └─────────────────────────┘ │  │
│           │                  └──────────────┬────────────────┘  │
│           ▼                                 ▼                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              SHARED BACKEND LIBRARY (bash)              │   │
│  │  preflight → bootloader-detect → disk → luks           │   │
│  │  → fs-select → mount → pacstrap → configure            │   │
│  │  → cachyos-repo → deploy → bootloader-install          │   │
│  │  → snapshots → hooks-restore → done                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Bootloader: Smart Detection (GRUB + Limine Only)

**Supported Bootloaders:** **GRUB (BIOS/MBR + UEFI)** and **Limine (UEFI only)** — no other bootloaders.

**Detection Logic (adapted from CachyOS installer):**

```bash
# In bootloader-detect.sh (runs early in preflight)
tinapple_bootloader_detect() {
  # 1. Firmware type
  if [ -d /sys/firmware/efi ]; then
    FIRMWARE="uefi"
  else
    FIRMWARE="bios"
  fi

  # 2. Existing bootloader (for in-place installs)
  if [ -f /boot/grub/grub.cfg ] || [ -f /boot/grub2/grub.cfg ]; then
    EXISTING_BOOTLOADER="grub"
  elif [ -f /boot/EFI/limine/limine.conf ] || [ -f /boot/limine.conf ]; then
    EXISTING_BOOTLOADER="limine"
  else
    EXISTING_BOOTLOADER="none"
  fi

  # 3. Recommendation logic
  case $FIRMWARE in
    uefi)
      # UEFI: prefer Limine (modern, UKI-native), but GRUB is fully supported
      if [ "$EXISTING_BOOTLOADER" = "grub" ]; then
        RECOMMENDED="grub"      # Preserve existing
      else
        RECOMMENDED="limine"    # Default for new UEFI installs
      fi
      ;;
    bios)
      # BIOS: ONLY GRUB works; Limine cannot boot BIOS
      RECOMMENDED="grub"
      ;;
  esac

  # 4. TUI presents choice with recommendation highlighted
  #    User can override, but BIOS+Limine is blocked with clear error
}
```

**Installer Behavior:**
- **ISO install**: Detects firmware, recommends bootloader, installs selected one
- **In-place install**: Detects existing bootloader, preserves by default, offers migration (GRUB ↔ Limine on UEFI only)
- **No systemd-boot, no refind, no other bootloaders** — keeps testing matrix minimal

### 2.3 Filesystem Selection: ext4 / XFS / Btrfs

**Supported Filesystems:** **ext4 (default)**, **XFS**, **Btrfs** — user choice at install time.

| Filesystem | Default For | Use Case |
|------------|-------------|----------|
| **ext4** | **All new installs** | Proven stability, low CPU overhead, excellent for server/storage workloads |
| **XFS** | Large storage arrays (>16TB) | High parallelism, excellent for media/backup volumes |
| **Btrfs** | Snapshots required | COW, native snapshots, but higher CPU overhead |

**Implementation:**
- `fs-select.sh` module presents TUI with recommendation (ext4 default)
- Partitioning logic adapts: ext4/XFS use standard partitions; Btrfs uses subvolumes
- No snapper/limine-snapper-sync for ext4/XFS (use `tinapple-snapshot` with rsync/borg instead)
- Root filesystem choice persists in `/etc/tinapple/manifest.yaml`

### 2.4 Partitioning & Disk Layout

**Server Use Case: Single-Boot, Full-Disk Default**

```
Disk Strategy TUI:
┌─────────────────────────────────────────────────────────────┐
│  [■] Use entire disk (recommended for servers)             │
│  [□] Custom layout (advanced)                               │
└─────────────────────────────────────────────────────────────┘
```

**Default Layout (Whole Disk, ext4 example):**

```
┌─────────────────────────────────────────────────────────────┐
│  /dev/sda (entire disk)                                     │
├──────────┬──────────────┬──────────────────────────────────┤
│ ESP      │ Swap         │ Root (ext4)                      │
│ 1 GiB    │ 4 GiB (opt)  │ 100% remaining                   │
│ FAT32    │ linux-swap   │ /                                │
└──────────┴──────────────┴──────────────────────────────────┘
```

**Custom Layout TUI (Slider-Based):**

```
┌─────────────────────────────────────────────────────────────┐
│  Partition Editor: /dev/sda (465 GiB)                      │
├─────────────────────────────────────────────────────────────┤
│  [ESP]      ████░░░░░░░░░░░░░░░░░░░░  1.0 GiB  (fixed)      │
│  [Swap]     ████████░░░░░░░░░░░░░░  8.0 GiB  ◄── slider     │
│  [Root]     ████████████████████████  456 GiB  ◄── slider   │
│  [Free]     ░░░░░░░░░░░░░░░░░░░░░░░░  0 GiB   ◄── slider   │
├─────────────────────────────────────────────────────────────┤
│  [+] Add partition   [−] Remove   [↑][↓] Reorder            │
│  Filesystem: [ext4 ▼]  Mount: [/ ▼]  Label: [tinapple-root] │
└─────────────────────────────────────────────────────────────┘
```

**Multi-Drive Support (Advanced Tab):**

```
┌─────────────────────────────────────────────────────────────┐
│  Storage Pools (for services: media, downloads, backups)   │
├─────────────────────────────────────────────────────────────┤
│  /dev/sdb  ████████████░░░░░░░░  2.0 TiB  [+] Add to pool   │
│  /dev/sdc  ████████████████████  4.0 TiB  [+] Add to pool   │
│                                                             │
│  Pool: [media-pool]  RAID: [raid1 ▼]  FS: [xfs ▼]          │
│  Mount: /mnt/media  Services: jellyfin, plex, immich       │
└─────────────────────────────────────────────────────────────┘
```

- LVM2 + mdadm for RAID; ZFS available via `tinapple-zfs` extra package
- Each pool gets a systemd mount unit + service dependency

### 2.5 ISO Installer (TUI Path)

**Technology Stack:** Go-based TUI (modular, testable components) + Bash backend library.

**Flow:**

```
Welcome → Keyboard → Network (NM) → Bootloader Detect → Disk Strategy
    │
    ├─► Whole Disk (slider-based partition editor)
    │
    └─► Custom Layout (multi-drive, RAID, LVM, ZFS)
         │
         ▼
    Filesystem Selection (ext4 ▼ / XFS / Btrfs)
         │
         ▼
    LUKS Encryption (optional, passphrase + TPM2 auto-unlock)
         │
         ▼
    Hostname / Username / Password / Locale / Timezone
         │
         ▼
    Hardware Profile ◄── KEY: Desktop vs Laptop (auto-detected)
         ┌──────────────────────────────────────────────────┐
         │ [Desktop]  ──► Auto-detected on desktop hardware │
         │ [Laptop]   ──► Auto-detected on laptop hardware  │
         │     └─► Enables: battery backup management,      │
         │         thermal zones, lid-ignore-by-default     │
         └──────────────────────────────────────────────────┘
         │
         ▼
    Kernel Profile Selection
         ┌──────────────────────────────────────────────────┐
         │ [LTS] 6.12.x  ──► RECOMMENDED DEFAULT            │
         │     "Stability for homelabs; wide                │
         │     proprietary driver compatibility"             │
         ├──────────────────────────────────────────────────┤
         │ [Hardened] 6.12.x-hardened                       │
         │     "High-security; stricter memory,             │
         │     may conflict with proprietary modules"        │
         ├──────────────────────────────────────────────────┤
         │ [Current] 6.14.x                                 │
         │     "Newer hardware; rolling updates,             │
         │     may break slower proprietary drivers"         │
         └──────────────────────────────────────────────────┘
         │
         ▼
    Desktop Environment Selection
         ┌──────────────────────────────────────────────────┐
         │ [None]       Headless server (DEFAULT)           │
         │ [chadwm]     Minimal GUI for local admin          │
         │     └─► Graceful degradation: if GPU unsupported,│
         │         falls back to headless + tty-dash        │
         └──────────────────────────────────────────────────┘
         │
         ▼
    Proprietary Drivers (Explicit Consent)
         ┌──────────────────────────────────────────────────┐
         │ [ ] Enable proprietary driver support            │
         │     Detected: BCM943228HMB (Broadcom WiFi)       │
         │     Packages: broadcom-wl-dkms, linux-headers    │
         │     [Show all detected hardware]                 │
         └──────────────────────────────────────────────────┘
         │
         ▼
    Confirmation → Install (progress sentinels @@STEP/@@DONE)
         │
         ▼
    Reboot into tinapple
```

**Backend Modules:**

| Module | Responsibility |
|--------|----------------|
| `preflight.sh` | Architecture, systemd, root, disk, **firmware type detection** |
| `bootloader-detect.sh` | **NEW**: Detects firmware, existing bootloader, recommends GRUB/Limine |
| `disk.sh` | **Extended**: Whole-disk default, slider TUI, multi-drive pools, RAID/LVM/ZFS |
| `fs-select.sh` | **NEW**: ext4/XFS/Btrfs selection with recommendations |
| `luks.sh` | LUKS2, keyfile, TPM2 auto-unlock, GRUB/Limine cryptodisk support |
| `filesystem.sh` | **Multi-FS**: ext4/XFS mkfs, Btrfs subvolumes, mount options per FS |
| `mount.sh` | Mount order per filesystem type; systemd mount units for pools |
| `pacstrap.sh` | Base + kernel + FS tools + bootloader + profile packages |
| `mirrors.sh` | `rate-mirrors` for Arch + CachyOS |
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

### 2.3 In-Place Bootstrap (Script Path)

**Entry Point:** `curl -fsSL https://get.tinapple.dev | bash`

```bash
#!/usr/bin/env bash
# tinapple-bootstrap: transforms a minimal Arch into tinapple
# - Detects distro (Arch/Debian derivatives)
# - Verifies systemd, x86_64, not root
# - Downloads signed binary installer (tinapple-install binary)
# - Executes TUI with answers from flags (--yes, --profile, --kernel, etc.)

TINAPPLE_BOOTSTRAP_REF="main"
RAW_URL="https://raw.githubusercontent.com/tinapple/tinapple-arch/main/bootstrap"
```

**Binary Installer (`tinapple-install`):**

- Compiled Go binary containing the TUI
- Shares the **exact same backend library** as ISO path
- Runs inside the live system (target = `/`)
- Uses `TINAPPLE_DRYRUN` for simulation
- Post-install: runs `tinapple-boot-apply` (plymouth + bootloader sync), enables `tinapple-firstboot` service

### 2.4 Kernel Profile Implementation

**Package Mapping:**

| Profile | Kernel Package | Headers | Initramfs Hook | Boot Entry |
|---------|----------------|---------|----------------|------------|
| LTS | `linux-lts` | `linux-lts-headers` | `mkinitcpio` preset `lts` | `tinapple-lts` (default) |
| Hardened | `linux-hardened` | `linux-hardened-headers` | `mkinitcpio` preset `hardened` | `tinapple-hardened` |
| Current | `linux` | `linux-headers` | `mkinitcpio` preset `default` | `tinapple-current` |

**CachyOS Kernel Integration (Opt-in):**

- Post-install via `tinapple-extras` (modular extra package bundle)
- Adds `[cachyos-v3]` repo only (not core/extra rebuilds)
- Installs `linux-cachyos` + `linux-cachyos-headers`
- Boot entry: `tinapple-cachyos` (non-default)
- Removal: `tinapple-pkg-remove linux-cachyos` leaves repo inert

---

## 3. Repository & Packaging Blueprint

### 3.1 Repository Structure

```
tinapple-repo/
├── tinapple.db.tar.zst          # Signed repository database
├── tinapple.files.tar.zst       # File list
├── x86_64/
│   ├── tinapple-keyring-20250101-1-any.pkg.tar.zst
│   ├── tinapple-mirrorlist-1-1-any.pkg.tar.zst
│   ├── tinapple-base-1.0-1-any.pkg.tar.zst           # Meta-package: base system config
│   ├── tinapple-desktop-1.0-1-any.pkg.tar.zst        # Meta-package: minimal WM + dash
│   ├── tinapple-media-1.0-1-any.pkg.tar.zst          # Meta-package: jellyfin, *arr stack
│   ├── tinapple-hw-1.0-1-x86_64.pkg.tar.zst          # Hardware abstraction (clamshell, power, thermal)
│   ├── tinapple-dash-0.1.0-1-x86_64.pkg.tar.zst      # Web dashboard (Go/Rust, not Python)
│   ├── tinapple-install-1.0-1-x86_64.pkg.tar.zst     # Installer binary + backend libs
│   ├── tinapple-boot-apply-1.0-1-x86_64.pkg.tar.zst  # Plymouth + Limine sync hook
│   ├── tinapple-firstboot-1.0-1-any.pkg.tar.zst      # First-boot setup service
│   ├── tinapple-config-generator-1.0-1-x86_64.pkg.tar.zst  # Config templating engine
│   └── tinapple-maintenance-1.0-1-any.pkg.tar.zst    # Update hooks, health checks, migrations
├── x86_64_v3/                   # CachyOS v3 rebuilds (if we rebuild)
└── x86_64_v4/                   # CachyOS v4 rebuilds (if we rebuild)
```

### 3.2 Key Packages

#### `tinapple-keyring`
- GPG key for repository signing
- `pacman-key --populate tinapple` in post-install

#### `tinapple-mirrorlist`
- Multiple tiers: CDN, regional mirrors, fallback
- `rate-mirrors` integration for auto-ranking

#### `tinapple-base` (meta-package)
```
depends=(
  'base' 'linux-lts' 'linux-lts-headers' 'linux-firmware'
  'systemd' 'systemd-sysvcompat' 'systemd-resolved' 'systemd-networkd'
  'btrfs-progs' 'snapper' 'limine' 'mkinitcpio' 'plymouth'
  'networkmanager' 'polkit' 'sudo' 'vim' 'zsh' 'git' 'curl' 'wget'
  'tinapple-keyring' 'tinapple-mirrorlist'
  'tinapple-hw' 'tinapple-boot-apply' 'tinapple-firstboot'
)
install=tinapple-base.install  # Runs: systemctl enable services, limine install, snapper create-root
```

#### `tinapple-hw` — Hardware Abstraction Layer

| Binary | Purpose |
|--------|---------|
| `tinapple-hw-detect` | Hardware detection: laptop vs desktop, battery, sensors, GPU, thermal zones |
| `tinapple-battery` | Battery charge limits (hysteresis), UPS-mode behavior, critical hibernate |
| `tinapple-power-profile` | Form-factor independent power profiles (balanced/performance/power-saver/custom) |
| `tinapple-thermal` | Vendor-conditional thermal management (Intel thermald / AMD amd_pstate_epp / generic ACPI) |
| `tinapple-ups-monitor` | NUT/apcupsd integration for external UPS |
| `tinapple-driver-detect` | Universal proprietary driver detection (PCI/USB IDs → packages) |

**Systemd Integration:**
- `tinapple-battery-daemon.service` (system) — monitors power_supply udev events
- `tinapple-thermal-daemon.service` (system) — applies vendor-specific thermal policy
- `tinapple-ups-monitor.service` (system, conditional) — external UPS monitoring
- `tinapple-power-profile-apply.service` (system, boot) — applies power profile
- `tinapple-hw-detect.service` (oneshot, boot) — populates `/etc/tinapple/hardware.json`

#### `tinapple-dash` — Web Dashboard
- **Rewrite from Python (Tinarchy) → Go/Rust** for performance, single binary, no runtime deps
- SSE telemetry (delta frames like Tinarchy's smart SSE)
- WebSocket for real-time service control
- Reverse proxy via **Caddy** (auto-TLS via Tailscale/Let's Encrypt) instead of nginx
- Plugin architecture for service widgets (qBittorrent, Jellyfin, Syncthing, etc.)

#### `tinapple-config-generator`
- Templating engine (Go templates + Sprig) for all service configs
- Input: `/etc/tinapple/manifest.yaml` (declarative service list + overrides)
- Output: systemd drop-ins, nginx/Caddy site configs, app config files (YAML/TOML/JSON)
- Supports **config versioning + migration hooks** (semver per service)

#### `tinapple-maintenance`
- `tinapple-health-check` — SMART, ZFS/Btrfs scrub, service health, disk space, cert expiry
- `tinapple-update-hook` — pacman hook: pre/post transaction snapshots, config migration, service restart
- `tinapple-rollback` — CLI: `tinapple rollback <snapshot-id>` (limine menu integration)

#### `tinapple-nginx` — Core Reverse Proxy Module
- **Core module** (always installed with `tinapple-base`)
- Provides: Caddy reverse proxy with auto-TLS (Let's Encrypt + Tailscale)
- Configuration via `tinapple-config-generator` from manifest.yaml
- Service: `tinapple-nginx.service` (enabled by default)

#### `tinapple-service-*` — Modular Service Packages
All services **except nginx** are modular, installable/removable independently:

| Package | Services | Profile |
|---------|----------|---------|
| `tinapple-media` | jellyfin, plex, immich, *arr stack (sonarr, radarr, prowlarr, bazarr) | media |
| `tinapple-downloads` | qbittorrent-nox, transmission, jdownloader2, flaresolverr | downloads |
| `tinapple-backups` | restic, borg, rclone, syncthing, snapraid | backups |
| `tinapple-network` | tailscale, wireguard, pihole, unbound, nginx-stream | network |
| `tinapple-infrastructure` | prometheus, grafana, loki, tempo, alertmanager | monitoring |
| `tinapple-databases` | postgresql, mariadb, redis, mongodb, influxdb | databases |

**Each modular package:**
- Declares systemd units with `tinapple.service=active` tag
- Includes `tinapple-config-generator` templates
- Has `tinapple-service-meta.yaml` with dependencies, ports, health checks
- Installed via: `tinapple-service install media` (or `pacman -S tinapple-media`)

### 3.3 CachyOS Performance Layer Integration

**Pacman Configuration (generated by `cachyos-repo.sh` in installer, managed by `tinapple-base.install`):**

```ini
# /etc/pacman.d/tinapple-cachyos.conf  (included from pacman.conf)
# Auto-generated; do not edit directly. Use: tinapple-cachyos-repo {enable|disable|status}

# Architecture override for v3 packages
Architecture = auto x86_64_v3

# CachyOS v3 repositories (kernel + optimized userland packages)
[cachyos-v3]
Include = /etc/pacman.d/cachyos-v3-mirrorlist

[cachyos-core-v3]
Include = /etc/pacman.d/cachyos-v3-mirrorlist

[cachyos-extra-v3]
Include = /etc/pacman.d/cachyos-v3-mirrorlist

# Baseline CachyOS packages (keyring, mirrorlist, kernel-manager, settings)
[cachyos]
Include = /etc/pacman.d/cachyos-mirrorlist
```

**CPU Capability Detection:**

```bash
# In tinapple-cachyos-repo enable:
if /lib/ld-linux-x86-64.so.2 --help 2>/dev/null | grep -q 'x86-64-v3 (supported'; then
    # Enable v3 repos
    ARCH_SUFFIX="v3"
elif /lib/ld-linux-x86-64.so.2 --help 2>/dev/null | grep -q 'x86-64-v4 (supported'; then
    # Enable v4 repos (znver4 for AMD, separate Intel AVX-512 handling)
    ARCH_SUFFIX="v4"
else
    # Baseline only
    ARCH_SUFFIX=""
fi
```

**Key Policy:** Tinapple **only enables `[cachyos-v3]` (or v4) by default** — the optimized kernel and userland rebuilds. The baseline `[cachyos]` repo (which carries CachyOS's forked pacman) is **optional**, enabled only if user installs `cachyos-settings` or `cachyos-kernel-manager`. This follows the "borrow the kernel, leave the distro" approach.

### 3.4 Custom Repository Hosting

**Infrastructure:**
- **Primary:** GitHub Releases + GitHub Pages (for small packages, metadata)
- **Mirror:** Self-hosted nginx on tinapple CDN node (or Cloudflare R2 + Workers)
- **Signing:** `tinapple-keyring` with offline master key, online signing subkey (rotated quarterly)
- **Database:** `repo-add` + `repo-sign` in CI/CD pipeline

**CI/CD Pipeline (GitHub Actions):**
```yaml
# .github/workflows/repo.yml
on:
  push:
    paths: ['packages/**']
  schedule: [cron: '0 3 * * *']  # Nightly rebuild check

jobs:
  build:
    runs-on: ubuntu-latest
    container: archlinux:base-devel
    steps:
      - checkout
      - for pkg in packages/*; do makepkg -sf; done
      - repo-add -s -k $SIGN_KEY tinapple.db.tar.zst *.pkg.tar.zst
      - upload artifacts (db, files, packages)
      - deploy to GitHub Pages + mirror sync
```

---

## 4. Hardware & Power Abstraction

### 4.1 Laptop-as-Server Design

tinapple treats **laptops as first-class server targets** — a laptop chassis is just a desktop with a built-in UPS (battery). All hardware abstraction lives in `tinapple-hw` package.

**Install-Time Profile Selection (Auto-Detected Default):**

```
Hardware Profile TUI:
┌─────────────────────────────────────────────────────────────┐
│  [■] Desktop   ──► Auto-detected: no battery, ACPI desktop │
│  [□] Laptop    ──► Auto-detected: battery present, clamshell│
│                                                      capable │
└─────────────────────────────────────────────────────────────┘
```

- **Desktop profile**: Standard server behavior, no battery management
- **Laptop profile**: Enables battery backup management, thermal zones, **lid-ignore-by-default**

### 4.2 Lid Behavior: **Never Suspend on Lid Close (Server Policy)**

> **Lid close must never suspend, sleep, or power off the server — no exceptions.**
> Rationale: This is a **server**, not a laptop. A laptop chassis here is just a desktop with a battery for backup power — lid state is irrelevant to server operation.

**Logind Configuration (`/etc/systemd/logind.conf.d/tinapple-lid.conf`):**

```ini
[Login]
# SERVER POLICY: Lid is ignored entirely. Logind never acts on lid events.
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
LidSwitchIgnoreInhibited=yes  # Inhibitors cannot override; lid is fully ignored
```

**No clamshell daemon, no inhibitor, no panel-off-on-close.** The lid switch is completely disabled at the logind level. If a user *wants* clamshell behavior (external monitor only), they can enable it via `tinapple-hw-config set lid_policy=clamshell` — but the **default is ignore**.

### 4.3 Battery Management: Backup Power Only (Laptop Profile)

On laptop hardware, the battery functions **purely as backup power** for graceful shutdown — not as a primary mobile power source.

**`tinapple-battery` (replaces `tinapple-power` for laptop profile):**

```bash
# Config: /etc/tinapple/battery.json (system-wide, not per-user)
{
  "charge_limit": 80,              # Stop charging at 80% for longevity
  "charge_limit_min": 40,          # Allow discharge to 40% before recharging (hysteresis)
  "critical_action": "hibernate",  # On critical battery: hibernate (not poweroff)
  "critical_threshold": 5,         # % remaining to trigger critical action
  "ups_mode": true,                # Treat battery as UPS: no suspend on battery
  "notify_thresholds": [20, 10, 5] # Notification levels
}
```

**Behavior:**
- **AC online**: Charge to 80%, hold (battery preservation)
- **AC lost**: Switch to battery, notify, **no suspend** (server keeps running)
- **Battery < critical_threshold**: `systemctl hibernate` (preserves state to swap)
- **AC restored**: Resume from hibernate, recharge to 80%

**Implementation:**
- `tinapple-battery-daemon.service` (system, runs as root) — monitors `power_supply` udev events
- Uses `charge_control_start_threshold` + `charge_control_end_threshold` for hysteresis
- Integrates with `tinapple-ups-monitor` for NUT/apcupsd coexistence

**Reference Tooling:** `batctl` (ThinkPad battery control), `tlp`/`auto-cpufreq` patterns for charge thresholds.

### 4.4 Power Profiles: Form-Factor Independent

Power profiles are **not tied to laptop vs desktop** — they apply to any hardware:

| Profile | Governor | EPP | Max Freq | Use Case |
|---------|----------|-----|----------|----------|
| **balanced** | schedutil | balance_performance | 100% | Default: good throughput + efficiency |
| **performance** | performance | performance | 100% | Heavy compute, transcoding, compilation |
| **power-saver** | powersave | power | 70% | Idle-heavy, low-priority background tasks |
| **custom** | user-defined | user-defined | user-defined | Via `tinapple-power-profile set custom ...` |

**CLI:** `tinapple-power-profile {get|set|list}` — persists to `/etc/tinapple/power-profile.json`

### 4.5 Thermal Management: Vendor-Conditional Logic

> **Thermal daemon tooling is vendor-specific, not universal.**

| Vendor | Primary Interface | Tools |
|--------|-------------------|-------|
| **Intel** | `intel_pstate` + DPTF | `thermald` (Intel-maintained), `intel_pstate` sysfs |
| **AMD** | `amd_pstate` / `amd_pstate_epp` | No AMD-maintained `thermald`; community: `ryzenadj` (mobile APUs), generic ACPI thermal zones |
| **Generic** | ACPI thermal zones | `thermal-conf` (userspace), `fancontrol` (PWM) |

**Implementation: `tinapple-thermal` with vendor detection**

```bash
# /usr/bin/tinapple-thermal-detect
if [ -d /sys/devices/system/cpu/intel_pstate ]; then
  VENDOR="intel"
  TOOL="thermald"
elif [ -d /sys/devices/system/cpu/amd_pstate ]; then
  VENDOR="amd"
  TOOL="amd_pstate_epp"  # + ryzenadj if mobile APU detected
else
  VENDOR="generic"
  TOOL="acpi_thermal"
fi
```

**Profiles (apply via vendor-specific backend):**
- `balanced`: Default trip points, moderate fan curves
- `performance`: Higher trip points, aggressive cooling
- `quiet`: Lower trip points, passive-first, accept throttling
- `server`: **New** — prioritizes sustained throughput; higher sustained power limits, disabled turbo boost on thermal pressure

**Emergency:** Critical trip → `systemctl hibernate` (if swap) or `poweroff`

### 4.6 Proprietary Driver Support (Explicit Consent)

**Universal Detection Mechanism:**
- Scan PCI/USB IDs at install time (`lspci -nn`, `lsusb -t`)
- Match against `tinapple-hw-db` (curated database: vendor:device → package list)
- Present detected hardware with **explicit opt-in checkboxes**

**Example: BCM943228HMB Dualband (Broadcom WiFi)**

```
Detected Hardware Requiring Proprietary Drivers:
┌─────────────────────────────────────────────────────────────┐
│  [ ] 14e4:4359  BCM943228HMB 802.11n Dual-band WiFi        │
│      → Package: broadcom-wl-dkms (AUR)                     │
│      → Requires: linux-headers, dkms                       │
│      → License: Proprietary (Broadcom)                     │
├─────────────────────────────────────────────────────────────┤
│  [ ] 10de:1c82  NVIDIA GTX 1050 Ti                         │
│      → Package: nvidia-dkms (extra) + nvidia-utils         │
│      → License: Proprietary (NVIDIA)                       │
└─────────────────────────────────────────────────────────────┘
[Accept Selected]  [Decline All]
```

- **DKMS modules** rebuilt on kernel update via `pacman` hook
- **Firmware** packages installed from `linux-firmware` + vendor-specific (e.g., `linux-firmware-broadcom`)
- **No proprietary drivers installed without explicit consent**

### 4.7 Power Loss Handling (UPS/Battery)

- `tinapple-ups-monitor` service (if `nut` or `apcupsd` detected)
- On battery > 5 min → notify, begin graceful shutdown of services (media stack first)
- On battery < 5% or time < 2 min → `systemctl hibernate` (preserves RAM to swap)
- Restore on AC return: `systemctl resume` → services restart via `After=hibernate.target`

---

## 5. Session & Window Management Architecture

### 5.1 Design Philosophy

> **Headless by default. Graphical environment is an explicit, toggleable package group.**

The GUI (chadwm) is meant **only for occasional local checkups** — not as a primary/constant interface. The system is designed to be **fully remotely usable** via SSH, Tailscale, and the web dashboard.

### 5.2 Session Modes

| Mode | Target | Boot Target | Graphical Stack | Use Case |
|------|--------|-------------|-----------------|----------|
| **Headless** | Rack/closet server | `multi-user.target` | None | Pure server, no monitor ever attached |
| **Interactive** | Laptop/desktop with monitor | `graphical.target` | chadwm + tinapple-dash | Local admin, initial setup, troubleshooting |
| **Kiosk** | Appliance mode | `graphical.target` | tinapple-dash fullscreen (auto-login) | Dedicated dashboard display |

### 5.3 Mode Switching (GUI ⇄ Headless On-Demand)

```bash
# CLI tool: tinapple-session
tinapple-session get                    # current mode
tinapple-session set headless           # disable graphical.target, stop WM
tinapple-session set interactive        # enable graphical.target, start WM
tinapple-session set kiosk              # enable graphical.target, auto-login kiosk
tinapple-session toggle                 # smart toggle: headless ↔ interactive
```

**Implementation:**
- `tinapple-session` manipulates systemd targets + user services:
  - `systemctl disable --now graphical.target` (headless)
  - `systemctl enable --now graphical.target` (interactive/kiosk)
  - Starts/stops `chadwm@.service` (user) accordingly
- **Instant switch** — no reboot required; `loginctl` seat management handles VT switching
- Kiosk mode: creates `/etc/systemd/system/getty@tty1.service.d/autologin.conf` + `tinapple-dash-kiosk.service` (user, `After=graphical-session.target`)

### 5.4 Minimal Window Manager: **chadwm**

**Choice: `chadwm`** ([github.com/siduck/chadwm](https://github.com/siduck/chadwm)) — dynamic window manager (dwm fork) with pre-configured "rices" (theme packs), lightweight, X11-based (better compatibility than Wayland for headless→GUI switching).

**Reference: CachyOS WM Setup** — CachyOS installs WMs as optional packages with hardware detection and graceful degradation. tinapple follows the same pattern.

**Package: `tinapple-chadwm` (pulled by `tinapple-desktop` meta-package)**

```
tinapple-chadwm/
├── chadwm/                     # Built from source (AUR: chadwm-git)
│   ├── config.def.h            # Tinapple-default keybinds, gaps, borders
│   ├── patches/                # Selected patches: systray, pertag, swallow, etc.
│   └── rices/                  # Default rices (tokyo-night, catppuccin, gruvbox, etc.)
├── picom/                      # Compositor config (transparency, blur, shadows)
├── polybar/                    # Status bar (cpu, mem, disk, net, tinapple-dash status)
├── rofi/                       # App launcher + tinapple-dash actions + power menu
├── dunst/                      # Notification daemon
├── sxhkd/                      # Hotkey daemon (volume, brightness, session toggle)
├── xinitrc                     # Starts: chadwm → picom → polybar → dunst → sxhkd
└── tinapple-dash.desktop       # Auto-start in kiosk/interactive
```

**Graceful Degradation (Critical Requirement):**

```bash
# /usr/bin/tinapple-chadwm-preflight (runs before graphical.target)
# Returns 0 if GUI can start, 1 if should fall back to headless

if ! lspci | grep -qE "VGA|3D|Display"; then
  echo "No GPU detected — falling back to headless"
  exit 1
fi

# Check for basic X11 support
if ! command -v Xorg >/dev/null; then
  echo "Xorg not installed — falling back to headless"
  exit 1
fi

# Try to start X on VT; if fails, fallback
timeout 5 Xorg -nolisten tcp vt${XDG_VTNR:-1} :0 2>/dev/null || {
  echo "X server failed to start — falling back to headless"
  exit 1
}

exit 0
```

- **Install-time**: If `tinapple-chadwm-preflight` fails, installer auto-selects "None" (headless) for Desktop Environment
- **Runtime**: `tinapple-session set interactive` runs preflight; if fails, stays headless + shows `tinapple-tty-dash` on TTY1

### 5.5 Headless Local Admin Access

When in **headless mode** but physical monitor/keyboard attached:

- **TTY1:** `getty@tty1.service` with `tinapple-tty-dash` (text-mode dashboard via `ratatui`/`bubbletea`)
- **TTY2-6:** Standard login prompts
- **SSH:** Primary remote access (Tailscale SSH + tmux persistence)

**`tinapple-tty-dash` Features:**
- System health (CPU, RAM, disk, temp, network)
- Service status grid (systemd units tagged `tinapple.service=active`)
- Quick actions: reboot, service restart, network config, **session mode toggle**
- Config: `/etc/tinapple/tty-dash.yaml`

### 5.6 Remote Usability & Ease-of-Use Mode

**Fully Remote-First Design:**

| Access Method | Purpose |
|---------------|---------|
| **SSH** (Tailscale + tmux) | Primary admin, persistent sessions |
| **Web Dashboard** (tinapple-dash via Caddy + TLS) | Service management, monitoring, config |
| **API** (REST + WebSocket) | Automation, integrations, fleet management |
| **TTY** (local) | Emergency/fallback when network unavailable |

**"Ease of Use" Mode (Optional, opt-in at install):**

```yaml
# In manifest.yaml
ease_of_use_mode: true
```

**Effects when enabled:**
- Simplified dashboard UI (fewer tabs, larger targets, guided flows)
- Auto-enable Tailscale SSH + MagicDNS
- Pre-configured common service stacks (media, downloads, backups) with sane defaults
- `tinapple-setup` wizard on first boot (interactive or headless via SSH)
- Reduced CLI verbosity; more confirmations, fewer flags required
- Automatic health notifications via dashboard/email/webhook

---

## 6. Milestone Roadmap

### Phase 0: Foundation (Weeks 1-3)

| Task | Deliverable |
|------|-------------|
| Repo scaffolding | `tinapple-repo` structure, CI/CD pipeline, signing keys |
| Keyring + mirrorlist packages | `tinapple-keyring`, `tinapple-mirrorlist` published |
| Base meta-package | `tinapple-base` with systemd presets, limine UKI, snapper config |
| Hardware abstraction | Port battery, thermal, power-profile, driver-detect tools → `tinapple-hw` |
| Boot apply hook | `tinapple-boot-apply` (plymouth + limine globals + cmdline sync) |

### Phase 1: Installer Core (Weeks 4-7)

| Task | Deliverable |
|------|-------------|
| Backend library | Bash modules: `preflight`, `disk`, `luks`, `fs`, `mount`, `pacstrap`, `configure`, `cachyos-repo`, `deploy`, `network`, `drivers`, `bootloader`, `aur`, `snapshots`, `offline` |
| ISO profile | `mkarchiso` profile with `tinapple-install` TUI binary baked in |
| TUI installer | Go-based TUI (disk, network, kernel profile, profile selection) |
| In-place bootstrap | `curl | bash` script + signed binary download + TUI execution |
| Kernel profile implementation | LTS/Hardened/Current package sets, limine entries, default selection logic |
| CachyOS repo integration | Automatic v3/v4 detection, repo insertion, key trust |

### Phase 2: Repository & Config Engine (Weeks 8-11)

| Task | Deliverable |
|------|-------------|
| Config generator | Go templating engine: manifests → systemd drop-ins, Caddy configs, app configs |
| Dashboard rewrite | `tinapple-dash` in Go/Rust: SSE, WebSocket, plugin widgets, Caddy reverse proxy |
| Service meta-packages | `tinapple-media`, `tinapple-downloads`, `tinapple-backups` with declarative service definitions |
| Migration framework | Config versioning, pre/post transaction hooks, rollback CLI |
| First-boot service | `tinapple-firstboot`: hardware detection, initial config, Tailscale auth, dashboard setup |

### Phase 3: Session & Polish (Weeks 12-15)

| Task | Deliverable |
|------|-------------|
| Session manager | `tinapple-session` CLI + systemd target switching |
| Minimal WM | `tinapple-chadwm`: chadwm + polybar + rofi + picom, preflight + graceful degradation |
| TTY dashboard | `tinapple-tty-dash` (ratatui) for headless local admin |
| Kiosk mode | Auto-login + fullscreen dashboard |
| Documentation | Installation guide, admin guide, API reference, migration from Tinarchy |

### Phase 4: Testing & Release (Weeks 16-20)

| Task | Deliverable |
|------|-------------|
| ISO testing matrix | VM (UEFI/BIOS), bare metal (laptop, desktop, server), dual-boot, encrypted |
| In-place test matrix | Minimal Arch, Arch + existing services, Debian derivative (via debootstrap) |
| Hardware validation | Laptop clamshell (multiple vendors), battery limits, thermal, UPS |
| Upgrade testing | Version-to-version migrations, config migrations, rollback verification |
| Release artifacts | Signed ISO, bootstrap script, repo packages, checksums, SBOM |

### Phase 5: Post-Launch (Ongoing)

| Area | Focus |
|------|-------|
| Kernel profile automation | Auto-detect hardware → recommend profile; `tinapple-kernel-switch` tool |
| Dashboard plugins | Community plugin SDK, official plugins for *arr, Jellyfin, Immich, Paperless, etc. |
| Fleet management | `tinapple-fleet` for multi-node homelab orchestration (Ansible inventory + SSH) |
| Security hardening | SELinux profile (optional), `tinapple-hardened` profile with lockdown, TPM2 auto-decrypt |

---

## Appendix A: Key Configuration Files

### `/etc/tinapple/manifest.yaml` (Source of Truth)

```yaml
version: 1
hostname: tinapple-server
kernel_profile: lts          # lts | hardened | current
session_mode: headless       # headless | interactive | kiosk
hardware_profile: auto       # auto | desktop | laptop
cachyos_repos: true          # Enable CachyOS v3/v4 repos
ease_of_use_mode: false      # Simplified UI, guided setup
filesystem: ext4             # ext4 | xfs | btrfs
bootloader: auto             # auto | grub | limine
profiles:
  - base
  - media
  - downloads
services:
  jellyfin:
    enabled: true
    overrides:
      JELLYFIN_PublishedServerUrl: "https://jellyfin.mytailnet.ts.net"
  qbittorrent:
    enabled: true
    user: media
  syncthing:
    enabled: true
    device_id: "ABCDEF-123456"
  tailscale:
    enabled: true
    auth_key: "tskey-auth-..."  # Or OAuth via firstboot
hardware:
  battery:
    charge_limit: 80
    charge_limit_min: 40
    critical_action: hibernate
    critical_threshold: 5
  power_profile: balanced      # balanced | performance | power-saver | custom
  thermal_profile: server      # balanced | performance | quiet | server
  lid_policy: ignore           # ignore | clamshell (opt-in)
  ups_monitor: true
network:
  interface: eth0
  dhcp: true
  static_fallback:
    address: 192.168.1.100/24
    gateway: 192.168.1.1
    dns: [1.1.1.1, 9.9.9.9]
```

### `/etc/pacman.conf` (tinapple default)

```ini
[options]
Architecture = auto x86_64_v3
ParallelDownloads = 10
Color
ILoveCandy
HoldPkg = pacman glibc
SigLevel = Required DatabaseOptional
LocalFileSigLevel = Optional

Include = /etc/pacman.d/tinapple-mirrorlist

[core]
Include = /etc/pacman.d/mirrorlist

[extra]
Include = /etc/pacman.d/mirrorlist

[multilib]
Include = /etc/pacman.d/mirrorlist

# Tinapple custom repository
[tinapple]
SigLevel = Required DatabaseOptional
Include = /etc/pacman.d/tinapple-mirrorlist

# CachyOS performance layer (managed by tinapple-cachyos-repo)
Include = /etc/pacman.d/tinapple-cachyos.conf
```

---

## Appendix B: Service Presets (systemd)

**`/usr/lib/systemd/system-preset/90-tinapple.preset`:**

```ini
# Tinapple base services
enable tinapple-battery-daemon.service
enable tinapple-thermal-daemon.service
enable tinapple-power-profile-apply.service
enable tinapple-hw-detect.service
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

# Conditional (enabled by profile packages)
# enable tinapple-dash.service          # desktop profile
# enable jellyfin.service              # media profile
# enable qbittorrent-nox@.service      # downloads profile
# enable syncthing@.service            # base profile
# enable tailscaled.service            # base profile
```

---

## Appendix C: Upgrade & Rollback Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                    tinapple-update (user invoked)                  │
├────────────────────────────────────────────────────────────────────┤
│  1. pacman -Sy                                                     │
│  2. snapper create --description "pre-update: $(date -Iseconds)"  │
│  3. pacman -Su --noconfirm                                         │
│  4. tinapple-config-generator migrate (if manifest version bumped) │
│  5. systemd-analyze verify (check for broken units)                │
│  6. systemctl daemon-reload                                        │
│  7. Restart changed services (systemd reload + tinapple-maintenance)│
│  8. limine-mkinitcpio (rebuild UKIs for new kernels)               │
│  9. snapper create --description "post-update: $(date -Iseconds)"  │
│ 10. limine-snapper-sync (update boot menu)                         │
│ 11. tinapple-health-check (smoke test)                             │
│ 12. Notify: "Update complete. Reboot to load new kernel if needed."│
└────────────────────────────────────────────────────────────────────┘

Rollback:
  tinapple rollback <snapshot-id>
  → snapper rollback <id>
  → limine-snapper-sync
  → reboot (select snapshot entry in limine menu)
```

---

## Appendix D: Security Model

| Layer | Mechanism |
|-------|-----------|
| **Boot** | UKI (Unified Kernel Image) signed with `tinapple-keyring`; Secure Boot via shim + MOK |
| **Repository** | All packages signed; `SigLevel = Required DatabaseOptional`; key rotation quarterly |
| **Services** | Systemd hardening: `ProtectSystem=strict`, `ProtectHome=read-only`, `PrivateTmp=yes`, `NoNewPrivileges=yes`, `CapabilityBoundingSet=` minimal |
| **Network** | `systemd-resolved` + `nftables` default deny; Tailscale for admin access; Caddy auto-TLS for dashboard |
| **Secrets** | `tinapple-secrets` (age-encrypted) in `/etc/tinapple/secrets/`; decrypted at boot by `tinapple-firstboot` via TPM2 or passphrase |
| **Updates** | Reproducible builds; SBOM (CycloneDX) published per release; `pacman -Qkk` verification |

---

**End of Specification**

*This document is the authoritative architecture reference for tinapple v1.0. All implementation decisions should trace back to the principles and specifications defined herein.*