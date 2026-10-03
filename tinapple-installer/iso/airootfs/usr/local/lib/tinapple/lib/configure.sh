#!/usr/bin/env bash
# configure.sh — Configure target system: fstab, hostname, locale, users, sudo, services, mkinitcpio, and manifest.yaml
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

tinapple_configure() {
  local target=${1:-/mnt}
  local hostname=${TINAPPLE_HOSTNAME:-tinapple-server}
  local username=${TINAPPLE_USERNAME:-tinapple}
  local password=${TINAPPLE_PASSWORD:-tinapple}
  local root_password=${TINAPPLE_ROOT_PASSWORD:-$password}
  local locale=${TINAPPLE_LOCALE:-en_US.UTF-8}
  local bootloader=${TINAPPLE_BOOTLOADER:-${TINAPPLE_RECOMMENDED_BOOTLOADER:-grub}}
  local profiles_csv=${TINAPPLE_PROFILES:-base}

  step "configure"
  log "configuring target system (%s)..." "$hostname"

  # 1. Generate /etc/fstab with UUIDs
  log_info "generating fstab..."
  run_sh "mkdir -p $target/etc && genfstab -U $target >> $target/etc/fstab"

  # 2. Hostname & Hosts
  log_info "setting hostname: %s..." "$hostname"
  run_sh "echo '$hostname' > $target/etc/hostname"
  run_sh "cat << 'EOH' > $target/etc/hosts
127.0.0.1   localhost
::1         localhost
127.0.1.1   $hostname.localdomain $hostname
EOH"

  # 3. Locale
  log_info "setting locale: %s..." "$locale"
  run_sh "echo '$locale UTF-8' > $target/etc/locale.gen"
  run arch-chroot "$target" locale-gen
  run_sh "echo 'LANG=$locale' > $target/etc/locale.conf"

  # 4. Sudoers: %wheel ALL=(ALL) NOPASSWD: ALL
  log_info "configuring sudo permissions for wheel group..."
  run_sh "mkdir -p $target/etc/sudoers.d && echo '%wheel ALL=(ALL) NOPASSWD: ALL' > $target/etc/sudoers.d/10-wheel && chmod 440 $target/etc/sudoers.d/10-wheel"

  # 5. User Creation & Passwords
  log_info "creating user '%s' and configuring passwords..." "$username"
  run_sh "arch-chroot $target id '$username' >/dev/null 2>&1 || arch-chroot $target useradd -m -g users -G wheel,video,audio,storage,input -s /bin/zsh '$username'"
  run_sh "echo '$username:$password' | arch-chroot $target chpasswd"
  run_sh "echo 'root:$root_password' | arch-chroot $target chpasswd"

  # Deploy default dotfiles (.tmux.conf, .zshrc, foot.ini, TPM plugins)
  log_info "deploying default tmux, foot, and zsh configurations..."
  if [[ -f "/etc/skel/.tmux.conf" ]]; then
    run_sh "mkdir -p $target/etc/skel $target/home/$username $target/root"
    run_sh "cp -rf /etc/skel/. $target/etc/skel/ 2>/dev/null || true"
    run_sh "cp -rf /etc/skel/. $target/home/$username/ 2>/dev/null || true"
    run_sh "cp -rf /etc/skel/. $target/root/ 2>/dev/null || true"
    run_sh "arch-chroot $target chown -R $username:users /home/$username 2>/dev/null || true"
  fi

  # 6. Enable Systemd Services
  local -a services=(
    systemd-resolved
    systemd-networkd
    NetworkManager
    sshd
    tinapple-hw-detect
    tinapple-battery-daemon
    tinapple-thermal-daemon
    tinapple-power-profile-apply
    chadwm@"$username"
  )

  # Configure SSH on target
  run_sh "mkdir -p $target/etc/ssh/sshd_config.d && echo 'PermitRootLogin yes' > $target/etc/ssh/sshd_config.d/00-tinapple-root.conf"
  if [[ -f /root/.ssh/authorized_keys ]]; then
    run_sh "mkdir -p $target/root/.ssh $target/home/$username/.ssh && cp -f /root/.ssh/authorized_keys $target/root/.ssh/authorized_keys && cp -f /root/.ssh/authorized_keys $target/home/$username/.ssh/authorized_keys && chmod 700 $target/root/.ssh $target/home/$username/.ssh && chmod 600 $target/root/.ssh/authorized_keys $target/home/$username/.ssh/authorized_keys && arch-chroot $target chown -R $username:users /home/$username/.ssh 2>/dev/null || true"
  fi

  # Add profile-specific services
  IFS=',' read -ra prof_array <<< "$profiles_csv"
  for raw_prof in "${prof_array[@]}"; do
    local prof
    prof=$(echo "$raw_prof" | tr -d '[:space:]')
    case "$prof" in
      base|chadwm)
        services+=(chadwm@"$username")
        ;;
      media)
        services+=(jellyfin)
        ;;
      downloads)
        services+=(qbittorrent-nox@"$username")
        ;;
      backups)
        services+=(syncthing@"$username")
        ;;
      network)
        services+=(tailscaled unbound)
        ;;
      infrastructure|infra)
        services+=(prometheus grafana prometheus-node-exporter)
        ;;
      databases)
        services+=(postgresql mariadb redis)
        ;;
    esac
  done

  log_info "enabling systemd services: %s..." "${services[*]}"
  for s in "${services[@]}"; do
    run_sh "arch-chroot $target systemctl enable '$s' 2>/dev/null || true"
  done

  # 7. Configure mkinitcpio
  log_info "configuring mkinitcpio..."
  run_sh "mkdir -p $target/etc && echo 'KEYMAP=us' > $target/etc/vconsole.conf"
  local mkinit_hooks="base udev autodetect microcode modconf kms keyboard keymap consolefont block"
  if [[ -n "${TINAPPLE_LUKS:-}" && "${TINAPPLE_LUKS}" != "no" ]]; then
    mkinit_hooks="$mkinit_hooks encrypt"
  fi
  mkinit_hooks="$mkinit_hooks filesystems fsck"
  if [[ -n "${TINAPPLE_LIVE:-}" || -n "${TINAPPLE_ARCHISO:-}" ]]; then
    mkinit_hooks="$mkinit_hooks archiso archiso_loop_mnt"
  fi
  run_sh "mkdir -p $target/etc/mkinitcpio.conf.d && cat << 'EOF' > $target/etc/mkinitcpio.conf.d/tinapple.conf
HOOKS=($mkinit_hooks)
EOF"
  run arch-chroot "$target" mkinitcpio -P

  # 8. Configure bootloader entries (GRUB/Limine)
  log_info "configuring bootloader entries for %s..." "$bootloader"
  if [[ "$bootloader" == "grub" ]]; then
    run_sh "mkdir -p $target/etc/default && cat << 'EOG' >> $target/etc/default/grub
GRUB_TIMEOUT=3
GRUB_DISTRIBUTOR=\"tinapple\"
EOG"
    if [[ -n "${TINAPPLE_LUKS:-}" && "${TINAPPLE_LUKS}" != "no" ]]; then
      run_sh "echo 'GRUB_ENABLE_CRYPTODISK=y' >> $target/etc/default/grub"
    fi
  elif [[ "$bootloader" == "limine" ]]; then
    run_sh "mkdir -p $target/boot/loader/entries && cat << 'EOL' > $target/boot/loader/loader.conf
default tinapple.conf
timeout 3
console-mode max
editor no
EOL"
  fi

  # 9. Generate /etc/tinapple/manifest.yaml
  log_info "generating manifest.yaml..."
  run_sh "mkdir -p $target/etc/tinapple && cat << 'EOM' > $target/etc/tinapple/manifest.yaml
version: 1
hostname: $hostname
kernel_profile: ${TINAPPLE_KERNEL_PROFILE:-lts}
session_mode: ${TINAPPLE_SESSION_MODE:-headless}
hardware_profile: ${TINAPPLE_HARDWARE_PROFILE:-auto}
cachyos_repos: ${TINAPPLE_CACHYOS_REPOS:-true}
ease_of_use_mode: ${TINAPPLE_EASE_OF_USE:-false}
filesystem: ${TINAPPLE_FS:-ext4}
bootloader: $bootloader
profiles:
$(for p in "${prof_array[@]}"; do echo "  - $(echo "$p" | tr -d '[:space:]')"; done)
services:
  chadwm:
    enabled: true
    user: $username
  jellyfin:
    enabled: true
  qbittorrent:
    enabled: true
    user: $username
  tailscale:
    enabled: true
hardware:
  battery:
    charge_limit: 80
    charge_limit_min: 40
    critical_action: hibernate
    critical_threshold: 5
  power_profile: balanced
  thermal_profile: server
  lid_policy: ignore
  ups_monitor: true
network:
  interface: eth0
  dhcp: true
EOM"

  # 10. Configure pacman repository on target
  log_info "configuring pacman repositories on target..."
  if ! grep -q '\[tinapple\]' "$target/etc/pacman.conf" 2>/dev/null; then
    run_sh "cat << 'EOPAC' >> $target/etc/pacman.conf

[tinapple]
SigLevel = Optional TrustAll
Server = file:///opt/tinapple-repo/\$arch
Include = /etc/pacman.d/tinapple-mirrorlist
EOPAC"
  fi
  if [[ -d /opt/tinapple-repo ]]; then
    run_sh "mkdir -p $target/opt && cp -a /opt/tinapple-repo $target/opt/ 2>/dev/null || true"
  fi

  # Export output variables for next stage
  export TINAPPLE_CONFIGURED="true"
  export TINAPPLE_STAGE="configure"
  export TINAPPLE_TARGET_HOSTNAME="$hostname"

  done_step "configure"
  log_ok "system configuration complete"
  return 0
}

tinapple_configure_base() {
  tinapple_configure "$@"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  tinapple_configure "$@"
fi
