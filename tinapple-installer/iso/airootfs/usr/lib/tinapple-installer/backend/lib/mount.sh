#!/usr/bin/env bash
# mount.sh — Mount target filesystems in order and activate swap

# Find and source common.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "/usr/lib/tinapple-installer/backend/lib/common.sh" ]]; then
  # shellcheck source=/dev/null
  source "/usr/lib/tinapple-installer/backend/lib/common.sh"
elif [[ -f "/usr/lib/tinapple/lib/common.sh" ]]; then
  # shellcheck source=/dev/null
  source "/usr/lib/tinapple/lib/common.sh"
elif [[ -f "${SCRIPT_DIR}/common.sh" ]]; then
  # shellcheck source=/dev/null
  source "${SCRIPT_DIR}/common.sh"
fi

tinapple_create_systemd_mount_unit() {
  local what=$1
  local where=$2
  local type=$3
  local options=${4:-defaults}
  local target=${5:-/mnt}

  local unit_name
  if command -v systemd-escape >/dev/null 2>&1; then
    unit_name=$(systemd-escape --path --suffix=mount "$where")
  else
    unit_name="$(echo "$where" | sed -e 's|^/||' -e 's|/$||' -e 's|/|-|g').mount"
  fi

  local unit_path="$target/etc/systemd/system/$unit_name"
  local where_clean="${where#/}"
  log "creating systemd mount unit %s (%s -> %s)..." "$unit_name" "$what" "$where"

  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    log_info "DRYRUN: mkdir -p %s/%s" "$target" "$where_clean"
    log_info "DRYRUN: write systemd mount unit %s for %s on %s" "$unit_path" "$what" "$where"
    return 0
  fi

  mkdir -p "$target/$where_clean"
  mkdir -p "$target/etc/systemd/system"
  cat << EOF > "$unit_path"
[Unit]
Description=Mount unit for $where
After=local-fs-pre.target
Before=local-fs.target

[Mount]
What=$what
Where=$where
Type=$type
Options=$options

[Install]
WantedBy=multi-user.target
EOF
  log_ok "created systemd mount unit %s" "$unit_name"
}

tinapple_create_additional_mount_units() {
  local target=${1:-${TINAPPLE_TARGET:-/mnt}}
  local extra_mounts="${TINAPPLE_EXTRA_MOUNTS:-${TINAPPLE_ADDITIONAL_MOUNTS:-}}"

  if [[ -n "$extra_mounts" ]]; then
    log "configuring systemd mount units for additional partitions..."
    local old_ifs="$IFS"
    IFS=$'\n;'
    for entry in $extra_mounts; do
      [[ -z "$entry" ]] && continue
      local what="" where="" type="" opts=""
      if [[ "$entry" == *:* ]]; then
        IFS=':' read -r what where type opts <<< "$entry"
      else
        IFS=' ' read -r what where type opts <<< "$entry"
      fi
      [[ -n "$what" && -n "$where" ]] || continue
      tinapple_create_systemd_mount_unit "$what" "$where" "${type:-ext4}" "${opts:-defaults}" "$target"
    done
    IFS="$old_ifs"
  fi

  if [[ -n "${TINAPPLE_PART_DATA:-}" ]]; then
    tinapple_create_systemd_mount_unit "$TINAPPLE_PART_DATA" "/data" "${TINAPPLE_DATA_FS:-ext4}" "defaults,noatime" "$target"
  fi
  if [[ -n "${TINAPPLE_PART_MEDIA:-}" ]]; then
    tinapple_create_systemd_mount_unit "$TINAPPLE_PART_MEDIA" "/media" "${TINAPPLE_MEDIA_FS:-ext4}" "defaults,noatime" "$target"
  fi
}

tinapple_mount_all() {
  # Load previous stage outputs if available
  if declare -f load_stage_env >/dev/null 2>&1; then
    load_stage_env
  else
    [[ -f /run/tinapple/env ]] && source /run/tinapple/env 2>/dev/null || true
    [[ -f /tmp/tinapple-env ]] && source /tmp/tinapple-env 2>/dev/null || true
  fi

  local disk="${TINAPPLE_DISK:-/dev/vda}"
  local esp_dev=${2:-${TINAPPLE_PART_ESP:-$(part_dev "$disk" 1)}}
  local swap_dev
  if [[ -n "${3:-}" ]]; then
    swap_dev="$3"
  elif [[ -n "${TINAPPLE_SWAP_GIB:-}" && "${TINAPPLE_SWAP_GIB}" -eq 0 ]] || [[ "${TINAPPLE_PART_SWAP:-}" == "none" ]]; then
    swap_dev=""
  elif [[ -z "${TINAPPLE_PART_SWAP+x}" ]]; then
    swap_dev="$(part_dev "$disk" 2)"
  else
    swap_dev="$TINAPPLE_PART_SWAP"
  fi

  local root_dev
  if [[ -n "${1:-}" ]]; then
    root_dev="$1"
  elif [[ -n "${TINAPPLE_LUKS_MAPPED:-}" ]]; then
    root_dev="$TINAPPLE_LUKS_MAPPED"
  elif [[ -n "${TINAPPLE_PART_ROOT:-}" ]]; then
    root_dev="$TINAPPLE_PART_ROOT"
  elif [[ -n "${TINAPPLE_SWAP_GIB:-}" && "${TINAPPLE_SWAP_GIB}" -eq 0 ]]; then
    root_dev="$(part_dev "$disk" 2)"
  else
    root_dev="$(part_dev "$disk" 3)"
  fi
  local fs=${4:-${TINAPPLE_FS:-ext4}}
  fs="$(echo "$fs" | tr '[:upper:]' '[:lower:]' | awk '{print $1}')"
  fs="${fs%%(*}"
  fs="$(echo "$fs" | tr -d ' ')"

  local target=${5:-${TINAPPLE_TARGET:-/mnt}}

  local stage="${TINAPPLE_STAGE:-mount}"
  step "$stage"
  log "mounting target filesystem (%s) to %s..." "$fs" "$target"

  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    case "$fs" in
      ext4)
        log_info "DRYRUN: mount -o noatime,commit=60 %s %s" "$root_dev" "$target"
        ;;
      xfs)
        log_info "DRYRUN: mount -o noatime,logbufs=8 %s %s" "$root_dev" "$target"
        ;;
      btrfs)
        local btrfs_opts="compress=zstd:3,noatime,space_cache=v2"
        log_info "DRYRUN: mount -o %s,subvol=@ %s %s" "$btrfs_opts" "$root_dev" "$target"
        log_info "DRYRUN: mkdir -p %s/home %s/.snapshots %s/var/log %s/var/cache" "$target" "$target" "$target" "$target"
        log_info "DRYRUN: mount -o %s,subvol=@home %s %s/home" "$btrfs_opts" "$root_dev" "$target"
        log_info "DRYRUN: mount -o %s,subvol=@snapshots %s %s/.snapshots" "$btrfs_opts" "$root_dev" "$target"
        log_info "DRYRUN: mount -o %s,subvol=@var_log %s %s/var/log" "$btrfs_opts" "$root_dev" "$target"
        log_info "DRYRUN: mount -o %s,subvol=@var_cache %s %s/var/cache" "$btrfs_opts" "$root_dev" "$target"
        ;;
    esac

    if [[ -n "$esp_dev" && "$esp_dev" != "none" ]]; then
      local esp_mount="${TINAPPLE_ESP_MOUNT:-$target/boot}"
      if [[ "$esp_mount" != "$target"* ]]; then
        esp_mount="$target/${esp_mount#/}"
      fi
      log_info "DRYRUN: mkdir -p %s && mount -o umask=0077 %s %s" "$esp_mount" "$esp_dev" "$esp_mount"
    fi

    if [[ -n "$swap_dev" && "$swap_dev" != "none" ]]; then
      log_info "DRYRUN: swapon %s" "$swap_dev"
    fi

    tinapple_create_additional_mount_units "$target"
    log_ok "all filesystems mounted (dry-run) to %s" "$target"
    done_step "$stage"
    return 0
  fi

  mkdir -p "$target"

  case "$fs" in
    ext4)
      mount -t ext4 -o noatime,commit=60 "$root_dev" "$target" || die "failed to mount ext4 root %s to %s" "$root_dev" "$target"
      ;;
    xfs)
      mount -t xfs -o noatime,logbufs=8 "$root_dev" "$target" || die "failed to mount xfs root %s to %s" "$root_dev" "$target"
      ;;
    btrfs)
      local btrfs_opts="compress=zstd:3,noatime,space_cache=v2"
      mount -t btrfs -o "$btrfs_opts,subvol=@" "$root_dev" "$target" || die "failed to mount btrfs root subvolume @"
      mkdir -p "$target/home" "$target/.snapshots" "$target/var/log" "$target/var/cache"
      mount -t btrfs -o "$btrfs_opts,subvol=@home" "$root_dev" "$target/home" || die "failed to mount @home"
      mount -t btrfs -o "$btrfs_opts,subvol=@snapshots" "$root_dev" "$target/.snapshots" || die "failed to mount @snapshots"
      mount -t btrfs -o "$btrfs_opts,subvol=@var_log" "$root_dev" "$target/var/log" || die "failed to mount @var_log"
      mount -t btrfs -o "$btrfs_opts,subvol=@var_cache" "$root_dev" "$target/var/cache" || die "failed to mount @var_cache"
      ;;
    *)
      die "unsupported filesystem %s" "$fs"
      ;;
  esac

  if [[ -n "$esp_dev" && "$esp_dev" != "none" ]]; then
    local esp_mount="${TINAPPLE_ESP_MOUNT:-$target/boot}"
    if [[ "$esp_mount" != "$target"* ]]; then
      esp_mount="$target/${esp_mount#/}"
    fi
    mkdir -p "$esp_mount"
    mount -t vfat -o umask=0077 "$esp_dev" "$esp_mount" || die "failed to mount ESP %s to %s" "$esp_dev" "$esp_mount"
  fi

  if [[ -n "$swap_dev" && "$swap_dev" != "none" ]]; then
    swapon "$swap_dev" 2>/dev/null || log_warn "swapon failed on %s (may already be active)" "$swap_dev"
  fi

  tinapple_create_additional_mount_units "$target"

  # Restore cached packages from live /tmp/pkg-cache and host cache to accelerate testing
  mkdir -p "$target/var/cache/pacman/pkg"
  if [[ -d /tmp/pkg-cache ]]; then
    cp -n /tmp/pkg-cache/*.pkg.tar.zst* "$target/var/cache/pacman/pkg/" 2>/dev/null || true
  fi
  if [[ -d /var/cache/pacman/pkg ]]; then
    cp -n /var/cache/pacman/pkg/*.pkg.tar.zst* "$target/var/cache/pacman/pkg/" 2>/dev/null || true
  fi

  export TINAPPLE_TARGET="$target"
  export TINAPPLE_MOUNTED="yes"
  if declare -f save_stage_env >/dev/null 2>&1; then
    save_stage_env
  fi

  log_ok "all filesystems mounted to %s" "$target"
  done_step "$stage"
  return 0
}

tinapple_mount() {
  tinapple_mount_all "$@"
}

tinapple_generate_fstab() {
  local target=${1:-/mnt}
  log "generating fstab for %s..." "$target"
  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    log_info "DRYRUN: genfstab -U %s > %s/etc/fstab" "$target" "$target"
    return 0
  fi
  mkdir -p "$target/etc"
  genfstab -U "$target" >> "$target/etc/fstab"
  log_ok "fstab generated successfully"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  tinapple_mount "$@"
fi
