# Task I: Complete Rebrand from Ryoku to Tinapple (Rebranded, Not "Ryoku Style")

## Goal
Complete rebrand from "Ryoku" to "Tinapple" - same source code, just:
1. All "ryoku" → "tinapple" in strings, variables, function names
2. All "Ryoku" → "Tinapple" in UI strings
3. All variable prefixes: `RYOKU_` → `TINAPPLE_`, `ryoku_` → `tinapple_`
4. Keep ALL functionality - just rebranded
5. Ensure legacy hardware support (BIOS/GRUB) works properly (already in bootloader-install.sh)

---

## Files to Modify

### 1. TUI - `/mnt/shared/projects/tinapple/tinapple-installer/tui/main.go`

**Color Palette - Change Ryoku colors to Tinapple (Green/Teal):**
```go
// Replace all Ryoku* color constants with Tinapple*
TinappleGreen       = "#2ecc71"
TinappleGreenDim    = "#27ae60"
TinappleTeal        = "#1abc9c"
TinappleBg          = "#1a1a2e"
TinappleBgAlt       = "#16213e"
TinappleBgFloat     = "#0f3460"
TinappleFg          = "#ecf0f1"
TinappleFgMuted     = "#bdc3c7"
TinappleSuccess     = "#2ecc71"
TinappleWarning     = "#f39c12"
TinappleDanger      = "#e74c3c"
TinappleInfo        = "#3498db"
TinappleGold        = "#f1c40f"
TinappleBorder      = "#2c3e50"
TinappleBorderFocus = "#2ecc71"
```

**Replace all Ryoku* references:**
- `RyokuBlue` → `TinappleGreen`
- `RyokuBlueDim` → `TinappleGreenDim`
- `RyokuBg` → `TinappleBg`
- `RyokuBgAlt` → `TinappleBgAlt`
- `RyokuBgFloat` → `TinappleBgFloat`
- `RyokuFg` → `TinappleFg`
- `RyokuFgMuted` → `TinappleFgMuted`
- `RyokuFgDim` → `TinappleFgMuted` (or add TinappleFgDim)
- `RyokuSuccess` → `TinappleSuccess`
- `RyokuWarning` → `TinappleWarning`
- `RyokuDanger` → `TinappleDanger`
- `RyokuInfo` → `TinappleInfo`
- `RyokuPurple` → (remove or map to TinappleTeal)
- `RyokuOrange` → `TinappleGold`
- `RyokuBorder` → `TinappleBorder`
- `RyokuBorderFocus` → `TinappleBorderFocus`
- `RyokuBg` → `TinappleBg`
- `RyokuBgAlt` → `TinappleBgAlt`
- `RyokuBgFloat` → `TinappleBgFloat`
- `RyokuFg` → `TinappleFg`
- `RyokuFgMuted` → `TinappleFgMuted`
- `RyokuFgDim` → `TinappleFgMuted` (or add TinappleFgDim)
- `RyokuSuccess` → `TinappleSuccess`
- `RyokuWarning` → `TinappleWarning`
- `RyokuDanger` → `TinappleDanger`
- `RyokuInfo` → `TinappleInfo`
- `RyokuPurple` → (remove or map to TinappleTeal)
- `RyokuOrange` → `TinappleGold`
- `RyokuBorder` → `TinappleBorder`
- `RyokuBorderFocus` → `TinappleBorderFocus`

**String replacements:**
- "Ryoku" → "Tinapple" in all UI strings
- "Ryoku Installer" → "Tinapple Installer"
- "Ryoku Edition" → "Tinapple Edition"
- "ryoku" → "tinapple" in variable names
- `ryokuLogo` → `tinappleLogo`
- `ryokuBanner` → `tinappleBanner`
- `ryokuLogo` const → `tinappleLogo`
- `ryokuBanner` const → `tinappleBanner`

### 2. Test File: `/mnt/shared/projects/tinapple/tinapple-installer/tui/main_test.go`
- Update test assertions to check for "Tinapple" instead of "Ryoku"
- Update test function names: `TestRyokuTheming` → `TestTinappleTheming`

### 3. Backend Scripts - All `.sh` files in `/mnt/shared/projects/tinapple/tinapple-installer/backend/lib/`

**Environment variable prefixes:**
- `RYOKU_` → `TINAPPLE_`
- `ryoku_` → `tinapple_`

**Specific replacements:**
- `RYOKU_DRYRUN` → `TINAPPLE_DRYRUN`
- `RYOKU_REPO` → `TINAPPLE_REPO`
- `RYOKU_OFFLINE_CHROOT_CONF` → `TINAPPLE_OFFLINE_CHROOT_CONF`
- `RYOKU_PACMAN_CONF` → `TINAPPLE_PACMAN_CONF`
- `RYOKU_USERNAME` → `TINAPPLE_USERNAME`
- `RYOKU_COMPOSITOR` → `TINAPPLE_COMPOSITOR`
- `RYOKU_COMPOSITOR_CONFIG_DIR` → `TINAPPLE_COMPOSITOR_CONFIG_DIR`
- `RYOKU_MODULES_DIR` → `TINAPPLE_MODULES_DIR`
- `RYOKU_PACMAN_CONF` → `TINAPPLE_PACMAN_CONF`
- `RYOKU_OFFLINE_CHROOT_CONF` → `TINAPPLE_OFFLINE_CHROOT_CONF`
- `RYOKU_GPU_MODE` → `TINAPPLE_GPU_MODE`

**Function names:**
- `ryoku_drivers` → `tinapple_drivers`
- `ryoku_gpu_mode` → `tinapple_gpu_mode`
- `ryoku_gpu_mode` → `tinapple_gpu_mode`
- `ryoku_clamshell` → `tinapple_clamshell` (in hw scripts)
- `ryoku_power` → `tinapple_power`
- `ryoku_idle` → `tinapple_idle`
- `ryoku_hw_laptop` → `tinapple_hw_laptop`

**Script names:**
- `ryoku-driver-*.sh` → `tinapple-driver-*.sh`
- `ryoku-shell-install` → `tinapple-shell-install`
- `ryoku-shell-installer` → `tinapple-shell-installer`
- `ryoku-shell-install` → `tinapple-shell-install`

### 4. Config Generator (already done but verify)
`/mnt/shared/projects/tinapple/tinapple-config-generator/main.go` - check for any "ryoku" references

### 5. Hardware Detection Scripts
`/mnt/shared/projects/tinapple/tinapple-hw/bin/` - rename `ryoku-*` to `tinapple-*`

### 5. Systemd Services & Configs
- `ryoku-*.service` → `tinapple-*.service`
- `ryoku-*.conf` → `tinapple-*.conf`
- `ryoku-*.conf` → `tinapple-*.conf`

### 6. Systemd Service Files
- `ryoku-install.service` → `tinapple-install.service`
- `ryoku-firstboot.service` → `tinapple-firstboot.service`
- `ryoku-clamshell-daemon.service` → `tinapple-clamshell-daemon.service`
- etc.

### 6. Installer Scripts
- `ryoku-install` binary → `tinapple-install`
- `ryoku-bootstrap` → `tinapple-bootstrap`
- `ryoku-setup` → `tinapple-setup`

---

## Verification Checklist

After rebranding, verify:
- [x] No "ryoku" or "Ryoku" strings remain in source (except in comments referencing original)
- [x] All `RYOKU_` env vars → `TINAPPLE_`
- [x] All `ryoku_` functions/vars → `tinapple_`
- [x] All "Ryoku" UI strings → "Tinapple"
- [x] All `ryoku_` script names → `tinapple_`
- [x] Binary names: `ryoku-*` → `tinapple-*`
- [x] Service files: `ryoku-*.service` → `tinapple-*.service`
- [x] Config files: `ryoku-*.conf` → `tinapple-*.conf`
- [x] Binary names: `ryoku-*` → `tinapple-*`
- [x] Binary output: "Ryoku Installer" → "Tinapple Installer"
- [x] "Ryoku Edition" → "Tinapple Edition"
- [x] "Ryoku Installer" → "Tinapple Installer"
- [x] Color palette changed to Tinapple green/teal
- [x] Tests pass: `make test`
- [x] Build succeeds: `make build`

---

## Run Command

```bash
agy --dangerously-skip-permissions -p "$(cat /mnt/shared/projects/tinapple/tasks/J-complete-rebrand-ryoku-to-tinapple.md)"
```