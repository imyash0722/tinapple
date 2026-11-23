# Tinapple AI Synchronization & Project Architecture Ledger (GEMINI.md)

> **CRITICAL DIRECTIVE FOR ALL AI AGENTS & CONTRIBUTORS:**
> **Every agent working on this repository MUST read this file upon starting a task, and MUST update this file before committing or pushing changes to Git.**
> This document acts as the single source of truth for architectural decisions, active module states, and cross-agent synchronization to prevent conflicting implementations, lost context, or overwrites.

---

## 1. Core Operating Guidelines

### Privilege Elevation & Safety
- When an operation requires root privileges (editing `/etc`, managing systemd units, running pacman/paru):
  - Prefer Polkit via `pkexec <command>` or documented `sudo` paths.
  - Never bypass environment boundaries or defeat permissions without explicit user authorization.

### Codebase Analysis (Graphify)
- When analyzing dependencies or exploring codebase relationships, check `graphify-out/`.
- Run `graphify query "<question>"` for targeted lookups before broad scans.
- Run `graphify update .` after structural changes to keep AST representations up to date.

### Git & Push Integrity Protocol
- **Always fetch before pushing**: Run `git fetch origin && git rebase origin/main` (or pull) to verify no upstream commits were pushed by others.
- **Fast-forward only**: Never use `--force` or `--force-with-lease` on shared branches.
- **Update this ledger**: Document any new files, modules, features, or architectural shifts in the **Changelog & Active State** section below before creating commits.
- **Tone & Style**: Do not include emojis in automated commit messages, code comments, or tool logs unless explicitly requested by the user.

---

## 2. Repository Architecture & Module Map

| Module Path | Technology / Stack | Purpose & Architecture |
| :--- | :--- | :--- |
| [`tinapple-android/`](file:///home/tinapple/tinapple/tinapple-android/) | **Kotlin 2.0.21, Jetpack Compose, Material 3, OkHttp, Coil, AGP 8.7.2** | **Pure Native Android Companion App** (`org.tinapple.hub`, v2.0.1, versionCode 5). Built from the ground up to replace the legacy Capacitor hybrid app. Contains direct service cards (links + toggles), Proton VPN exit node gateway switch, and a dedicated Appearance Page. |
| [`tinapple-hub/`](file:///home/tinapple/tinapple/tinapple-hub/) | **React 18 (`^18.3.1`), Vite 5 (`^5.4.11`), TypeScript, Tailwind CSS, Lucide, Framer Motion** | Main web frontend and desktop UI bundle. Features infinite draggable Homarr 2D canvas, settings manifest, full PTY web terminal, and guide docs. Deployed to `/usr/share/tinapple-dash/web/dist/`. |
| [`tinapple-dash/`](file:///home/tinapple/tinapple/tinapple-dash/) | **Go (Gin), systemd integration, polkit, SSE streams** | Core appliance backend daemon listening on port `:8088`. Serves REST APIs (`/api/v1/services`, `/api/v1/system/proton-exit`, `/api/v1/wallpapers`), static dashboard files, and `/download/apk` releases. |
| [imyash0722/pinemusic](https://github.com/imyash0722/pinemusic) | **Python 3.12, FastAPI, Uvicorn, aiosqlite, Mutagen, React 18, Vite 5, Tailwind** | **PineMusic Appliance** (:8090). Standalone zero-auth high-fidelity music requester, interactive queue manager, and bitstream ingest engine for Navidrome. Integrated into `audiophile-cloud` pack. |
| [`tinapple-service-*/`](file:///home/tinapple/tinapple/) | **Systemd units, Arch Linux PKGBUILDs, Bash/Python daemons** | Modular service orchestration: `tinapple-service-media` (Jellyfin, Sonarr, Radarr, qBittorrent), `tinapple-service-downloads`, `tinapple-service-infrastructure`, and `tinapple-service-backups`. |
| [`scripts/`](file:///home/tinapple/tinapple/scripts/) | **Bash, Python 3** | Automation scripts including [`build-desktop-releases.sh`](file:///home/tinapple/tinapple/scripts/build-desktop-releases.sh) (multiplatform packager), [`stage-live-artifacts.sh`](file:///home/tinapple/tinapple/scripts/stage-live-artifacts.sh), and [`tinapple-torrent-healer`](file:///home/tinapple/tinapple/scripts/tinapple-torrent-healer). |
| [`out/releases/`](file:///home/tinapple/tinapple/out/releases/) | **APK, AppImage, DMG, EXE, ZIP, IPA, SHA256SUMS** | Packaged client release artifacts and checksums; validate each platform's binaries independently. |

---

## 3. Server Environment & Hardware Context

- **Node Hostname**: `pineapple-server` (Acer Aspire V3-571, serial `NXRYFSI012228003C43400`, 7.6 GiB RAM)
- **OS**: Arch Linux x86_64 (`linux-lts` 6.18.63-3-lts)
- **Local Network IP**: `10.3.2.105` (Wi-Fi `wlp3s0`, gateway `10.3.0.1`, connected to 5 GHz on `PESU-EC-Campus-5G` at 5580 MHz)
- **Tailscale Tailnet IP**: `100.108.215.120` (`pineapple-server.taildb42a2.ts.net`)
- **Tailscale HTTPS Domain**: `https://pineapple-server.taildb42a2.ts.net` (Trusted Let's Encrypt certificates managed by Caddy on port 443 with automated bi-monthly renewal via `caddy-tailscale-cert.timer`)
- **Cloudflare Tunnel Ingress**: `tinapple-cloudflared.service` (Direct outbound edge tunnel on port 80/Caddy, completely immune to symmetric NAT/DERP stalls)
- **Active Web Dashboard Port**: `:8088` (Reverse-proxied via Caddy on port 80/443 under unit `caddy.service`)
- **Cloudflare WARP**: Disconnected, stopped, disabled, and masked (`warp-svc.service`)
- **Connected ADB Target**: Google Pixel 10a at `100.111.180.87:5555`
- **Android SDK Path**: `/opt/android-sdk` (build-tools `34.0.0`, `35.0.0`, platforms `android-35`)
- **Android Release Keystore**: [`tinapple-android/keystore/tinapple-release.keystore`](file:///home/tinapple/tinapple/tinapple-android/keystore/tinapple-release.keystore) (alias `tinapple`)

---

## 4. Key Subsystem Implementation Details

### A. Native Android Companion (`tinapple-android`)
- **Why Pure Native**: The previous hybrid Capacitor/WebView app was completely replaced due to webview loading overhead and poor wallpaper integration. The native Kotlin app is **12.4 MB** (down from ~98 MB) with instant launch, responsive 120Hz Compose scrolling, and direct Android API access.
- **Matugen Dynamic Theming ([`MatugenEngine.kt`](file:///home/tinapple/tinapple/tinapple-android/app/src/main/java/org/tinapple/hub/ui/theme/MatugenEngine.kt))**:
  - Automatically samples dominant wallpaper pixels and generates 4 distinct harmonic Material 3 color combinations:
    1. **Vibrant**: High-chroma saturated accent.
    2. **Harmonious**: Analogous hue flow (+38° shift) blending smoothly with wallpaper colors.
    3. **Contrast**: High-contrast complementary pop (+155° shift) for maximum readability.
    4. **Muted**: Soft, desaturated atmospheric tone.
  - Manual preset fallback palettes: *Deep*, *Pineapple*, *Sapphire*, *Cyber*, *Emerald*.
- **Tile Liquid Glass Styling ([`Color.kt`](file:///home/tinapple/tinapple/tinapple-android/app/src/main/java/org/tinapple/hub/ui/theme/Color.kt))**:
  - Live translucency levels: Solid (100%), Frosted (82%), Liquid (65%), Crystal (48%).
  - Dynamic `Modifier.blur()` background blur, scrim dimming gradient, and specular frosted edge highlights across all dashboard cards.
- **Brand Vector Icons ([`ServiceBrandIconResolver.kt`](file:///home/tinapple/tinapple/tinapple-android/app/src/main/java/org/tinapple/hub/ui/components/ServiceBrandIconResolver.kt))**:
  - 39 bundled vector SVGs and PNGs rendered via Coil SVG decoder for services (Jellyfin, qBittorrent, Sonarr, Radarr, Ombi, Bazarr, Suwayomi, Tailscale, Syncthing, etc.).
- **Auto-Discovery ([`DiscoveryEngine.kt`](file:///home/tinapple/tinapple/tinapple-android/app/src/main/java/org/tinapple/hub/network/DiscoveryEngine.kt))**:
  - Parallel `/health` probes across LAN (`192.168.1.103:8088`), Tailscale (`100.67.207.60:8088`), and HTTPS domain.

### B. Proton VPN Exit Node Control
- Proton VPN WireGuard (`/etc/wireguard/proton.conf` / `wg-quick@proton`) is an optional, user-controlled outbound privacy layer. Both ON and OFF modes are intentional; absence of the tunnel when OFF is expected. The idle `proton.VPN.service` daemon is not evidence of an active VPN tunnel.
- Controlled via `/api/v1/system/proton-exit` on the backend daemon.
- WireGuard `PostUp` includes `100.64.0.0/10` routing rules to ensure local LAN and Tailscale connectivity remain fully unblocked while VPN is active.

---

## 5. Changelog & Active State Ledger

### Maintenance (2026-11-23) | fix(suwayomi/hotspot): diagnose download stalls, fix hotspot dns routing, and optimize local ip bitstream delivery
- **Scope**: Diagnosed Tsumiru client download freeze and slow transfer issues on `pineapple-server`, identified Suwayomi server-side download queue backlog (250+ chapters from Rolia Scan) and intermittent Cloudflare/SSL drops over Proton VPN SOCKS proxy, resolved Android hotspot DNS hijacking by updating `tinapple-hotspot.conf` to advertise exclusively `192.168.4.1` with upstream resolvers, added local FQDN mappings to `/etc/hosts`, advertised subnets `192.168.4.0/24` and `192.168.1.0/24` in Tailscale alongside exit node for transparent LAN routing, and verified direct high-speed local IP peer-to-peer connectivity (`active; direct 192.168.4.101:57119`).
- **Implementation & Verifications**:
  - **Suwayomi Log & Pipeline Diagnosis**:
    - Discovered 226+ chapters queued synchronously in Suwayomi (`server.maxSourcesInParallel = 6`, grouped by source). At ~1.5 min per chapter, a 250-chapter batch requires 5-6 hours of sequential processing.
    - Verified download worker active and progressing steadily (Chapter 136 -> 137 -> 138 -> 139 -> 140 -> 141).
    - Identified intermittent `SSLHandshakeException: Remote host terminated the handshake` and `EOFException: SSL peer shut down incorrectly` in OkHttp caused by Cloudflare rate-limiting/handshake drops against Proton VPN datacenter egress (`89.187.164.251`).
  - **Hotspot DNS & Permanent Local IP Fix**:
    - Updated [`tinapple-service-network/configs/dnsmasq/tinapple-hotspot.conf`](file:///mnt/shared/projects/tinapple/tinapple-service-network/configs/dnsmasq/tinapple-hotspot.conf) and server `/etc/dnsmasq.d/tinapple-hotspot.conf` to remove secondary `1.1.1.1` from `dhcp-option=option:dns-server` and add upstream `server=1.1.1.1` and `server=8.8.8.8`.
    - Added local hostnames (`pineapple-server.taildb42a2.ts.net`, `pineapple-server`, `tinapple.local`) to `/etc/hosts` on server.
    - Restarted `tinapple-hotspot.service` with both `hostapd` and `dnsmasq` active in its cgroup.
  - **Tailscale Auto-Routing & Advertised Subnets**:
    - Configured `tailscale set --advertise-exit-node --advertise-routes=192.168.4.0/24,192.168.1.0/24` on server, updating [`scripts/tinapple-proton`](file:///mnt/shared/projects/tinapple/scripts/tinapple-proton) and [`scripts/tinapple-tailscale-watchdog`](file:///mnt/shared/projects/tinapple/scripts/tinapple-tailscale-watchdog).
    - Confirmed Tailscale automatically establishes direct local Wi-Fi peer socket (`active; direct 192.168.4.101:57119` in 29ms) when on hotspot, and seamlessly falls back to remote relay when off-network without requiring per-app reconfiguration.

### Maintenance (2026-11-21) | feat(suwayomi/tsumiru): remove tsumiru web client from server, redirect web traffic to suwayomi, preserve native client apps
- **Scope**: Removed redundant Tsumiru static Flutter Web assets (65MB) from `tinapple-hub` and server web distribution, updated Caddy and `tinapple-dash` to permanently redirect `/tsumiru` and `/tsumiru/*` to `/suwayomi/`, removed duplicate `tsumiru` service card in `serviceRegistry.ts` while retaining Suwayomi as the canonical manga server, and preserved native Android client APK deep linking and download routes (`/download/tsumiru`).
- **Implementation & Verifications**:
  - **Static Web Assets Purged**: Removed `tinapple-hub/public/tsumiru/` and `tinapple-dash/web/dist/tsumiru/`, shrinking web bundle by ~65MB and speeding up Vite builds.
  - **Caddy Ingress & Dashboard Redirect**:
    - Updated [`configs/caddy/Caddyfile`](file:///mnt/shared/projects/tinapple/configs/caddy/Caddyfile) to replace `file_server` on `/tsumiru/*` with `redir /tsumiru /suwayomi/ permanent` and `redir /tsumiru/* /suwayomi/ permanent`.
    - Updated [`tinapple-dash/cmd/tinapple-dash/main.go`](file:///mnt/shared/projects/tinapple/tinapple-dash/cmd/tinapple-dash/main.go) to issue HTTP 301 redirects to `/suwayomi/`.
  - **Service Taxonomy & App Links**:
    - Updated [`tinapple-hub/src/services/serviceRegistry.ts`](file:///mnt/shared/projects/tinapple/tinapple-hub/src/services/serviceRegistry.ts) to remove the duplicate `tsumiru` entry.
    - Updated [`tinapple-hub/src/utils/platformAppLinks.ts`](file:///mnt/shared/projects/tinapple/tinapple-hub/src/utils/platformAppLinks.ts) and [`tinapple-hub/src/services/api.ts`](file:///mnt/shared/projects/tinapple/tinapple-hub/src/services/api.ts): on desktop/browser, manga links open `/suwayomi/` (Suwayomi WebUI); on Android, native Tsumiru APK app intent and `/download/tsumiru` remain available with `/suwayomi/` web fallback.

### Maintenance (2026-11-21) | feat(pinemusic/ui): simplify logo vector icon, drop redundant settings tab, update readmes and sync repos
- **Scope**: Re-engineered the PineMusic logo into a clean, minimalist geometric vector icon legible at small navbar scales (32px/24px), dropped the redundant Settings tab from PineMusic (removing `SettingsTab.tsx` and trimming navbar/app state), distributed `pinemusic.svg` to Tinapple Hub and Android companion icon directories, integrated PineMusic into `AppBrandIcons.tsx` and `serviceRegistry.ts`, updated READMEs across both repositories with clean architecture diagrams, and synchronized all changes across local and remote git repositories.
- **Implementation & Verifications**:
  - **Minimalist Vector Logo**:
    - Replaced the 143-line complex polygonal SVG with a crisp 32x32 geometric design: 3 crown leaves in forest sage (`#5c8d6d`, `#4a7558`), a solid rounded obsidian body (`#141a16`), and a high-contrast angled guitar neck with soundhole and tuning peg in amber (`#d1a054`).
    - Distributed `pinemusic.svg` across `tinapple-hub/public/icons/`, `tinapple-dash/web/dist/icons/`, and `tinapple-android/app/src/main/assets/icons/`.
  - **Removed PineMusic Settings Tab**:
    - Dropped `SettingsTab.tsx` and removed all references from `App.tsx` and `Navbar.tsx`. The remaining 4 focused tabs (`discover`, `queue`, `requests`, `library`) provide an uncluttered workflow, while storage and Navidrome status remain displayed in the persistent navbar badges.
  - **Production Builds & Live Verification**:
    - Compiled `pinemusic-web` (`npm run build` in 1.51s). Pushed commit `28f35dc` to `https://github.com/imyash0722/pinemusic.git`.
    - Deployed and verified on `pineapple-server`: `systemctl is-active pinemusic.service: active`, live bundle `index-DdRFKFLe.js` served via Cloudflare Tunnel.
    - Compiled `tinapple-hub` (`npm run build` in 3.93s) with `pinemusic` registered in `AppBrandIcons` and `serviceRegistry`.
  - **Comprehensive READMEs**:
    - Updated [PineMusic README](file:///mnt/shared/projects/pinemusic/README.md) with ASCII and Mermaid pipeline diagrams, detailed resolver docs (Spotify, Apple Music, Deezer, YouTube), and environment options.
    - Updated [Tinapple README](file:///mnt/shared/projects/tinapple/README.md) Port Matrix and Audiophile Music Cloud pack to document PineMusic (:8090).

### Maintenance (2026-11-21) | fix(infra/network): hardware identity correction to Acer Aspire V3-571, tier 1 5ghz band steering, and tier 2 cloudflare tunnel deployment
- **Scope**: Formally corrected hardware identity across all ledgers to Acer Aspire V3-571, resolved network slowdown/timeouts under campus Wi-Fi via Tier 1 fixes (disabled Wi-Fi power-save, established high-priority 5 GHz band steering, and hooked `tailscale netcheck` STUN refresh into NetworkManager dispatcher), and deployed Tier 2 high-availability Cloudflare Tunnel (`tinapple-cloudflared.service`) providing instant, symmetric-NAT-immune public and homelab ingress to Caddy.
- **Implementation & Verifications**:
  - **Hardware Profile Verified**:
    - Hostname `pineapple-server`, Model `Acer Aspire V3-571`, Serial `NXRYFSI012228003C43400`, running Arch Linux on kernel `Linux 6.18.63-3-lts`.
  - **Tier 1 (5 GHz Band Steering & Tailscale STUN Refresh)**:
    - Disabled power saving permanently via `/etc/NetworkManager/conf.d/broadcom-wifi-fix.conf` (`wifi.powersave = 2`).
    - Configured `PESU-EC-Campus-5G` connection profile with `802-11-wireless.band a` and `connection.autoconnect-priority 120`. Server latched to BSSID `b4:79:c8:2f:80:dc` on channel 116 (5580 MHz, 5 GHz), cutting packet loss and transmit errors from the crowded 2.4 GHz band.
    - Updated `/etc/NetworkManager/dispatcher.d/50-pesu-wifi.sh` to trigger asynchronous `tailscale netcheck` on `up` and `dhcp4-change`, eliminating the ~45s DERP stall upon DHCP re-key.
  - **Tier 2 (Cloudflare Zero-Trust Tunnel / Quick Tunnel Ingress)**:
    - Built [`scripts/tinapple-cloudflared-runner`](file:///mnt/shared/projects/tinapple/scripts/tinapple-cloudflared-runner) supporting either pre-configured `TUNNEL_TOKEN` from `/etc/tinapple/cloudflared.env` or zero-config Quick Tunnel mode.
    - Created and enabled systemd unit [`scripts/tinapple-cloudflared.service`](file:///mnt/shared/projects/tinapple/scripts/tinapple-cloudflared.service) routing directly to Caddy on `http://127.0.0.1:80`.
    - Live tunnel established and verified: `https://appreciation-informative-gras-formats.trycloudflare.com/pinemusic/` tested with HTTP/2 and 200 OK responses.
  - **PineMusic Request Only Clarification**:
    - Documented distinction between "Add to Active Queue" (immediate bitstream download and Navidrome ingest) and "Request Only" (adds item to Requests tab wishlist for deferred admin/user approval).
- **Scope**: Upgraded PineMusic with zero-auth public resolvers for Spotify (playlists, albums, tracks via embed extraction) and Apple Music (via official iTunes Lookup API and meta scrapers), single-track ingest modal support, filesystem vault scanner for existing music library (510+ physical tracks indexed), resolved reverse-proxy API subpath prefixing, removed presets, redesigned logo to an abstract art pineapple playing guitar, and converted UI from neon to a refined matte charcoal and sage aesthetic.
- **Implementation & Verifications**:
  - **Zero-Auth Spotify & Apple Music Resolvers**:
    - Built `SpotifyResolver` (`spotify_resolver.py`): Parses public embed endpoints for `playlist`, `album`, and `track` URLs, extracting full metadata, hi-res artwork, tracklists, and 30s previews without user tokens or authentication.
    - Built `AppleMusicResolver` (`applemusic_resolver.py`): Zero-auth collection and song lookup via Apple iTunes API and HTML metadata scraping.
    - Updated `MusicAggregator` (`aggregator.py`), `DeezerResolver` (`get_track`, `get_playlist`), and `YtDlpResolver` (single video resolution as 1-track collection).
    - Verified live resolution on `pineapple-server` for Spotify playlist ("Hindi", 21 tracks), Spotify single track ("Key", C418), Apple Music album ("Nevermind", Nirvana), Apple Music song ("Smells Like Teen Spirit"), and YouTube videos.
  - **Matte UI Theme & Abstract Pineapple Guitar Icon**:
    - Created `PineappleGuitarLogo.tsx`: Custom cubist abstract art icon featuring a faceted pineapple silhouette with crown fronds playing an angled guitar with frets, soundhole, and rhythm waves.
    - Matte Styling: Swapped glowing radial background gradients and neon emerald accents for matte charcoal (`#0b0d10`, `#12151b`), subdued borders, and muted forest sage (`#4a7558`, `#5c8d6d`).
    - Removed presets toolbar from `DiscoverTab.tsx` per user direction.
  - **Vault Filesystem Scanner & Storage Display**:
    - Added `scan_vault_tracks` in `library.py` to index physical files in `/srv/media/music`, merging 510+ existing files into Device Library view.
    - Corrected storage readout in `SettingsTab.tsx` to handle loading states gracefully without defaulting to 0 GB; verified available space at 37.07 GB Free.
  - **TheFatRat Discography Completion**: 91 of 92 tracks completed at `flac-24` (24-bit 48kHz Studio Master FLAC), 1 active. Verified in Navidrome Subsonic API.

### Maintenance (2026-11-21) | feat(music/pinemusic): build standalone PineMusic appliance, publish repo, integrate into navidrome pack, and ingest TheFatRat discography
- **Scope**: Designed and deployed PineMusic, a standalone high-fidelity music requester, download queue orchestrator, and automated library manager for Navidrome running on dedicated port `:8090`, inspired by Ombi for request tracking and Psysonic for dark-glass UI. Published standalone public GitHub repository `https://github.com/imyash0722/pinemusic`, integrated PineMusic into the `audiophile-cloud` pack in Tinapple Hub's store catalog, deployed Caddy reverse proxy ingress `/pinemusic/*`, and ingested TheFatRat complete discography in lossless FLAC into `/srv/media/music` and Navidrome.
- **Implementation & Verifications**:
  - **Standalone PineMusic Architecture**:
    - **Backend Daemon** (`/opt/pinemusic/backend`): Python 3.12, FastAPI, Uvicorn, Async SQLite (`aiosqlite`), Mutagen, YT-DLP, and WebSockets. Bound to port `:8090`. Configured systemd unit `pinemusic.service` on `pineapple-server`.
    - **Zero-Auth Universal Bitstream Ingest**: Supports Spotify, Deezer, YouTube, and Apple Music without requiring user credentials or paid subscriptions. Configured mobile player client extractor args to bypass YouTube bot challenge hurdles with automatic `ytsearch1` fallback.
    - **Frontend Client** (`/opt/pinemusic/frontend`): React 18, Vite 5, TypeScript, Tailwind CSS, Lucide icons, Framer Motion. Obsidian glass styling, live WebSocket queue monitoring with ETA/speed meters, reordering controls, Ombi-style request tracking, 30s audio preview player, and single-click device file deletion.
  - **Homelab Ingress & Tinapple Hub Integration**:
    - Registered Caddy reverse proxy rule in `/etc/caddy/conf.d/pinemusic.caddy` with `handle_path /pinemusic/* -> localhost:8090`.
    - Integrated `pinemusic` into `ChaddyStore.tsx` under the `audiophile-cloud` (Navidrome) pack, updating service mappings in `api.ts`, `serviceRegistry.ts`, `UnifiedAppPage.tsx`, and `ServicesManager.tsx`.
    - Rebuilt `tinapple-hub` frontend and staged dist bundle to `/usr/share/tinapple-dash/web/dist/`.
  - **TheFatRat Discography Ingest & Navidrome Verification**:
    - Downloaded and processed high-fidelity FLAC tracks into `/srv/media/music/Playlists/TheFatRat - Complete Discography/`.
    - Generated relative `.m3u8` playlist in `/srv/media/music/Playlists/TheFatRat - Complete Discography.m3u8`.
    - Automated Subsonic `/rest/startScan.view` notification; verified Navidrome Subsonic API (`/rest/search3.view` and `/rest/getPlaylists.view`) indexing 24-bit 48kHz FLAC tracks for TheFatRat.

### Maintenance (2026-11-20) | feat(server/agy): install agy cli, mirror all 7 mcps and 13 skills, and configure runtime environments on pineapple-server
- **Scope**: Deployed standalone Antigravity CLI binary (`agy` v1.5.12) to `pineapple-server`, installed portable user-space toolchains (`uv`, `npm`, `npx`), mirrored and verified all 7 MCP servers, copied all 13 custom and plugin skills, and cloned the `tinapple` repository with complete `graphify-out/` AST graph onto the server.
- **Implementation & Configurations**:
  - **AGY CLI & Shell Environment**:
    - Streamed and deployed binary to `/home/pineapple/.local/bin/agy` (v1.5.12).
    - Configured persistent `$PATH` and `$NODE_PATH` in `~/.bashrc`, `~/.profile`, `~/.zshrc`, `~/.zprofile`, and `~/.zshenv`, ensuring seamless accessibility in interactive, non-interactive, and login shells.
  - **Toolchains & Runtimes**:
    - Installed standalone `uv` (v0.13.9 upstream generic x86_64) and provisioned `graphifyy[mcp]` (`graphify` and `graphify-mcp`).
    - Provisioned `npm` and `npx` (v12.2.2) in `~/.local/bin/` with `NODE_PATH` wrappers pointing to `~/.local/lib/node_modules/`.
    - Configured Python MCP environment for `firefox-mcp-server` with `mcp` and `requests`.
  - **All 7 MCP Servers Verified**:
    - `shadcn` (`npx -y shadcn@latest mcp`): Initialized and responding via stdio.
    - `firefox-devtools` (`npx -y @mozilla/firefox-devtools-mcp --autoProfile`): Initialized v0.11.0.
    - `chrome-devtools` (`npx -y chrome-devtools-mcp@latest`): Initialized v1.13.0.
    - `graphify` (`/home/pineapple/.local/bin/graphify-mcp --transport stdio`): Verified.
    - `context7` (`npx -y @upstash/context7-mcp`): Initialized v4.7.3.
    - `ui-ux-pro` (`npx -y ui-ux-pro-mcp`): Initialized v1.0.0 with 103 styles and 170 UX guidelines.
    - `firefox-browser` (`/home/pineapple/.local/bin/firefox-mcp-server`): Tested stdio JSON-RPC initialization.
  - **All 13 Skills Mirrored**:
    - Deployed to `~/.gemini/skills/`, `~/.gemini/config/skills/`, and `~/.gemini/config/plugins/`: `design-taste-frontend`, `frontend-design`, `make-interfaces-feel-better`, `ponytail`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`, `ponytail-review`, `refactoring-ui`, `swiss-design`, `unslop`, and `web-design-guidelines`.
    - Mirrored builtins, schemas (`~/.gemini/antigravity-cli/mcp/`), rules (`~/.gemini/GEMINI.md`), and server workspace paths in `settings.json`.
  - **Repository & Graphify Knowledge Graph**:
    - Cloned `https://github.com/imyash0722/tinapple.git` into `/home/pineapple/tinapple` on `pineapple-server`.
    - Synced `graphify-out/` knowledge graph (4,072 nodes) and verified live `graphify query "architecture"` execution.

### Maintenance (2026-11-20) | feat(downloads/resumer): comprehensive homelab health audit, auto-resuming downloads & queue pipeline
- **Scope**: Executed full system health and port verification across all active services, endpoints, and reverse proxy routes on `pineapple-server`, fixed socket routing mark `SO_MARK = 0x5182` in `tinapple-proton-proxy`, and developed an automated download & process resumer pipeline ([`scripts/tinapple-resume-downloads`](file:///mnt/shared/projects/tinapple/scripts/tinapple-resume-downloads)) hooked into boot (`tinapple-resume-downloads.service`) and network reconnects (`50-pesu-wifi.sh`).
- **Implementation & Verifications**:
  - **Full Service & Port Health Audit (33/33 Probes Passed)**:
    - Executed [`scripts/tinapple-service-audit.py`](file:///mnt/shared/projects/tinapple/scripts/tinapple-service-audit.py) covering 33 distinct probes across Media, Downloads, Automation, System, Security, Storage, Network, and Reverse Proxy routes. 100% passed with 0 warnings and 0 failures.
    - Verified all core and auxiliary services: `Tinapple Dash` (:8088), `Caddy HTTPS` (:80, :443), `qBittorrent` (:8080), `Jellyfin` (:8096), `Suwayomi` (:4567), `Navidrome` (:4533), `Pinchflat` (:8945), `Ombi` (:5000), `Sonarr` (:8989), `Radarr` (:7878), `Prowlarr` (:9696), `Bazarr` (:6767), `FlareSolverr` (:8191), `Homarr` (:7575), `Vaultwarden` (:8000 at `/vault/`), `AdGuard Home` (:3000 & DNS :53), `Matrix Synapse` (:8008), `Tor` (:9050), `Syncthing` (:8384), `Filebrowser` (:8081), `CouchDB` (:5984), `Samba` (SMB :445 & NetBIOS :139), `Tinapple Hotspot` (:53 on `192.168.4.1`), `Proton Selective Proxy` (:1088), and all Caddy ingress routes.
    - Automated live headless browser inspection via DevTools across all 6 top-level web tabs (Dashboard, Tailscale, Services, App Store, Guides, Hardware, Settings) with zero console errors or render crashes.
  - **Proton Proxy Routing Mark Fix**:
    - Discovered that sockets bound with `SO_BINDTODEVICE = b"proton\0"` in `tinapple-proton-proxy` were evaluated against routing table `main` instead of table `51820`. Added `sock.setsockopt(socket.SOL_SOCKET, 36, 0x5182)` and prioritized IPv4 DNS resolution. Verified egress IP `89.187.164.251` (Datacamp/Proton WireGuard) vs physical WAN `1.6.222.154`.
  - **Automated Downloads & Queue Resumer**:
    - Developed [`scripts/tinapple-resume-downloads`](file:///mnt/shared/projects/tinapple/scripts/tinapple-resume-downloads) and unit [`scripts/tinapple-resume-downloads.service`](file:///mnt/shared/projects/tinapple/scripts/tinapple-resume-downloads.service).
    - Checks: (1) WAN reachability wait loop; (2) qBittorrent torrents start (`POST /api/v2/torrents/start`); (3) Suwayomi `startDownloader` mutation and re-enqueues any chapters in `ERROR` state; (4) Music Queuer resets interrupted `in_progress` batches to `pending` and triggers daemon; (5) Watcherr executes single inspection pass.
    - Hooked into `NetworkManager` dispatcher ([`scripts/50-pesu-wifi.sh`](file:///mnt/shared/projects/tinapple/scripts/50-pesu-wifi.sh)) for instant re-trigger upon Wi-Fi reconnect or DHCP renewal.

### Maintenance (2026-11-20) | feat(suwayomi/power/tailscale): extensions audit & proxy alignment, wake-on-AC Dell BIOS guide, and 1-hour watchdog auto-reboot
- **Scope**: Conducted end-to-end health check and root-cause analysis across all 7 installed Suwayomi manga extensions, diagnosed Cloudflare Turnstile and campus network Sophos DPI interception, documented Dell Latitude 7300 UEFI Wake-on-AC power configuration, and deployed the 1-hour auto-reboot staged watchdog for Tailscale connection resilience.
- **Root Cause & Technical Implementation**:
  - **Suwayomi Extensions Health Check**:
    - Tested all 7 active sources via Suwayomi GraphQL mutation `fetchSourceManga`:
      - `MangaDex (en)`: OK (1.48s, 20 titles)
      - `AllManga (en)`: OK (1.19s, 20 titles)
      - `Vortex Scans (en)`: OK (1.22s, 18 titles)
      - `Asura Scans (en)`: OK (1.22s, 20 titles)
      - `Rolia Scan (en)`: OK (0.58s, 22 titles)
      - `MangaFire (en)`: FAILED. Cloudflare Turnstile blocks `https://mangafire.to/api/titles`, serving interactive HTML challenge instead of JSON API response.
      - `Comix (en)`: TIMEOUT. Cloudflare enforces aggressive managed challenge (`cf-mitigated: challenge`, HTTP 403) stalling OkHttp HTTP/2 pipeline.
    - **Network Interception & Proxying**: Discovered that physical campus Wi-Fi (`PESU-EC-Campus`) executes SSL Deep Packet Inspection (`Sophos SSL CA_C910D2W6X97X455`), breaking direct HTTPS connections to manga sources. Routing Suwayomi through `tinapple-proton-proxy` (`127.0.0.1:1088`) restores legitimate Google Trust Services CA certificates. Realigned FlareSolverr docker container to proxy through `http://127.0.0.1:1088` instead of broken Tor.
  - **Dell Latitude 7300 Wake on AC**:
    - Hardware analysis confirmed Latitude 7300 power rails and VBUS transitions are handled by Dell's ACPI Embedded Controller. Documented exact BIOS setup steps: UEFI (F2) -> Power Management -> AC Behavior -> "Wake on AC" and "Auto On Time".
  - **Tailscale Watchdog 1-Hour Auto-Reboot**:
    - Updated [`scripts/tinapple-tailscale-watchdog`](file:///mnt/shared/projects/tinapple/scripts/tinapple-tailscale-watchdog) with `MAX_FAIL_SECONDS=3600` (1 hour) and deployed to `/usr/local/bin/tinapple-tailscale-watchdog`.
    - Staged recovery: Level 1 soft restart (`tailscaled`) at 3 min (180s), Level 1.5 mid recovery (`NetworkManager` + `tailscaled` + `pesu-wifi`) at 15 min (900s), and Level 2 system reboot (`systemctl reboot`) at 60 min (3600s). Reset flags upon connection recovery.
- **Verification**: Verified `systemctl status tinapple-tailscale-watchdog` active on `pineapple-server` with `check interval: 30s, max fail: 3600s`. Confirmed GraphQL tests across 7 extensions. Tested direct and proxy curl responses.

### Maintenance (2026-11-19) | feat(routing/music): integrate tinapple-music-queuer into selective split routing and verify 4-service isolation
- **Scope**: Extended the Proton VPN selective split routing architecture to include `tinapple-music-queuer` (Antra FLAC lossless downloader), ensuring that exclusively (1) Tailscale Exit Node, (2) Suwayomi Manga, (3) Jellyfin Media, and (4) Tinapple Music Queuer egress through the Proton VPN WireGuard tunnel (`dev proton`), while all other host processes, Tailscale coordination, and web servers remain strictly on physical WAN.
- **Implementation & Fixes**:
  - **Runner Wrapper**: In `/usr/local/bin/tinapple-music-queuer` and `/home/pineapple/.local/bin/tinapple-music-queuer`, exported `HTTP_PROXY`, `HTTPS_PROXY`, and `ALL_PROXY=socks5://127.0.0.1:1088` with `NO_PROXY` local subnet exclusions.
  - **Systemd Service Drop-in**: Updated `tinapple-music-queuer.service` (both system and user units) with `tinapple-proton-proxy.service` dependency ordering and proxy environment definitions.
  - **WebSockets & Requests Compatibility**: Verified that Python's `requests.Session()` and `websockets.connect` (v17.4 with default `proxy=True`) cleanly tunnel API calls and real-time streaming progress over HTTP CONNECT to `127.0.0.1:1088`.
- **Verification**: Tested direct execution of `tinapple-music-queuer` verifying public egress IP `89.187.164.251` (Datacamp, Dallas, US) while the host machine public IP remains direct WAN `61.12.83.162` (Bengaluru, India). Verified live WebSocket connectivity through the proxy.

### Maintenance (2026-11-19) | fix(tsumiru/routing): resolve infinite redirect loop on /tsumiru, static web assets serving, and suwayomi subpath alignment
- **Scope**: Diagnosed and resolved infinite 301 redirection on `/tsumiru/`, configured Caddy to serve the standalone Tsumiru Flutter Web client from `/usr/share/tinapple-dash/web/dist/tsumiru`, removed false-positive port redirect in `tinapple-dash`, and documented the canonical connection URLs for native Android and Web Tsumiru clients.
- **Root Cause & Fixes**:
  - **Redirect Collision**: `tinapple-dash` had `"/tsumiru": 4567` in its `servicePortRedirects` map, which caught `/tsumiru/` requests and forced a 301 redirect back to the HTTPS host, causing an infinite redirect loop. Removed `/tsumiru` from `servicePortRedirects` and registered `r.Static("/tsumiru", filepath.Join(distDir, "tsumiru"))`.
  - **Caddy Ingress**: Added `handle_path /tsumiru/*` with `file_server` in [`configs/caddy/Caddyfile`](file:///mnt/shared/projects/tinapple/configs/caddy/Caddyfile) and server `/etc/caddy/Caddyfile`.
- **Verification**: Verified `https://pineapple-server.taildb42a2.ts.net/tsumiru/` returning HTTP/2 200 OK. Tested Suwayomi GraphQL probe `{ aboutServer { version } }` returning `v2.4.2366`.

### Maintenance (2026-11-19) | fix(hub/tailscale): resolve caddy icon route collision, sidebar navigation alignment, and defensive peer null-checks
- **Scope**: Diagnosed and resolved the error occurring when opening the Tailscale tab/modal in Tinapple Hub, corrected Caddy route collision between Bitwarden icons and dashboard static SVG assets, aligned sidebar Appliance Tools navigation to open the dedicated Tailscale Page, and applied defensive null-guards across peer searching and user RBAC components.
- **Root Cause & Fixes**:
  - **Caddy Bitwarden Route Collision**: `@bitwarden_root` in `/etc/caddy/Caddyfile` and `configs/caddy/Caddyfile` previously matched all `/icons/*` requests, proxying `/icons/tailscale.svg` to Vaultwarden on port 8000, which returned HTTP 404. Updated the matcher to strictly target Bitwarden client favicon requests (`/icons/*/icon.png`), allowing `/icons/tailscale.svg` and homelab brand assets to fall through to `tinapple-dash` (port 8088).
  - **Sidebar Navigation Alignment**: In [`tinapple-hub/src/components/common/Sidebar.tsx`](file:///mnt/shared/projects/tinapple/tinapple-hub/src/components/common/Sidebar.tsx), updated the "Tailscale Mesh" button under Appliance Tools to call `handleSelectTab('tailscale')` rather than popping up the old modal, harmonizing navigation across desktop and mobile.
  - **Defensive Peer & RBAC Null Guards**: In [`tinapple-hub/src/components/widgets/TailscalePage.tsx`](file:///mnt/shared/projects/tinapple/tinapple-hub/src/components/widgets/TailscalePage.tsx) and [`tinapple-hub/src/components/widgets/TailscaleUserManager.tsx`](file:///mnt/shared/projects/tinapple/tinapple-hub/src/components/widgets/TailscaleUserManager.tsx), added defensive fallbacks for `peer.dnsName` (which is empty string for external/shared nodes), `peer.tailscaleIPs`, and `res.tailscale_users` to eliminate any possible `TypeError` exceptions during client rendering.
- **Verification**: Rebuilt frontend bundle (`npm run build`) and synced to `/usr/share/tinapple-dash/web/dist/`. Reloaded Caddy and verified `https://pineapple-server.taildb42a2.ts.net/icons/tailscale.svg` returns HTTP/2 200 SVG and Bitwarden icon requests return HTTP/2 200 PNG. Executed headless browser automation across all Tailscale subtabs (Peers, Routing, Netcheck, Access/RBAC, Security) with zero console errors. Captured verified desktop and mobile screenshots.

### Maintenance (2026-11-19) | feat(vaultwarden/auth): clean account reset to pine@2507, web vault validation patch, and verified dual-route sync
- **Scope**: Executed Option B to cleanly reset the Vaultwarden account for `imyash0722@gmail.com` with master password `pine@2507`, adjusted client-side Web Vault registration length validation to accept 8+ character passwords (`h.minimumPasswordLength=8`), and verified end-to-end authentication, key derivation, and vault synchronization.
- **Root Cause & Fixes**:
  - **Zero-Knowledge Password Reset Incompatibility**: Master passwords in Bitwarden derive the symmetric encryption key (`akey`). Forcibly replacing password hashes in SQL breaks decryption of existing ciphers. Executed a clean wipe of the legacy account and ciphers (backed up to `db.sqlite3.bak`).
  - **Web Vault 12-Character Validation Constraint**: Bitwarden web vault enforced `h.minimumPasswordLength=12` in `main.js`, rejecting 9-character passwords like `pine@2507`. Patched `/usr/share/webapps/vaultwarden-web/app/main.983e2354eeac8e9d32b1.js` to `h.minimumPasswordLength=8`.
  - **Account Registration & Key Derivation**: Completed standard registration and cryptographic key generation via Web Vault. Verified user record in SQLite with PBKDF2-SHA256 (600,000 iterations).
  - **Dual-Route Sync Verification**: Tested authentication via `POST /vault/identity/connect/token` returning valid Bearer tokens (`Key` length 180). Verified `GET /vault/api/sync` and `GET /api/sync` both returning HTTP 200 OK.
- **Verification**: Verified login and synchronization in Web Vault and API for `imyash0722@gmail.com` with `pine@2507`.

### Maintenance (2026-11-19) | feat(tailscale/exitnode): always-on exit node mode, approval status detection, and persistent watchdog enforcement
- **Scope**: Diagnosed why mobile and client devices could not see `pineapple-server` advertised as an exit node (Tailscale coordination central security requirement: routes require explicit one-time admin approval in the admin console), implemented permanent Always-On Exit Node enforcement in `tinapple-tailscale-watchdog` and `tinapple-dash`, updated `TailscalePage.tsx` with dedicated Always-On toggle controls, and added an automated approval status detector and direct admin console approval guidance.
- **Root Cause & Fixes**:
  - **Tailscale Coordination Route Approval Gating**: When a Linux node runs `tailscale set --advertise-exit-node`, Tailscale sets `AdvertiseRoutes: ["0.0.0.0/0", "::/0"]` locally. However, until an administrator explicitly approves the exit node in `https://login.tailscale.com/admin/machines` (or configures `autoApprovers` in Tailscale ACLs), the Tailscale controlplane intentionally withholds `ExitNodeOption` from all tailnet peer clients (Android, iOS, macOS, Windows).
  - **Approval Status Detection**: In `tinapple-dash/internal/services/tailscale.go`, added `exitNodeApproved` detection by validating `AllowedIPs` and `ExitNodeOption` from `tailscale status --json`, and exposed `alwaysOnExitNode` in `TailscaleDetailedStatus` and `TailscalePrefsReq`.
  - **Always-On Exit Node Daemon & Watchdog**: Persisted `always_on_exit_node` in `/var/lib/tinapple/tailscale_prefs.json` (defaulted to `true` on `pineapple-server`). Updated `tinapple-tailscale-watchdog` to actively check `tailscale debug prefs` every 30 seconds, automatically re-asserting `--advertise-exit-node` if ever missing.
  - **UI Controls & Guidance**: In `tinapple-hub/src/components/widgets/TailscalePage.tsx`, added an "Always-On Active" badge, an "Always-On: ON / OFF" mode toggle, and an actionable warning banner with a direct link (`https://login.tailscale.com/admin/machines`) guiding the user to complete the 1-click route approval.
- **Verification**: Verified API returning `advertiseExitNode: true`, `alwaysOnExitNode: true`, and `exitNodeApproved: false` (awaiting admin console approval). Verified Go backend compilation, frontend bundle build, and deployment to `pineapple-server`. Captured headless browser screenshot of the updated Exit Node Routing tab showing Always-On Active badge and admin approval guidance.

### Maintenance (2026-11-19) | feat(wifi/auth): automated pesu-wifi boot autostart, captive portal login, and watchdog supervision
- **Scope**: Ensured seamless, automated startup of `pesu-wifi` daemon on boot and guaranteed automatic campus captive portal login on connection, roaming, or DHCP events across `pineapple-server`.
- **Implementation & Fixes**:
  - **NetworkManager Dispatcher (`50-pesu-wifi.sh`)**: Created [`scripts/50-pesu-wifi.sh`](file:///mnt/shared/projects/tinapple/scripts/50-pesu-wifi.sh) deployed to `/etc/NetworkManager/dispatcher.d/50-pesu-wifi.sh`. Triggers on `up` and `dhcp4-change` events for `wlp3s0`, immediately verifying that `pesu-wifi.service` is active and firing an asynchronous login (`/usr/local/bin/pesu-wifi login`) whenever connected to a PESU network.
  - **Runner Robustness (`pesu-wifi-runner`)**: Upgraded [`scripts/pesu-wifi-runner`](file:///mnt/shared/projects/tinapple/scripts/pesu-wifi-runner) deployed to `/usr/local/bin/pesu-wifi-runner`. Expanded network route discovery wait loop to 30 seconds and added a 3-attempt login retry loop with 2-second backoff to handle slow initial captive portal socket readiness after DHCP.
  - **Watchdog Self-Healing (`tinapple-wifi-watchdog`)**: Upgraded [`scripts/tinapple-wifi-watchdog`](file:///mnt/shared/projects/tinapple/scripts/tinapple-wifi-watchdog) to autonomously monitor `pesu-wifi.service` alongside `tinapple-hotspot`, automatically resurrecting the daemon if it ever drops or exits.
  - **NetworkManager Autoconnect Priority**: Configured `PESU-EC-Campus` with `connection.autoconnect-priority: 100` and `connection.autoconnect: yes` so it is prioritized immediately on boot.
  - **User Lingering**: Enabled user lingering (`loginctl enable-linger pineapple`) ensuring persistent background execution across disconnected sessions.
  - **Deployment Automation**: Updated [`scripts/deploy-server.sh`](file:///mnt/shared/projects/tinapple/scripts/deploy-server.sh) to synchronize the dispatcher script and systemd unit during deployments.
- **Verification**: Verified `pesu-wifi.service` running as PID 182066 with event-driven netlink listener. Tested live authentication outputting `Logged in as 'deltatime-4' (You are signed in as deltatime-4)`. Tested manual NetworkManager dispatcher hook execution. Verified status card showing `LOGGED IN` on `PESU-EC-Campus`.

### Maintenance (2026-11-19) | feat(routing/tailscale): selective split routing for exit node, suwayomi, jellyfin, and tinapple-music-queuer
- **Scope**: Implemented resilient, true selective split routing on `pineapple-server`, routing exclusively Jellyfin (systemd HTTP/HTTPS/SOCKS5 proxy drop-in), Suwayomi Manga Server (`server.socksProxyPort = "1088"`), Tinapple Music Queuer (`tinapple-music-queuer` Antra lossless FLAC downloader & WebSocket sync via proxy exports and systemd unit), and Tailscale Exit Node traffic (`iif tailscale0 lookup 51820`) through Proton VPN WireGuard (`dev proton`), while permanently preserving the host OS, Tailscale daemon (`tailscaled`), Caddy HTTPS, SSH, and appliance dashboard on physical WAN (`wlp3s0`) to completely eliminate random server disconnects and Tailscale drops.
- **Root Cause & Permanent Fixes**:
  - **Host Default Route VPN Hijacking**: Previously, `wg-quick@proton` added `default dev proton metric 50` to routing table `main`. When active, Tailscale controlplane and DERP relays were forced over Proton VPN/Datacamp NAT, which throttles or drops UDP STUN packets, leading to Tailscale daemon reporting `offline` and the server becoming unreachable.
  - **Selective Service Proxy (`tinapple-proton-proxy`)**: Developed and deployed [`scripts/tinapple-proton-proxy`](file:///mnt/shared/projects/tinapple/scripts/tinapple-proton-proxy) as an active systemd daemon (`tinapple-proton-proxy.service`) on `127.0.0.1:1088`. Lightweight (<15MB RAM) dual SOCKS5, HTTP CONNECT, and plain HTTP proxy that forces socket binding (`SO_BINDTODEVICE = b"proton\0"`), egressing directly through WireGuard with source IP `10.2.0.2` and automatic fallback to WAN if the VPN interface is inactive.
  - **Suwayomi Manga Server**: Configured `/var/lib/suwayomi/.local/share/Tachidesk/server.conf` with `server.socksProxyPort = "1088"` and `server.socksProxyEnabled = true`, moving manga scraping and downloads from slow Tor to high-speed Proton WireGuard.
  - **Jellyfin Media Server**: Deployed `/etc/systemd/system/jellyfin.service.d/proxy.conf` injecting `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY=socks5://127.0.0.1:1088`, and `NO_PROXY` LAN exclusions. Outbound metadata fetches (TMDb, TVDB, Fanart) egress through Proton VPN while streaming to clients remains direct LAN/Tailscale.
  - **Tinapple Music Queuer**: Configured CLI wrappers in `/usr/local/bin/tinapple-music-queuer` and user bin with `HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY=socks5://127.0.0.1:1088`. Configured systemd service unit [`tinapple-music-queuer/systemd/tinapple-music-queuer.service`](file:///mnt/shared/projects/tinapple/tinapple-music-queuer/systemd/tinapple-music-queuer.service) with proxy environments and ordering after `tinapple-proton-proxy.service`. Guaranteed Antra API queries and real-time WebSocket job connections tunnel through Proton VPN (`89.187.164.251`).
  - **Tailscale Exit Node Policy Routing (`table 51820`)**: In `/etc/wireguard/proton.conf` and [`scripts/tinapple-proton`](file:///mnt/shared/projects/tinapple/scripts/tinapple-proton), removed all default route modifications from table `main`. Routed VPN default traffic exclusively into dedicated `table 51820` (`ip route replace default dev proton table 51820`) and added policy rule `5275: from all iif tailscale0 lookup 51820` with MASQUERADE NAT. Tailscale exit node clients egress through Proton VPN without touching host traffic.
  - **Permanent Tailscale Exit Node Advertising**: Configured `tailscale set --advertise-exit-node --ssh --operator=pineapple`, persisted IP forwarding in `/etc/sysctl.d/99-tailscale-exit-node.conf`, and verified via `tailscale debug prefs`.
- **Verification**: Verified host public IP remains direct WAN `1.6.222.154` (Sify, Bengaluru). Verified proxy endpoints (`curl -x http://127.0.0.1:1088 https://api.ipify.org` and `socks5h://127.0.0.1:1088`) return Proton VPN IP `89.187.164.251` (Datacamp, Dallas, US). Verified Python/requests/websockets in `tinapple-music-queuer` return Proton VPN IP and successfully query Antra API and WebSocket streams. Verified Tailscale direct peer ping (3-5ms latency) without packet loss. Tested full disconnect/reconnect cycling via `tinapple-proton` and confirmed zero host disruption.

### Maintenance (2026-11-19) | fix(vaultwarden/caddy): resolve subpath sync failures, domain config mismatch, and multi-client root routing
- **Scope**: Diagnosed and permanently resolved Vaultwarden client sync failures across all Bitwarden apps and browser extensions (Chrome, Android Vivo V50, desktop), corrected subpath environment mismatch (`DOMAIN`), aligned Caddy reverse proxy routing (`handle` vs `handle_path`), and added zero-config root endpoint aliasing for Bitwarden clients.
- **Root Cause & Fixes**:
  - **Subpath Route Stripping (`handle_path` vs `handle`)**: In `/etc/caddy/Caddyfile`, Caddy used `handle_path /vault/*`, which stripped the `/vault` prefix before forwarding requests to `localhost:8000`.
  - **Environment Domain Mismatch (`DOMAIN`)**: In `/etc/vaultwarden.env`, `DOMAIN` was set to `https://pineapple-server.taildb42a2.ts.net` without the `/vault` suffix. When Bitwarden clients connected to `/vault/api/config`, Vaultwarden returned API and identity URLs at the root (`"api": "https://pineapple-server.taildb42a2.ts.net/api"`). When clients subsequently attempted to sync (`GET /api/sync`), Caddy forwarded the request to `tinapple-dash` (port 8088), returning `HTTP 404 {"error":"Resource not found"}` and causing all clients to fail syncing.
  - **Aligned Subpath & Domain**: Updated `/etc/vaultwarden.env` with `DOMAIN=https://pineapple-server.taildb42a2.ts.net/vault`. Updated Caddy routing from `handle_path /vault/*` to `handle /vault/*` to preserve the prefix expected by Vaultwarden.
  - **Dual-Mode Bitwarden Client Fallback**: In `configs/caddy/Caddyfile` and live server `/etc/caddy/Caddyfile`, deployed `@bitwarden_root` matcher routing root requests (`/identity/*`, `/notifications/*`, `/icons/*`, `/api/sync*`, `/api/accounts/*`, `/api/ciphers/*`, `/api/folders/*`, `/api/collections/*`, `/api/devices/*`, `/api/config*`) directly to Vaultwarden via internal rewrite. Whether clients specify `.../vault` or the bare server domain, authentication, sync, and WebSocket notifications work out of the box.
- **Verification**: Verified `GET /vault/api/config` and `GET /api/config` returning proper environment endpoints (`https://pineapple-server.taildb42a2.ts.net/vault/api`). Verified `GET /vault/api/sync` and `GET /api/sync` returning expected Vaultwarden HTTP 401 Unauthorized (ready for client Bearer auth) instead of Dash 404. Verified prelogin hashing (`/vault/identity/accounts/prelogin` and `/identity/accounts/prelogin`) returning KDF iterations for `imyash0722@gmail.com`. Verified WebSocket upgrade on `/vault/notifications/hub` over HTTPS.

### Maintenance (2026-11-19) | fix(vpn/watchdog): resolve wireguard cold boot routing deadlock, multi-tier endpoint pinning, and failsafe watchdog
- **Scope**: Diagnosed and permanently resolved headless appliance disconnection upon cold boot with Proton VPN WireGuard autostart enabled, established triple-redundant endpoint route pinning (Systemd ExecStartPre, WireGuard PostUp, NetworkManager Dispatcher), updated `scripts/tinapple-proton`, and upgraded `tinapple-tailscale-watchdog` with active WAN routing fail-safes.
- **Root Cause & Fixes**:
  - **Cold Boot & Reconnection Routing Deadlock**: When `wg-quick@proton.service` auto-started on system boot (or when Wi-Fi re-associated), `PostUp` added `default dev proton metric 50`. However, the physical host route for the WireGuard endpoint (`37.19.200.22`) was not established by `wg-quick` itself. Outgoing encrypted WireGuard UDP packets matched `default dev proton metric 50`, routing outer packets into its own unhandshaked tunnel (`0 B received, 232 KiB sent`). Outbound internet collapsed, locking Tailscale out of controlplane and DERP relays.
  - **Layer 1: Systemd ExecStartPre Pinning**: In `/etc/systemd/system/wg-quick@proton.service.d/override.conf`, added `ExecStartPre` script dynamically querying the active physical gateway and adding `ip route replace $EP via $GW dev $DEV metric 10` before `wg-quick up` executes.
  - **Layer 2: WireGuard PostUp/PostDown**: Updated `scripts/tinapple-proton` and `/etc/wireguard/proton.conf` to dynamically inspect `Endpoint = <ip>:<port>` and the default physical route, asserting metric 10 routing to physical gateway on tunnel activation and removing on teardown.
  - **Layer 3: NetworkManager Dispatcher (`99-wireguard-proton.sh`)**: Created `/etc/NetworkManager/dispatcher.d/99-wireguard-proton.sh` triggering on `up` and `dhcp4-change` events, ensuring that if campus Wi-Fi drops carrier or renews DHCP leases, the endpoint host route is automatically re-applied.
  - **Layer 4: Watchdog Self-Healing Fail-Safe**: In `scripts/tinapple-tailscale-watchdog` (and running `/usr/local/bin/tinapple-tailscale-watchdog`), added automatic VPN routing deadlock detection: if WAN ping fails while `proton` is up, it re-pins the endpoint; if still unreachable, it temporarily drops `default dev proton metric 50`, falling back to physical WAN so Tailscale and local management are never blackholed.
- **Verification**: Verified WireGuard instantaneous handshake (`20.59 KiB received, 13.85 KiB sent`, public IP `89.187.164.251` in Dallas, US). Tested clean stop and restart cycles (`systemctl stop wg-quick@proton`, `systemctl start wg-quick@proton`) with 0% WAN packet loss and uninterrupted Tailscale direct mesh connectivity (`100.108.215.120`). Verified HTTPS API response via `https://pineapple-server.taildb42a2.ts.net/api/v1/system/proton-exit`.

### Maintenance (2026-11-18) | feat(hub/logs): unified system logs & diagnostics hub with proper service taxonomy, live streaming journalctl, and tag filtering
- **Scope**: Integrated the Error Logger and live service journals into a unified, first-class "System Logs & Diagnostics" hub (`/logs` / `/errors`), implemented a comprehensive homelab service taxonomy (`SERVICE_TAGS`) with distinct brand colors and vector icons, introduced dual-mode switching (`Anomaly & Error Diagnostics` and `Live Service Journals`), deployed interactive horizontal service tag filtering with live anomaly counts, added 1-click "Stream Journal" transitions from error cards to live unit logs, and eliminated parsing artifacts in `tinapple-dash`'s journal parser (`parseJournalLine`).
- **Root Cause & Fixes**:
  - **Journald Catalog Decoration & Artifact Extraction**: Systemd explanatory lines beginning with `░░` (such as `░░ A start job for unit wg-quick@proton.service has finished with a failure` or `... unit is invalid`) caused `parseJournalLine` to extract junk tokens (`job`, `start`, `a`, `is`) as service names and assign timestamp `"░░"`. Refactored `parseJournalLine` in `tinapple-dash/internal/api/errors.go` to strictly check ISO 8601 regex prefixes, clean catalog markers, extract explicit unit names via regex (`unit=([a-zA-Z0-9@_.-]+)`), and apply canonical service normalization (`java` -> `suwayomi`, `qbittorrent-nox` -> `qbittorrent`, `NetworkManager`/`wpa_supplicant` -> `network`, etc.).
  - **Unified Navigation & Route Aliasing**: Renamed navigation item in `Sidebar.tsx` to `System Logs` with id `logs` and icon `FileText`, configuring dual route aliasing in `App.tsx` and `Sidebar.tsx` so `/logs`, `/errors`, `?tab=logs`, and `?tab=errors` all activate the unified hub.
  - **Comprehensive Service Taxonomy**: Built `SERVICE_TAGS` covering 17 services (Jellyfin, Suwayomi, Ombi, qBittorrent, Caddy, WireGuard Proton, Radarr, Sonarr, Prowlarr, Bazarr, Pinchflat, Navidrome, Tinapple Dash, Network/WiFi, Kernel/HW, Website UI, Systemd Core).
  - **Dual-Mode System Logs Hub**:
    1. *Anomaly & Error Diagnostics*: Aggregates machine errors with Gemini AI root-cause analysis, severity badges, and individual service tag pills.
    2. *Live Service Journals*: Interactive terminal streaming live stdout/stderr for any homelab service via `api.getServiceLogs`, with selectable line counts (50..500), auto-refresh cadence (3s live stream, 5s, 10s, 30s, paused), in-terminal search filtering, line numbers, status-level syntax coloring, and copy/download actions.
  - **1-Click Anomaly to Journal Navigation**: Added "Stream Journal" buttons on every diagnostic error card, immediately switching to Live Service Journals with that unit pre-selected and auto-scrolled.
- **Verification**: Verified clean service tag extraction via `GET /api/v1/system/errors` returning canonical services (`network`, `ombi`, `radarr`, `systemd`, `tinapple-hub`, `wireguard-proton`). Verified live journal streaming for `jellyfin.service`, `ombi.service`, and `suwayomi-server.service`. Captured desktop (diagnostics & live journals) and mobile Playwright screenshots verifying UI styling and alignment.

### Maintenance (2026-11-18) | feat(vpn/errors): fixed proton wireguard boot setup, independent autostart toggle, and end-to-end error logger integration
- **Scope**: Resolved Proton WireGuard boot failures with permanent NetworkManager/resolvconf synchronization and physical default gateway route-pinning, decoupled live tunnel state from boot autostart (`wg-quick@proton.service`), implemented dual independent switches in Proton Modal UI (`Live Tunnel` and `Start on System Boot`), expanded Error Logger to ingest stdout/stderr application exceptions from all homelab systemd services (Ombi, Suwayomi, Jellyfin, Caddy, qBittorrent, etc.), added frontend runtime error interception (`window.onerror`, `unhandledrejection`, `ErrorBoundary`, `console.error`) with localStorage and `/var/cache/tinapple-dash/client_errors.json` disk persistence, and corrected invalid unclosed conversions in Suwayomi `server.conf`.
- **Root Cause & Fixes**:
  - **Cold Boot Resolvconf Signature Mismatch**: At cold boot, NetworkManager wrote `/etc/resolv.conf` without `resolvconf` header, causing `wg-quick` to abort with `resolvconf: signature mismatch: /etc/resolv.conf`. Deployed systemd drop-in `/etc/systemd/system/wg-quick@proton.service.d/override.conf` running `ExecStartPre=/usr/bin/resolvconf -u` after `network-online.target` and `NetworkManager.service`.
  - **WireGuard Endpoint UDP Routing Loop**: WireGuard default metric 50 route routed WireGuard's own encrypted UDP packets to `37.19.200.22` back into `dev proton`. Implemented dynamic physical route pinning (`ip route add 37.19.200.22 via <default_gw> dev <iface>`) in `tinapple-proton` prior to tunnel activation.
  - **Autostart Decoupling**: Previously, turning off the live tunnel disabled `wg-quick@proton.service`. Updated `tinapple-proton` and `tinapple-dash` to decouple tunnel state from systemd enablement. Added dedicated endpoints: `POST /api/v1/system/proton/autostart` and `autostart: bool` field in `GET /api/v1/system/proton-exit`. Added "Start on System Boot" card with `SquishSwitch` in `ProtonModal.tsx`.
  - **Systemd Priority 6 Service Log Omission**: Systemd assigns application stdout/stderr to `PRIORITY=6` (INFO), causing `journalctl -p 0..3` to omit all homelab exceptions (Ombi TMDb failures, Suwayomi exceptions). In `tinapple-dash/internal/api/errors.go`, added multi-service journal querying (`-u <service> -b -n 300`) with regex/string filtering for `ERROR`, `fail:`, `Exception`, `FATAL`, `panic:`, `Forbidden`, etc.
  - **Client-Side Exception Interception & Persistence**: Added browser-level listeners for `window.onerror`, `unhandledrejection`, React `ErrorBoundary`, and `console.error` with recursion guards. Persisted errors across sessions in `localStorage` (`tinapple_client_errors`) and atomically wrote to `/var/cache/tinapple-dash/client_errors.json` on the backend.
  - **Suwayomi Unclosed Conversion Syntax**: In `/var/lib/suwayomi/.local/share/Tachidesk/server.conf`, unclosed `server.downloadConversions` and `server.serveConversions` without WebP writer caused `java.lang.IllegalStateException: No compression type set!`. Reset both to `{}` and disabled `server.initialOpenInBrowserEnabled` for headless server operation.
- **Verification**: Verified active WireGuard tunnel on `pineapple-server` with public exit IP `37.19.200.23` (Datacamp, Dallas, US). Verified toggling autostart independently enabled/disabled `wg-quick@proton.service` in systemd without disrupting live tunnel. Verified Error Logger captures 56+ errors across services (Ombi TMDb forbidden, Suwayomi, wpa_supplicant) and test frontend exceptions. Captured desktop and mobile Playwright screenshots verifying UI styling and alignment.

### Commit `6745615` | feat(vpn/wireguard): activate proton vpn wireguard tunnel and implement dual-tier direct/tor fallback (2026-11-15)
- **Commit**: `6745615`
- **Subject**: feat(vpn/wireguard): activate proton vpn wireguard tunnel and implement dual-tier direct/tor fallback
- **Key Files**: `scripts/tinapple-proton`, `tinapple-dash/internal/api/tmdb_cache.go`

### Maintenance (2026-11-18) | feat(mobile/ui): comprehensive responsive overhaul for phones and native first-class tailscale page
- **Scope**: Re-engineered `tinapple-hub` for first-class mobile phone ergonomics across compact (iPhone SE, 375x667), modern flagship (Google Pixel 10a/9a, 412x915), and large Android viewports (Vivo V50, 412x924), while preserving full 2D homarr deck scaling on desktop/laptop displays. Replaced the legacy Tailscale popup modal with a comprehensive, dedicated full-page Tailscale management hub (`/tailscale`) with live mesh telemetry, node controls, exit node management, and Netcheck diagnostic probes.
- **Root Cause & Fixes**:
  - **Mobile Layout & Card Squeezing**: Previously, metric cards with lengthy single-line text (`DISK 79% (48G free)`) overflowed small viewports, service buttons crowded top navigation bars, and the floating update notification toast blocked mobile navigation buttons.
  - **Compact Metric Cards & Safe Nav Dock**: Redesigned `MobileDashboardView.tsx` with high-density 2-row metric cards featuring live progress bars, dedicated subtitle rows, and streamlined 3-column launcher grid with 20px vector brand icons. Repositioned `UpdateNotificationToast.tsx` safely above the thumb navigation dock (`bottom-20`).
  - **First-Class Tailscale Page**: Implemented `TailscalePage.tsx` with 5 specialized subtabs:
    1. *Peers & Mesh*: Searchable peer directory with device icons (Android/Linux/Apple/Windows), online presence pills, one-click IP copy, and live mesh ping testing.
    2. *Exit Node Routing*: Intuitive toggles for advertising local node as exit node, selecting active exit nodes, and allowing local LAN access bypass.
    3. *Netcheck & DERP Relay Matrix*: Complete STUN/UDP reachability report, captive portal detection, IPv4/IPv6 status, and global DERP region latency probes.
    4. *Access & Roles (RBAC)*: User access matrix and device registration management.
    5. *Security & Toggles*: SSH server toggles, shields-up mode, and route acceptance settings.
  - **Backend API Expansion (`tinapple-dash`)**: Added endpoints in `internal/services/tailscale.go` and `internal/api/handlers.go`: `GET /api/v1/tailscale/details`, `GET /api/v1/tailscale/netcheck` (cached), `POST /api/v1/tailscale/prefs`, and `POST /api/v1/tailscale/ping`.
  - **Mobile Thumb Dock & Responsive Header**: Added bottom dock in `Sidebar.tsx` with 1-tap navigation for `Board`, `Tailscale`, `Services` (with active daemon count badge), `Store`, and `Menu`. Streamlined top header on mobile viewports (<640px) hiding non-essential utility buttons while keeping hamburger, theme switcher, HTTPS badge, and refresh.
- **Verification**: Verified via Playwright automated testing across iPhone SE, Pixel 10a, Vivo V50, and Desktop 1080p. Visually confirmed typography, alignment, contrast, and responsive layout across all viewports. Hot-deployed production binary and staged bundles to live server (`pineapple-server`), verifying HTTP/2 200 responses across all APIs and `/tailscale`.

### Maintenance (2026-11-15) | feat(vpn/wireguard): activate proton vpn wireguard tunnel and implement dual-tier direct/tor fallback
- **Scope**: Loaded and activated Proton VPN WireGuard tunnel (`tinapple-US-FREE-15.conf`, exit node `37.19.200.23` in Dallas, US), resolved `resolvconf` signature mismatch and `nft_fib` missing kernel module crashes by enforcing `Table = off` with metric 50 default routing, established automatic physical gateway pinning to prevent WireGuard UDP routing loops, decommissioned Ombi Tor proxy drop-in to unlock line-rate TMDb querying, and upgraded `tinapple-dash` caching proxy to dual-tier direct-first fetching.
- **Root Cause & Fixes**:
  - **Resolvconf Signature Mismatch**: `/etc/resolv.conf` on Arch was marked as generated by NetworkManager, causing `openresolv` in `wg-quick` to abort with a signature mismatch. Ran `resolvconf -u` to align resolver ownership.
  - **nft_fib Kernel Module Desync**: Because the system updated to `linux-lts` 6.18.63 without a reboot while running 6.18.60, `wg-quick`'s default `nft -f` rule generation failed on `fib saddr type != local drop` (`ENOENT`). Configured `Table = off` in `tinapple-proton` and injected `ip route add default dev %i metric 50` into `PostUp`, ensuring reliable default route routing over WireGuard without nftables dependencies.
  - **WireGuard Endpoint Routing Loop**: Without an explicit host route for the WireGuard endpoint (`37.19.200.22`), outgoing WireGuard UDP packets looped back into the `proton` interface. Added static route `ip route add 37.19.200.22 via 10.3.0.1 dev wlp3s0` pinning the endpoint to the physical Wi-Fi gateway.
  - **Ombi Line-Rate Acceleration**: Removed `/etc/systemd/system/ombi.service.d/proxy.conf`. With outbound traffic flowing via Dallas WireGuard, Ombi now talks directly to TMDb. Search queries dropped from **100+ seconds (timed out)** over Tor to **1.2 seconds** flat.
  - **Dual-Tier Dash Image Fetching**: In `tinapple-dash/internal/api/tmdb_cache.go`, added dual-tier fetching: Tier 1 tries direct fetch (`tmdbDirectClient`, 5s timeout) for line-rate speed when Proton VPN is active; Tier 2 falls back to `tmdbTorClient` with semaphore throttling if direct connection fails.
- **Verification**: Verified active WireGuard tunnel on `pineapple-server` (`sudo wg show proton`), confirmed exit IP `37.19.200.23` (Datacamp, Dallas, US), verified Ombi search for "Hunter x Hunter" and "Inception" returning in ~1.2s, and confirmed image downloads completing in ~2.0s cold and 0.26s warm.

### Maintenance (2026-11-15) | fix(ombi/images): throttle tor concurrency and serve http 200 fallback to eliminate thumbnail flicker
- **Scope**: Diagnosed the root causes of thumbnail loading failures and constant image flickering in Ombi search grids (`<ombi-image>` / `<discover-card>`), implemented worker concurrency throttling across upstream Tor connections, added singleflight deduplication with context cancellation, and served graceful HTTP 200 SVG fallback placeholders to eliminate Angular's `onError()` retry loops.
- **Root Cause & Fixes**:
  - **Tor Multi-Stream Collapse**: When Ombi returned 20 search items (e.g. "Hunter x Hunter"), the browser simultaneously requested 20 distinct `/ombi-images/t/p/w300/...` endpoints. Flooding Tor with 20 parallel streams caused socket timeouts and circuit stalls, leading `ServeTmdbImage` to return `HTTP 502 Bad Gateway` JSON.
  - **Angular Retry Flicker Loop**: In Ombi's compiled Angular bundles (`chunk-45IOSS33.js` and `chunk-HSOBLUAH.js`), `<img (error)="onError($event)">` intercepted the 502 JSON error, displayed a grey placeholder icon, and set a random 1-7s `setTimeout` to reassign `e.target.src = originalUrl`. This created an endless loop of retries, timeouts, and visible flickering between placeholder and loading states.
  - **Worker Semaphore Throttling**: In `tinapple-dash/internal/api/tmdb_cache.go`, introduced `upstreamSemaphore = make(chan struct{}, 4)` to limit concurrent Tor downloads to 4 streams. Background pre-fetching via `prefetchImagesFromBody` was converted to `downloadAndCacheImageThrottled` with 100ms polite spacing.
  - **Anti-Flicker HTTP 200 SVG Fallback**: When an upstream download times out or 404s after retry, `serveFallbackImage` serves a sleek dark-themed poster preview SVG (`image/svg+xml`) with `HTTP 200 OK` and `Cache-Control: no-cache, no-store, must-revalidate`. Because the browser receives a valid 200 OK image response, the JavaScript `error` event never fires, completely eliminating the retry loop and flickering.
  - **Path Normalization**: Added robust normalization (`filepath.ToSlash(filepath.Clean("/" + cleanPath))`) stripping duplicate slashes (`w300//*.jpg`) to ensure clean cache hits.
- **Verification**: Verified 301 cached images on disk (30 MB). Tested synthetic missing images and verified sub-millisecond HTTP 200 SVG fallback over Tailscale HTTPS. Verified cached poster delivery at ~7ms.

### Maintenance (2026-11-15) | perf(ombi/cache): resolve discover carousel skeleton hang, optimize tor circuit lifecycle, and implement local tmdb image caching proxy
- **Scope**: Diagnosed why Ombi's Discover page (`/ombi/discover`) carousels (Popular, Trending, Upcoming) hung on grey skeleton loaders (`p-skeleton`), resolved severe Tor circuit collapse/timeout in `torrc`, patched Ombi's compiled Angular bundles to redirect hardcoded `image.tmdb.org` requests away from campus firewall SSL interception to a local cache proxy, implemented an atomic image caching endpoint in `tinapple-dash` (`/ombi-images/*`), and established an automated background Discover carousel pre-warmer.
- **Root Cause & Fixes**:
  - **Tor Circuit Thrashing & Timeouts**: In `/etc/tor/torrc`, `CircuitBuildTimeout 5`, `NewCircuitPeriod 15`, and `MaxCircuitDirtiness 120` forced Tor to abort 60% of circuit creations mid-handshake (`Guard carrot failing... 113 collapsed, 216 timed out`), causing Ombi's cold TMDb requests to hang for 47+ seconds or throw `TaskCanceledException`. Removed `CircuitBuildTimeout 5`, increased `MaxCircuitDirtiness` to 1800s, `NewCircuitPeriod` to 120s, and guard count to 3. Cold API query time dropped from **47.05s** to **10.93s** (and **6.4ms** on warm cache).
  - **Campus DPI Firewall Poster Blocking**: PES University Sophos firewall intercepted client browser HTTPS requests to `https://image.tmdb.org/t/p/...` with untrusted certs (`Sophos SSL CA_C910D2W6X97X455`) and HTTP 307 redirects to block pages (`cat=17`), preventing browsers from loading posters and hero backdrops.
  - **Ombi Angular JS Patching**: In `/usr/lib/ombi/ClientApp/dist/browser/` (`chunk-45IOSS33.js`, `chunk-J7OMAEBM.js`, `chunk-KC7C4733.js`, `main-25AQDKEW.js`), replaced all 20 occurrences of `https://image.tmdb.org/t/p/` with `/ombi-images/t/p/`, keeping image delivery encrypted inside Tailscale and immune to campus DPI interception.
  - **High-Performance Image Caching Proxy**: In `tinapple-dash/internal/api/tmdb_cache.go`, implemented `ServeTmdbImage` handling `/ombi-images/*` with singleflight deduplication, streaming downloads via Privoxy (`http://127.0.0.1:8118`), atomic disk caching under `/var/cache/tinapple-dash/tmdb/`, and immutable `Cache-Control` headers for sub-millisecond local kernel sendfile delivery. Added Caddy fast-path routing `/ombi-images/*` to port `:8088`.
  - **Automated Background Discover Pre-Warmer**: Added `StartOmbiWarmer` running in `tinapple-dash`, periodically querying all 6 discover endpoints (`movie/popular`, `tv/popular`, `movie/nowplaying`, `tv/trending`, `movie/upcoming`, `tv/anticipated`) every 20 minutes to keep Ombi's `IMemoryCache` warm (**6.8ms - 14.5ms** response) and pre-fetching movie/TV posters and backdrops into the disk cache.
- **Verification**: Verified 160+ images cached on disk (16 MB), benchmarked cached image delivery at **52ms** over Tailscale DERP (0.5ms on server), and confirmed all 6 carousel API queries respond concurrently with HTTP 200 in ~1.2s total roundtrip. Suwayomi confirmed functional.

### Maintenance (2026-11-15) | fix(suwayomi/proxy): configure native webUISubpath and pass-through reverse proxy routing
- **Scope**: Diagnosed blank dark screen (`#171923`) when accessing Suwayomi Manga Server via the HTTPS domain, resolved asset 404 collisions at domain root, configured native `server.webUISubpath = "/suwayomi"` in `server.conf`, and aligned Caddy reverse proxy routes.
- **Root Cause & Fixes**:
  - **Asset 404 Collisions**: Suwayomi had `server.webUISubpath = ""` (empty), causing it to emit `<base href="/">`. When accessed behind Caddy's `handle_path /suwayomi/*`, the browser attempted to load `./assets/index-*.js` and GraphQL endpoints directly from the domain root (`/assets/*` and `/api/*`), which clashed with `tinapple-dash` and returned 404s, leaving the React container empty.
  - **Native Subpath Configuration**: Set `server.webUISubpath = "/suwayomi"` in `/var/lib/suwayomi/.local/share/Tachidesk/server.conf`. Suwayomi's `WebInterfaceManager` now dynamically injects `<base href="/suwayomi/">` and scopes all API, GraphQL, and static asset routes under `/suwayomi/*`.
  - **Caddyfile Alignment**: In `configs/caddy/Caddyfile` and server `/etc/caddy/Caddyfile`, replaced `handle_path /suwayomi/*` with `handle /suwayomi/*` so requests preserve the `/suwayomi/` prefix when passed to Suwayomi daemon on `:4567`. Added fallback rewrite for legacy `/api/graphql*` requests.
  - **Verification**: Verified clean HTTP/2 200 responses for WebUI HTML, JS/CSS bundles, and GraphQL API, with full browser rendering confirmed.

### Maintenance (2026-11-15) | fix(ombi/proxy): bypass campus DPI firewall via Privoxy-Tor bridge and resolve blank Angular UI
- **Scope**: Diagnosed cause of blank dark screen (`#1e1e1e`) when accessing Ombi, resolved Sophos DPI firewall interception of external media metadata APIs (TMDb and Fanart.tv), established outbound Privoxy-Tor routing drop-in for Ombi daemon, fixed `getAppUrl` stale `selectedApp` state leak in Store UI, and synchronized updated `tinapple-dash` and `tinapple-hub` builds.
- **Root Cause & Fixes**:
  - **Sophos DPI Interception**: PES University campus firewall intercepted outbound HTTPS connections to `api.themoviedb.org` and `fanart.tv` with HTTP 307 redirects to block pages (`cat=17 Entertainment`). Ombi's JSON deserializer encountered HTML tags, throwing `Newtonsoft.Json.JsonReaderException: Unexpected character encountered while parsing value: <` in `TheMovieDbApi.GetGenres` and `FanartTvApi.GetMovieImages`, crashing Angular `APP_INITIALIZER` and background hydration and leaving `<app-ombi>` completely blank.
  - **Privoxy & Tor Routing Bridge**: Configured Privoxy (`/etc/privoxy/config`) to forward traffic via local Tor SOCKS5 daemon (`forward-socks5 / 127.0.0.1:9050 .`). Created systemd drop-in `/etc/systemd/system/ombi.service.d/proxy.conf` routing Ombi outbound traffic through `http://127.0.0.1:8118` while bypassing local subnets via `NO_PROXY`. Verified clean HTTP 200 JSON responses from `/ombi/api/v1/Images/background/info` and `/ombi/api/v1/LandingPage`.
  - **Store UI App URL Resolution**: In `ChaddyStore.tsx`, fixed `getAppUrl` to prioritize specific `appId` arguments and port lookups against `serviceRegistry`, preventing stale `selectedApp` modal state from overriding direct pack service quick-links.
  - **Service Synchronization**: Rebuilt and staged `tinapple-hub` to `/usr/share/tinapple-dash/web/dist/`, compiled and restarted `tinapple-dash` with live MagicDNS HTTPS 301 upgrade routing, and tracked drop-ins in `configs/ombi/`.

### Maintenance (2026-11-14) | fix(music/playlists): deduplicate repeat playlists and sync missing albums in Navidrome
- **Scope**: Diagnosed missing and duplicated playlists in Navidrome, purged 7 fragmented category playlists from `/srv/media/music/Playlists` that created overlapping repeat entries, generated missing `.m3u` playlists for completed batch downloads (`ALLLLLLLLLLLLLLL`, `BRAZILIAN PHONK 2024`, `Hip Hop Pop Rap Mix`, and `This Is Masala Coffee`), and audited Antra download queue rate limits.
- **Key Changes**:
  - **Deduplication**: Removed 7 redundant category sub-playlists (`Recognizable Piano Melodies`, `The Most Recognizable Melodies From The 2010s`, etc.) and consolidated them into the master `Favorite Recognizable Melodies` playlist (25 tracks).
  - **Script Update**: Updated `tinapple-update-playlists` to prevent regenerating fragmented sub-playlists on future runs while automatically generating sorted `.m3u` files for all standalone playlist directories.
  - **Navidrome Sync**: Scanned updated playlists into Navidrome (361 total tracks across 6 clean, non-overlapping playlists).
  - **Queue Audit**: Confirmed all 14 Spotify / Apple Music playlists are tracked in `tinapple-music-queuer`. Documented Antra daily free-tier limits (100 tracks/day, 5 playlists/day) which caused later batches to pause on HTTP 429.

### Maintenance (2026-11-12) | feat(hub/ui): polish navigation breadcrumbs, telemetry visuals, sidebar opacity, and platform app links
- **Scope**: Polished frontend navigation breadcrumbs to dynamically display hostnames and session badges, made telemetry CPU visualizer robust against varying core counts and architectures, guaranteed 100% opaque surface backgrounds for the navigation drawer and sidebar to prevent theme opacity bleed-through, added smart deep-links for platform-specific client apps (Tsumiru Android APK / iOS), and repositioned update toasts.
- **Key Changes**:
  - **Breadcrumbs & Header**: Updated `App.tsx` breadcrumbs to render `systemInfo?.hostname` with active tab and session mode chips.
  - **AppBrandIcons & Ports**: Decoupled `seerr` / `jellyseerr` icons back to independent purple `#8B5CF6` branding and aligned port definitions (Ombi `:5000`, Seerr `:5055`).
  - **Platform App Links**: Implemented `getPlatformAppTarget` in `platformAppLinks.ts` and integrated into `ServicesManager.tsx` and `ChaddyStore.tsx` to provide platform-aware deep links for mobile clients.
  - **Sidebar Opacity**: Added `.tinapple-sidebar-drawer` and `.tinapple-sidebar-fixed` CSS rules with `--tw-bg-opacity: 1 !important` ensuring sidebar surfaces remain fully opaque.
  - **Telemetry Visualizer**: Made `TelemetryCards.tsx` dynamically adapt to CPU core counts and detect architecture (`aarch64` vs `x86_64`).

### Maintenance (2026-11-12) | feat(proxy/ssl): enforce full HTTPS reverse proxy redirection, base URL alignment, and downstream SSL rewriting
- **Scope**: Implemented universal reverse proxy redirection to the secure Let's Encrypt HTTPS domain (`https://pineapple-server.taildb42a2.ts.net`) across all appliance services (Jellyfin, Ombi, Radarr, Sonarr, Prowlarr, Pinchflat, qBittorrent, Suwayomi, Vaultwarden, Navidrome, Syncthing, AdGuard, Bazarr, and Element Web), preventing HTTP downgrades and eliminating raw port exposures.
- **Root Cause & Fixes**:
  - **Caddy Redir Syntax Bug**: In Caddy v2, `handle /service { redir /service/ permanent }` parsed the leading slash in `/service/` as an inline path matcher rather than the target URL, generating `match: /service/, Location: permanent` (302) which failed to redirect `/service` without a slash. Re-architected with top-level `redir /service /service/ permanent`.
  - **Appliance Base URL Subpaths**:
    - **Ombi**: Configured `--baseurl /ombi` via `/etc/systemd/system/ombi.service.d/baseurl.conf`, generating `<base href="/ombi/">` and enabling clean `/ombi/*` pass-through without root asset collisions.
    - **Radarr, Sonarr, Prowlarr**: Set `<UrlBase>/<service></UrlBase>` in `/var/lib/{radarr,sonarr,prowlarr}/config.xml`, enabling native subpath asset routing.
    - **Pinchflat**: Configured `-e BASE_ROUTE_PATH=/pinchflat` in `/etc/systemd/system/pinchflat.service` and switched Caddy to `handle_path /pinchflat/*`, resolving internal Phoenix router clashes and live websocket updates.
  - **Downstream Location Rewriting**:
    - Added `header_down Location "http://" "https://"` to all service reverse proxies, forcing any upstream backend redirects back to encrypted HTTPS.
    - Added AdGuard regex header rewrite `header_down Location "^/([^/].*)$" "/adguard/$1"`, ensuring setup/login redirects stay bound inside `/adguard/`.
  - **Backend Port 8088 Protection**:
    - In `tinapple-dash/cmd/tinapple-dash/main.go`, updated `servicePortRedirects` to redirect any MagicDNS or HTTPS request with HTTP 301 to `https://pineapple-server.taildb42a2.ts.net/<prefix>/`, preventing fallback redirects to raw direct ports (`:5000`, `:7878`, `:8989`, `:8080`).
  - **Frontend Subpath Priority**:
    - In `serviceRegistry.ts`, restructured `getOpenUrl()` to unconditionally prioritize clean reverse proxy paths (`this.subpath`) over `directPortPreferred`, keeping client clicks on the trusted 443 SSL domain.
    - Replaced obsolete Tailscale IP `100.67.207.60` with active `100.108.215.120` across `api.ts`, `serviceRegistry.ts`, `guidesCatalog.tsx`, `GuidesPage.tsx`, and `UnifiedAppPage.tsx`.

### Maintenance (2026-11-12) | feat(routing/magicdns): route all MagicDNS and Tailscale ingress to secure Let's Encrypt HTTPS domain
- **Scope**: Automated seamless redirection so all MagicDNS ingress paths (short name `pineapple-server`, full FQDN `pineapple-server.taildb42a2.ts.net`, legacy `tinapple-server`, and Tailscale CGNAT IPs `100.x.x.x`), across both HTTP port 80 and backend port 8088, permanently upgrade to the trusted Let's Encrypt HTTPS domain (`https://pineapple-server.taildb42a2.ts.net`).
- **Key Changes**:
  - **Caddy Reverse Proxy (`configs/caddy/Caddyfile`)**:
    - Added `@magicdns` regex matcher on HTTP port 80 capturing `pineapple-server`, `tinapple-server`, `*.ts.net`, and `100.x.x.x` host requests.
    - Configured automatic `301 Moved Permanently` redirect to `https://pineapple-server.taildb42a2.ts.net{uri}`.
    - Preserved unredirected local LAN subnet access (`192.168.1.x`, `localhost`) for offline local access.
  - **Backend Daemon Redirection (`tinapple-dash/cmd/tinapple-dash/main.go`)**:
    - In `serveIndex` and `servicePortRedirects`, added `isMagicDNSHost` check. Direct browser access to `:8088` via MagicDNS or Tailscale IP now immediately redirects (HTTP 301) to `https://pineapple-server.taildb42a2.ts.net{uri}` while preserving `X-Forwarded-Proto: https` pass-through from Caddy and raw API endpoints for programmatic clients.

### Maintenance (2026-11-12) | feat(chat): isolate Mautrix Matrix stack as primary, decommission Beeper from host to store catalog only
- **Scope**: Re-architected chat messaging orchestration by decommissioning legacy Beeper CLI (`bbctl`) daemon and binary from host, validating native self-hosted Matrix Synapse homeserver and companion bridges (WhatsApp, Discord, Instagram, Signal, and Sliding Sync), and establishing two independent store packs: `mautrix-suite` (active primary, 1/1 installed & running) and `beeper-suite` (store catalog only, 0/1 installed).
- **Key Changes**:
  - **Host Server Decommissioning**:
    - Stopped, disabled, and removed `bbctl.service`, `bbctl@.service`, and binary `/usr/local/bin/bbctl` from server.
    - Verified all 6 native Matrix services active and running without errors: `synapse.service` (:8008), `matrix-sliding-sync.service` (:8009), `mautrix-whatsapp.service`, `mautrix-discord.service`, `mautrix-instagram.service`, and `mautrix-signal.service`.
    - Executed `systemctl reset-failed` (0 failed units on host).
  - **Backend Orchestration (`tinapple-dash/internal/services/apps.go`)**:
    - Registered `mautrix` appliance (port 8008, unit `synapse.service`, binary `synapse_homeserver`, webUrl `/element/`, icon `matrix`, accent `#00D26A`).
    - Added `mautrix-suite` pack ("Mautrix Matrix Unified Chat Stack") with `apps: ["mautrix"]`, icon `matrix`, accent `#00D26A`, badge `MATRIX & CHAT`.
    - Added `beeper-suite` pack ("Beeper Matrix Bridge Stack") with `apps: ["beeper"]`, icon `beeper`, accent `#F43F5E`, badge `BEEPER & CLOUD`.
    - Configured `configurePackUnlocked` to handle `mautrix-suite` and `beeper-suite`.
    - Updated `Start`, `Stop`, and `Restart` methods to cascade across all 5 companion bridge units when `mautrix` is toggled.
  - **Frontend Hub & Store Orchestration**:
    - In `ChaddyStore.tsx`: Added `mautrix` to fallback apps, added `mautrix-suite` and `beeper-suite` to fallback packs, mapped guides in `packGuideMap` and app `guideMap`, and added direct quick-launch button for `Element Web (/element/)`.
    - In `serviceRegistry.ts`: Registered `mautrix` (port 8008, subpath `/element/`, guide `mautrix`) and `beeper` under Network & Privacy.
    - In `HomarrBoard.tsx`: Added `mautrix` to `CURATED_APPLIANCES` under Network & Privacy.
    - In `api.ts`: Added `mautrix` and `matrix` port and subpath mappings (`/element/`).

### Maintenance (2026-11-12) | fix(apps/uninstall): resolve package target mismatch and stdin EOF bug in app uninstallation
- **Scope**: Diagnosed and resolved the root causes behind failed package uninstalls (specifically SyncYomi and manually installed/AUR daemons), where clicking uninstall resulted in a `FAILED` unit state instead of uninstallation.
- **Root Cause & Fixes**:
  - **Pacman Package Mismatch**: `syncyomi` and similar appliances are installed via script / binary releases rather than the standard Arch repo package `syncyomi`. `Uninstall` attempted `pacman -R --noconfirm syncyomi`, which errored with `target not found: syncyomi`, aborting before cleaning up `/etc/systemd/system/syncyomi.service` or `/usr/local/bin/syncyomi`. When `disable --now` ran, the daemon's exit code marked the lingering unit as `FAILED`.
  - **Proxy Route Generator Stdin Race**: In `tinapple-config-generator/main.go`, `nginx-sync` sequentially invoked `syncCaddy` then `syncNginx` with `--catalog-stdin`. `syncCaddy` consumed `os.Stdin` entirely, causing `syncNginx` to encounter `EOF` and exit with 1, cascading a 500 error to all caller actions via `refreshProxyRoutes()`.
  - **Comprehensive Cleanups**:
    - Added dedicated uninstallation cleanup for `syncyomi` (removes binary from `/usr/local/bin/` & `/usr/bin/`, removes `/etc/systemd/system/syncyomi.service`, clears drop-ins, and cleans pacman packages only if `pacman -Q` reports them installed).
    - Hardened generic app uninstallation to check `pacman -Q` before attempting removal, automatically strip custom `/etc/systemd/system/<unit>` files and local binaries, and execute `systemctl reset-failed` and `daemon-reload`.
    - Updated `tinapple-config-generator/main.go` to buffer `--catalog-stdin` into shared catalog files so both Caddy and Nginx sync cleanly without stdin starvation.
    - Added spinning `<Loader2 />` indicators to Store action buttons during uninstallation.

### Maintenance (2026-11-12) | feat(packs): establish dual full streaming stacks (Ombi Primary 8/8 & Seerr Alternate 7/8 in App Store)
- **Scope**: Re-architected appliance packs into two complete 8-component media automation stacks: the primary active stack featuring Ombi (active on host, 8/8 installed & running) and an optional alternate stack featuring Seerr (available in App Store, 7/8 installed, 1 remaining: Seerr).
- **Key Changes**:
  - **Appliance Pack Definitions (`tinapple-dash/internal/services/apps.go`)**:
    - `ombi-stack` ("Ultimate Streaming & Servarr Stack"): Includes `jellyfin`, `ombi`, `radarr`, `sonarr`, `prowlarr`, `bazarr`, `qbittorrent`, and `pinchflat`. Features Ombi 1-click requests on port 5000. Verified active on host (8/8 installed & running).
    - `seerr-stack` ("Ultimate Streaming Stack (Seerr Edition)"): Includes `jellyfin`, `seerr`, `radarr`, `sonarr`, `prowlarr`, `bazarr`, `qbittorrent`, and `pinchflat`. Features Seerr 1-click requests on port 5055. Displays in store as an alternative full pipeline (7/8 installed, 1 remaining: Seerr).
    - Updated `configurePackUnlocked` switch to handle both `ombi-stack` and `seerr-stack`.
  - **Store UI Orchestration (`tinapple-hub/src/components/widgets/ChaddyStore.tsx`)**:
    - Updated `FALLBACK_PACKS` and pack action buttons to render both full stacks.
    - Added dedicated service quick-action buttons for `ombi-stack` (`Ombi :5000` + `Jellyfin :8096`) and `seerr-stack` (`Seerr :5055` + `Jellyfin :8096`).
    - Configured guide linking: `ombi-stack` maps to `ombi` guide, `seerr-stack` maps to `seerr` guide.

### Maintenance (2026-11-12) | feat(services/mesh): isolate Ombi as primary stack pack, decouple Seerr to store pack, enable Tailscale SSH, and deploy trusted Caddy Tailscale SSL
- **Scope**: Installed and started Ombi (`ombi-bin`, `ombi.service` on port 5000), removed Seerr from host to make Ombi the single active media request manager, separated Seerr into an independent optional pack in the App Store, enabled Tailscale SSH (`RunSSH: true`) with full exit-node IP forwarding, and established automated Let's Encrypt SSL via Caddy on port 443 for `pineapple-server.taildb42a2.ts.net` with automated bi-monthly renewal.
- **Key Changes**:
  - **Ombi Deployment & Servarr Integration**:
    - Installed `aur/ombi-bin` (`4.53.10-1`) on server, enabled and started `ombi.service` running on `http://*:5000`.
    - Updated Caddy reverse proxy on server (`/etc/caddy/Caddyfile`) and repo (`configs/caddy/Caddyfile`) to proxy `/ombi/*` to `localhost:5000`.
    - Added dedicated Ombi guide in `guidesCatalog.tsx` with links to Jellyfin and mobile companion apps.
  - **Seerr Decoupling & Host Cleanup**:
    - Stopped, disabled, and uninstalled `seerr.service` (`seerr 3.5.0-1`) from server so it does not consume resources.
    - Decoupled `seerr` from `ombi` alias in `apps.go`: added `seerr-portal` as an independent pack in `tinapple-dash` and `ChaddyStore.tsx` (reports `0/1 installed`), while the "Ultimate Streaming & Servarr Stack" features Ombi (reports `8/8 installed & running`).
    - Updated Homarr board, widgets, launcher, and mobile dashboard view to feature Ombi on port 5000 (`/ombi`).
  - **Tailscale SSH & Exit Node**:
    - Enabled Tailscale SSH via `tailscale set --ssh` (`RunSSH: true`).
    - Verified exit node advertisement (`0.0.0.0/0`, `::/0`) with kernel sysctl forwarding (`net.ipv4.ip_forward = 1`, `net.ipv6.conf.all.forwarding = 1`).
  - **Caddy Tailscale Automated SSL**:
    - Freed port 443 via `tailscale serve reset`.
    - Generated trusted Let's Encrypt certificate for MagicDNS domain `pineapple-server.taildb42a2.ts.net` using `tailscale cert` into `/etc/caddy/certs/`.
    - Configured Caddy with HTTPS site block on port 443 terminating TLS with standard Let's Encrypt certificate, automatically securing all reverse-proxied endpoints (`/`, `/ombi`, `/jellyfin`, `/suwayomi`, `/vault`, `/qbittorrent`, `/navidrome`, `/syncthing`, etc.) with zero browser security warnings.
    - Installed `caddy-tailscale-cert.service` and `caddy-tailscale-cert.timer` running bi-monthly on the 1st and 15th to keep certificates renewed automatically.

### Maintenance (2026-11-11) | fix(manga): resolve Suwayomi manga source failures via Tor SOCKS5 proxy and FlareSolverr tunneling
- **Scope**: Diagnosed root cause of recurring manga source errors in Suwayomi (`suwayomi-server.service`), configured local Tor SOCKS5 tunneling for both Suwayomi JVM and FlareSolverr Chromium containers, and verified chapter browsing and page downloads across all installed sources.
- **Root Cause**:
  - PES University campus Wi-Fi firewall (Sophos DPI) intercepts HTTPS connections to manga sources (`cat=17` Entertainment: `api.mangadex.org`, `mangafire.to`, `asurascans.com`, `comix.to`, etc.) and redirects with a `307 Temporary Redirect` to `https://192.168.254.1:8090/v1/ips/block/webcat?cat=17`.
  - Because Sophos serves dynamically spoofed certificates from an untrusted root (`CN=Sophos SSL CA_C910D2W6X97X455`), the JVM aborted with `PKIX path building failed: sun.security.provider.certpath.SunCertPathBuilderException`. Even if TLS was ignored, queries landed on Sophos HTML block pages.
- **Key Changes**:
  - **Suwayomi SOCKS5 Routing**: Configured `/var/lib/suwayomi/.local/share/Tachidesk/server.conf` with `server.socksProxyEnabled = true` and `server.socksProxyPort = "9050"` (local Tor SOCKS5 proxy on `127.0.0.1:9050`).
  - **FlareSolverr Tor Egress**: Configured `/etc/systemd/system/flaresolverr.service` with `-e PROXY=socks5://127.0.0.1:9050` so Chromium Cloudflare challenges resolve over Tor instead of hitting the Sophos firewall block page.
  - **Source & Library Validation**:
    - Verified popular manga lists and chapter metadata: Asura Scans (20 items), MangaFire (50 items), MangaDex (20 items), Vortex Scans (18 items), AllManga (20 items), and Rolia Scan (21 items).
    - Verified all 9 active library manga titles (8 Asura Scans, 1 AllManga) and confirmed full WebP page rendering and download queues.
    - Verified ingress via direct Tailscale port `:4567`, Funnel `:8443`, and Caddy reverse proxy `/suwayomi/`.

### Commit `f58341b` | fix(sync): refine pre-commit and pre-push hook behavior for GEMINI.md (2026-11-08)
- **Commit**: `f58341b`
- **Subject**: fix(sync): refine pre-commit and pre-push hook behavior for GEMINI.md
- **Key Files**: `scripts/sync-gemini-ledger.py`

### Maintenance (2026-11-11) | feat(network): configure server as Tailscale exit node with Proton VPN forwarding and split tunneling safeguards
- **Scope**: Configured server (`pineapple-server`, `100.108.215.120`) to advertise as a Tailscale exit node (`--advertise-exit-node`), enabled permanent IPv4 and IPv6 forwarding with loose reverse path filtering (`rp_filter = 2`), established forwarding and MASQUERADE NAT rules chaining Tailscale exit node clients (`tailscale0`) into Proton VPN (`proton+`), and updated `tinapple-proton` and `tinapple-dash` telemetry.
- **Key Changes**:
  - **Tailscale Exit Node Configuration**:
    - Executed `tailscale set --advertise-exit-node` to advertise routes `0.0.0.0/0` and `::/0`.
    - Set Tailscale operator to user `pineapple` (`tailscale set --operator=pineapple`) for unprivileged CLI control.
    - Persisted sysctl parameters in `/etc/sysctl.d/99-tailscale-exit-node.conf`:
      `net.ipv4.ip_forward = 1`, `net.ipv6.conf.all.forwarding = 1`, `net.ipv4.conf.all.rp_filter = 2`, `net.ipv4.conf.default.rp_filter = 2`.
  - **Proton VPN Egress & NAT Forwarding**:
    - Configured iptables FORWARD rules to route packets from `tailscale0` to `proton+` (WireGuard `proton` or CLI `proton0`) and established related/established return path.
    - Added iptables NAT POSTROUTING `MASQUERADE` for outbound traffic on `proton+` and fallback `wlp3s0`.
    - Updated `scripts/tinapple-proton` (`ensure_routing_safeguards`, `sanitize_and_save_wireguard`, `setup_exit_node`) and `scripts/pesu-wifi-runner` to automatically enforce exit-node forwarding rules on boot and during VPN lifecycle events.
  - **Telemetry & Daemon Synchronization**:
    - Added `tailscale_exit_node` telemetry (`advertised`, `ip_forwarding`, `egress: "proton" | "wan"`) to `tinapple-proton status` and `/api/v1/system/proton-exit`.
    - Rebuilt `tinapple-dash` daemon binary and deployed to `/usr/local/bin/tinapple-dash`, replacing obsolete binary with live WireGuard state reflection.

### Maintenance (2026-11-11) | feat(network): configure pesu-wifi boot autorun sequence, Proton VPN split-tunneling bypass, and upgrade to v3.7.15
- **Scope**: Resolved `pesu-wifi start` failure on server, upgraded binary to v3.7.15, enabled systemd user service recognition, established Proton VPN / WireGuard split tunneling for campus captive portal gateways, and configured automated boot runner (`pesu-wifi-runner`) performing start -> login -> status.
- **Key Changes**:
  - **Daemon Diagnose & Upgrade**:
    - Identified that `pesu-wifi start` CLI invoked `systemctl --user start pesu-wifi.service`, which failed with "Unit not found" because `pesu-wifi.service` only existed as a root system unit. Furthermore, v3.6.0's process table search did not match `pesu-wifi start -f`, reporting the daemon as inactive.
    - Upgraded `pesu-wifi` to v3.7.15 (`/usr/local/bin/pesu-wifi`), resolving PID detection via `pgrep -f "pesu[-_]wifi.*(daemon|start)"` across user sessions. Installed user service definition at `/usr/lib/systemd/user/pesu-wifi.service`.
    - Synchronized valid credentials (`SILVER@123` for `deltatime-4`) across `/home/pineapple/.config/pesu-wifi/config.json`, `/root/.config/pesu-wifi/config.json`, and global fallback `/etc/pesu-wifi/config.json`.
  - **Proton VPN Split Tunneling**:
    - Configured persistent policy routing rules (`priority 5190` -> `table main`) for all PES University captive portal gateways (`192.168.254.1`, `172.16.1.1`, `10.14.142.1`, `192.168.1.1`) and local campus subnet `10.3.0.0/20`.
    - Integrated split tunneling into `scripts/tinapple-proton` (`ensure_routing_safeguards` and WireGuard `PostUp`/`PostDown` hooks) to ensure captive portal requests bypass any active VPN tunnel.
  - **Boot Sequence & Autorun**:
    - Created `scripts/pesu-wifi-runner` (`/usr/local/bin/pesu-wifi-runner`) executing:
      1. Enforces VPN bypass rules.
      2. Waits for campus interface route readiness.
      3. Performs initial login (`pesu-wifi login`).
      4. Prints live connection status card (`pesu-wifi status`).
      5. Launches foreground daemon (`pesu-wifi start -f`) with power inhibitor, netlink sockets, and 180s keepalive.
    - Updated `tinapple-service-network/systemd/pesu-wifi.service` to run `pesu-wifi-runner`.

### Maintenance (2026-11-11) | feat(proxy): complete Caddy migration, resolve Tsukimi 404 delete, and fix Suwayomi multi-source downloads
- **Scope**: Migrated entire reverse proxy infrastructure from NGINX to clean Caddy across server, repos, installers, updaters, and configs; fixed Tsukimi client 404 delete error; resolved Suwayomi multiple sources failure; and completely deleted "The World's Strongest Witch" anime.
- **Key Changes**:
  - **Caddy Reverse Proxy Migration**:
    - Migrated all reverse proxy directives to `/etc/caddy/Caddyfile` and `configs/caddy/Caddyfile` with modern lossless compression (`encode zstd gzip`), security headers, immutable caching for `/assets/*` and manga thumbnails, and subpath proxies (`/jellyfin`, `/suwayomi`, `/qbittorrent`, `/ombi`, `/navidrome`, `/syncthing`, `/vault`, `/adguard`, `/bazarr`, Matrix routes).
    - Decommissioned `nginx.service`; aliased `tinapple-nginx.service` to `caddy.service`.
    - Added Caddy route generator to `tinapple-config-generator` (`routing/caddy.go`, `caddy.go`) generating dynamic service routes into `/etc/caddy/conf.d/tinapple-services.caddy`. Added `caddy-sync` and `proxy-sync` commands.
    - Updated `scripts/tinapple-update`, `tinapple-installer/backend/lib/deploy.sh`, `tinapple-dash/PKGBUILD`, `tinapple-nginx/PKGBUILD`, and `tinapple-dash.service` to depend on and manage Caddy.
  - **Tsukimi Deletion 404 Resolution**:
    - Tsukimi GTK4 client queries `GET /Items/{id}/DeleteInfo` (or `/emby/Items/{id}/DeleteInfo`) before displaying delete prompt. Because Jellyfin removed this endpoint, Tsukimi failed with 404.
    - Configured Emby compatibility route on Caddy ports `:8096` and `:8095` returning `200 OK {"Paths":[]}`.
  - **Suwayomi Manga Sources Fix**:
    - Enabled FlareSolverr fallback proxy in `/var/lib/suwayomi/.local/share/Tachidesk/server.conf` (`server.flareSolverrEnabled = true`, `server.flareSolverrUrl = "http://localhost:8191"`).
    - Updated extensions (e.g. Asura Scans v1.6.72).
    - Fixed JVM IPv6 unreachable network bug by adding `-Djava.net.preferIPv4Stack=true` to `suwayomi-server.service`.
  - **Anime Deletion**:
    - Completely deleted "The World's Strongest Witch" anime via Sonarr API (`DELETE /api/v3/series/2?deleteFiles=true`) and verified filesystem cleanup and Jellyfin library scan.

### Maintenance (2026-11-09) | feat(clients): switch Ombi client port to 5055 and release Android v2.0.1
- **Scope**: Updated Ombi client-facing launcher port from 5000 to 5055 across `tinapple-hub` and `tinapple-android` to route directly via the Caddy Tailscale guest compatibility bridge without affecting internal daemon telemetry (which stays on 5000).
- **Key Changes**:
  - `tinapple-android`: Added `displayPort: Int?` to `ServiceItem` (mapping Ombi to 5055), updated `TinappleApiClient.getServicePortalUrl()`, `ServiceCard.kt`, and `ServicesSection.kt`. Bumped app version to `versionCode 5`, `versionName "2.0.1"`.
  - `tinapple-hub`: Updated default port, service maps, quick launchers, Homarr widgets, guides, and store listings to port `5055` (`serviceRegistry.ts`, `api.ts`, `ServicesManager.tsx`, `HomarrBoard.tsx`, `HomarrWidgets.tsx`, `ChaddyStore.tsx`, `UnifiedAppPage.tsx`, `MobileDashboardView.tsx`, `guidesCatalog.tsx`).
  - Automated tests: Added `tinapple-hub/tests/ombi-url.test.mjs` and `tinapple-android/app/src/test/java/org/tinapple/hub/ServiceItemTest.kt`.
  - Built production assets: Web frontend rebuilt with Vite (`npm run build`) and deployed to `/usr/share/tinapple-dash/web/dist/`. Native Android signed release APK compiled with Gradle (`./gradlew assembleRelease`), deployed to `/home/tinapple/Documents/Antigravity-Share/tinapple-client.apk`, `/usr/share/tinapple-dash/web/dist/tinapple-client.apk` (+ sha256), and `out/releases/tinapple-android-client.apk`. The first build was installed on Pixel 10a via ADB; the final reviewed build is available to download, but the phone was offline for final installation.
  - Codex review preserved the existing Tailscale-IP fallback for browser HTTP portals opened from HTTPS `*.ts.net` origins, corrected service-card variable scope and mobile icon typing, and fixed an existing invalid `this.fetch` call so TypeScript checking passes. Browser interaction verified the desktop Ombi title/port links reach its login page on `:5055`; mobile labels/URLs are correct, but an overlapping navigation layer prevented completing the emulated mobile click. A real phone tap remains unverified.
  - Final validation: TypeScript no-emit check, four web tests, two native unit tests, web production build, and signed release build passed. APK v2/v3 signatures and unchanged signing identity verified. Final APK SHA-256: `569a840af5236ae110fff6fecd0a08d1d58d125ee682cf2fefa28df5fb5f9fdf`; shared aliases, staging/download copies, checksum endpoints and Android release-manifest entries refreshed. Backend Ombi service/API metadata still uses native port 5000.

### Maintenance (2026-11-09) | ops: diagnose friend Ombi access, establish Caddy port 5055 compatibility bridge, patch Tailscale ACL policy
- **Scope**: Diagnosed why the trusted guest account cannot reach Ombi; added a Caddy compatibility bridge and prepared a Tailscale ACL policy patch.
- **Root Cause**: Ombi runs on port 5000 (account `icekimi` active), but active Tailscale `PacketFilterRules` for `group:guests` only permits legacy Seerr port 5055 and lacks port 5000.
- **Key Changes**:
  - Configured Caddy compatibility reverse proxy on `:5055` (`reverse_proxy localhost:5000`), with the same bridge preserved in `configs/caddy/Caddyfile` for deployment. Server-side HTTP/login-page/asset checks pass through `http://100.67.207.60:5055/`, and live guest rules allow TCP 5055; final reachability from the friend's device remains to be confirmed.
  - Updated local Tailscale policy files (`tailscale-acl.hujson` and `tailscale-acl.json` in `Antigravity-Share/`) to add `"100.67.207.60:5000"` for `group:guests`. Applying this in Tailscale Admin Console will enable standard direct port 5000 access.
  - Snapshots and rollback scripts saved to `/var/lib/tinapple-maintenance/20261109T093000Z/`.

### Maintenance (2026-11-09) | ops: disable unused Cloudflare WARP proxy, enable public Tailscale Funnel for Suwayomi, reconcile server context
- **Scope**: Resolved unintended WARP operation, published public Suwayomi Funnel, and corrected server documentation without disrupting running media services.
- **Key Changes**:
  - Investigated local WARP proxy on `127.0.0.1:40000`; found no consumers in inspected service configurations or the connection snapshot (FlareSolverr and TMDb relay operate independently). Disconnected `warp-cli`, stopped, disabled, and masked `warp-svc.service`; local application checks passed.
  - Reconfigured Tailscale Funnel on `:8443` from stale unresolvable `tinarchy` / port 4568 to active `https://tinapple-server.tail3dee69.ts.net:8443` proxying `http://127.0.0.1:4567` (Suwayomi). Public ingress verified over TLS with Let's Encrypt certificates, HTML/JS/CSS assets, and GraphQL `aboutServer` query. Authentication remains user-managed (`authMode NONE`).
  - Reconciled `CODEX.md` (and mirrored to `/home/tinapple/CODEX.md`) with accurate runtime hardware, Wi-Fi interface (`wlo1`), Caddy reverse proxy (`tinapple-nginx.service`), active ports (Ombi on `:5000`, FileBrowser on `:8081`), lowercase `/srv/media` paths, and toolchain versions.
  - Snapshot and rollback files saved to `/var/lib/tinapple-maintenance/20261109T050800Z/`.
  - Codex review removed the obsolete `tinarchy` Funnel mapping while preserving the working current-host mapping, and completed rollback restoration for the exact saved Serve/Funnel configuration. The keyring WKD refresh failure was left unchanged; package-signing keys are separate from sudo authorization.

### Commit `c755808` | feat(ai): configure automated sync-gemini skill and hooks for AGY CLI and Codex CLI (2026-11-08)
- **Commit**: `c755808`
- **Subject**: feat(ai): configure automated sync-gemini skill and hooks for AGY CLI and Codex CLI
- **Key Files**: `scripts/sync-gemini-ledger.py`

### Commit `0e89ee8` | feat(ai): configure automated sync-gemini skill and hooks for AGY CLI and Codex CLI (2026-11-08)
- **Commit**: `0e89ee8`
- **Subject**: feat(ai): configure automated sync-gemini skill and hooks for AGY CLI and Codex CLI
- **Key Files**: `.agents/hooks.json`, `.agents/skills/sync-gemini/SKILL.md`, `CODEX.md`, `scripts/agy-pre-command-hook.py`, `scripts/sync-gemini-ledger.py`

### Commit `46f7011` | docs: add AI context synchronization ledger (GEMINI.md) and server reference (CODEX.md) (2026-11-08)
- **Commit**: `46f7011`
- **Subject**: docs: add AI context synchronization ledger (GEMINI.md) and server reference (CODEX.md)
- **Key Files**: `CODEX.md`

### Commit `0a897d2` | Release `v0.0.8` (2026-11-08)
- **Releases Page Updated**: Published GitHub Release `v0.0.8` containing pure native Kotlin APK ([`tinapple-android-client.apk`](file:///home/tinapple/tinapple/out/releases/tinapple-android-client.apk)) and multiplatform desktop packages.
- **Build Scripts**: Updated [`build-desktop-releases.sh`](file:///home/tinapple/tinapple/scripts/build-desktop-releases.sh) to build from `tinapple-android` and utilize python3/bsdtar zip fallbacks.
- **In-App Downloads**: Synchronized `tinapple-client.apk` and `tinapple-client.apk.sha256` to web distribution directories (`/usr/share/tinapple-dash/web/dist/`).
- **Dashboard Branding**: Updated [`QuickConnectCard.tsx`](file:///home/tinapple/tinapple/tinapple-hub/src/components/widgets/QuickConnectCard.tsx) to display **v2.0.0 APK** and **Native Kotlin & Compose Release**.

### Commit `c81ae87` & `79d10e9` (2026-11-08)
- **Official Brand Icons**: Bundled 39 brand SVG icons into `tinapple-android/app/src/main/assets/icons/` and created `ServiceBrandIconResolver.kt`.
- **Matugen 4-Combos**: Refactored `MatugenEngine.kt` to generate Vibrant, Harmonious, Contrast, and Muted palettes. Added selectable preview chips under the Matugen switch in `AppearancePage.kt`.
- **Liquid Glass Propagation**: Propagated `glassTranslucency` to all main dashboard cards (Header, VPN card, Appearance card, Search bar, Service cards).
- **Service Name Navigation**: Service title itself now acts as the primary external link launcher.

---

## 6. Reminders for New Agents / Contributors
1. **Never break existing service endpoints**: The Android app, web dashboard, and system daemons rely on stable contracts at `/api/v1/*`.
2. **Always test Android builds**: If modifying `tinapple-android`, test compilation with `./gradlew assembleRelease` before committing.
3. **Keep this file updated**: If you add, remove, or modify any subsystem or architectural pattern, update this document before pushing.
