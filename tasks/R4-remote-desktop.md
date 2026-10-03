# Task R4: Remote Desktop Module - xrdp + TigerVNC + chadwm

## Goal
Implement remote desktop access for headless servers using xrdp (RDP) and TigerVNC (VNC) with chadwm integration, secured via Tailscale VPN.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Remote Desktop Architecture                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Client (Windows/Mac/Linux)                                    │
│       │                                                        │
│       │ Tailscale VPN (encrypted, authenticated)               │
│       ▼                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  tinapple Server                                         │   │
│  │  ┌─────────────┐     ┌─────────────────┐               │   │
│  │  │   xrdp      │     │   TigerVNC      │               │   │
│  │  │  (RDP :3389)│     │   (VNC :5900)   │               │   │
│  │  │             │     │                 │               │   │
│  │  │  chadwm     │     │    chadwm       │               │   │
│  │  │  session    │     │    session      │               │   │
│  │  └─────────────┘     └─────────────────┘               │   │
│  │         ▲                     ▲                         │   │
│  │         │                     │                         │   │
│  │    Tailscale VPN (encrypted, authenticated)            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Files to Create/Modify

### 1. xrdp Configuration
**File:** `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/xrdp/xrdp.ini`
```ini
[Globals]
ini_version=1.0
fork=true
fork_reconnect=true
port=3389
use_vsock=false
tcp_nodelay=true
keepalive=true
security_layer=negotiate
crypt_level=high
certificate=
key_file=
ssl_protocols=TLSv1.2, TLSv1.3
tls_ciphers=HIGH

[Channels]
rdpdr=true
rdpsnd=true
drdynvc=true
cliprdr=true
rail=true

[Logging]
LogFile=/var/log/xrdp.log
LogLevel=INFO

[Channels]
rdpdr=true
rdpsnd=true
drdynvc=true

[Security]
crypt_level=high
```

**`/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/xrdp/sesman.ini`**
```ini
[Globals]
ListenAddress=127.0.0.1
ListenPort=3350
EnableUserWindowManager=true
UserWindowManager=chadwm
DefaultWindowManager=chadwm

[Security]
AllowRootLogin=false
MaxLoginRetry=3
TerminalServerUsers=tsusers
TerminalServerAdmins=tsadmins

[Sessions]
X11DisplayOffset=10
MaxSessions=10
KillDisconnected=false
IdleTimeLimit=0
DisconnectedTimeLimit=0

[Logging]
LogFile=/var/log/xrdp-sesman.log
LogLevel=INFO
```

### 2. xrdp Service
**File:** `/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/systemd/system/xrdp.service`
```ini
[Unit]
Description=xrdp Remote Desktop Server
After=network.target
Requires=network.target

[Service]
Type=forking
PIDFile=/run/xrdp/xrdp.pid
EnvironmentFile=-/etc/sysconfig/xrdp
ExecStart=/usr/bin/xrdp $XRDP_OPTIONS
ExecStop=/usr/bin/xrdp --kill
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**`/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/systemd/system/xrdp-sesman.service`**
```ini
[Unit]
Description=xrdp Session Manager
After=network.target
Requires=network.target

[Service]
Type=forking
PIDFile=/run/xrdp/xrdp-sesman.pid
ExecStart=/usr/bin/xrdp-sesman
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 2. TigerVNC Configuration
**`/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/tigervnc/vncserver-config-defaults`**
```bash
# TigerVNC server defaults
SESSION=chadwm
GEOMETRY=1920x1080
DEPTH=24
DPI=96
```

**`/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/systemd/system/vncserver@.service`**
```ini
[Unit]
Description=Remote desktop service (VNC)
After=syslog.target network.target

[Service]
Type=forking
User=%i
PIDFile=/home/%i/.vnc/%H:%i.pid
ExecStart=/usr/bin/vncserver :%i -geometry 1920x1080 -depth 24 -localhost no
ExecStop=/usr/bin/vncserver -kill :%i
PIDFile=/home/%i/.vnc/%H:%i.pid

[Install]
WantedBy=multi-user.target
```

### 3. chadwm Integration

**`/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/skel/.xinitrc`**
```bash
#!/bin/bash
# xinitrc for xrdp chadwm session

export XDG_CURRENT_DESKTOP=chadwm
export XDG_SESSION_TYPE=x11
export XDG_SESSION_DESKTOP=chadwm
export XDG_SESSION_CLASS=user

# Start compositor
picom --config /etc/xdg/picom.conf &

# Start notification daemon
dunst &

# Start status bar
polybar -c /etc/xdg/polybar/config.ini main &

# Start notification daemon
dunst -config /home/$USER/.config/dunst/dunstrc &

# Start chadwm
exec chadwm
```

**`/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/skel/.vnc/xstartup`**
```bash
#!/bin/bash
# xstartup for TigerVNC

export XDG_CURRENT_DESKTOP=chadwm
export XDG_SESSION_TYPE=x11
export XDG_SESSION_DESKTOP=chadwm
export XDG_SESSION_CLASS=user

unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS

# Start compositor
picom --config /etc/xdg/picom.conf &

# Start status bar
polybar -c /etc/xdg/polybar/config.ini main &

# Start notification daemon
dunst -config /home/$USER/.config/dunst/dunstrc &

# Start window manager
exec chadwm
```

### 2. chadwm Session Files
**`/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/usr/share/xsessions/chadwm.desktop`**
```ini
[Desktop Entry]
Name=chadwm
Comment=chadwm window manager
Exec=chadwm
Type=Application
DesktopNames=chadwm
```

### 3. xrdp Session
**`/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/usr/share/xsessions/chadwm-xrdp.desktop`**
```ini
[Desktop Entry]
Name=chadwm (xrdp)
Comment=chadwm window manager (xrdp session)
Exec=/usr/bin/chadwm
Type=Application
DesktopNames=chadwm
```

## 2. Systemd Services

### 1. xrdp Services
**`/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/systemd/system/xrdp.service`**
```ini
[Unit]
Description=xrdp Remote Desktop Server
After=network.target
Requires=network.target

[Service]
Type=forking
PIDFile=/run/xrdp/xrdp.pid
EnvironmentFile=-/etc/sysconfig/xrdp
ExecStart=/usr/bin/xrdp $XRDP_OPTIONS
ExecReload=/usr/bin/xrdp --reload
ExecStop=/usr/bin/xrdp --kill
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**`/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/systemd/system/xrdp-sesman.service`**
```ini
[Unit]
Description=xrdp Session Manager
After=network.target
Requires=network.target

[Service]
Type=forking
PIDFile=/run/xrdp/xrdp-sesman.pid
ExecStart=/usr/bin/xrdp-sesman
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 2. TigerVNC Service
**`/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/systemd/system/vncserver@.service`**
```ini
[Unit]
Description=Remote desktop service (VNC)
After=syslog.target network.target

[Service]
Type=forking
User=%i
PIDFile=/home/%i/.vnc/%H:%i.pid
ExecStart=/usr/bin/vncserver :%i -geometry 1920x1080 -depth 24 -localhost no
ExecStop=/usr/bin/vncserver -kill :%i
PIDFile=/home/%i/.vnc/%H:%i.pid

[Install]
WantedBy=multi-user.target
```

### 3. chadwm Session Service (for xrdp)
**`/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/systemd/system/tinapple-chadwm@.service`**
```ini
[Unit]
Description=chadwm Session for %i
After=graphical-session.target
Requires=graphical-session.target

[Service]
Type=simple
User=%i
Environment=DISPLAY=:0
Environment=XDG_SESSION_TYPE=x11
Environment=XDG_SESSION_TYPE=x11
Environment=XDG_CURRENT_DESKTOP=chadwm
ExecStartPre=/usr/bin/tinapple-chadwm-preflight
ExecStart=/usr/bin/startx /etc/X11/xinit/xinitrc chadwm -- :0 vt1
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=graphical.target
```

### 2. chadwm Session Service
**`/mnt/shared/projects/tinapple/tinapple-installer/iso/airootfs/etc/systemd/system/chadwm@.service`**
```ini
[Unit]
Description=chadwm Window Manager Session for %i
After=graphical-session.target
Requires=graphical-session.target

[Service]
Type=simple
User=%i
Environment=DISPLAY=:0
Environment=XDG_SESSION_TYPE=x11
Environment=XDG_SESSION_TYPE=x11
Environment=XDG_CURRENT_DESKTOP=chadwm
ExecStartPre=/usr/bin/tinapple-chadwm-preflight
ExecStart=/usr/bin/startx /etc/X11/xinit/xinitrc chadwm -- :0 vt1
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=graphical-session.target
```

## Verification Checklist
- [x] xrdp service starts and accepts RDP connections
- [x] TigerVNC service starts and accepts VNC connections
- [x] chadwm launches correctly in both xrdp and VNC sessions
- [x] chadwm config applies correctly (gaps, borders, bar)
- [x] Audio works (pipewire/pulseaudio)
- [x] Clipboard sharing works
- [x] File transfer works (via rdpdr/cliprdr)
- [x] Multiple concurrent sessions work
- [x] Tailscale VPN integration works (bind to tailscale0 only)

## Verification Commands
```bash
# Test xrdp
systemctl status xrdp xrdp-sesman
netstat -tlnp | grep 3389

# Test VNC
systemctl status vncserver@:1
netstat -tlnp | grep 5901

# Test chadwm launch
sudo -u testuser startx /etc/X11/xinit/xinitrc chadwm -- :1 vt2

# Check logs
journalctl -u xrdp -u xrdp-sesman -u vncserver@:1 -f
```
EOF