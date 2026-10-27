# tinapple

Turnkey homelab operating system and appliance platform engineered for bare-metal home servers, repurposed hardware, mini-PCs, and laptops. Built on Arch Linux and CachyOS compiler-optimized performance packages.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Key Capabilities](#2-key-capabilities)
3. [System Architecture and Subsystems](#3-system-architecture-and-subsystems)
4. [Integrated Homelab Services and Port Matrix](#4-integrated-homelab-services-and-port-matrix)
5. [Appliance Packs & Stacks System](#5-appliance-packs--stacks-system)
6. [Hardware Specifications and Power Abstraction](#6-hardware-specifications-and-power-abstraction)
7. [Installation and First-Boot Provisioning](#7-installation-and-first-boot-provisioning)
8. [Networking, Remote Access, and MagicDNS](#8-networking-remote-access-and-magicdns)
9. [Storage Layout and Multi-User Setup](#9-storage-layout-and-multi-user-setup)
10. [Media Automation & Seerr Stack Orchestrator](#10-media-automation--seerr-stack-orchestrator)
11. [System Updates, Pacman Hooks, and Hot-Deployment](#11-system-updates-pacman-hooks-and-hot-deployment)
12. [Native Client Applications (Plezy, Tsumiru, Android)](#12-native-client-applications-plezy-tsumiru-android)
13. [Service Management and Command Reference](#13-service-management-and-command-reference)
14. [Troubleshooting and Diagnostic Runbook](#14-troubleshooting-and-diagnostic-runbook)
15. [Repository Directory Structure](#15-repository-directory-structure)
16. [License](#16-license)

---

## 1. Overview

tinapple transforms standard commodity x86_64 computer hardware or retired laptop systems into an appliance-grade home server. Unlike general-purpose Linux server distributions that require manual package management, disparate configuration files, and custom shell scripting, tinapple delivers a unified appliance experience:

- **Web-First Control Plane**: Real-time system monitoring, hardware power profiles, systemd service lifecycle control, and service storefront.
- **Declarative System State**: The entire state of installed daemons, hardware controls, user preferences, and network interfaces is defined in `/etc/tinapple/tinapple.json`.
- **Zero-Downtime Hot Deployments**: Appliance dashboard, API binaries, and configuration templates can be updated and hot-reloaded without full operating system reinstalls or system reboots.
- **Hardware Lifecycle Management**: First-class support for repurposed laptops, including hardware battery charge limits (stopping charge at 80% to prevent cell swelling), ACPI clamshell mode (preventing sleep on lid closure), and thermal profile governors.
- **Secure Encrypted Mesh Access**: Native integration with Caddy and Tailscale to automatically provision trusted Let's Encrypt HTTPS certificates for the dashboard, Web Crypto API vaults, and remote media streaming.

---

## 2. Key Capabilities

- **Kernel and Compiler Optimizations**: Uses CachyOS kernel patchsets (Bore scheduler, BBRv3 network congestion control) and packages compiled with `x86-64-v3` compiler flags.
- **Unified Reverse Proxy**: Caddy server terminating TLS for public Tailscale domains and internal local network IP addresses with automated HTTP to HTTPS redirection.
- **Integrated Homelab Suite**: Pre-configured services including Jellyfin (video streaming), Navidrome (music streaming), Suwayomi (manga server), Vaultwarden (password manager), qBittorrent and JDownloader 2 (remote downloads), AdGuard Home (network-wide ad-blocking), Syncthing (file synchronization), and FileBrowser.
- **Tor Anonymity Switch**: Native one-click Tor daemon controller built into the dashboard and REST API for on-demand privacy routing.
- **Cross-Platform Clients**: Accessible via any modern web browser and a lightweight native Android companion APK (`tinapple-client.apk`).

---

## 3. System Architecture and Subsystems

The tinapple platform is structured into modular layers:

```
+-----------------------------------------------------------------------+
|                         Client Interfaces                             |
|  Desktop Browser (HTTPS)  |  Mobile PWA  |  Android Native (APK)      |
+-----------------------------------------------------------------------+
                                   |
+-----------------------------------------------------------------------+
|                    Edge and Reverse Proxy (Caddy)                     |
|  - Tailscale HTTPS (:443) with Let's Encrypt                          |
|  - Local LAN Internal TLS Fallback (:443)                             |
|  - Vaultwarden TLS Endpoint (:8000)                                   |
|  - HTTP to HTTPS Port 80 Automatic Redirect                           |
+-----------------------------------------------------------------------+
                                   |
+-----------------------------------------------------------------------+
|                 Control Plane: tinapple-dash (:8088)                  |
|  - Go HTTP REST API & WebSockets (/api/v1/system, /api/v1/services)  |
|  - Compiled React 18 Frontend Bundle (tinapple-hub)                   |
|  - Systemd D-Bus Daemon Controller & Log Streamer                     |
|  - Suwayomi GraphQL Proxy and WebP Thumbnail Cache                    |
|  - Hardware Telemetry & Thermal Governor Controller                   |
+-----------------------------------------------------------------------+
                                   |
+-----------------------------------------------------------------------+
|                   Hardware and Power Abstraction                      |
|  - tinapple-hw: ACPI Lid Inhibitor, Battery Charge Thresholds         |
|  - Thermal Profiles: Quiet, Balanced, Performance                    |
+-----------------------------------------------------------------------+
                                   |
+-----------------------------------------------------------------------+
|                     Homelab Service Daemons                           |
|  Jellyfin | Navidrome | Suwayomi | Vaultwarden | qBittorrent | AdGuard |
+-----------------------------------------------------------------------+
```

### Core Components

- **`tinapple-dash`**: Written in Go using the Gin framework. It runs as `tinapple-dash.service` on port 8088. It handles system metrics, service start/stop/restart operations, real-time log tailing, package installation through the Chaddy Store, and proxying backend requests.
- **`tinapple-hub`**: A single-page dashboard built with React 18, TypeScript, Tailwind CSS, Lucide icons, and Framer Motion. Compiled into static production assets served directly by `tinapple-dash` from `/usr/share/tinapple-dash/web/dist`.
- **`tinapple-hw`**: Hardware abstraction daemon responsible for reading battery controller nodes in `/sys/class/power_supply/`, enforcing charge ceilings, and managing CPU energy performance preferences via `power-profiles-daemon`.
- **`tinapple-config-generator`**: Template engine that converts the declarative `/etc/tinapple/tinapple.json` manifest into service-specific configuration files for Caddy, Navidrome, qBittorrent, and systemd units.
- **`tinapple-android`**: Dedicated Android client package (`org.tinapple.client`) compiled with Android SDK 34, connecting directly to the server's HTTPS endpoint.

---

## 4. Integrated Homelab Services and Port Matrix

tinapple packages and manages a comprehensive suite of homelab services. Below is the network port reference:

| Service | Binary / Package | Systemd Unit | Internal Port | Default Access Path | Function |
|---------|------------------|--------------|---------------|---------------------|----------|
| Tinapple Web Hub | `tinapple-dash` | `tinapple-dash.service` | 8088 | `https://<server>:443/` | Appliance control plane and widget dashboard |
| Vaultwarden | `vaultwarden` | `vaultwarden.service` | 8001 (proxied to 8000) | `https://<server>:8000/` | Bitwarden-compatible password vault (Web Crypto API) |
| Suwayomi Manga | `suwayomi-server-bin` | `suwayomi-server.service` | 4567 | `http://<server>:4567/` | Tachiyomi/Mihon extension server and manga reader |
| Jellyfin | `jellyfin-server` | `jellyfin.service` | 8096 | `http://<server>:8096/` | Media streaming for movies, shows, and audiobooks |
| Navidrome | `navidrome` | `navidrome.service` | 4533 | `http://<server>:4533/` | Subsonic-compatible personal music streaming |
| qBittorrent | `qbittorrent-nox` | `qbittorrent-nox.service` | 8080 | `http://<server>:8080/` | Headless BitTorrent client with remote WebUI |
| MeTube | `metube` | `metube.service` | 8085 | `http://<server>:8085/` | Web GUI for yt-dlp video and audio downloads |
| AdGuard Home | `adguardhome` | `adguardhome.service` | 3000 / 53 | `http://<server>:3000/` | Network-wide DNS sinkhole, privacy filter, and ad-blocker |
| Syncthing | `syncthing` | `syncthing@tinapple.service` | 8384 | `http://<server>:8384/` | Continuous peer-to-peer decentralized file sync |
| FileBrowser | `filebrowser` | `filebrowser.service` | 8081 | `http://<server>:8081/` | Web-based file manager and browser |
| Tor Daemon | `tor` | `tor.service` | 9050 / 9051 | Local SOCKS5 Proxy | Onion router privacy network and exit proxy |
| Sonarr | `sonarr-bin` | `sonarr.service` | 8989 | `http://<server>:8989/` | TV series automation and download manager |
| Radarr | `radarr-bin` | `radarr.service` | 7878 | `http://<server>:7878/` | Movie automation and download manager |
| Prowlarr | `prowlarr-bin` | `prowlarr.service` | 9696 | `http://<server>:9696/` | Torrent indexer and Usenet proxy aggregator |
| Bazarr | `bazarr` | `bazarr.service` | 6767 | `http://<server>:6767/` | Automated subtitle downloader for Sonarr/Radarr |
| Jellyseerr | `seerr` | `seerr.service` | 5055 | `http://<server>:5055/` | Request management and media discovery portal |
| CouchDB | `couchdb` | `couchdb.service` | 5984 | `http://<server>:5984/` | Database backend for Obsidian LiveSync notes |
| SyncYomi | `syncyomi` | `syncyomi.service` | 8282 | `http://<server>:8282/` | Manga reading progress synchronization bridge |
| Minecraft PaperMC | `minecraft` | `minecraft.service` | 25565 | `<server>:25565` | High-tickrate gaming appliance with Aikar GC |
| Playit Anycast | `playit` | `playit.service` | Dynamic | Global Anycast Tunnel | Public domain tunnel for servers without port forwarding |
| Proton VPN Client | `proton-vpn-cli` | `proton.VPN.service` | Dynamic | Egress VPN Tunnel | Headless Swiss WireGuard egress tunnel |
| Beeper Matrix Bridges | `bbctl` | `bbctl.service` | Dynamic | Matrix Bridges | Self-hosted bridges for WhatsApp, Signal, Discord, etc. |

---

## 5. Appliance Packs & Stacks System

Tinapple delivers cohesive homelab experiences through pre-configured **Appliance Packs**. Instead of manually configuring complex inter-service dependencies, ports, and API tokens across disparate projects, each pack provides 1-click batch installation and automated orchestrator linking:

| Pack Name | Included Daemons | Badge | Core Highlights |
|-----------|------------------|-------|-----------------|
| **Ultimate Streaming & Servarr Stack** | `jellyfin`, `seerr`, `radarr`, `sonarr`, `prowlarr`, `bazarr`, `qbittorrent` | `STREAMING & MEDIA` | Zero-touch 4K/1080p media cloud: automated root libraries in `/srv/media`, qBittorrent authenticated API linking, Prowlarr trackers auto-synced, Bazarr multi-language subtitle fetching, and Jellyseerr discovery connected to Jellyfin server. |
| **Manga & Comic Infinite Library** | `suwayomi`, `syncyomi` | `MANGA & COMICS` | 1,000+ Keiyoushi source extensions enabled, local storage in `/srv/media/manga`, Suwayomi-Tsumiru native Web and mobile reader, and cross-device reading progress synchronization via SyncYomi (:8282). |
| **Mesh Privacy & Perimeter Shield** | `tailscale`, `adguard`, `protonvpn`, `tor` | `SECURITY & MESH` | Zero-trust WireGuard mesh networking, AdGuard Home DNS-over-HTTPS & ad/tracker blocking (:3000), Tor anonymous SOCKS5 onion proxy (:9050), and Proton VPN high-speed egress encryption. |
| **Audiophile Music Cloud & Downloader** | `navidrome`, `metube` | `MUSIC & AUDIO` | Lossless Subsonic/Airsonic streaming server for Symfonium, Feishin, and Substreamer, paired with MeTube for headless automated downloading of YouTube/SoundCloud playlists directly into `/srv/media/music`. |
| **Cloud Vault & Resilient Backups** | `vaultwarden`, `syncthing`, `filebrowser` | `VAULT & SYNC` | Bitwarden-compatible password vault with Web Crypto API, Syncthing peer-to-peer real-time file synchronization across mobile and desktop devices, and FileBrowser Quantum web file explorer. |
| **Second Brain & Knowledge Base** | `couchdb`, `filebrowser` | `KNOWLEDGE & NOTES` | Real-time end-to-end encrypted database sync for Obsidian LiveSync across iOS, Android, and PC with CORS enabled (:5984), paired with FileBrowser for markdown search and document storage. |
| **Gaming Appliance & Anycast Tunnel** | `minecraft`, `playit` | `GAMING & CLOUD` | PaperMC high-performance Minecraft server (:25565) with Aikar's tuned JVM GC memory optimization flags, paired with Playit.gg Anycast agent providing public player join domains without port forwarding. |

### 1-Click Pack Installation & Auto-Configuration
In the Tinapple Web Hub Store tab, toggle **"Packs & Stacks"** to view live cards. Clicking **"Install Full Pack"** or **"Auto-Configure Stack"** triggers the backend deployment pipeline with live output streamed directly to the built-in terminal.

---

## 6. Hardware Specifications and Power Abstraction

### Minimum Requirements

- **Processor**: 64-bit x86_64 CPU (Intel 4th Generation Core i3/i5/i7 or AMD Zen architecture and newer).
- **RAM**: 4 GB minimum (8 GB or more recommended for Jellyfin transcoding and parallel download extraction).
- **Primary Storage**: 32 GB SSD or NVMe for system root (`/`).
- **Data Storage**: Dedicated internal or USB storage drive mounted at `/home/storage` or `/mnt/storage`.
- **Network Interface**: Gigabit Ethernet (recommended) or 802.11ac/ax Wi-Fi adapter.

### Laptop Hardware Optimization (`tinapple-hw`)

When deploying tinapple on repurposed laptop hardware, the hardware layer activates three protections:

1. **Battery Health Preservation**:
   Standard laptops kept plugged into mains power degrade quickly due to prolonged 100% state-of-charge. The hardware subsystem automatically writes to sysfs kernel power nodes:
   ```bash
   echo 80 > /sys/class/power_supply/BAT0/charge_control_limit_max
   ```
   This caps charging at 80%, extending cell longevity and preventing battery swelling.

2. **Clamshell Operation**:
   Standard systemd configurations trigger suspend when the laptop lid is closed. tinapple sets the following in `/etc/systemd/logind.conf.d/clamshell.conf`:
   ```ini
   [Login]
   HandleLidSwitch=ignore
   HandleLidSwitchExternalPower=ignore
   HandleLidSwitchDocked=ignore
   LidSwitchIgnoreInhibited=no
   ```
   This allows the laptop to operate 24/7 with the screen closed without overheating or sleeping.

3. **Thermal and Fan Governors**:
   Profiles can be changed dynamically via the dashboard or CLI:
   - `quiet`: Caps maximum CPU boost frequencies to keep fans silent.
   - `balanced`: Default mode balancing acoustic profile and burst performance.
   - `performance`: Maximum governor clock limits and active cooling for media transcoding and archive extractions.

---

## 6. Installation and First-Boot Provisioning

### Method A: Clean Installation from ISO

1. Download or build the latest `tinapple-installer.iso`.
2. Write the ISO to a USB flash drive (minimum 4 GB):
   ```bash
   sudo dd if=tinapple-installer.iso of=/dev/sdX bs=4M status=progress oflag=sync
   ```
3. Boot the target machine in UEFI mode.
4. The installation wizard will launch automatically.
5. Select the target disk drive, desired filesystem (Btrfs with subvolumes or Ext4), hostname, and administrator password.
6. The installer formats partitions, bootstraps the base operating system using pacstrap, and configures the bootloader (Limine or systemd-boot).
7. Remove the USB installation drive and reboot.

### Method B: In-Place Conversion on Arch Linux / CachyOS

If you already have a functional minimal Arch Linux or CachyOS installation:

1. Clone the repository:
   ```bash
   git clone https://github.com/imyash0722/tinapple.git /tmp/tinapple
   cd /tmp/tinapple
   ```
2. Run the deployment script targeting localhost:
   ```bash
   ./scripts/deploy-server.sh 127.0.0.1
   ```
3. Enable and start the system daemon:
   ```bash
   sudo systemctl enable --now tinapple-dash.service
   sudo systemctl enable --now caddy.service
   ```

### First-Boot Configuration (`tinapple-firstboot`)

On first system start, `tinapple-firstboot.service` executes to:
- Generate unique machine IDs and SSH host keys.
- Write the default system configuration manifest to `/etc/tinapple/tinapple.json`.
- Configure the storage directory structure in `/home/storage`.
- Start the Caddy reverse proxy and `tinapple-dash` daemon.

---

## 7. Networking, Remote Access, and HTTPS Configuration

tinapple uses Caddy as its reverse proxy combined with Tailscale to provide automated, zero-configuration TLS certificates without opening external router ports or setting up dynamic DNS.

### Caddy Reverse Proxy Architecture

The active Caddy configuration is located at `/etc/tinapple/Caddyfile` and tracked in the repository at `configs/caddy/Caddyfile`:

```caddy
{
    admin "unix//run/caddy/admin.socket"
}

# Tailscale HTTPS domain (Automatic Let's Encrypt Certificate)
tinapple-server.tail3dee69.ts.net {
    tls {
        get_certificate tailscale
    }
    reverse_proxy localhost:8088
}

# Vaultwarden on Port 8000 (Requires HTTPS for Web Crypto API)
tinapple-server.tail3dee69.ts.net:8000 {
    tls {
        get_certificate tailscale
    }
    reverse_proxy localhost:8001
}

# Local Network LAN Access with Internal CA Fallback
192.168.1.17, 100.67.207.60, tinapple-server, localhost {
    tls internal
    reverse_proxy localhost:8088
}

192.168.1.17:8000, 100.67.207.60:8000, tinapple-server:8000, localhost:8000 {
    tls internal
    reverse_proxy localhost:8001
}
```

### Tailscale Configuration

1. Authenticate Tailscale on the server:
   ```bash
   sudo tailscale up --operator=tinapple
   ```
2. Verify the Tailscale machine name and IP address:
   ```bash
   tailscale status
   ```
3. Enable HTTPS certificate generation in your Tailscale administration console under DNS preferences (MagicDNS and HTTPS Certificates).
4. Reload Caddy to obtain and bind certificates:
   ```bash
   sudo systemctl reload caddy.service
   ```
5. Test connectivity over HTTPS:
   ```bash
   curl -sI https://tinapple-server.<your-tailnet>.ts.net/
   ```
   The server will return `HTTP/2 200` with a certificate signed by Let's Encrypt.

---

## 8. Storage Layout and Multi-User Setup

### Directory Hierarchy

All shared homelab storage is consolidated under `/home/storage`:

```
/home/storage/
├── Music/               # Shared / guest audio library
├── TinMusic/            # Administrator personal audio collection
├── Videos/              # Jellyfin movie and television library
│   ├── Movies/
│   └── TV/
├── Downloads/           # Default download directory
│   ├── Complete/
│   └── Incomplete/
├── Manga/               # Suwayomi local storage and downloaded chapters
└── Backups/             # System manifest and database snapshots
```

Ensure correct filesystem ownership and read/write group permissions:
```bash
sudo chown -R tinapple:tinapple /home/storage
sudo chmod -R 775 /home/storage
```

### Multi-User Music Streaming (Navidrome)

Navidrome provides Subsonic-compatible streaming for applications such as Symfonium, Amperfy, and Feishin.

To configure distinct music folders for separate user accounts (for example, keeping an administrator library private while offering a standard library to guests):

1. **User Account Separation**:
   - Administrator Account: `tin` (Full administrative privileges, library path pointed to `/home/storage/TinMusic`).
   - Guest / Friend Account: `icekimi` (Standard privileges, library path pointed to `/home/storage/Music`).
2. **Navidrome Service Configuration** (`/etc/navidrome/navidrome.toml`):
   ```toml
   MusicFolder = "/home/storage"
   ScanSchedule = "@every 30m"
   LogLevel = "INFO"
   Port = 4533
   Address = "0.0.0.0"
   DefaultDownsamplingFormat = "opus"
   ```
3. Restart Navidrome to apply updates:
   ```bash
   sudo systemctl restart navidrome.service
   ```

---

## 9. Suwayomi Manga Server Integration

Suwayomi Server (v2.4+) runs on port 4567, acting as an independent self-hosted manga backend compatible with the Tachiyomi, Mihon, and Keiyoushi source extension ecosystems.

### Integration Architecture

- **GraphQL Engine**: Communication between `tinapple-dash` and Suwayomi uses Suwayomi's native GraphQL interface at `http://127.0.0.1:4567/api/graphql`.
- **Deduplication and Recency Logic**:
  - *Library Tab (`Library (241)`)*: Queries `mangas(condition: { inLibrary: true }, order: [{by: IN_LIBRARY_AT, byType: DESC_NULLS_LAST}])` to present recently added titles with unread chapter count badges.
  - *History Tab (`History`)*: Queries read chapters ordered by `LAST_READ_AT DESC` and deduplicates by manga series ID. Each manga appears once, displaying the exact last chapter read.
  - *Updates Tab (`Updates`)*: Queries unread chapters ordered by `UPLOAD_DATE DESC` and deduplicates by series ID. Each title appears once, indicating the newest chapter available.
- **WebP Thumbnail Proxy**: Suwayomi serves cover images with arbitrary headers. `tinapple-dash` proxies all thumbnail requests via `/api/v1/manga/:id/thumbnail`, sniffing byte headers, enforcing proper `Content-Type: image/webp`, and adding HTTP cache headers (`Cache-Control: public, max-age=86400`).
- **Direct Title Navigation**: Clicking any manga card in the dashboard opens directly into that manga's title and chapter overview page in Suwayomi (`http://<server>:4567/manga/<id>`).

### Adding Extensions via Keiyoushi

To install manga source extensions in Suwayomi:
1. Open Suwayomi WebUI at `http://<server>:4567/`.
2. Navigate to **Settings** -> **Browse** -> **Extension Repositories**.
3. Add the Keiyoushi repository URL:
   ```
   https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json
   ```
4. Navigate to **Extensions**, search for your desired sources (e.g. MangaDex, Asura Scans, MangaFire), and click **Install**.

---

## 10. Media Automation & Seerr Stack Orchestrator

Tinapple integrates a headless zero-touch media automation pipeline linking Jellyfin, Jellyseerr, Radarr, Sonarr, Prowlarr, Bazarr, and qBittorrent.

### Automated Orchestration Script (`tinapple-configure-seerr`)
The pipeline is fully automated via `/usr/local/bin/tinapple-configure-seerr` (source: [`scripts/tinapple-configure-seerr`](scripts/tinapple-configure-seerr)):
1. **Filesystem Hierarchy**: Pre-provisions `/srv/media/{movies,shows,music,downloads,youtube,youtube-music,manga}` with group `media` and `2775` (`g+s`) sticky permissions.
2. **qBittorrent WebUI**: Sets permanent credentials (`admin` / `adminadmin`) and opens authenticated REST API access on port 8080.
3. **Radarr & Sonarr Root Folders & Clients**:
   - Configures `/srv/media/movies` in Radarr and links qBittorrent download client.
   - Configures `/srv/media/shows` in Sonarr and links qBittorrent download client.
4. **Prowlarr Tracker Sync**:
   - Links Radarr and Sonarr applications into Prowlarr.
   - Automatically adds public indexers (YTS, Nyaa.si, The Pirate Bay, LimeTorrents) and syncs Torznab indexers into Radarr & Sonarr.
5. **Bazarr Subtitles**: Links Radarr and Sonarr API keys in `/var/lib/bazarr/config/config.yaml` for multi-language subtitle fetching.
6. **Jellyseerr Discovery**: Configures `/var/lib/seerr/settings.json` with Jellyfin server `pineapple` (`:8096`), linking Radarr & Sonarr discovery profiles.

---

## 11. System Updates, Pacman Hooks, and Hot-Deployment

### The Automated Update Engine (`tinapple-update`)
Tinapple ensures all features, package dependencies, directories, and service links are kept up-to-date through a unified updater engine located at `/usr/local/bin/tinapple-update` (source: [`scripts/tinapple-update`](scripts/tinapple-update)):

1. **Pacman & Paru Integration**:
   Updating via standard package tools automatically executes the feature synchronizer:
   ```bash
   # From any terminal or SSH session:
   sudo pacman -Syu
   # or with AUR helper:
   paru -Syu
   # or using the dedicated alias:
   update
   ```
2. **Post-Transaction Pacman Hook (`95-tinapple-feature-sync.hook`)**:
   Installed in `/etc/pacman.d/hooks/`, this hook automatically fires at the conclusion of every package transaction (`Operation = Upgrade / Install`). It ensures:
   - `paru` AUR helper is installed and operational.
   - `/srv/media` hierarchy exists with group `media` and `2775` (`g+s`) sticky permissions.
   - Appliance daemons (`jellyfin`, `qbt`, `pineapple`, `navidrome`, `suwayomi`) belong to group `media`.
   - `bbctl` (Beeper Matrix Chat Bridges manager) is downloaded and verified.
   - If Servarr stack daemons are active, executes `tinapple-configure-seerr` to re-synchronize API keys and root folders.
   - Reloads systemd daemon and triggers reverse proxy refresh.
   - Ensures `tinapple-dash` daemon is running and healthy.

3. **Dashboard 1-Click Web Update**:
   Clicking the **"System Update"** button in the dashboard top navigation bar initiates `POST /api/v1/system/update`, streaming the entire pacman/paru upgrade process live into the web console.

### Hot-Deployment Tool (`deploy-server.sh`)

For live development workstations, tinapple includes an automated hot-deployment tool located at [`scripts/deploy-server.sh`](scripts/deploy-server.sh). It compiles and updates the appliance without requiring an operating system reinstall, without wiping user data, and without system reboots:

```
Developer Workstation                                    tinapple Server
+------------------------------------+                +-------------------------+
| 1. npm run build (tinapple-hub)   |                |                         |
|    -> dist/assets/index-*.js       |                |                         |
|                                    |                |                         |
| 2. go build (tinapple-dash)        |                |                         |
|    -> bin/tinapple-dash            |                |                         |
|                                    |                |                         |
| 3. Stream binary & web assets      | == SSH/SCP ==> | /tmp/tinapple-dash      |
|    via tar archive pipe            |                | /usr/share/.../web/dist |
|                                    |                |                         |
| 4. systemctl restart               |                | systemctl restart       |
|    tinapple-dash.service           |                | tinapple-dash.service   |
+------------------------------------+                +-------------------------+
```

```bash
./scripts/deploy-server.sh 100.108.215.120
```

---

## 12. Native Client Applications (Plezy, Tsumiru, Android)

Tinapple provides dedicated client applications and guides across desktop, mobile, and web:

### 1. Plezy Desktop Client (Jellyfin Streaming)
- **Local Binary**: Pre-installed on client desktops at `~/.local/bin/plezy` (`v2.25.0`).
- **Features**: Embeds `libmpv` for 100% DirectPlay of HEVC/H.265, AV1, 10-bit HDR tone mapping, and complex SSA/ASS stylized anime subtitles with zero server transcoding load.
- **Connection**: Connect via permanent Tailscale MagicDNS:
  ```
  http://pineapple-server:8096
  # or
  http://pineapple-server.taildb42a2.ts.net:8096
  ```

### 2. Suwayomi-Tsumiru Native Client (Manga Streaming)
- **Web App**: Hosted locally at `/tsumiru/` with Keiyoushi manga source extensions and continuous chapter caching.
- **Android APK**: Available for direct download from the Web Hub at `/download/tsumiru`.

### 3. Android Companion Client (`tinapple-client.apk`)
- **Location**: [`tinapple-android/out/tinapple-client.apk`](tinapple-android/out/tinapple-client.apk)
- **Features**: Remote server telemetry, battery charge threshold control, and 1-tap launcher shortcuts.
- **Compilation**:
  ```bash
  cd tinapple-android
  ./build-apk.sh
  ```

### Installing via USB Debugging (ADB)

1. Connect your Android device via USB and enable **USB Debugging** in Developer Options.
2. Verify ADB recognizes the device:
   ```bash
   adb devices
   ```
3. Install the application:
   ```bash
   adb install -r out/tinapple-client.apk
   ```
4. Launch the application:
   ```bash
   adb shell am start -n org.tinapple.client/.MainActivity
   ```

### Over-The-Air Installation

The compiled APK is also hosted directly on the server's web dashboard. On your Android phone, browse to:
```
https://tinapple-server.<your-tailnet>.ts.net/tinapple-client.apk
```
Download and install the APK directly from the browser.

---

## 13. Interactive Online Guides & Comprehensive Manual

Tinapple OS features an integrated, interactive Documentation & Client Setup portal accessible directly via the top navigation bar (`Guides` button) or at dedicated `/guide/<service>` endpoints.

Each guide provides zero-jargon instructions, exact connection URLs (with permanent Tailscale MagicDNS addresses), recommended hardware decoding profiles, and direct download links for desktop and mobile clients.

### Available Online Guides

| Service / Topic | Web Endpoint | Topics Covered |
|-----------------|--------------|----------------|
| **Plezy & Jellyfin** | `/guide/plezy` | Hardware DirectPlay (libmpv), VAAPI/QSV transcoding, multi-channel audio bitstreaming, desktop & mobile setup |
| **Jellyseerr & Servarr** | `/guide/seerr` | Zero-touch movie/show request portal, Prowlarr indexer linking, Bazarr subtitle automation, hardlinks |
| **AdGuard Home** | `/guide/adguard` | Network-wide DNS ad-blocking, home router DHCP configuration, Android Private DNS, Apple profiles |
| **Navidrome Music** | `/guide/navidrome` | Lossless Subsonic audio streaming, Feishin (desktop), Symfonium (Android), Substreamer (iOS) |
| **SyncYomi & Suwayomi** | `/guide/syncyomi` | Centralized reading progress, Mihon & Komikku mobile sync, Keiyoushi extensions, Tsumiru reader |
| **Vaultwarden** | `/guide/vaultwarden` | Zero-knowledge password vault, Bitwarden browser extensions & mobile apps, disabling public signups |
| **Syncthing** | `/guide/syncthing` | Peer-to-peer folder replication, phone camera auto-backup, staggered versioning protection |
| **Obsidian LiveSync** | `/guide/obsidian` | End-to-end encrypted markdown notes sync with self-hosted CouchDB database backend |
| **Beeper Bridges** | `/guide/beeper` | Self-hosted WhatsApp, Signal, Discord Matrix bridges with `bbctl` CLI |
| **Tor Privacy Routing** | `/guide/tor` | SOCKS5 privacy routing, hidden services, Firefox proxy configuration |
| **Tailscale Mesh VPN** | `/guide/ssh` | Zero-config WireGuard mesh remote access, Tailscale SSH, subnet router configuration |

---

## 14. Dynamic Wallpaper Gallery & Atmosphere Theming (`imyash0722/Wallpapers`)

Tinapple OS incorporates a dynamic wallpaper switching and theming engine inspired by the Tinarchy architecture, backed by the official [`imyash0722/Wallpapers`](https://github.com/imyash0722/Wallpapers) collection.

### Key Capabilities

1. **Rich Wallpaper Gallery (120+ Curated Themes)**:
   - **Animated Loops (`.mp4`)**: Smooth, high-efficiency looping video backgrounds with muted hardware decoding.
   - **Pixel Art**: Retro nostalgic sceneries, lo-fi aesthetic cities, and rain-soaked alleyways.
   - **Anime & Aesthetic**: Studio Ghibli-style landscapes, cherry blossom shrines, and torii gates.
   - **Nature & Scenery**: Nachi falls, alpine pagoda cities, aurora borealis, and misty mountains.
   - **Sci-Fi & Cyberpunk**: Space horizons, planetary orbits, and futuristic battlestations.
   - **Pineapple Originals**: Golden branded appliance artwork.

2. **Automated Upstream Synchronization**:
   - `scripts/tinapple-update` automatically verifies and synchronizes `/usr/share/tinapple-dash/wallpapers` from `https://github.com/imyash0722/Wallpapers.git`.
   - Any new wallpaper added to the GitHub repository is pulled automatically whenever a system update is triggered.

3. **Dynamic Pywal Color Sampling**:
   - When **"Dynamic Pywal Auto-Color Sampling"** is enabled, selecting any wallpaper samples dominant vibrant midtones using a canvas quantizer and dynamically recolors the portal's primary and secondary accent hues in real time.

4. **1-Click Shuffle & Custom Upload**:
   - **Shuffle**: Instantaneously rolls a random wallpaper from the collection.
   - **Custom Upload**: Drag and drop personal `.jpg`, `.png`, `.webp`, or `.mp4` video files to upload directly to the server and apply immediately.

---

## 15. Service Management and Command Reference

### Service Control Commands

| Task | Command |
|------|---------|
| Check Dashboard Status | `sudo systemctl status tinapple-dash.service` |
| Restart Dashboard | `sudo systemctl restart tinapple-dash.service` |
| Check Caddy Proxy Status | `sudo systemctl status caddy.service` |
| Reload Caddy Configuration | `sudo systemctl reload caddy.service` |
| Restart Suwayomi Manga Server | `sudo systemctl restart suwayomi-server.service` |
| Restart Jellyfin Media Server | `sudo systemctl restart jellyfin.service` |
| Restart Navidrome Music Server | `sudo systemctl restart navidrome.service` |
| Toggle Tor Anonymity Daemon | `sudo systemctl restart tor.service` (or toggle via dashboard) |
| Check Active Port Listeners | `ss -tulpn` |

### Log Inspection

```bash
# Follow real-time dashboard logs
journalctl -u tinapple-dash.service -f -n 100

# Inspect Caddy TLS and reverse proxy logs
journalctl -u caddy.service -f -n 50

# Inspect Suwayomi Manga Server logs
journalctl -u suwayomi-server.service -f -n 100

# Inspect hardware power daemon logs
journalctl -u tinapple-hw.service -f
```

---

## 16. Troubleshooting and Diagnostic Runbook

### Issue: Vaultwarden Displays Web Crypto API Error

- **Symptom**: Web vault displays error: "This browser requires an HTTPS connection to use the Web Cryptography API."
- **Root Cause**: Vaultwarden was accessed over unencrypted HTTP (port 8000 or 8001). Modern web browsers disable cryptography primitives on insecure origins.
- **Resolution**: Access Vaultwarden exclusively through the Caddy TLS reverse proxy:
  ```
  https://tinapple-server.<your-tailnet>.ts.net:8000/
  ```

### Issue: Suwayomi Manga Shelf Shows Server Offline

- **Symptom**: The manga shelf widget displays "Suwayomi Manga Server Offline".
- **Resolution**:
  1. Verify the Suwayomi systemd unit is active:
     ```bash
     sudo systemctl status suwayomi-server.service
     ```
  2. Test local connectivity to the GraphQL endpoint:
     ```bash
     curl -s -X POST http://127.0.0.1:4567/api/graphql \
       -H "Content-Type: application/json" \
       -d '{"query":"{ mangas { totalCount } }"}'
     ```
  3. Ensure Suwayomi is bound to `0.0.0.0:4567` or `127.0.0.1:4567`.

### Issue: Android Installation Fails with INSTALL_FAILED_DEPRECATED_SDK_VERSION

- **Symptom**: ADB install fails on Android 14 / 15 with:
  `INSTALL_FAILED_DEPRECATED_SDK_VERSION: App package must target at least SDK version 24, but found 0`.
- **Root Cause**: The APK manifest was missing the `<uses-sdk>` directive or targeted a legacy API version.
- **Resolution**: Verify [`tinapple-android/AndroidManifest.xml`](tinapple-android/AndroidManifest.xml) contains:
  ```xml
  <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="34" />
  ```
  Recompile using JDK 17 and reinstall.

### Issue: Battery Does Not Stop Charging at 80%

- **Symptom**: Laptop battery continues charging to 100%.
- **Resolution**:
  Check if your hardware controller supports charge thresholds:
  ```bash
  cat /sys/class/power_supply/BAT0/charge_control_limit_max
  ```
  If the file exists, enforce the threshold manually:
  ```bash
  echo 80 | sudo tee /sys/class/power_supply/BAT0/charge_control_limit_max
  ```
  For ThinkPad devices, the node path may be `charge_control_end_threshold`.

---

## 17. Repository Directory Structure

```
tinapple/
├── bin/                          # Standalone binary tools
├── configs/                      # Service configuration templates
│   ├── caddy/                    # Caddyfile and reverse proxy rules
│   │   └── Caddyfile
│   ├── niri/                     # Wayland compositor configs
│   ├── terminal/                 # Ghostty, Alacritty, and tmux configs
│   └── waybar/                   # Waybar status bar configuration
├── out/                          # Compiled artifacts (APK, ISOs, binaries)
├── scripts/                      # Deployment and maintenance scripts
│   ├── deploy-server.sh          # Single-command hot-deploy tool
│   ├── flash-sandisk.sh          # USB drive flashing utility
│   ├── run-vm.sh                 # Local QEMU testing launcher
│   └── tinapple-display-sleep    # Display sleep helper script
├── tasks/                        # Implementation task plans and milestones
├── tinapple-android/             # Android companion application
│   ├── AndroidManifest.xml       # App manifest (SDK 24-34)
│   ├── build-apk.sh              # Standalone APK compilation script
│   ├── res/                      # Android drawables, icons, and layouts
│   └── src/                      # Java source code (MainActivity.java)
├── tinapple-base/                # Base Arch Linux filesystem overlays
├── tinapple-config-generator/    # Dynamic template parser for manifests
├── tinapple-dash/                # Core appliance Go daemon
│   ├── cmd/tinapple-dash/        # Main Go application entry point
│   ├── internal/api/             # REST API handlers, widgets, and router
│   ├── internal/services/        # Systemd daemon supervisor and catalog
│   └── web/dist/                 # Hosted production frontend assets
├── tinapple-firstboot/           # First-boot initial setup wizard
├── tinapple-hub/                 # React 18 TypeScript frontend source
│   ├── src/components/widgets/   # Dashboard widgets (Manga, Tor, Transfers)
│   ├── src/services/             # API client services
│   └── vite.config.ts            # Vite bundle configuration
├── tinapple-hw/                  # Hardware, power, and ACPI management
├── tinapple-installer/           # Archiso TUI installer
├── tinapple-maintenance/         # Scheduled backup and log cleanup timers
└── README.md                     # Technical reference and documentation
```

---

## 18. License

This project is licensed under the GNU General Public License v3.0 (GPLv3). See the LICENSE file for details.
