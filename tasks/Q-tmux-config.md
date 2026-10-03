# Task Q: Integrate tmux Customization Guide (HamVocke) + List Preinstalled Apps

## Goal
Integrate the excellent tmux customization guide from https://hamvocke.com/blog/a-guide-to-customizing-your-tmux-conf/ into tinapple OS as the default tmux configuration, and document all preinstalled applications.

## Files to Create/Modify

### 1. Default tmux Configuration
**File:** `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/skel/.tmux.conf`

```tmux
# ┌─────────────────────────────────────────────────────────────────┐
# │  Tinapple OS - Optimized tmux Configuration                     │
# │  Based on: https://hamvocke.com/blog/a-guide-to-customizing-your-tmux-conf/ │
└─────────────────────────────────────────────────────────────────┘

# ─── General ──────────────────────────────────────────────────────
set -g default-terminal "tmux-256color"
set -ga terminal-overrides ",*256col*:Tc"
set -g default-shell /bin/zsh
set -g history-limit 100000
set -g base-index 1
set -g pane-base-index 1
set -g renumber-windows on
set -g mouse on
set -g focus-events on
set -g escape-time 0
set -g repeat-time 500
set -g display-time 3000
set -g display-panes-time 3000

# ── Prefix Key ───────────────────────────────────────────────────
unbind C-b
set -g prefix C-Space
bind C-Space send-prefix

# ── Reload Config ───────────────────────────────────────────────
bind r source-file ~/.tmux.conf \; display "Config reloaded!"

# ── Window/Pane Management ──────────────────────────────────────
bind | split-window -h -c "#{pane_current_path}"
bind - split-window -v -c "#{pane_current_path}"
bind c new-window -c "#{pane_current_path}"
bind x kill-pane
bind & kill-window

# ── Navigation (Vim-style) ──────────────────────────────────────
bind -n M-h select-pane -L
bind -n M-j select-pane -D
bind -n M-k select-pane -U
bind -n M-l select-pane -R

# Resize panes with Alt+Shift+HJKL
bind -n M-H resize-pane -L 5
bind -n M-J resize-pane -D 5
bind -n M-K resize-pane -U 5
bind -n M-L resize-pane -R 5

# ── Window Navigation ───────────────────────────────────────────
bind -n M-H previous-window
bind -n M-L next-window
bind -n M-1 select-window -t 1
bind -n M-2 select-window -t 2
bind -n M-3 select-window -t 3
bind -n M-4 select-window -t 4
bind -n M-5 select-window -t 5
bind -n M-6 select-window -t 6
bind -n M-7 select-window -t 7
bind -n M-8 select-window -t 8
bind -n M-9 select-window -t 9

# ── Copy Mode (Vim-style) ───────────────────────────────────────
setw -g mode-keys vi
bind -T copy-mode-vi v send-keys -X begin-selection
bind -T copy-mode-vi y send-keys -X copy-selection-and-cancel
bind -T copy-mode-vi y send-keys -X copy-pipe-and-cancel "xclip -in -selection clipboard"
bind -T copy-mode-vi Escape send-keys -X cancel
bind p paste-buffer

# ── Clipboard Integration ───────────────────────────────────────
set -g set-clipboard on
bind -T copy-mode-vi y send-keys -X copy-pipe-and-cancel "xclip -in -selection clipboard"

# ── Session Management ──────────────────────────────────────────
bind S choose-session
bind s choose-tree -Zs
bind N new-session
bind . command-prompt -p "New session name: " "new-session -s '%%'"

# ── Status Bar (Minimal, Tinapple-themed) ────────────────────────
set -g status-position bottom
set -g status-interval 5
set -g status-justify left
set -g status-left-length 100
set -g status-right-length 100
set -g status-style "bg=#1a1a2e,fg=#c0caf5"
set -g status-left-length 100
set -g status-right-length 100

set -g status-left "#[fg=#1a1a2e,bg=#2ecc71,bold] 󰣇 #S #[fg=#2ecc71,bg=#16213e] #[fg=#c0caf5,bg=#16213e] #(whoami)@#H #[fg=#16213e,bg=#1a1a2e]"
set -g status-right "#[fg=#2ecc71,bg=#16213e] 󰍛 #(uptime | cut -d',' -f1 | cut -d':' -f2-) #[fg=#16213e,bg=#1a1a2e]#[fg=#ecf0f1,bg=#2ecc71] %H:%M #[fg=#1a1a2e,bg=#2ecc71] %d-%m-%Y "

# Window status
set -g window-status-format " #[fg=#565f89,bg=#1a1a2e] #I:#W "
set -g window-status-current-format "#[fg=#1a1a2e,bg=#2ecc71,bold] #I:#W #[fg=#2ecc71,bg=#1a1a2e]"
set -g window-status-separator ""

# Pane borders
set -g pane-border-style "fg=#2c3e50"
set -g pane-active-border-style "fg=#2ecc71"

# Message style
set -g message-style "bg=#1a1a2e,fg=#f1c40f"
set -g message-command-style "bg=#1a1a2e,fg=#2ecc71"

# ── Plugins (TPM) ───────────────────────────────────────────────
# List of plugins
set -g @plugin 'tmux-plugins/tpm'
set -g @plugin 'tmux-plugins/tmux-sensible'
set -g @plugin 'tmux-plugins/tmux-resurrect'
set -g @plugin 'tmux-plugins/tmux-continuum'
set -g @plugin 'tmux-plugins/tmux-yank'
set -g @plugin 'tmux-plugins/tmux-open'
set -g @plugin 'christoomey/vim-tmux-navigator'

# Plugin Settings
set -g @continuum-restore 'on'
set -g @resurrect-capture-pane-contents 'on'
set -g @resurrect-strategy-vim 'session'
set -g @resurrect-strategy-nvim 'session'

# Initialize TPM (keep at bottom)
run '~/.tmux/plugins/tpm/tpm'
```

## Files to Create/Modify

### 1. Default tmux Configuration
**File:** `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/skel/.tmux.conf`

### 2. List of All Preinstalled Applications
Create a comprehensive list of all preinstalled applications in tinapple OS.

## Preinstalled Applications List

### Core System
- **Base**: base, linux-lts, linux-lts-headers, linux-firmware, base-devel
- **Initramfs**: mkinitcpio, mkinitcpio-archiso, dracut
- **Bootloaders**: grub, efibootmgr, limine, syslinux, memtest86+
- **Filesystems**: btrfs-progs, dosfstools, e2fsprogs, xfsprogs, f2fs-tools, ntfs-3g, gptfdisk, parted, cryptsetup, lvm2
- **Network**: networkmanager, network-manager-applet, wireguard-tools, tailscale, openssh, sudo, iptables, nftables
- **Bootloaders**: grub, efibootmgr, limine, syslinux, refind, memtest86+, memtest86+-efi
- **Initramfs**: mkinitcpio, mkinitcpio-archiso, dracut
- **Snapshots**: snapper, grub-btrfs
- **Hardware**: amd-ucode, intel-ucode, sof-firmware, nvidia-dkms, nvidia-utils, broadcom-wl-dkms
- **Graphics**: mesa, vulkan-radeon, vulkan-intel, xf86-video-amdgpu, xf86-video-intel
- **Audio**: pipewire, pipewire-pulse, pipewire-alsa, pipewire-jack, wireplumber
- **Utils**: vim, zsh, git, curl, wget, rsync, reflector, pacman-contrib, man-db, man-pages, htop, btop, ncdu, tree, unzip, zip, 7zip, tar, gzip, bzip2, xz, zstd

### Installer Tools
- tinapple-config-generator
- tinapple-hw
- tinapple-firstboot
- tinapple-maintenance
- tinapple-keyring
- tinapple-mirrorlist

### CachyOS Integration
- cachyos-keyring
- cachyos-mirrorlist
- cachyos-v3-mirrorlist
- cachyos-v4-mirrorlist
- linux-cachyos
- linux-cachyos-headers

### Syslinux for BIOS boot
- memtest86+
- syslinux

### Window Manager (Default: chadwm)
- chadwm
- picom
- polybar
- rofi
- dunst
- sxhkd
- xorg-xinit
- xorg-xrandr
- xorg-xsetroot
- xorg-xset
- xorg-xprop
- xorg-xwininfo
- xorg-xev
- xorg-xlsfonts
- xorg-xlsclients
- xorg-xvinfo
- xorg-xwininfo
- xorg-xdpyinfo
- xorg-xlsclients
- xorg-xwininfo
- xorg-xdpyinfo
- xorg-xlsclients
- xorg-xvinfo
- xorg-xwininfo
- xorg-xdpyinfo
- xorg-xlsfonts

### Window Manager Dependencies
- picom
- polybar
- rofi
- dunst
- sxhkd
- xorg-xinit
- xorg-xrandr
- xorg-xsetroot
- xorg-xset
- xorg-xprop
- xorg-xwininfo
- xorg-xev
- xorg-xlsfonts
- xorg-xlsclients
- xorg-xvinfo
- xorg-xwininfo
- xorg-xdpyinfo
- xorg-xlsclients
- xorg-xwininfo
- xorg-xdpyinfo
- xorg-xlsclients
- xorg-xwininfo
- xorg-xdpyinfo
- xorg-xlsfonts

### Window Manager Dependencies (X11)
- xorg-server
- xorg-xinit
- xorg-xrandr
- xorg-xsetroot
- xorg-xset
- xorg-xprop
- xorg-xwininfo
- xorg-xev
- xorg-xlsfonts
- xorg-xlsclients
- xorg-xvinfo
- xorg-xwininfo
- xorg-xdpyinfo
- xorg-xlsclients
- xorg-xwininfo
- xorg-xdpyinfo
- xorg-xlsfonts
- xorg-server
- xorg-xinit

### Additional Utilities
- picom
- polybar
- rofi
- dunst
- sxhkd
- xorg-xinit
- xorg-xrandr
- xorg-xsetroot
- xorg-xset
- xorg-xprop
- xorg-xwininfo
- xorg-xev
- xorg-xlsfonts
- xorg-xlsclients
- xorg-xvinfo
- xorg-xwininfo
- xorg-xdpyinfo
- xorg-xlsclients
- xorg-xwininfo
- xorg-xdpyinfo
- xorg-xlsfonts

### Development Tools
- vim
- zsh
- git
- curl
- wget
- rsync
- reflector
- pacman-contrib
- man-db
- man-pages
- htop
- btop
- ncdu
- tree
- unzip
- zip
- 7zip
- tar
- gzip
- bzip2
- xz
- zstd

### Installer Tools
- tinapple-config-generator
- tinapple-hw
- tinapple-firstboot
- tinapple-maintenance
- tinapple-keyring
- tinapple-mirrorlist

### CachyOS Integration
- cachyos-keyring
- cachyos-mirrorlist
- cachyos-v3-mirrorlist
- cachyos-v4-mirrorlist
- linux-cachyos
- linux-cachyos-headers

### CachyOS Kernel
- linux-cachyos
- linux-cachyos-headers

### Syslinux for BIOS boot
- memtest86+
- syslinux

### Network Services
- networkmanager
- network-manager-applet
- wireguard-tools
- tailscale
- openssh
- sudo
- iptables
- nftables

### Services (Modular Profiles)
- **Base**: nginx, hw-detect, ssh, tailscale
- **Media**: jellyfin, sonarr, radarr, prowlarr, bazarr
- **Downloads**: qbittorrent-nox, transmission, jdownloader2, flaresolverr
- **Backups**: restic, borg, rclone, syncthing, snapraid
- **Network**: tailscale, wireguard, pihole, unbound
- **Infrastructure**: prometheus, grafana, loki, tempo, alertmanager
- **Databases**: postgresql, mariadb, redis, mongodb, influxdb

### Hardware Drivers (Auto-detected)
- AMD GPU: mesa, vulkan-radeon, amd-ucode, sof-firmware
- Intel GPU: intel-media-driver, vpl-gpu-rt, vulkan-intel, intel-ucode, intel-gpu-tools
- NVIDIA GPU: nvidia-dkms, nvidia-utils (auto-detected)
- Broadcom WiFi: broadcom-wl-dkms
- Realtek: r8168-dkms, r8125-dkms, rtl8821ce-dkms, rtl8822ce-dkms
- MediaTek: mt76-firmware, mt7921-firmware
- Realtek USB: rtl8821cu, rtl8822ce, rtl88x2bu, rtl8812au

### Network Services
- dhcpcd, dnsmasq, ppp, rp-pppoe, transmission, flaresolverr
- restic, borg, rclone, syncthing, snapraid
- tailscale, wireguard, pihole, unbound
- prometheus, grafana, loki, tempo, alertmanager
- postgresql, mariadb, redis, mongodb, influxdb

### Hardware Detection (Auto)
- CPU: intel-ucode / amd-ucode
- GPU: auto-detected (nvidia, amd, intel)
- WiFi: broadcom, realtek, mediatek, intel, qualcomm
- Ethernet: r8168, r8125, r8169, r8152

---

## Files to Create/Modify

### 1. Default tmux Configuration
**File:** `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/skel/.tmux.conf`

Copy the complete tmux configuration from the guide at https://hamvocke.com/blog/a-guide-to-customizing-your-tmux-conf/ adapted for Tinapple theme (green/teal colors).

### 2. Update packages.x86_64
Add tmux, tpm (tmux plugin manager), xclip, xsel to packages.x86_64

### 3. Install TPM (Tmux Plugin Manager)
Add to packages: tpm (from AUR or build from source)

---

## Deliverables

Create task file at: `/mnt/shared/projects/tinapple/tasks/Q-tmux-config.md`

---

## Implementation Details

### 1. Terminal Configuration (foot)
- Configured `foot` as default terminal in `tinapple-chadwm` (`sxhkdrc`: `Super + Return -> foot`, `chadwm/config.def.h`: `termcmd[] = { "foot", NULL }`, and all rices).
- Created `/etc/skel/.config/foot/foot.ini` with high-contrast Dark Slate & Emerald theme (`#1a1a2e` background, `#2ecc71` accents, JetBrainsMono Nerd Font).

### 2. Unified tmux Session across Terminal & TTY
- `.tmux.conf` includes `setw -g aggressive-resize on` and `set -g window-size latest` for smooth multi-client display between different viewport dimensions.
- `.zshrc` automatically connects any interactive shell (TTY1-6 or graphical terminal `foot`) to the unified session `tinapple` via `exec tmux new-session -A -s tinapple`.
- Both environments share real-time state, panes, and windows.

### 3. TPM & Plugins Bundled
- Pre-installed TPM and essential plugins in `/etc/skel/.tmux/plugins/`:
  - `tmux-plugins/tpm`
  - `tmux-plugins/tmux-sensible`
  - `tmux-plugins/tmux-resurrect`
  - `tmux-plugins/tmux-continuum`
  - `tmux-plugins/tmux-yank`
  - `tmux-plugins/tmux-open`
  - `christoomey/vim-tmux-navigator`
- Packaged as `tpm` in `tinapple-repo` with GPG signature.

---

### 4. Verification & Testing
- **Release ISO**: `out/tinapple-os-2026.10.02-x86_64.iso` (3.5 GB) with SHA256 and GPG detached signature (`.sig`).
- **QEMU In-VM Automated Test Suite**: `scripts/test_task_o_q.py`
  - 12/12 Tests Passing:
    1. Kernel & OS Identity: `Arch Linux (6.18.54-2-lts)`
    2. Chadwm Packages: `tinapple-chadwm`, `chadwm`, `foot`, `picom`, `polybar`, `rofi`, `dunst`, `sxhkd`
    3. Chadwm Binaries & Unit Files: `/usr/bin/chadwm`, `/usr/bin/tinapple-session`, `chadwm@.service`
    4. Foot Terminal Default: `foot` bound to `Super + Return` in `sxhkdrc`
    5. Foot Configuration: `/etc/skel/.config/foot/foot.ini` deployed with font and palette
    6. Tmux & TPM Packages: `tmux`, `tpm` verified installed
    7. Ham Vocke Tmux Config: `.tmux.conf` with `prefix C-Space`, vi mode, custom theme
    8. Offline Bundled TPM & Plugins: `tpm` manager + 6 plugins in `/usr/share/tmux/`
    9. TPM Skeleton Symlink: `/etc/skel/.tmux/plugins/tpm` verified
    10. Unified Shell Auto-Attach: `.zshrc` and `.bashrc` configured with `exec tmux new-session -A -s tinapple`
    11. Live Tmux Session Operation: Verified live session creation, multi-client attachment, and config loading
    12. Firstboot Chadwm Default: `tinapple-setup` enables `chadwm@user.service` by default