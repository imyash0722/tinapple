# tinapple v0.0.1 — Complete Implementation for Antigravity

This document contains ALL code files that need to be created. Antigravity should write every file listed here.

---

## Current State (Already Done)
- `TINAPPLE_ARCHITECTURE.md` - Complete architecture spec
- `tinapple-config-generator/` - Go module (manifest parsing, validation, config generation)
- `tinapple-hw/data/tinapple-hw-db.json` - 40+ device entries
- `tinapple-installer/backend/lib/` - 20 bash modules (common.sh through offline.sh)
- `tinapple-base/` - PKGBUILD, .install, preset, pacman.conf, manifest.yaml, logind.conf.d/tinapple-lid.conf, bin/tinapple-boot-apply
- `tinapple-hw/bin/` - 6 binaries (tinapple-hw-detect, battery, power-profile, thermal, ups-monitor, driver-detect)
- `tinapple-hw/systemd/` - 6 service files

---

## Files for Antigravity to Create

### 1. tinapple-chadwm/ — Window Manager Package

#### 1.1 chadwm/config.def.h (DONE above)
#### 1.2 chadwm/rice patches - create patch list file
#### 1.3 Rices (tokyo-night, catppuccin-mocha, gruvbox, nord) - each with config.def.h
#### 1.4 Companion configs (picom, polybar, rofi, dunst, sxhkd, xinitrc)
#### 1.5 systemd/chadwm@.service
#### 1.6 bin/tinapple-session (Go binary for headless↔interactive toggle)

---

### 2. tinapple-dash/ — Web Dashboard (Go)

#### 2.1 cmd/tinapple-dash/main.go
#### 2.2 internal/api/*.go (REST + WebSocket handlers)
#### 2.3 internal/telemetry/*.go (SSE delta frames)
#### 2.4 internal/services/*.go (systemd control via dbus)
#### 2.5 internal/config/*.go (manifest integration)
#### 2.6 web/templates/*.html
#### 2.7 web/static/*.css, *.js
#### 2.8 go.mod, go.sum

---

### 3. tinapple-nginx/ — Caddy Reverse Proxy Core Module

#### 3.1 PKGBUILD
#### 3.2 tinapple-nginx.install
#### 3.3 tinapple-nginx.service
#### 3.4 Caddyfile template

---

### 4. tinapple-service-* (6 Modular Service Packages)

Each package needs: PKGBUILD, .install, systemd units, config templates

#### 4.1 tinapple-service-media/ (jellyfin, plex, immich, *arr stack)
#### 4.2 tinapple-service-downloads/ (qbittorrent-nox, transmission, jdownloader2, flaresolverr)
#### 4.3 tinapple-service-backups/ (restic, borg, rclone, syncthing, snapraid)
#### 4.4 tinapple-service-network/ (tailscale, wireguard, pihole, unbound)
#### 4.5 tinapple-service-infrastructure/ (prometheus, grafana, loki, tempo, alertmanager)
#### 4.6 tinapple-service-databases/ (postgresql, mariadb, redis, mongodb, influxdb)

---

### 5. tinapple-maintenance/ — Health & Updates

#### 5.1 bin/tinapple-health-check
#### 5.2 bin/tinapple-update-hook
#### 5.3 bin/tinapple-rollback
#### 5.4 hooks/90-tinapple-update.hook (PreTransaction)
#### 5.5 hooks/91-tinapple-update.hook (PostTransaction)

---

### 6. tinapple-firstboot/ — First-Boot Setup

#### 6.1 bin/tinapple-setup (wizard)
#### 6.2 systemd/tinapple-firstboot.service
#### 6.3 Config templates for guided setup

---

### 7. tinapple-repo/ — Repository Infrastructure

#### 7.1 .github/workflows/repo.yml (CI/CD)
#### 7.2 Makefile
#### 7.3 packages/ directory structure
#### 7.4 scripts/build-package.sh, sign-package.sh

---

### 8. tinapple-installer/ — Remaining Components

#### 8.1 tui/ (Go TUI with bubbletea)
#### 8.2 bootstrap/install.sh (curl|bash)
#### 8.3 iso/ (mkarchiso profile)

---

## Execution Instructions for Antigravity

Write ALL files above. Use `cat > file << 'EOF' ... EOF` for each file.
Return consolidated status when complete.