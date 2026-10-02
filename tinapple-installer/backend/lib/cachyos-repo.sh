#!/usr/bin/env bash
# cachyos-repo.sh — CachyOS optimized repository integration (x86-64-v3/v4)
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

tinapple_detect_cpu_arch() {
  local arch_level="baseline"
  local ld_so="/lib/ld-linux-x86-64.so.2"

  if [[ -x "$ld_so" ]] && "$ld_so" --help 2>/dev/null | grep -q 'x86-64-v4 (supported'; then
    arch_level="v4"
  elif [[ -x "$ld_so" ]] && "$ld_so" --help 2>/dev/null | grep -q 'x86-64-v3 (supported'; then
    arch_level="v3"
  fi
  printf '%s' "$arch_level"
}

tinapple_cachyos_repo() {
  local target=${1:-/mnt}
  local cpu_level
  cpu_level=$(tinapple_detect_cpu_arch)

  step "cachyos-repo"
  log "configuring CachyOS performance repository layer (CPU level: %s)..." "$cpu_level"

  # 1. Import and trust CachyOS key
  log_info "importing and signing CachyOS repository key..."
  run_sh "pacman-key --recv-keys F3B607488DB35A47 --keyserver keyserver.ubuntu.com && pacman-key --lsign-key F3B607488DB35A47"

  # If target is mounted and has pacman-key, initialize in target chroot too
  if [[ -d "$target/etc/pacman.d" && "$target" != "/" ]]; then
    run_sh "arch-chroot $target pacman-key --recv-keys F3B607488DB35A47 --keyserver keyserver.ubuntu.com 2>/dev/null && arch-chroot $target pacman-key --lsign-key F3B607488DB35A47 2>/dev/null || true"
  fi

  # 2. Install cachyos-keyring and cachyos-mirrorlist if needed
  log_info "ensuring cachyos-keyring and cachyos-mirrorlist are installed..."
  if ! pacman -Q cachyos-keyring cachyos-mirrorlist >/dev/null 2>&1; then
    run pacman -Sy --noconfirm --needed cachyos-keyring cachyos-mirrorlist
  fi

  # 3. Add CachyOS repos to /etc/pacman.conf and set Architecture
  local conf_file="$target/etc/pacman.conf"
  [[ -f "$conf_file" ]] || conf_file="/etc/pacman.conf"

  log_info "updating pacman configuration with CachyOS repositories (arch: %s)..." "$cpu_level"

  local arch_str="x86_64_v3"
  local repo_block=""

  case "$cpu_level" in
    v4)
      arch_str="x86_64_v4"
      repo_block="[cachyos-v4]
Include = /etc/pacman.d/cachyos-v4-mirrorlist

[cachyos-core-v4]
Include = /etc/pacman.d/cachyos-v4-mirrorlist

[cachyos-extra-v4]
Include = /etc/pacman.d/cachyos-v4-mirrorlist

[cachyos]
Include = /etc/pacman.d/cachyos-mirrorlist"
      ;;
    v3|*)
      arch_str="x86_64_v3"
      repo_block="[cachyos-v3]
Include = /etc/pacman.d/cachyos-v3-mirrorlist

[cachyos-core-v3]
Include = /etc/pacman.d/cachyos-v3-mirrorlist

[cachyos-extra-v3]
Include = /etc/pacman.d/cachyos-v3-mirrorlist

[cachyos]
Include = /etc/pacman.d/cachyos-mirrorlist"
      ;;
  esac

  # Set Architecture = auto x86_64_v3 (or v4)
  run_sh "sed -i 's/^Architecture = .*/Architecture = auto $arch_str/' $conf_file 2>/dev/null || true"

  # Copy CachyOS mirrorlists into target system if mounted
  if [[ -d "$target/etc" && "$target" != "/" ]]; then
    run_sh "mkdir -p $target/etc/pacman.d && cp -a /etc/pacman.d/cachyos* $target/etc/pacman.d/ 2>/dev/null || true"
  fi

  # Add CachyOS repos to pacman.conf
  run_sh "mkdir -p \$(dirname $conf_file)/pacman.d && cat << 'EOF' > \$(dirname $conf_file)/pacman.d/tinapple-cachyos.conf
$repo_block
EOF"

  run_sh "grep -q 'tinapple-cachyos.conf' $conf_file 2>/dev/null || sed -i '/\\[core\\]/i Include = /etc/pacman.d/tinapple-cachyos.conf\\n' $conf_file 2>/dev/null || cat \$(dirname $conf_file)/pacman.d/tinapple-cachyos.conf >> $conf_file"

  # Export output variables for next stage
  export TINAPPLE_CACHYOS_ARCH="$cpu_level"
  export TINAPPLE_STAGE="cachyos-repo"

  done_step "cachyos-repo"
  log_ok "CachyOS repo configuration completed successfully"
  return 0
}

tinapple_configure_cachyos_repo() {
  tinapple_cachyos_repo "$@"
}

function tinapple_cachyos-repo() {
  tinapple_cachyos_repo "$@"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  tinapple_cachyos_repo "$@"
fi
