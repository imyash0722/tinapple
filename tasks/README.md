# Tinapple v0.0.1 — Implementation Tasks

## Overview
These task files define the remaining implementation work for tinapple v0.0.1 (excluding the installer which is handled separately). Each task file contains complete implementation details for one component.

## Task List

| # | Task File | Component | Status | Priority |
|---|-----------|-----------|--------|----------|
| 01 | `01-tinapple-nginx.md` | tinapple-nginx | ✅ Complete | High |
| 02 | `02-tinapple-service-network.md` | tinapple-service-network | ✅ Complete | High |
| 03 | `03-tinapple-service-infrastructure.md` | tinapple-service-infrastructure | ✅ Complete | High |
| 04 | `04-tinapple-service-databases.md` | tinapple-service-databases | ✅ Complete | High |
| 05 | `05-tinapple-service-backups.md` | tinapple-service-backups | ✅ Complete | Medium |
| 06 | `06-tinapple-maintenance.md` | tinapple-maintenance | ✅ Complete | High |
| 07 | `07-tinapple-firstboot.md` | tinapple-firstboot | ✅ Complete | High |
| 08 | `08-tinapple-repo.md` | tinapple-repo | ✅ Complete | High |
| 09 | `09-tinapple-service-backups-complete.md` | tinapple-service-backups (completion) | ✅ Complete | Medium |
| 10 | `10-tinapple-installer-tui.md` | tinapple-installer (TUI) | ✅ Complete | High |
| 11 | `11-tinapple-installer-bootstrap.md` | tinapple-installer (Bootstrap) | ✅ Complete | High |
| 12 | `12-tinapple-installer-iso.md` | tinapple-installer (ISO) | ✅ Complete | High |
| A-N | `A` through `N` | Installation, Boot, Rebranding, Drivers | ✅ Complete | High |
| O | `O-chadwm-default.md` | Chadwm Default Window Manager | ✅ Complete | High |
| Q | `Q-tmux-config.md` | tmux Customization & Preinstalled Apps | ✅ Complete | High |
| R1 | `R1-chaddy-store-core.md` | Chaddy Store Core (CLI & TUI) | ✅ Complete | High |
| R2 | `R2-config-manager.md` | Config Manager & Templates | ✅ Complete | High |
| R3 | `R3-settings-tui.md` | Settings TUI Hub | ✅ Complete | High |
| R4 | `R4-remote-desktop.md` | Remote Desktop Module (xrdp + VNC) | ✅ Complete | High |
| R5 | `R5-installer-integration.md` | Installer Integration | ✅ Complete | High |

## Usage

```bash
# For each task, give the markdown file to Gemini:
gemini -p "$(cat tasks/01-tinapple-nginx.md)"

# After Gemini implements, verify:
cd /mnt/shared/projects/tinapple
makepkg -sf  # in the component directory
make test
```

## Component Dependencies

```
tinapple-repo (depends on all packages)
    ├── tinapple-base (done)
    ├── tinapple-hw (done)
    ├── tinapple-config-generator (done)
    ├── tinapple-dash (done)
    ├── tinapple-nginx (task 01)
    ├── tinapple-firstboot (task 07)
    ├── tinapple-maintenance (task 06)
    ├── tinapple-chadwm (done)
    ├── tinapple-service-media (done)
    ├── tinapple-service-downloads (done)
    ├── tinapple-service-backups (task 09)
    ├── tinapple-service-network (task 02)
    ├── tinapple-service-infrastructure (task 03)
    ├── tinapple-service-databases (task 04)
    └── tinapple-chadwm (done)
```

## Execution Order

1. **High Priority** (core services): 01, 02, 03, 04, 06, 07
2. **Medium Priority** (backup completion): 09
3. **High Priority** (repo/CI): 08

## Verification Checklist per Task

- [x] `makepkg -sf` builds without errors
- [x] `make test` passes (if applicable)
- [x] Systemd units enable/start correctly
- [x] Config templates render via `tinapple-config-generator`
- [x] Services start and respond on expected ports