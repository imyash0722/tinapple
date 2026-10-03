# Task O: Make chadwm Default Window Manager

## Goal
Make chadwm the **default window manager** (not optional) in the tinapple installer. Currently chadwm is optional/optional in profile selection - make it enabled by default in the "base" profile.

## Required Changes

### 1. Update Profile Selection in TUI (main.go)
**File:** `/mnt/shared/projects/tinapple/tinapple-installer/tui/main.go`

**Changes:**
1. In `initialModel()` - Add "chadwm" to default selected profiles
2. In `stepProfile` rendering - Ensure chadwm is pre-selected in base profile
3. In `selectedProfilesList()` - Ensure chadwm is included by default

### 2. Update Profile Selection Logic
**File:** `/mnt/shared/projects/tinapple/tinapple-installer/tui/main.go`

Find the `stepProfile` rendering logic and ensure chadwm is pre-selected in the base profile.

### 3. Update Manifest Default
In `generateManifest()` or `initialModel()`, ensure chadwm is included in default profiles.

### 3. Update Package Selection
**File:** `/mnt/shared/projects/tinapple/tinapple-installer/iso/packages.x86_64`

Ensure chadwm and its dependencies are in the base profile packages:
```
# Window Manager (DEFAULT)
chadwm
picom
polybar
rofi
dunst
sxhkd
xorg-xinit
xorg-xrandr
xorg-xsetroot
xorg-xset
xorg-xprop
xorg-xwininfo
xorg-xdpyinfo
xorg-xev
xorg-xlsfonts
xorg-xlsclients
xorg-xvinfo
xorg-xwininfo
xorg-xdpyinfo
xorg-xwininfo
xorg-xprop
xorg-xrandr
xorg-xrdb
xorg-xset
xorg-xsetroot
xorg-xvinfo
xorg-xlsclients
xorg-xlsfonts
xorg-xwininfo
```

### 2. Update Profile Configuration
**File:** `/mnt/shared/projects/tinapple/tinapple-installer/iso/packages.x86_64`

Add chadwm and dependencies to base profile section.

### 3. Update Profile Selection UI
**File:** `/mnt/shared/projects/tinapple/tinapple-installer/tui/main.go`

In the profile selection step, ensure chadwm is pre-selected by default in base profile.

### 3. Update Manifest Default
In `generateManifest()` or `initialModel()`, ensure chadwm is included in default profiles.

### 4. Update Firstboot Setup
Ensure firstboot enables chadwm service by default.

## Verification
- [x] chadwm appears in base profile by default
- [x] chadwm packages installed by default
- [x] chadwm service enabled by default
- [x] ISO builds and boots with chadwm

## Commands to Run After Implementation
```bash
cd /mnt/shared/projects/tinapple && make test && make build
cd /mnt/shared/projects/tinapple/tinapple-installer/iso && sudo ./build.sh
qemu-system-x86_64 -cdrom out/tinapple-os-*.iso -m 2G -enable-kvm -cpu host
```