# tinapple-chadwm-store
A beautiful, tile-based Settings & Store app for chadwm/hyprland desktop environments on tinapple OS.

## Features

### 🏪 Store (App Marketplace)
- **Curated packages** from tinapple-repo and AUR
- **One-click install** with pacman/yay integration
- **Categories**: Media, Development, System, Network, Gaming, Utilities
- **Search & filter** by tags, rating, update status
- **Update notifications** with changelog preview

### ⚙️ Settings Dashboard (Tile-based)
Each config category gets a beautiful tile:

| Tile | Config Files Managed | Description |
|------|---------------------|-------------|
| 🎨 **Theme & Rice** | chadwm/rices/*, polybar, rofi, dunst | Switch between Tokyo Night, Catppuccin, Gruvbox, Nord |
| 🪟 **Window Manager** | chadwm/config.def.h, sxhkd/sxhkdrc | Keybinds, gaps, layouts, rules, mod key |
| 📊 **Bar & Widgets** | polybar/config.ini, scripts/ | Module layout, colors, positions, custom scripts |
| 🔔 **Notifications** | dunst/dunstrc | Position, timeout, actions, app rules |
| 🚀 **Launcher** | rofi/config.rasi, tinapple-actions.sh | Themes, modes, keybinds, custom actions |
| 🌐 **Network** | systemd/network/, ufw/, tailscale/ | Interfaces, firewall, VPN, Tailscale ACLs |
| 💾 **Storage** | fstab, btrfs, zram, rclone, syncthing | Drives, compression, cloud sync, backups |
| 🐳 **Services** | systemd/*.service, docker-compose.yml | Media stack, downloads, databases, infrastructure |
| 🖥️ **System** | sysctl/, modprobe/, cpupower, logind | Kernel tuning, hardware, power, limits |
| 🔐 **Security** | ssh/, ufw/, vaultwarden, tor | Hardening, keys, passwords, anonymity |
| 🎮 **Gaming** | steam, lutris, gamescope, mangohud | Proton, FSR, controllers, overlays |
| 🔧 **Developer** | fish/, nvim/, git/, docker/, node/ | Shell, editor, containers, runtimes |

### 🖥️ Remote Desktop Beyond SSH
- **WayVNC** - Native Wayland VNC server (headless capable)
- **RDP via FreeRDP** - Windows-compatible remote desktop
- **Sunshine + Moonlight** - Game streaming (NVIDIA/AMD/Intel)
- **Web-based** - noVNC, Apache Guacamole, RustDesk Web
- **Tailscale Funnel** - Secure public access without port forwarding
- **KVM over IP** - Hardware-level remote management (PiKVM)

## Architecture

```
tinapple-chadwm-store/
├── bin/
│   ├── chadwm-store          # Main CLI entry point
│   ├── chadwm-store-tui      # Terminal UI (textual)
│   └── chadwm-store-web      # Web UI server
├── lib/
│   ├── store/                # Package management
│   ├── settings/             # Config tile system
│   ├── remote/               # Remote desktop backends
│   └── ui/                   # Shared UI components
├── tiles/
│   ├── theme.py              # Theme/Rice tile
│   ├── wm.py                 # Window Manager tile
│   ├── bar.py                # Bar & Widgets tile
│   ├── notifications.py      # Notifications tile
│   ├── launcher.py           # Launcher tile
│   ├── network.py            # Network tile
│   ├── storage.py            # Storage tile
│   ├── services.py           # Services tile
│   ├── system.py             # System tile
│   ├── security.py           # Security tile
│   ├── gaming.py             # Gaming tile
│   └── developer.py          # Developer tile
├── remote/
│   ├── wayvnc.py             # WayVNC backend
│   ├── freerdp.py            # FreeRDP backend
│   ├── moonlight.py          # Moonlight/Sunshine backend
│   ├── novnc.py              # noVNC backend
│   ├── guacamole.py          # Apache Guacamole backend
│   ├── rustdesk.py           # RustDesk backend
│   └── pikvm.py              # PiKVM backend
├── configs/                  # Default configs for each tile
└── assets/                   # Icons, themes, screenshots
```

## Quick Start

```bash
# Install
cd /mnt/shared/projects/tinapple/tinapple-chadwm-store
sudo make install

# Run TUI
chadwm-store-tui

# Run Web UI (access at http://localhost:8089)
chadwm-store-web

# CLI usage
chadwm-store search firefox
chadwm-store install neovim
chadwm-store tile theme
chadwm-store remote list
chadwm-store remote enable wayvnc
```

## Integration with tinarchy

- Uses existing `tinarchy.services` for service management
- Reads/writes configs from `tinarchy-src/configs/`
- Leverages `tinarchy.config` for paths and environment
- Compatible with `ryoku` tooling for Hyprland
- Works alongside `tinapple-chadwm` package