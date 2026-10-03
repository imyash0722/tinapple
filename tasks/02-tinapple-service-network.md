# Task: tinapple-service-network

## Status: ✅ Complete

## Goal
Implement network services package: Tailscale, WireGuard, Pi-hole, Unbound

## Files to Create

### 1. `/mnt/shared/projects/tinapple/tinapple-service-network/PKGBUILD`
```bash
# Maintainer: tinapple Project <https://github.com/tinapple/tinapple-arch>
pkgname=tinapple-service-network
pkgver=0.0.1
pkgrel=1
pkgdesc="Network services for tinapple (tailscale, wireguard, pihole, unbound)"
arch=(any)
url="https://github.com/tinapple/tinapple-arch"
license=(MIT)
depends=('tailscale' 'wireguard-tools' 'pihole' 'unbound')
install=tinapple-service-network.install
source=()
sha256sums=()

package() {
  install -dm755 "$pkgdir/usr/share/tinapple-service-network"
}
```

### 2. `/mnt/shared/projects/tinapple/tinapple-service-network/tinapple-service-network.install`
```bash
post_install() {
  systemctl enable tailscaled.service >/dev/null 2>&1 || true
  systemctl enable wg-quick@wg0.service >/dev/null 2>&1 || true
  systemctl enable pihole-FTL.service >/dev/null 2>&1 || true
  systemctl enable unbound.service >/dev/null 2>&1 || true
}

post_upgrade() { post_install; }

pre_remove() {
  systemctl disable tailscaled.service >/dev/null 2>&1 || true
  systemctl disable wg-quick@wg0.service >/dev/null 2>&1 || true
  systemctl disable pihole-FTL.service >/dev/null 2>&1 || true
  systemctl disable unbound.service >/dev/null 2>&1 || true
}
```

### 3. `/mnt/shared/projects/tinapple/tinapple-service-network/systemd/tailscaled.service`
```ini
[Unit]
Description=Tailscale VPN Client
Documentation=https://tailscale.com/kb/
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/bin/tailscaled --state=/var/lib/tailscale/tailscaled.state --socket=/run/tailscale/tailscaled.sock
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

# Security hardening
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only
ProtectControlGroups=yes
ProtectKernelModules=yes
ProtectKernelTunables=yes
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
RestrictNamespaces=yes
LockPersonality=yes
MemoryDenyWriteExecute=yes
SystemCallFilter=@system-service
SystemCallErrorNumber=EPERM
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_RAW CAP_SYS_ADMIN CAP_DAC_OVERRIDE

[Install]
WantedBy=multi-user.target
```

### 4. `/mnt/shared/projects/tinapple/tinapple-service-network/systemd/wg-quick@.service`
```ini
[Unit]
Description=WireGuard via wg-quick(8) for %I
Documentation=man:wg-quick(8) man:wg(8)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/wg-quick up %i
ExecStop=/usr/bin/wg-quick down %i
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 5. `/mnt/shared/projects/tinapple/tinapple-service-network/systemd/pihole-FTL.service`
```ini
[Unit]
Description=Pi-hole FTL DNS Server
Documentation=https://docs.pi-hole.net/
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
User=pihole
Group=pihole
ExecStart=/usr/bin/pihole-FTL
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
```

### 6. `/mnt/shared/projects/tinapple/tinapple-service-network/systemd/unbound.service`
```ini
[Unit]
Description=Unbound DNS Resolver
Documentation=https://www.unbound.net/documentation/
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/bin/unbound -d
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
```

### 7. Config Templates (in `configs/`)

#### `/mnt/shared/projects/tinapple/tinapple-service-network/configs/wireguard/wg0.conf.template`
```text
[Interface]
PrivateKey = {{ .WireGuardPrivateKey }}
Address = {{ .WireGuardAddress }}
ListenPort = {{ .WireGuardPort }}

[Peer]
PublicKey = {{ .WireGuardPeerPublicKey }}
AllowedIPs = {{ .WireGuardPeerAllowedIPs }}
Endpoint = {{ .WireGuardPeerEndpoint }}
```

#### `/mnt/shared/projects/tinapple/tinapple-service-network/configs/unbound/unbound.conf.template`
```text
server:
    interface: 0.0.0.0
    port: 53
    do-ip4: yes
    do-ip6: yes
    do-udp: yes
    do-tcp: yes
    access-control: 0.0.0.0/0 allow
    access-control: ::0/0 allow
    hide-identity: yes
    hide-version: yes
    harden-glue: yes
    harden-dnssec-stripped: yes
    use-caps-for-id: yes
    minimal-responses: yes
    prefetch: yes
    num-threads: 4
    msg-cache-size: 64m
    rrset-cache-size: 128m
    cache-max-ttl: 86400
    cache-min-ttl: 300
```

## Verification
- `makepkg -sf` builds without errors
- All 4 services install and enable correctly
- WireGuard config template renders via `tinapple-config-generator`
- Unbound config template renders correctly