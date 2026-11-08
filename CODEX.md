# Server Environment & Systems Manual (CODEX.md)

This document provides complete, authoritative context for the **OpenAI Codex CLI** and AI agents operating on this machine.

---

## 1. Machine & System Identity

- **Host Platform**: Arch Linux x86_64
- **Hostname**: `tinapple-server` (or `appliance-node`)
- **Primary User**: `tinapple` (uid: 1000, gid: 1000, home: `/home/tinapple`)
- **Secondary User**: `tin`
- **Core Role**: Dedicated 24/7 self-hosted homelab, media automation appliance, and private cloud server for Tinapple OS.

---

## 2. Network Topology & Interfaces

| Network Zone | IP / Address | Description |
| :--- | :--- | :--- |
| **Local LAN** | `192.168.1.103` | Main network interface (`enp2s0` / `wlan0`). |
| **Tailscale Tailnet** | `100.67.207.60` | Machine's private mesh IP (`pineapple-server.taildb42a2.ts.net`). |
| **Client Laptop** | `tinux` (on Tailscale) | User's primary workstation laptop. |
| **Android Device** | `100.111.180.87:5555` | Google Pixel 10a running Android 17, connected via wireless ADB over Tailscale. |
| **Proton VPN WireGuard** | Interface `proton` | Outbound privacy exit gateway configured in `/etc/wireguard/proton.conf`. `PostUp` includes routing for `100.64.0.0/10` so Tailscale and LAN remain reachable while VPN is active. |
| **Nginx Reverse Proxy** | Ports `80`, `443` | Reverse proxy terminating SSL and routing domains to local service ports. |
| **Tinapple Web Daemon** | Port `8088` | Core Go Gin backend daemon (`tinapple-dash`) serving API and dashboard. |

---

## 3. Storage Hierarchy & Key Paths

```
/
├── srv/
│   ├── media/                   # Media library (Jellyfin / Navidrome / Suwayomi)
│   │   ├── Movies/              # Managed by Radarr
│   │   ├── Shows/               # Managed by Sonarr
│   │   ├── Music/               # Managed by Navidrome / MeTube
│   │   ├── Manga/               # Managed by Suwayomi
│   │   └── youtube/             # Headless YouTube archive downloads
│   ├── torrents/                # BitTorrent staging and seeding (qBittorrent)
│   └── minecraft/               # Minecraft server instance jar & world data
│
├── home/tinapple/
│   ├── tinapple/                # Primary monorepo (see section 5)
│   ├── drive/                   # Synced storage, backups, and user documents
│   ├── storage/                 # Wallpapers, music libraries, notes
│   ├── Documents/
│   │   └── Antigravity-Share/   # Shared artifacts folder
│   ├── .codex/                  # Codex configuration, auth, and skills
│   └── .gemini/                 # Antigravity CLI and agent state
│
└── usr/share/tinapple-dash/web/dist/ # Live web dashboard production distribution
```

---

## 4. Port Map & Installed Services

| Service | Port | Management Unit | Role |
| :--- | :--- | :--- | :--- |
| **Tinapple Dashboard** | `8088` | `tinapple-dash.service` | Central appliance dashboard and API daemon |
| **Jellyfin** | `8096` | `jellyfin.service` | Hardware-accelerated media streaming server |
| **qBittorrent NoX** | `8080` | `qbittorrent-nox@tinapple.service` | Headless BitTorrent client |
| **Sonarr** | `8989` | `sonarr.service` | TV show collection manager and indexer watcher |
| **Radarr** | `7878` | `radarr.service` | Movie collection manager and automated grabber |
| **Prowlarr** | `9696` | `prowlarr.service` | Torrent & Usenet indexer manager |
| **Bazarr** | `6767` | `bazarr.service` | Subtitle synchronizer and fetcher |
| **Ombi** | `3579` | `ombi.service` | User request portal routing to Sonarr / Radarr |
| **Suwayomi** | `4567` | `suwayomi.service` | Manga reader and automated chapter downloader |
| **Navidrome** | `4533` | `navidrome.service` | Subsonic-compatible music streaming server |
| **Vaultwarden** | `8001` / `3012` | `vaultwarden.service` | Bitwarden-compatible password vault |
| **MeTube** | `8081` | `docker` or systemd | Web GUI for yt-dlp YouTube video downloader |
| **FileBrowser** | `8082` | `filebrowser.service` | Web-based file explorer and storage manager |
| **Syncthing** | `8384` | `syncthing@tinapple.service` | Continuous peer-to-peer file synchronization |
| **AdGuard Home** | `3000` / `53` | `adguardhome.service` | Network-wide DNS ad-blocking and privacy |
| **Watcherr** | daemon | `watcherr.service` | Torrent health and indexer failover watchdog |

---

## 5. Main Monorepo Structure (`/home/tinapple/tinapple`)

- **Git Remote**: `https://github.com/imyash0722/tinapple.git` (branch: `main`, user: `T1n777`)
- **Key Subdirectories**:
  - `tinapple-android/`: **Pure Native Kotlin Android Companion** (`org.tinapple.hub`, v2.0.0). Built with Jetpack Compose Material 3, Matugen dynamic theming engine, liquid glass styling, brand vector icons, and Proton VPN toggle. Release APK is signed with `tinapple-release.keystore`.
  - `tinapple-hub/`: React 18 / Vite 6 dashboard with infinite draggable Homarr 2D canvas, settings manifest, full PTY web terminal, and guide docs.
  - `tinapple-dash/`: Go Gin backend daemon (`:8088`), serving REST APIs, SSE transaction logs, system service state, wallpaper static files, and downloads.
  - `tinapple-service-*/`: Media, infrastructure, download, backup systemd units and packaging.
  - `scripts/`: Packaging (`build-desktop-releases.sh`), deployment (`stage-live-artifacts.sh`), and maintenance scripts.
  - `out/releases/`: Production client binaries (APK, AppImage, DMG, EXE, ZIP, IPA) and `SHA256SUMS`.
  - `GEMINI.md`: **Project Architecture & AI Synchronization Ledger**. Must be kept updated before any git push.

---

## 6. Installed Tools & Build Environments

- **Android SDK**: Located at `/opt/android-sdk`
  - Platform tools: `/opt/android-sdk/platform-tools`
  - Build tools: `35.0.0`
  - Platforms: `android-35`
  - `adb`: Available in system path at `/usr/local/bin/adb`
- **Java**: OpenJDK 21 (`/usr/lib/jvm/default`)
- **Node.js**: v20+ with `npm` and `pnpm`
- **Go**: Latest Go toolchain for building `tinapple-dash` and helper utilities
- **GitHub CLI**: `gh` (authenticated as `T1n777` with repo write access)
- **Arch Packaging**: `pacman` and `paru`

---

## 7. Operational Guidelines for Codex

1. **Privilege Elevation**:
   - For administrative actions, use `pkexec <command>` or documented `sudo` paths.
2. **Git & Push Safety**:
   - Always run `git fetch origin && git rebase origin/main` before pushing to avoid overwriting remote work.
   - Never use `--force` or `--force-with-lease` on `main`.
3. **AI Synchronization**:
   - Whenever changes are made to `tinapple`, document them in [`tinapple/GEMINI.md`](file:///home/tinapple/tinapple/GEMINI.md) prior to pushing.
4. **Formatting**:
   - Do not use emojis in automated commit messages or logs.
