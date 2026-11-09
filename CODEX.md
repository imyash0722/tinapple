# Server Environment & Systems Manual (CODEX.md)

This document is the operational reference for **OpenAI Codex CLI** and AI agents on this server. Observations are dated 2026-11-09; verify live state when a task depends on it.

---

## 1. Machine & System Identity

- **Host Platform**: Arch Linux x86_64 (Kernel: `linux-lts` 6.18.60-1-lts)
- **Hardware**: Dell Latitude 7300, Intel Core i5-8265U (4C/8T), ~7.6 GiB RAM, 256 GB NVMe SSD
- **Hostname**: `tinapple-server`
- **Primary User**: `tinapple` (uid: 1000, gid: 982, group: `users`, home: `/home/tinapple`)
- **Compatibility Paths**: `/home/tin` is a symlink to `/home/tinapple` (no separate `tin` user exists in `/etc/passwd`)
- **Core Role**: Dedicated 24/7 self-hosted homelab, media automation appliance, and private cloud server for Tinapple OS. Configured for headless, closed-lid operation (`multi-user.target`, systemd lid-switch ignored, display sleep/suspend masked).

---

## 2. Network Topology & Interfaces

| Network Zone | IP / Address / Port | Description |
| :--- | :--- | :--- |
| **Local LAN** | `192.168.1.103` | Main network interface is Wi-Fi `wlo1` (gateway `192.168.1.1`). |
| **Tailscale Tailnet** | `100.67.207.60` | Node DNS name: `tinapple-server.tail3dee69.ts.net`. Tailnet domain `tail3dee69.ts.net`. |
| **Tailscale Funnel (Public)** | `https://tinapple-server.tail3dee69.ts.net:8443` | Public internet ingress proxying to Suwayomi (`http://127.0.0.1:4567`). Authentication mode is currently `NONE` (user manages login manually). |
| **Client Laptop** | `tinux` (on Tailscale) | User's primary workstation laptop (`100.103.108.21`). |
| **Android Device** | `100.111.180.87:5555` | Google Pixel 10a running Android 17, connected via wireless ADB over Tailscale. |
| **Proton VPN WireGuard** | Interface `proton` | Outbound privacy exit gateway configured in `/etc/wireguard/proton.conf` (`wg-quick@proton`). Controlled via dashboard; absence of `proton` interface when toggle is OFF is normal expected behavior. |
| **Cloudflare WARP** | Former port `40000` (closed) | Previously ran in local proxy mode (`Mode WarpProxy`); disconnected, stopped, disabled, and masked (`warp-svc.service`). No consumers were found in the inspected service configuration or connection snapshot; local application checks passed after shutdown. |
| **Caddy Reverse Proxy** | Ports `80`, `443`, `8000`, `8095`, `5055` | Caddy executable runs under the legacy systemd unit name `tinapple-nginx.service` (`/etc/tinapple/Caddyfile`). Handles SSL, web frontend, Vaultwarden proxy (`:8000` -> `127.0.0.1:8001`), Ombi Jellyfin bridge (`:8095`), and Ombi compatibility bridge (`:5055` -> `127.0.0.1:5000` for active Tailscale guest allow rule). |
| **Tinapple Web Daemon** | Port `8088` | Core Go Gin backend daemon (`tinapple-dash.service`) serving API and web dashboard. |

---

## 3. Storage Hierarchy & Key Paths

```
/
├── srv/
│   └── media/                   # Unified media library tree
│       ├── movies/              # Managed by Radarr
│       ├── shows/               # Managed by Sonarr
│       ├── anime/               # Managed by Sonarr / Radarr
│       ├── kdrama/              # Managed by Sonarr
│       ├── music/               # Media music directory; Navidrome libraries use storage/Music and storage/TinMusic
│       ├── manga/               # Managed by Suwayomi
│       ├── downloads/           # Managed by qBittorrent (non-seeding completed file workflow)
│       ├── youtube/             # Headless YouTube archive downloads
│       └── youtube-music/       # Headless YouTube music downloads
│
├── home/tinapple/
│   ├── tinapple/                # Primary monorepo (see section 5)
│   ├── drive/                   # User storage (no backup coverage asserted)
│   ├── storage/                 # Wallpapers, music libraries, notes
│   ├── Documents/
│   │   └── Antigravity-Share/   # Shared guides, continuity reviews, architecture notes
│   ├── .codex/                  # Codex CLI configuration, auth, and skills
│   └── .gemini/                 # Antigravity CLI and agent state
│
├── home/tin/ -> /home/tinapple  # Compatibility symlink
│   └── storage/Downloads -> /srv/media/downloads
│
└── usr/share/tinapple-dash/web/dist/ # Live web dashboard production distribution
```

*(Note: Legacy paths `/srv/torrents` and `/srv/minecraft` mentioned in early planning docs do not exist on this host).*

---

## 4. Port Map & Installed Services

| Service | Port | Management Unit | Role & Notes |
| :--- | :--- | :--- | :--- |
| **Tinapple Dashboard** | `8088` | `tinapple-dash.service` | Central appliance dashboard and Go API daemon |
| **Jellyfin** | `8096` | `jellyfin.service` | Media streaming server (has `8095` Caddy compatibility bridge for Ombi) |
| **qBittorrent NoX** | `8080` | `qbittorrent-nox.service` | BitTorrent client running as user `tinapple` (non-seeding post-import workflow) |
| **Sonarr** | `8989` | `sonarr.service` | TV show collection manager and indexer watcher |
| **Radarr** | `7878` | `radarr.service` | Movie collection manager and automated grabber |
| **Prowlarr** | `9696` | `prowlarr.service` | Torrent indexer manager |
| **Bazarr** | `6767` | `bazarr.service` | Subtitle synchronizer and fetcher |
| **Ombi** | `5000` (bridge `:5055`) | `ombi.service` | Primary user request portal routing to Sonarr / Radarr; Caddy `:5055` provides immediate compatibility for Tailscale guest ACL |
| **Reiverr** | `9494` | `reiverr.service` | Alternative media request portal (retained for evaluation) |
| **Suwayomi** | `4567` | `suwayomi-server.service` | Manga reader; exposed publicly via Tailscale Funnel on `:8443` |
| **Navidrome** | `4533` | `navidrome.service` | Subsonic-compatible music streaming server |
| **Vaultwarden** | `8001` (Caddy `:8000`) | `vaultwarden.service` | Bitwarden-compatible password vault |
| **FileBrowser Quantum** | `8081` | `filebrowser.service` | Web file explorer (no MeTube, no Docker runtime) |
| **FlareSolverr** | `8191` | `flaresolverr.service` | Cloudflare challenge bypass proxy for indexers and Suwayomi |
| **TMDb Relay** | `8098` | `tmdb-relay.service` | Python ClientHello DPI desync relay for Ombi TMDb metadata |
| **Syncthing** | `8384` | `syncthing@tinapple.service`| Continuous peer-to-peer file synchronization |
| **Watcherr** | daemon | `tinapple-torrent-healer.service` | Stalled torrent healer (`/usr/local/bin/watcherr`) |
| **AdGuard Home** | `3000` / `53` | `adguardhome.service` | DNS ad-blocker (installed/enabled, observed inactive; reason not established) |
| **Cloudflare WARP** | `40000` | `warp-svc.service` | Masked & disabled (unused; resolved 2026-11-09) |
| **Serial Getty** | `ttyS0` | `serial-getty@ttyS0.service` | Masked & disabled (unusable UART caused restart loop; resolved 2026-11-08) |
| **Matrix Synapse / PG** | `8008` / `5432`| `synapse.service`, `postgresql.service` | Deliberately retired and masked to conserve memory |

---

## 5. Main Monorepo Structure (`/home/tinapple/tinapple`)

- **Git Remote**: `https://github.com/imyash0722/tinapple.git` (branch: `main`, user: `T1n777`)
- **Key Subdirectories**:
  - `tinapple-android/`: **Pure Native Kotlin Android Companion** (`org.tinapple.hub`, v2.0.1, versionCode 5, compile/target SDK 35, minSdk 26). Built with Jetpack Compose Material 3, Matugen dynamic theming engine, liquid glass styling, brand vector icons, and Proton VPN toggle. Release APK is signed with `tinapple-release.keystore`. Direct service cards route Ombi via client-facing port 5055.
  - `tinapple-hub/`: React 18 (`^18.3.1`) / Vite 5 (`^5.4.11`) dashboard with draggable Homarr 2D canvas, settings manifest, full PTY web terminal, and guide docs.
  - `tinapple-dash/`: Go Gin backend daemon (`:8088`), serving REST APIs, SSE transaction logs, system service state, wallpaper static files, and downloads.
  - `tinapple-service-*/`: Media, infrastructure, download, backup systemd units and packaging.
  - `scripts/`: Packaging (`build-desktop-releases.sh`), deployment (`stage-live-artifacts.sh`), and maintenance scripts.
  - `out/releases/`: Packaged client release artifacts and `SHA256SUMS`. Validate each platform's artifacts independently; their presence does not establish that every package is functional.
  - `GEMINI.md`: **Project Architecture & AI Synchronization Ledger**. Must be kept updated before any git push.

---

## 6. Installed Tools & Build Environments

- **Android SDK**: `/opt/android-sdk`
  - Build tools: `34.0.0`, `35.0.0`
  - Platforms: `android-35`
  - `adb`: Available at `/usr/local/bin/adb`
- **Java**: OpenJDK 21.0.12.1 (`/usr/lib/jvm/default`)
- **Node.js**: v26.13.0 with `npm` 12.2.2 and `pnpm` 12.17.0
- **Go**: 1.27.3
- **Python**: 3.14.9
- **GitHub CLI**: `gh` (authenticated as `T1n777` with repo write access)
- **Arch Packaging**: `pacman` and `paru`; the package-signing keyring is separate from sudo/password prompts. Its WKD refresh service was failing on 2026-11-09 and was left unchanged in this task.

---

## 7. Operational Continuity & Decisions

1. **User Scope Decisions**:
   - **Backups & Access Hardening**: Out of scope by explicit user decision. Do not configure backup automation or harden SSH/firewall unless explicitly requested.
   - **Privilege Elevation**: Passwordless sudo (`sudo -n`) is enabled and preferred for user convenience. Package signature checks (`archlinux-keyring`) remain active.
   - **Public Suwayomi Access**: Public Funnel on `https://tinapple-server.tail3dee69.ts.net:8443` is intentionally authorized without authentication (`authMode NONE`). Login will be added manually by the user later.
2. **Historical Decision Anchors**:
   - Continuity review: [`/home/tinapple/Documents/Antigravity-Share/tinapple-history-review-20261108.md`](file:///home/tinapple/Documents/Antigravity-Share/tinapple-history-review-20261108.md)
   - Maintenance log 2026-11-08 (zswap & serial loop fix): [`/home/tinapple/Documents/Antigravity-Share/server-maintenance-20261108.md`](file:///home/tinapple/Documents/Antigravity-Share/server-maintenance-20261108.md)
   - Maintenance log 2026-11-09 (WARP mask & Suwayomi Funnel): [`/home/tinapple/Documents/Antigravity-Share/server-maintenance-20261109.md`](file:///home/tinapple/Documents/Antigravity-Share/server-maintenance-20261109.md)
3. **Git & Push Safety**:
   - Always run `git fetch origin && git rebase origin/main` before pushing to avoid overwriting remote work.
   - Never use `--force` or `--force-with-lease` on `main`.
   - Update `GEMINI.md` and run `python3 /home/tinapple/tinapple/scripts/sync-gemini-ledger.py` before committing or pushing.
4. **Formatting**:
   - Do not use emojis in automated commit messages or logs.
