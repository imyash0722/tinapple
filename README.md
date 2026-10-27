# tinapple

Turnkey homelab operating system and appliance platform engineered for bare-metal home servers, repurposed hardware, mini-PCs, and laptops. Built on Arch Linux and CachyOS compiler-optimized performance packages.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Key Capabilities](#2-key-capabilities)
3. [System Architecture and Subsystems](#3-system-architecture-and-subsystems)
4. [Integrated Homelab Services and Port Matrix](#4-integrated-homelab-services-and-port-matrix)
5. [Hardware Specifications and Power Abstraction](#5-hardware-specifications-and-power-abstraction)
6. [Installation and First-Boot Provisioning](#6-installation-and-first-boot-provisioning)
7. [Networking, Remote Access, and HTTPS Configuration](#7-networking-remote-access-and-https-configuration)
8. [Storage Layout and Multi-User Setup](#8-storage-layout-and-multi-user-setup)
9. [Suwayomi Manga Server Integration](#9-suwayomi-manga-server-integration)
10. [Hot-Deployment and System Update Architecture](#10-hot-deployment-and-system-update-architecture)
11. [Android Companion Client Application](#11-android-companion-client-application)
12. [Service Management and Command Reference](#12-service-management-and-command-reference)
13. [Troubleshooting and Diagnostic Runbook](#13-troubleshooting-and-diagnostic-runbook)
14. [Repository Directory Structure](#14-repository-directory-structure)
15. [License](#15-license)

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

---

## 5. Hardware Specifications and Power Abstraction

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

## 10. Hot-Deployment and System Update Architecture

tinapple includes an automated hot-deployment tool located at [`scripts/deploy-server.sh`](scripts/deploy-server.sh). It compiles and updates the appliance without requiring an operating system reinstall, without wiping user data, and without system reboots.

### How Updates Work

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

### Running the Deployment Tool

From the root of the repository:

```bash
./scripts/deploy-server.sh 192.168.1.17
```

You can customize the target username and host via environment variables:

```bash
TARGET_USER=tinapple ./scripts/deploy-server.sh tinapple-server.tail3dee69.ts.net
```

The script executes five stages:
1. **Connectivity Verification**: Tests SSH connectivity with key authentication.
2. **Frontend Compilation**: Builds production assets for `tinapple-hub` via Vite.
3. **Backend Cross-Compilation**: Compiles the Go binary with optimizations (`-ldflags="-s -w"`).
4. **Asset Streaming**: Stops `tinapple-dash.service`, updates `/usr/bin/tinapple-dash`, extracts web assets directly into `/usr/share/tinapple-dash/web/dist`, and restarts the service.
5. **Health Verification**: Performs an automated HTTP health check against `/api/v1/system/info`.

---

## 11. Android Companion Client Application

The Android companion client (`tinapple-client.apk`) provides remote server monitoring, widget access, and direct links to all homelab web portals on mobile devices.

### Compilation Prerequisites

- OpenJDK 17 (`JAVA_HOME=/usr/lib/jvm/java-17-openjdk` or `~/.jdks/jdk-17.0.20.1+1`).
  *Note: Android D8 build tools cannot parse class bytecode compiled with Java 21 or newer.*
- Android SDK Command-line Tools and Build-Tools version `34.0.0`.
- Android Platform SDK `android-34` (`platforms/android-34/android.jar`).

### Building the APK

Run the automated compilation script inside the `tinapple-android` directory:

```bash
cd tinapple-android
./build-apk.sh
```

The script performs resource compilation with AAPT2, Java source compilation, bytecode desugaring and dexing with D8, archive alignment with zipalign, and signing with apksigner. The completed APK is generated at:
```
out/tinapple-client.apk
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

## 12. Service Management and Command Reference

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

## 13. Troubleshooting and Diagnostic Runbook

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

## 14. Repository Directory Structure

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

## 15. License

This project is licensed under the GNU General Public License v3.0 (GPLv3). See the LICENSE file for details.
