#!/usr/bin/env bash
# pacstrap.sh — Bootstrap core OS packages, selected kernel, filesystem tools, and profile packages
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

tinapple_pacstrap() {
  local target=${1:-/mnt}
  local kernel_profile=${TINAPPLE_KERNEL_PROFILE:-lts}
  local fs=${TINAPPLE_FS:-ext4}
  local bootloader=${TINAPPLE_BOOTLOADER:-${TINAPPLE_RECOMMENDED_BOOTLOADER:-grub}}
  local cachyos_repos=${TINAPPLE_CACHYOS_REPOS:-${TINAPPLE_CACHYOS:-false}}
  local profiles_csv=${TINAPPLE_PROFILES:-base}

  step "pacstrap"
  log "running pacstrap with kernel profile '%s', fs '%s', bootloader '%s'..." "$kernel_profile" "$fs" "$bootloader"

  if [[ -n "${TINAPPLE_SKIP_PACSTRAP:-}" && "${TINAPPLE_SKIP_PACSTRAP}" != "0" ]]; then
    log_warn "TINAPPLE_SKIP_PACSTRAP is active: skipping package bootstrap (~1.7GB download)."
    if [[ -z ${TINAPPLE_DRYRUN:-} ]]; then
      mkdir -p "$target"/{etc,usr/bin,usr/lib,var/lib,boot,home,root,run,sys,proc,dev} 2>/dev/null || true
      if [[ -d /etc/skel ]]; then
        mkdir -p "$target/etc/skel" 2>/dev/null || true
        cp -a /etc/skel/. "$target/etc/skel/" 2>/dev/null || true
      fi
    fi
    export TINAPPLE_PACKAGES="base linux-firmware systemd networkmanager sudo vim"
    export TINAPPLE_AUR_PACKAGES=""
    export TINAPPLE_KERNEL_PKG="linux-lts"
    export TINAPPLE_STAGE="pacstrap"

    done_step "pacstrap"
    log_ok "pacstrap skipped successfully (mock mode)"
    return 0
  fi

  # Base package set
  local -a pkgs=(
    base
    base-devel
    linux-firmware
    systemd
    systemd-sysvcompat
    networkmanager
    sudo
    vim
    nano
    zsh
    git
    curl
    wget
    paru
    openssh
    tmux
    tpm
    chaddy-store
    xclip
    xsel
    htop
    pciutils
    usbutils
    efibootmgr
    dosfstools
    kbd
    which
    tinapple-keyring
    tinapple-mirrorlist
    tinapple-base
    tinapple-hw
    tinapple-firstboot
    tinapple-maintenance
    tinapple-config-generator
    mkinitcpio
    iptables
    pipewire
    pipewire-pulse
    pipewire-alsa
    pipewire-jack
    wireplumber
  )

  # Kernel selection
  local kernel_pkg="linux-lts"
  case "$kernel_profile" in
    lts)
      kernel_pkg="linux-lts"
      pkgs+=(linux-lts linux-lts-headers)
      ;;
    hardened)
      kernel_pkg="linux-hardened"
      pkgs+=(linux-hardened linux-hardened-headers)
      ;;
    current|linux)
      kernel_pkg="linux"
      pkgs+=(linux linux-headers)
      ;;
    *)
      log_warn "unknown kernel profile %s, using linux-lts" "$kernel_profile"
      kernel_pkg="linux-lts"
      pkgs+=(linux-lts linux-lts-headers)
      ;;
  esac

  # Filesystem specific utilities
  case "$fs" in
    ext4)
      pkgs+=(e2fsprogs)
      ;;
    xfs)
      pkgs+=(xfsprogs)
      ;;
    btrfs)
      pkgs+=(btrfs-progs snapper)
      ;;
  esac

  # Bootloader packages
  if [[ "$bootloader" == "grub" ]] || [[ ! -d /sys/firmware/efi ]]; then
    pkgs+=(grub)
  fi
  if [[ "$bootloader" == "limine" ]] && [[ -d /sys/firmware/efi ]]; then
    pkgs+=(limine)
  fi

  # CachyOS repositories support
  if [[ "$cachyos_repos" == "true" ]]; then
    pkgs+=(cachyos-keyring cachyos-mirrorlist)
  fi

  # AUR packages
  local -a aur_pkgs=()

  # Build package list from profiles:
  # - base: base, linux-{profile}, linux-{profile}-headers, linux-firmware, systemd, networkmanager, sudo, etc.
  # - media: jellyfin, sonarr, radarr, prowlarr, bazarr, plex, immich
  # - downloads: qbittorrent-nox, transmission, jdownloader2, flaresolverr
  # - backups: restic, borg, rclone, syncthing, snapraid
  # - network: tailscale, wireguard-tools, pihole, unbound
  # - infrastructure: prometheus, grafana, loki, tempo, alertmanager, node_exporter, cadvisor
  # - databases: postgresql, mariadb, redis, mongodb, influxdb
  IFS=',' read -ra prof_array <<< "$profiles_csv"
  for raw_prof in "${prof_array[@]}"; do
    local prof
    prof=$(echo "$raw_prof" | tr -d '[:space:]')
    [[ -n "$prof" ]] || continue

    case "$prof" in
      niri|desktop|wayland)
        pkgs+=(niri waybar fuzzel foot btop pipewire pipewire-pulse wireplumber seatd xdg-desktop-portal xdg-desktop-portal-gnome)
        ;;
      suwayomi)
        aur_pkgs+=(suwayomi-server-bin)
        ;;
      minecraft)
        pkgs+=(jre17-openjdk-headless)
        ;;
      bspwm|chadwm)
        log_warn "bspwm is deprecated in favor of Niri Wayland rice; redirecting to Niri..."
        pkgs+=(niri waybar fuzzel foot btop pipewire pipewire-pulse wireplumber seatd xdg-desktop-portal xdg-desktop-portal-gnome)
        ;;
      base)
        # Core base already included
        ;;
      media)
        pkgs+=(jellyfin-server jellyfin-web)
        aur_pkgs+=(sonarr radarr prowlarr bazarr plex immich)
        ;;
      downloads)
        pkgs+=(qbittorrent-nox transmission-cli)
        aur_pkgs+=(jdownloader2 flaresolverr)
        ;;
      backups)
        pkgs+=(restic borg rclone syncthing)
        aur_pkgs+=(snapraid)
        ;;
      network)
        pkgs+=(tailscale wireguard-tools unbound)
        aur_pkgs+=(pihole)
        ;;
      infrastructure|infra)
        pkgs+=(prometheus grafana loki tempo alertmanager prometheus-node-exporter)
        aur_pkgs+=(cadvisor)
        ;;
      databases)
        pkgs+=(postgresql mariadb valkey influxdb)
        aur_pkgs+=(redis mongodb)
        ;;
      *)
        log_warn "unknown profile %s, skipping" "$prof"
        ;;
    esac
  done

  # Enable CachyOS repos if TINAPPLE_CACHYOS_REPOS=true (x86-64-v3/v4)
  if [[ "$cachyos_repos" == "true" ]]; then
    log_info "enabling CachyOS repository layer..."
    local cachyos_script="/usr/lib/tinapple-installer/backend/lib/cachyos-repo.sh"
    [[ -f "$cachyos_script" ]] || cachyos_script="$(dirname "${BASH_SOURCE[0]}")/cachyos-repo.sh"
    if [[ -f "$cachyos_script" ]]; then
      # shellcheck source=/dev/null
      source "$cachyos_script"
      tinapple_cachyos_repo "$target"
    fi
  fi

  # Deduplicate package list while preserving order
  local -a unique_pkgs=()
  local -A seen_pkgs=()
  for p in "${pkgs[@]}"; do
    if [[ -z "${seen_pkgs[$p]:-}" ]]; then
      seen_pkgs["$p"]=1
      unique_pkgs+=("$p")
    fi
  done

  log "installing %d packages via pacstrap..." "${#unique_pkgs[@]}"
  if [[ -z ${TINAPPLE_DRYRUN:-} ]]; then
    mkdir -p "$target/var/cache/pacman/pkg"
    # Pre-seed target package cache from local repo or live ISO cache to enable offline install
    for pdir in /opt/tinapple-repo/x86_64 /var/cache/pacman/pkg /run/archiso/bootmnt/packages; do
      if [[ -d "$pdir" ]]; then
        log_info "pre-seeding package cache from %s..." "$pdir"
        cp -un "$pdir"/*.pkg.tar.* "$target/var/cache/pacman/pkg/" 2>/dev/null || true
      fi
    done
    # Ensure local tinapple repo sync database is present in pacman sync dir
    if [[ -f /opt/tinapple-repo/x86_64/tinapple.db && ! -f /var/lib/pacman/sync/tinapple.db ]]; then
      mkdir -p /var/lib/pacman/sync
      cp -f /opt/tinapple-repo/x86_64/tinapple.db* /var/lib/pacman/sync/ 2>/dev/null || true
    fi
    # If official repo sync databases are missing, synchronize them
    if [[ ! -f /var/lib/pacman/sync/core.db ]]; then
      log_info "synchronizing repository databases..."
      pacman -Sy --config /etc/pacman.conf --noconfirm || log_warn "pacman -Sy sync completed with warnings"
    fi
  fi
  # Validate packages against available sync databases to prevent fatal failures
  local -a valid_pkgs=()
  for p in "${unique_pkgs[@]}"; do
    if pacman -Si "$p" &>/dev/null; then
      valid_pkgs+=("$p")
    elif [[ -f "/var/cache/pacman/pkg/$p"*.pkg.tar.* ]]; then
      valid_pkgs+=("$p")
    else
      log_warn "package '%s' not found in repos, skipping" "$p"
    fi
  done

  local retries=3
  local attempt=1
  local pacstrap_success=false

  while (( attempt <= retries )); do
    log_info "running pacstrap with %d packages (attempt %d/%d)..." "${#valid_pkgs[@]}" "$attempt" "$retries"
    if run pacstrap -C /etc/pacman.conf "$target" "${valid_pkgs[@]}"; then
      pacstrap_success=true
      break
    fi
    log_warn "pacstrap attempt %d failed (possibly transient network error); retrying in 3 seconds..." "$attempt"
    sleep 3
    attempt=$((attempt + 1))
  done

  if [[ "$pacstrap_success" != "true" ]]; then
    log_warn "pacstrap exited with an error after %d attempts. Last 20 log entries:" "$retries"
    tail -n 20 /var/log/tinapple-install.log 2>/dev/null || true
    die "pacstrap failed to install core packages"
  fi

  # Handle AUR packages via paru/yay if available in target
  if (( ${#aur_pkgs[@]} > 0 )); then
    log_info "handling AUR packages: %s" "${aur_pkgs[*]}"
    if [[ -x "$target/usr/bin/paru" ]]; then
      arch-chroot "$target" paru -S --noconfirm --needed "${aur_pkgs[@]}" 2>/dev/null || log_warn "AUR package install deferred to first boot: %s" "${aur_pkgs[*]}"
    elif [[ -x "$target/usr/bin/yay" ]]; then
      arch-chroot "$target" yay -S --noconfirm --needed "${aur_pkgs[@]}" 2>/dev/null || log_warn "AUR package install deferred to first boot: %s" "${aur_pkgs[*]}"
    else
      log_warn "AUR helpers not present in target; deferred AUR packages to first boot: %s" "${aur_pkgs[*]}"
    fi
  fi

  # Export output variables for next stage
  export TINAPPLE_PACKAGES="${unique_pkgs[*]}"
  export TINAPPLE_AUR_PACKAGES="${aur_pkgs[*]}"
  export TINAPPLE_KERNEL_PKG="$kernel_pkg"
  export TINAPPLE_STAGE="pacstrap"

  done_step "pacstrap"
  log_ok "pacstrap completed successfully"
  return 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  tinapple_pacstrap "$@"
fi
