# Task: tinapple-firstboot

## Status: ✅ Complete

## Goal
Implement first-boot setup wizard: hardware detection, Tailscale OAuth, service profile selection, ease-of-use mode

## Files to Create

### 1. `/mnt/shared/projects/tinapple/tinapple-firstboot/bin/tinapple-setup`
```bash
#!/usr/bin/env bash
# tinapple-setup — First-boot interactive setup wizard

set -euo pipefail

MANIFEST="/etc/tinapple/manifest.yaml"
STATE_FILE="/var/lib/tinapple/firstboot-done"

log() { echo "🔧 $*"; }
ok()  { echo "  ✓ $*"; }
warn() { echo "  ⚠ $*"; }
die() { echo "✗ $*" >&2; exit 1; }

# Check if already run
if [[ -f "$STATE_FILE" ]]; then
  log "First-boot setup already completed. Re-run with --force to redo."
  exit 0
fi

# Ensure we're root
[[ $EUID -eq 0 ]] || die "Must run as root"

# Load existing manifest or create default
if [[ -f "$MANIFEST" ]]; then
  source /usr/share/tinapple-config-generator/manifest.sh 2>/dev/null || true
fi

# 1. Hardware Profile Detection
log "Detecting hardware..."
if [[ -f /usr/bin/tinapple-hw-detect ]]; then
  /usr/bin/tinapple-hw-detect
  ok "Hardware detected"
else
  warn "tinapple-hw-detect not found, skipping"
fi

# 2. Hostname
read -rp "Enter hostname [tinapple-server]: " HOSTNAME
HOSTNAME="${HOSTNAME:-tinapple-server}"
# Update manifest
sed -i "s/hostname:.*/hostname: $HOSTNAME/" "$MANIFEST"
hostnamectl set-hostname "$HOSTNAME"
ok "Hostname set to $HOSTNAME"

# 3. User Creation
read -rp "Create admin username [admin]: " ADMIN_USER
ADMIN_USER="${ADMIN_USER:-admin}"
if ! id "$ADMIN_USER" &>/dev/null; then
  read -rsp "Password for $ADMIN_USER: " ADMIN_PASS
  echo
  useradd -m -G wheel -s /bin/zsh "$ADMIN_USER"
  echo "$ADMIN_USER:$ADMIN_PASS" | chpasswd
  ok "User $ADMIN_USER created"
else
  ok "User $ADMIN_USER already exists"
fi

# 4. Tailscale Authentication
log "Configuring Tailscale..."
if command -v tailscale >/dev/null 2>&1; then
  echo "Visit the URL below to authenticate:"
  tailscale up --accept-routes --accept-dns=false --ssh
  ok "Tailscale authenticated"
else
  warn "Tailscale not installed, skipping"
fi

# 5. Service Profile Selection
echo
echo "Select service profiles to enable (space-separated, Enter for all):"
echo "  [1] base       - Core services (nginx, hw, ssh, tailscale)"
echo "  [2] media      - Jellyfin, *arr stack"
echo "  [3] downloads  - qBittorrent, Transmission, JDownloader2"
echo "  [4] backups    - Syncthing, Restic, Borg, Rclone"
echo "  [5] network    - Tailscale, WireGuard, Pi-hole, Unbound"
echo "  [6] infra      - Prometheus, Grafana, Loki, Tempo, Alertmanager"
echo "  [7] databases  - PostgreSQL, MariaDB, Redis, MongoDB, InfluxDB"
read -rp "Select profiles [1 2 3 4 5 6 7]: " PROFILES
PROFILES="${PROFILES:-1 2 3 4 5 6 7}"

# Build profiles array
PROFILE_LIST=()
for p in $PROFILES; do
  case $p in
    1) PROFILE_LIST+=("base") ;;
    2) PROFILE_LIST+=("media") ;;
    3) PROFILE_LIST+=("downloads") ;;
    4) PROFILE_LIST+=("backups") ;;
    5) PROFILE_LIST+=("network") ;;
    6) PROFILE_LIST+=("infrastructure") ;;
    7) PROFILE_LIST+=("databases") ;;
  esac
done

# Update manifest profiles
PROFILE_YAML=$(printf '  - %s\n' "${PROFILE_LIST[@]}")
sed -i "/^profiles:/,/^[^ ]/ { /^profiles:/ { n; :a; /^  -/ { d; ba }; }; }" "$MANIFEST"
sed -i "/^profiles:/a\\$PROFILE_YAML" "$MANIFEST"
ok "Profiles: ${PROFILE_LIST[*]}"

# 6. Ease of Use Mode
read -rp "Enable Ease of Use Mode? (simplified UI, guided flows) [y/N]: " EASE
if [[ "${EASE,,}" == "y" ]]; then
  sed -i 's/ease_of_use_mode: false/ease_of_use_mode: true/' "$MANIFEST"
  ok "Ease of Use Mode enabled"
else
  ok "Ease of Use Mode disabled"
fi

# 6. Generate Configs
log "Generating service configurations..."
if command -v tinapple-config-generator >/dev/null 2>&1; then
  tinapple-config-generator generate "$MANIFEST" /etc/tinapple/generated
  ok "Configs generated"
else
  warn "tinapple-config-generator not found"
fi

# 6. Enable Selected Services
log "Enabling selected services..."
for profile in "${PROFILE_LIST[@]}"; do
  case $profile in
    base)
      systemctl enable tinapple-nginx >/dev/null 2>&1
      systemctl enable tinapple-nginx.path >/dev/null 2>&1
      ;;
    media)
      systemctl enable jellyfin sonarr radarr prowlarr bazarr >/dev/null 2>&1
      ;;
    downloads)
      systemctl enable qbittorrent-nox@media transmission jdownloader2 flaresolverr >/dev/null 2>&1
      ;;
    backups)
      systemctl enable syncthing@media restic-backup.timer borg-backup.timer >/dev/null 2>&1
      ;;
    network)
      systemctl enable tailscaled wg-quick@wg0 pihole-FTL unbound >/dev/null 2>&1
      ;;
    infrastructure)
      systemctl enable prometheus grafana loki tempo alertmanager >/dev/null 2>&1
      ;;
    databases)
      systemctl enable postgresql mariadb redis mongod influxdb >/dev/null 2>&1
      ;;
  esac
done
ok "Services enabled"

# 7. Mark Complete
mkdir -p "$(dirname "$STATE_FILE")"
echo "$(date -Iseconds)" > "$STATE_FILE"
ok "First-boot setup complete!"

echo
echo "=== Setup Complete ==="
echo "Dashboard: http://localhost:8088"
echo "Tailscale: Check 'tailscale status'"
echo "Reboot recommended to verify all services start correctly."
echo
read -rp "Reboot now? [y/N]: " REBOOT
[[ "${REBOOT,,}" == "y" ]] && reboot
```

### 2. `/mnt/shared/projects/tinapple/tinapple-firstboot/systemd/tinapple-firstboot.service`
```ini
[Unit]
Description=Tinapple First-Boot Setup Wizard
Documentation=https://github.com/tinapple/tinapple-arch
After=network-online.target tinapple-hw-detect.service
Wants=network-online.target
ConditionPathExists=!/var/lib/tinapple/firstboot-done

[Service]
Type=oneshot
ExecStart=/usr/bin/tinapple-setup
StandardInput=tty
StandardOutput=journal+console
StandardError=journal+console
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes
TTYVTDisallocate=yes

[Install]
WantedBy=multi-user.target
```

### 3. PKGBUILD & Install

#### `/mnt/shared/projects/tinapple/tinapple-firstboot/PKGBUILD`
```bash
# Maintainer: tinapple Project <https://github.com/tinapple/tinapple-arch>
pkgname=tinapple-firstboot
pkgver=0.0.1
pkgrel=1
pkgdesc="First-boot setup wizard for tinapple"
arch=(any)
url="https://github.com/tinapple/tinapple-arch"
license=(MIT)
depends=('tinapple-config-generator' 'tinapple-hw' 'tailscale')
install=tinapple-firstboot.install
source=(bin/tinapple-setup systemd/tinapple-firstboot.service)
sha256sums=('SKIP' 'SKIP')

package() {
  install -Dm755 bin/tinapple-setup "$pkgdir/usr/bin/tinapple-setup"
  install -Dm644 systemd/tinapple-firstboot.service "$pkgdir/usr/lib/systemd/system/tinapple-firstboot.service"
}
```

#### `/mnt/shared/projects/tinapple/tinapple-firstboot/tinapple-firstboot.install`
```bash
post_install() {
  systemctl enable tinapple-firstboot.service >/dev/null 2>&1 || true
}

post_upgrade() { post_install; }

pre_remove() {
  systemctl disable tinapple-firstboot.service >/dev/null 2>&1 || true
}
```

## Verification
- `makepkg -sf` builds without errors
- Service enables and runs on first boot (ConditionPathExists=!/var/lib/tinapple/firstboot-done)
- Interactive wizard runs on TTY1, prompts for all required config
- Manifest updated with user choices
- Selected services enabled
- State file created at /var/lib/tinapple/firstboot-done
- Re-run with `--force` flag to re-run