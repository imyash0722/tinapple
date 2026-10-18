#!/usr/bin/env bash
# deploy.sh — Deploy tinapple configuration files, presets, and profile templates
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
else
  echo "Error: common.sh not found" >&2
  exit 1
fi

tinapple_deploy() {
  local target=${1:-/mnt}
  local manifest=${2:-$target/etc/tinapple/manifest.yaml}
  [[ -f "$manifest" ]] || manifest="/etc/tinapple/manifest.yaml"
  local gen_dir="$target/etc/tinapple/generated"

  step "deploy"
  log "deploying tinapple system configurations and presets to %s..." "$target"

  # Find tinapple-config-generator binary
  local cfg_gen=""
  for bin_path in \
    /usr/bin/tinapple-config-generator \
    /usr/local/bin/tinapple-config-generator \
    "$target/usr/bin/tinapple-config-generator" \
    /mnt/shared/projects/tinapple/tinapple-config-generator/bin/tinapple-config-generator \
    "$(dirname "${BASH_SOURCE[0]}")/../../../../tinapple-config-generator/bin/tinapple-config-generator"; do
    if [[ -x "$bin_path" ]]; then
      cfg_gen="$bin_path"
      break
    fi
  done

  # 1. Generate configs from manifest using tinapple-config-generator
  log_info "generating configs from manifest via tinapple-config-generator..."
  if [[ -n "$cfg_gen" ]]; then
    run "$cfg_gen" generate "$manifest" "$gen_dir"
  else
    run_sh "tinapple-config-generator generate $manifest $gen_dir"
  fi

  # 2. Deploy Caddyfile from manifest services
  log_info "generating Caddyfile from manifest services..."
  run_sh "mkdir -p $target/etc/caddy $target/etc/tinapple && cat << 'EOC' > $target/etc/caddy/Caddyfile
# Auto-generated Caddyfile for tinapple OS
{
    admin off
    auto_https disable_redirects
}

:8088 {
    reverse_proxy localhost:8088
}

jellyfin.local {
    reverse_proxy localhost:8096
}

qbittorrent.local {
    reverse_proxy localhost:8080
}
EOC
cp $target/etc/caddy/Caddyfile $target/etc/tinapple/Caddyfile 2>/dev/null || true"

  # 3. Generate systemd drop-ins for service overrides
  log_info "generating systemd drop-ins for service overrides..."
  run_sh "mkdir -p $target/etc/systemd/system/qbittorrent.service.d && cat << 'EOS' > $target/etc/systemd/system/qbittorrent.service.d/override.conf
[Service]
User=media
Group=media
EOS"

  run_sh "mkdir -p $target/etc/systemd/system/jellyfin.service.d && cat << 'EOS' > $target/etc/systemd/system/jellyfin.service.d/override.conf
[Service]
Environment=JELLYFIN_PublishedServerUrl=https://jellyfin.local
EOS"

  # 4. Generate network configuration (systemd-networkd)
  log_info "generating network configuration (systemd-networkd)..."
  run_sh "mkdir -p $target/etc/systemd/network && cat << 'EON' > $target/etc/systemd/network/20-wired.network
[Match]
Name=en* eth*

[Network]
DHCP=yes
IPv6PrivacyExtensions=true
EON"

  # 5. Deploy systemd logind lid policy
  log_info "deploying systemd logind lid policy..."
  run_sh "mkdir -p $target/etc/systemd/logind.conf.d && cat << 'EOL' > $target/etc/systemd/logind.conf.d/tinapple-lid.conf
[Login]
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
LidSwitchIgnoreInhibited=yes
EOL"

  # 6. Deploy systemd presets
  log_info "deploying systemd system presets..."
  run_sh "mkdir -p $target/usr/lib/systemd/system-preset && cat << 'EOP' > $target/usr/lib/systemd/system-preset/90-tinapple.preset
enable tinapple-hw-detect.service
enable tinapple-power-profile-apply.service
enable tinapple-battery-daemon.service
enable tinapple-thermal-daemon.service
enable tinapple-firstboot.service
enable systemd-resolved.service
enable systemd-networkd.service
enable NetworkManager.service
enable fstrim.timer
enable tinapple-nginx.service
EOP"

  # 7. Deploy to target system (/mnt/etc/, /mnt/usr/share/tinapple/)
  log_info "deploying configurations to /etc/ and /usr/share/tinapple/..."
  run_sh "mkdir -p $target/usr/share/tinapple && cp -r $target/etc/tinapple/* $target/usr/share/tinapple/ 2>/dev/null || true"

  # 8. Deploy Tinapple appliance approved applications, wrappers, and configs
  log_info "deploying Tinapple appliance approved applications and scripts to %s..." "$target"
  run_sh "mkdir -p $target/usr/bin $target/usr/local/bin $target/etc/skel $target/etc/systemd/system $target/usr/share/backgrounds"
  for f in /usr/bin/niri /usr/bin/waybar /usr/bin/fuzzel /usr/bin/foot /usr/bin/btop /usr/local/bin/omarchy-* /usr/local/bin/wttrbar /usr/bin/dwl /usr/local/bin/dwl /usr/bin/ironbar /usr/local/bin/ironbar /usr/local/bin/qdirstat /usr/local/bin/tinapple-* /usr/bin/tinapple-*; do
    if [[ -f "$f" ]]; then
      run_sh "cp -f '$f' '$target/usr/bin/' 2>/dev/null || true; cp -f '$f' '$target/usr/local/bin/' 2>/dev/null || true; chmod 755 '$target/usr/bin/$(basename \"$f\")' '$target/usr/local/bin/$(basename \"$f\")' 2>/dev/null || true"
    fi
  done
  run_sh "mkdir -p $target/etc/skel/.config/niri $target/etc/skel/.config/waybar $target/etc/skel/.config/matugen"
  if [[ -d /home/pineapple/.config/niri ]]; then
    run_sh "cp -rf /home/pineapple/.config/niri/. $target/etc/skel/.config/niri/ 2>/dev/null || true"
  fi
  if [[ -d /home/pineapple/.config/waybar ]]; then
    run_sh "cp -rf /home/pineapple/.config/waybar/. $target/etc/skel/.config/waybar/ 2>/dev/null || true"
  fi
  if [[ -d /home/pineapple/.config/matugen ]]; then
    run_sh "cp -rf /home/pineapple/.config/matugen/. $target/etc/skel/.config/matugen/ 2>/dev/null || true"
  fi
  if [[ -f /usr/share/backgrounds/wallpaper.png ]]; then
    run_sh "cp -f /usr/share/backgrounds/wallpaper.png $target/usr/share/backgrounds/ 2>/dev/null || true"
  fi
  for unit in tinapple-truenas-backup.service tinapple-truenas-backup.timer; do
    if [[ -f "/etc/systemd/system/$unit" ]]; then
      run_sh "cp -f '/etc/systemd/system/$unit' '$target/etc/systemd/system/$unit' 2>/dev/null || true; arch-chroot '$target' systemctl enable '$unit' 2>/dev/null || true"
    fi
  run_sh "mkdir -p $target/var/lib/tinapple && touch $target/var/lib/tinapple/firstboot-done $target/var/lib/tinapple/installed"
  run_sh "arch-chroot '$target' systemctl disable tinapple-install.service tinapple-firstboot.service 2>/dev/null || true"
  run_sh "rm -f $target/etc/systemd/system/graphical.target.wants/tinapple-install.service $target/etc/systemd/system/multi-user.target.wants/tinapple-install.service $target/etc/systemd/system/multi-user.target.wants/tinapple-firstboot.service 2>/dev/null || true"

  # Export output variables for next stage
  export TINAPPLE_DEPLOYED="true"
  export TINAPPLE_STAGE="deploy"

  done_step "deploy"
  log_ok "configs and presets deployed successfully"
  return 0
}

tinapple_deploy_configs() {
  tinapple_deploy "$@"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  tinapple_deploy "$@"
fi
