# Task: tinapple-nginx (NGINX Core Reverse Proxy Module)

## Status: ✅ Complete — Configured for pure native NGINX

## Goal
Implement the native NGINX reverse proxy core module with PKGBUILD, install script, and nginx.conf template.

## Files

### 1. `tinapple-nginx/PKGBUILD`
```bash
# Maintainer: tinapple Project <https://github.com/tinapple/tinapple-arch>
pkgname=tinapple-nginx
pkgver=0.0.1
pkgrel=1
pkgdesc="NGINX reverse proxy core module for tinapple"
arch=(any)
url="https://github.com/tinapple/tinapple-arch"
license=(MIT)
depends=('nginx' 'tinapple-config-generator')
install=tinapple-nginx.install
source=(tinapple-nginx.service nginx.conf.template)
sha256sums=('SKIP' 'SKIP')

package() {
  install -Dm644 tinapple-nginx.service "$pkgdir/usr/lib/systemd/system/tinapple-nginx.service"
  install -Dm644 nginx.conf.template "$pkgdir/etc/tinapple/nginx.conf.template"
}
```

### 2. `tinapple-nginx/tinapple-nginx.install`
```bash
post_install() {
  systemctl enable tinapple-nginx.service >/dev/null 2>&1 || true
}

post_upgrade() {
  post_install
}

pre_remove() {
  systemctl disable tinapple-nginx.service >/dev/null 2>&1 || true
}
```

### 3. `tinapple-nginx/nginx.conf.template`
```nginx
# Auto-generated NGINX configuration for tinapple OS
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name _;

        # Main Web Hub Dashboard (tinapple-dash)
        location / {
            proxy_pass http://127.0.0.1:8088;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering off;
            proxy_read_timeout 86400s;
        }

        # Subpath proxies for homelab daemons
        location ^~ /jellyfin/ {
            proxy_pass http://127.0.0.1:8096/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location ^~ /qbittorrent/ {
            proxy_pass http://127.0.0.1:8080/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location ^~ /suwayomi/ {
            proxy_pass http://127.0.0.1:4567/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }

    include /etc/nginx/conf.d/*.conf;
}
```

## Verification
- `makepkg -sf` builds without errors
- `systemctl enable tinapple-nginx.service` works
- `tinapple-config-generator generate /etc/tinapple/manifest.yaml /etc/tinapple/generated` produces valid NGINX configuration
- `nginx -t -c /etc/nginx/nginx.conf` passes

## Current implementation

The source now supersedes the illustrative snippets above. See [native appliance operations](../docs/native-appliance.md) for routing, noninteractive provisioning, recovery prerequisites, and validation commands.
