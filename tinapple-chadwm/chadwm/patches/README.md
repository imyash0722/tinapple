# chadwm Patches

This directory contains the patches applied to `chadwm` for the `tinapple-chadwm` distribution.

## Patch Manifest

| # | Patch | Purpose | Key Configurations |
|---|-------|---------|-------------------|
| 1 | `systray` | System tray notification icon support | `showsystray`, `systrayspacing`, `systrayiconsize`, `systraypinning` |
| 2 | `pertag` | Per-tag tracking of layouts, mfacts, nmaster | Workspace isolation of layout states |
| 3 | `swallow` | Terminal swallowing of spawned GUI clients | `Rule` entries: `isterminal`, `noswallow` |
| 4 | `actualfullscreen` | Native toggleable fullscreen mode | `togglefullscr(const Arg *arg)` bound to `Super + f` |
| 5 | `vanitygaps` | Outer & inner window gap management | `gappih`, `gappiv`, `gappoh`, `gappov`, `smartgaps` |

## Application

When building from clean dwm source:

```bash
for patch in $(cat series); do
    patch -p1 < "$patch"
done
```
