#!/usr/bin/env bash
# Build from source before mkarchiso; do not depend on stale packaged binaries.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OVERLAY="$ROOT/tinapple-installer/iso/airootfs"
(cd "$ROOT/tinapple-hub" && npm run build)
mkdir -p "$ROOT/tinapple-dash/web/dist" "$OVERLAY/usr/local/bin" "$OVERLAY/usr/share/tinapple-dash/web/dist"
rsync -a --delete --exclude /wallpapers "$ROOT/tinapple-hub/dist/" "$ROOT/tinapple-dash/web/dist/"
rsync -a --delete "$ROOT/tinapple-hub/dist/" "$OVERLAY/usr/share/tinapple-dash/web/dist/"
(cd "$ROOT/tinapple-dash" && CGO_ENABLED=0 go build -v -o bin/tinapple-dash ./cmd/tinapple-dash)
(cd "$ROOT/tinapple-installer/tui" && CGO_ENABLED=0 go build -o tinapple-installer .)
(cd "$ROOT/chaddy-store" && CGO_ENABLED=0 go build -o bin/chaddy-store ./cmd/chaddy-store && CGO_ENABLED=0 go build -o bin/chaddy-settings ./cmd/chaddy-settings)
install -m755 "$ROOT/tinapple-dash/bin/tinapple-dash" "$OVERLAY/usr/local/bin/tinapple-dash"
install -m755 "$ROOT/tinapple-installer/tui/tinapple-installer" "$OVERLAY/usr/local/bin/tinapple-tui"
install -m755 "$ROOT/tinapple-installer/tui/tinapple-installer" "$OVERLAY/usr/local/bin/tinapple-install"
install -m755 "$ROOT/chaddy-store/bin/chaddy-store" "$OVERLAY/usr/local/bin/chaddy-store"
install -m755 "$ROOT/chaddy-store/bin/chaddy-settings" "$OVERLAY/usr/local/bin/chaddy-settings"
mkdir -p "$OVERLAY/etc/tinapple" "$OVERLAY/usr/share/tinapple/templates"
install -m644 "$ROOT/chaddy-store/config.yaml" "$OVERLAY/etc/tinapple/chaddy-store.yaml"
rsync -a --delete "$ROOT/chaddy-store/templates/" "$OVERLAY/usr/share/tinapple/templates/"
mkdir -p "$OVERLAY/usr/lib/tinapple-installer/backend"
rsync -a --delete "$ROOT/tinapple-installer/backend/" "$OVERLAY/usr/lib/tinapple-installer/backend/"
echo 'Live binaries, Hub, wallpapers and backend staged.'
