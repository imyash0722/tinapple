#!/usr/bin/env bash
# network.sh — Network configuration for systemd-networkd, resolved, and NetworkManager
set -eo pipefail

if [[ -f "/usr/lib/tinapple-installer/backend/lib/common.sh" ]]; then
  # shellcheck source=/dev/null
  source "/usr/lib/tinapple-installer/backend/lib/common.sh"
elif [[ -f "/usr/lib/tinapple/lib/common.sh" ]]; then
  # shellcheck source=/dev/null
  source "/usr/lib/tinapple/lib/common.sh"
elif [[ -f "$(dirname "${BASH_SOURCE[0]}")/common.sh" ]]; then
  # shellcheck source=common.sh
  source "$(dirname "${BASH_SOURCE[0]}")/common.sh"
fi

tinapple_configure_network() {
  local target=${1:-/mnt}
  local iface=${TINAPPLE_NET_IFACE:-eth0}
  local dhcp=${TINAPPLE_NET_DHCP:-true}

  step "network"
  log "configuring networking for interface '%s' (dhcp: %s)..." "$iface" "$dhcp"

  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    log_info "DRYRUN: would configure systemd-networkd and NetworkManager on %s" "$target"
    return 0
  fi

  # systemd-networkd configuration
  mkdir -p "$target/etc/systemd/network"
  if [[ "$dhcp" == "true" ]]; then
    cat << EON > "$target/etc/systemd/network/20-wired.network"
[Match]
Name=en* eth*

[Network]
DHCP=yes

[DHCPv4]
RouteMetric=10
EON
  else
    cat << EON > "$target/etc/systemd/network/20-wired.network"
[Match]
Name=$iface

[Network]
Address=${TINAPPLE_NET_STATIC_IP:-192.168.1.100/24}
Gateway=${TINAPPLE_NET_GATEWAY:-192.168.1.1}
DNS=1.1.1.1 9.9.9.9
EON
  fi

  # Enable services
  tinapple_chroot "$target" systemctl enable systemd-networkd systemd-resolved NetworkManager 2>/dev/null || true
  log_ok "networking configuration generated"
}

tinapple_network() {
  tinapple_configure_network "$@"
}
