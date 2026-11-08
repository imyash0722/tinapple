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
| [`tinapple-android/`](file:///home/tinapple/tinapple/tinapple-android/) | **Kotlin 2.0.21, Jetpack Compose, Material 3, OkHttp, Coil, AGP 8.7.2** | **Pure Native Android Companion App** (`org.tinapple.hub`, v2.0.0). Built from the ground up to replace the legacy Capacitor hybrid app. Contains direct service cards (links + toggles), Proton VPN exit node gateway switch, and a dedicated Appearance Page. |
| [`tinapple-hub/`](file:///home/tinapple/tinapple/tinapple-hub/) | **React 18, Vite 6, TypeScript, Tailwind CSS, Lucide, Framer Motion** | Main web frontend and desktop UI bundle. Features infinite draggable Homarr 2D canvas, settings manifest, full PTY web terminal, and guide docs. Deployed to `/usr/share/tinapple-dash/web/dist/`. |
| [`tinapple-dash/`](file:///home/tinapple/tinapple/tinapple-dash/) | **Go (Gin), systemd integration, polkit, SSE streams** | Core appliance backend daemon listening on port `:8088`. Serves REST APIs (`/api/v1/services`, `/api/v1/system/proton-exit`, `/api/v1/wallpapers`), static dashboard files, and `/download/apk` releases. |
| [`tinapple-service-*/`](file:///home/tinapple/tinapple/) | **Systemd units, Arch Linux PKGBUILDs, Bash/Python daemons** | Modular service orchestration: `tinapple-service-media` (Jellyfin, Sonarr, Radarr, qBittorrent), `tinapple-service-downloads`, `tinapple-service-infrastructure`, and `tinapple-service-backups`. |
| [`scripts/`](file:///home/tinapple/tinapple/scripts/) | **Bash, Python 3** | Automation scripts including [`build-desktop-releases.sh`](file:///home/tinapple/tinapple/scripts/build-desktop-releases.sh) (multiplatform packager), [`stage-live-artifacts.sh`](file:///home/tinapple/tinapple/scripts/stage-live-artifacts.sh), and [`torrent-healer.py`](file:///home/tinapple/tinapple/scripts/torrent-healer.py). |
| [`out/releases/`](file:///home/tinapple/tinapple/out/releases/) | **APK, AppImage, DMG, EXE, ZIP, IPA, SHA256SUMS** | Output directory for all compiled client artifacts and cryptographic signatures. |

---

## 3. Server Environment & Hardware Context

- **Node Hostname**: `tinapple-server` (or `appliance-node`)
- **OS**: Arch Linux x86_64
- **Local Network IP**: `192.168.1.103`
- **Tailscale Tailnet IP**: `100.67.207.60` (`pineapple-server.taildb42a2.ts.net`)
- **Active Web Dashboard Port**: `:8088` (Reverse-proxied via Nginx)
- **Connected ADB Target**: Google Pixel 10a at `100.111.180.87:5555`
- **Android SDK Path**: `/opt/android-sdk` (build-tools `35.0.0`, platforms `android-35`)
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
- The server routes outbound traffic through Proton VPN WireGuard (`/etc/wireguard/proton.conf` / `wg-quick@proton`).
- Controlled via `/api/v1/system/proton-exit` on the backend daemon.
- WireGuard `PostUp` includes `100.64.0.0/10` routing rules to ensure local LAN and Tailscale connectivity remain fully unblocked while VPN is active.

---

## 5. Changelog & Active State Ledger

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
