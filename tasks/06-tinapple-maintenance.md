# Task: tinapple-maintenance

## Status: ✅ Complete

## Goal
Implement system health & updates: health-check, update-hook, rollback, pacman hooks

## Files to Create

### 1. `/mnt/shared/projects/tinapple/tinapple-maintenance/bin/tinapple-health-check`
```bash
#!/usr/bin/env bash
# tinapple-health-check — Comprehensive system health verification

set -euo pipefail

LOG_PREFIX="[tinapple-health]"
OK=0
WARN=0
FAIL=0

log_ok() { echo "  ${OK} $*"; ((OK++)); }
log_warn() { echo "  ${WARN} $*"; ((WARN++)); }
log_fail() { echo "  ${FAIL} $*"; ((FAIL++)); }

check_disk_space() {
  local threshold=80
  while read -r line; do
    local usage=$(echo "$line" | awk '{print $5}' | sed 's/%//')
    local mount=$(echo "$line" | awk '{print $6}')
    if (( usage >= threshold )); then
      log_fail "Disk usage ${usage}% on $mount (threshold: ${threshold}%)"
    else
      log_ok "Disk usage ${usage}% on $mount"
    fi
  done < <(df -h / /home /var /mnt 2>/dev/null | tail -n +2)
}

check_smart() {
  for disk in /dev/sd? /dev/nvme?n1; do
    [[ -b "$disk" ]] || continue
    if smartctl -H "$disk" 2>/dev/null | grep -q "PASSED"; then
      log_ok "SMART OK: $disk"
    else
      log_fail "SMART FAILING: $disk"
    fi
  done
}

check_services() {
  local services=(
    "tinapple-nginx"
    "jellyfin"
    "qbittorrent-nox@media"
    "syncthing@media"
    "tailscaled"
    "prometheus"
    "grafana"
    "loki"
    "postgresql"
    "redis"
  )
  for svc in "${services[@]}"; do
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
      log_ok "Service running: $svc"
    elif systemctl list-unit-files | grep -q "^$svc"; then
      log_warn "Service enabled but not running: $svc"
    fi
  done
}

check_certs() {
  local cert_dir="/etc/tinapple/certs"
  [[ -d "$cert_dir" ]] || return
  for cert in "$cert_dir"/*.crt; do
    [[ -f "$cert" ]] || continue
    local expiry=$(openssl x509 -enddate -noout -in "$cert" 2>/dev/null | cut -d= -f2)
    [[ -n "$expiry" ]] || continue
    local expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || echo 0)
    local now_epoch=$(date +%s)
    local days=$(( (expiry_epoch - now_epoch) / 86400 ))
    if (( days < 30 )); then
      log_warn "Certificate expires in $days days: $(basename "$cert")"
    else
      log_ok "Certificate valid for $days days: $(basename "$cert")"
    fi
  done
}

check_updates() {
  local updates=$(checkupdates 2>/dev/null | wc -l)
  local aur_updates=0
  if command -v yay >/dev/null 2>&1; then
    aur_updates=$(yay -Qua 2>/dev/null | wc -l)
  fi
  if (( updates > 0 || aur_updates > 0 )); then
    log_warn "Updates available: $updates official, $aur_updates AUR"
  else
    log_ok "System up to date"
  fi
}

main() {
  echo "=== tinapple Health Check $(date) ==="
  check_disk_space
  check_smart
  check_services
  check_certs
  check_updates
  echo "=== Summary: ${OK} OK, ${WARN} WARN, ${FAIL} FAIL ==="
  (( FAIL > 0 )) && exit 1 || exit 0
}

main "$@"
```

### 2. `/mnt/shared/projects/tinapple/tinapple-maintenance/bin/tinapple-update-hook`
```bash
#!/usr/bin/env bash
# tinapple-update-hook — Pacman transaction hook handler

set -euo pipefail

HOOK_TYPE="${1:-}"  # pre | post
CONFIG_DIR="/etc/tinapple"

pre_transaction() {
  echo "=== Pre-transaction hook ==="
  # Create pre-update snapshot
  if command -v snapper >/dev/null 2>&1 && snapper -c root get-config >/dev/null 2>&1; then
    snapper -c root create --description "pre-update: $(date -Iseconds)" --cleanup-algorithm number
    echo "Created pre-update snapshot"
  fi
  # Backup current manifest
  cp /etc/tinapple/manifest.yaml "/etc/tinapple/manifest.yaml.pre-update.$(date +%s)"
}

post_transaction() {
  echo "=== Post-transaction hook ==="
  # Reload systemd
  systemctl daemon-reload
  # Run config generator to migrate configs
  if command -v tinapple-config-generator >/dev/null 2>&1; then
    tinapple-config-generator generate /etc/tinapple/manifest.yaml /etc/tinapple/generated
    echo "Regenerated configs from manifest"
  fi
  # Restart changed services
  systemctl reload tinapple-nginx 2>/dev/null || true
  systemctl reload prometheus 2>/dev/null || true
  systemctl reload grafana 2>/dev/null || true
  # Create post-update snapshot
  if command -v snapper >/dev/null 2>&1 && snapper -c root get-config >/dev/null 2>&1; then
    snapper -c root create --description "post-update: $(date -Iseconds)" --cleanup-algorithm number
    echo "Created post-update snapshot"
  fi
  # Update limine boot menu
  if command -v limine-mkinitcpio >/dev/null 2>&1; then
    limine-mkinitcpio 2>/dev/null || true
  fi
  if command -v limine-snapper-sync >/dev/null 2>&1; then
    limine-snapper-sync 2>/dev/null || true
  fi
  # Run health check
  /usr/bin/tinapple-health-check 2>&1 | logger -t tinapple-update || true
}

case "$HOOK_TYPE" in
  pre)  pre_transaction ;;
  post) post_transaction ;;
  *)    echo "Usage: $0 {pre|post}"; exit 1 ;;
esac
```

### 3. `/mnt/shared/projects/tinapple/tinapple-maintenance/bin/tinapple-rollback`
```bash
#!/usr/bin/env bash
# tinapple-rollback — Rollback to a snapper snapshot

set -euo pipefail

usage() {
  cat <<EOF
Usage: tinapple-rollback <snapshot-id>
  List snapshots: snapper -c root list
  Rollback:       tinapple-rollback <number>
EOF
  exit 1
}

[[ $# -eq 1 ]] || usage
SNAPSHOT_ID="$1"

# Verify snapshot exists
snapper -c root list | awk -v id="$SNAPSHOT_ID" '$1 == id {found=1} END {exit !found}' || {
  echo "Snapshot $SNAPSHOT_ID not found"
  exit 1
}

echo "Rolling back to snapshot $SNAPSHOT_ID..."
snapper -c root undochange "$SNAPSHOT_ID"..0
snapper -c root create --description "rollback to $SNAPSHOT_ID: $(date -Iseconds)"

# Update bootloader
if command -v limine-snapper-sync >/dev/null 2>&1; then
  limine-snapper-sync
fi

echo "Rollback complete. Reboot to activate."
```

### 4. `/mnt/shared/projects/tinapple/tinapple-maintenance/hooks/90-tinapple-update.hook`
```ini
[Trigger]
Operation = Upgrade
Type = Package
Target = *

[Action]
Description = Pre-update: create snapshot & backup manifest
When = PreTransaction
Exec = /usr/bin/tinapple-update-hook pre
```

### 5. `/mnt/shared/projects/tinapple/tinapple-maintenance/hooks/91-tinapple-update.hook`
```ini
[Trigger]
Operation = Upgrade
Type = Package
Target = *

[Action]
Description = Post-update: regenerate configs, restart services, update bootloader
When = PostTransaction
Exec = /usr/bin/tinapple-update-hook post
```

### 6. PKGBUILD & Install

#### `/mnt/shared/projects/tinapple/tinapple-maintenance/PKGBUILD`
```bash
# Maintainer: tinapple Project <https://github.com/tinapple/tinapple-arch>
pkgname=tinapple-maintenance
pkgver=0.0.1
pkgrel=1
pkgdesc="System health checks, update hooks, and rollback for tinapple"
arch=(any)
url="https://github.com/tinapple/tinapple-arch"
license=(MIT)
depends=('snapper' 'pacman-contrib' 'smartmontools' 'openssl' 'limine')
install=tinapple-maintenance.install
source=(hooks/90-tinapple-update.hook hooks/91-tinapple-update.hook)
sha256sums=('SKIP' 'SKIP')

package() {
  install -Dm755 bin/tinapple-health-check "$pkgdir/usr/bin/tinapple-health-check"
  install -Dm755 bin/tinapple-update-hook "$pkgdir/usr/bin/tinapple-update-hook"
  install -Dm755 bin/tinapple-rollback "$pkgdir/usr/bin/tinapple-rollback"
  install -Dm644 hooks/90-tinapple-update.hook "$pkgdir/usr/share/libalpm/hooks/90-tinapple-update.hook"
  install -Dm644 hooks/91-tinapple-update.hook "$pkgdir/usr/share/libalpm/hooks/91-tinapple-update.hook"
}
```

#### `/mnt/shared/projects/tinapple/tinapple-maintenance/tinapple-maintenance.install`
```bash
post_install() {
  # Ensure snapper configs exist
  if ! snapper -c root get-config >/dev/null 2>&1; then
    snapper -c root create-config / >/dev/null 2>&1 || true
  fi
  if ! snapper -c home get-config >/dev/null 2>&1; then
    snapper -c home create-config /home >/dev/null 2>&1 || true
  fi
}

post_upgrade() { post_install; }
```

## Verification
- `makepkg -sf` builds without errors
- `tinapple-health-check` runs without errors, reports OK/WARN/FAIL
- `tinapple-update-hook pre` creates snapper snapshot, backs up manifest
- `tinapple-update-hook post` regenerates configs, reloads services, updates limine
- `tinapple-rollback <id>` restores snapshot and updates limine
- Pacman hooks trigger correctly on upgrade