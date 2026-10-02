#!/usr/bin/env bash
# filesystem.sh — Format filesystems: ext4, XFS, Btrfs subvolumes, ESP FAT32, Swap

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

tinapple_format_esp() {
  local part=${1:-$TINAPPLE_PART_ESP}
  [[ -n "$part" && "$part" != "none" ]] || return 0

  log "formatting ESP partition %s as FAT32..." "$part"
  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    log_info "DRYRUN: mkfs.vfat -F32 -n ESP %s" "$part"
    return 0
  fi
  umount -l "$part" 2>/dev/null || true
  mkfs.vfat -F32 -n "ESP" "$part" || die "failed to format ESP on %s" "$part"
  log_ok "ESP formatted on %s" "$part"
}

tinapple_format_swap() {
  local part=${1:-$TINAPPLE_PART_SWAP}
  [[ -n "$part" && "$part" != "none" ]] || return 0

  log "formatting swap partition %s..." "$part"
  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    log_info "DRYRUN: mkswap -L tinapple-swap %s" "$part"
    return 0
  fi
  swapoff "$part" 2>/dev/null || true
  umount -l "$part" 2>/dev/null || true
  mkswap -L "tinapple-swap" "$part" || die "failed to format swap on %s" "$part"
  log_ok "swap formatted on %s" "$part"
}

tinapple_format_root() {
  local dev=${1:-${TINAPPLE_LUKS_MAPPED:-$TINAPPLE_PART_ROOT}}
  local fs=${2:-${TINAPPLE_FS:-ext4}}
  fs="$(echo "$fs" | tr '[:upper:]' '[:lower:]' | awk '{print $1}')"
  fs="${fs%%(*}"
  fs="$(echo "$fs" | tr -d ' ')"

  [[ -n "$dev" ]] || die "no root device specified for formatting"

  # Ensure root dev and /mnt are not currently mounted
  umount -R -l "$dev" 2>/dev/null || true
  umount -R -l /mnt 2>/dev/null || true

  log "formatting root partition %s as %s..." "$dev" "$fs"

  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    case "$fs" in
      ext4)
        log_info "DRYRUN: mkfs.ext4 -F -O 64bit,has_journal,extents,huge_file,flex_bg,metadata_csum,dir_index -L tinapple %s" "$dev"
        ;;
      xfs)
        log_info "DRYRUN: mkfs.xfs -f -L tinapple %s" "$dev"
        ;;
      btrfs)
        log_info "DRYRUN: mkfs.btrfs -f -L tinapple %s" "$dev"
        log_info "DRYRUN: mount -t btrfs %s <tmp_mnt>" "$dev"
        log_info "DRYRUN: btrfs subvolume create <tmp_mnt>/@"
        log_info "DRYRUN: btrfs subvolume create <tmp_mnt>/@home"
        log_info "DRYRUN: btrfs subvolume create <tmp_mnt>/@snapshots"
        log_info "DRYRUN: btrfs subvolume create <tmp_mnt>/@var_log"
        log_info "DRYRUN: btrfs subvolume create <tmp_mnt>/@var_cache"
        log_info "DRYRUN: umount <tmp_mnt>"
        ;;
      *)
        die "unsupported filesystem %s" "$fs"
        ;;
    esac
    return 0
  fi

  case "$fs" in
    ext4)
      mkfs.ext4 -F -O 64bit,has_journal,extents,huge_file,flex_bg,metadata_csum,dir_index \
        -L "tinapple" "$dev" || die "failed to format ext4 on %s" "$dev"
      ;;
    xfs)
      mkfs.xfs -f -L "tinapple" "$dev" || die "failed to format XFS on %s" "$dev"
      ;;
    btrfs)
      mkfs.btrfs -f -L "tinapple" "$dev" || die "failed to format btrfs on %s" "$dev"
      local tmp_mnt
      tmp_mnt=$(mktemp -d)
      if ! mount -t btrfs "$dev" "$tmp_mnt"; then
        rmdir "$tmp_mnt" 2>/dev/null || true
        die "failed to mount %s for subvolume creation" "$dev"
      fi
      local create_failed=0
      for subvol in @ @home @snapshots @var_log @var_cache; do
        btrfs subvolume create "$tmp_mnt/$subvol" || create_failed=1
      done
      umount "$tmp_mnt" || true
      rmdir "$tmp_mnt" 2>/dev/null || true
      if [[ $create_failed -ne 0 ]]; then
        die "failed to create btrfs subvolumes on %s" "$dev"
      fi
      ;;
    *)
      die "unsupported filesystem %s" "$fs"
      ;;
  esac

  log_ok "root filesystem formatted as %s on %s" "$fs" "$dev"
}

tinapple_filesystem() {
  local stage="${TINAPPLE_STAGE:-filesystem}"
  step "$stage"

  # Load previous stage outputs if available
  if declare -f load_stage_env >/dev/null 2>&1; then
    load_stage_env
  else
    [[ -f /run/tinapple/env ]] && source /run/tinapple/env 2>/dev/null || true
    [[ -f /tmp/tinapple-env ]] && source /tmp/tinapple-env 2>/dev/null || true
  fi

  local disk="${TINAPPLE_DISK:-/dev/vda}"
  local esp_part="${TINAPPLE_PART_ESP:-$(part_dev "$disk" 1)}"
  local swap_part
  if [[ -n "${TINAPPLE_SWAP_GIB:-}" && "${TINAPPLE_SWAP_GIB}" -eq 0 ]] || [[ "${TINAPPLE_PART_SWAP:-}" == "none" ]]; then
    swap_part=""
  elif [[ -z "${TINAPPLE_PART_SWAP+x}" ]]; then
    swap_part="$(part_dev "$disk" 2)"
  else
    swap_part="$TINAPPLE_PART_SWAP"
  fi

  local root_part
  if [[ -n "${TINAPPLE_LUKS_MAPPED:-}" ]]; then
    root_part="$TINAPPLE_LUKS_MAPPED"
  elif [[ -n "${TINAPPLE_PART_ROOT:-}" ]]; then
    root_part="$TINAPPLE_PART_ROOT"
  elif [[ -n "${TINAPPLE_SWAP_GIB:-}" && "${TINAPPLE_SWAP_GIB}" -eq 0 ]]; then
    root_part="$(part_dev "$disk" 2)"
  else
    root_part="$(part_dev "$disk" 3)"
  fi
  local fs="${TINAPPLE_FS:-ext4}"
  fs="$(echo "$fs" | tr '[:upper:]' '[:lower:]' | awk '{print $1}')"
  fs="${fs%%(*}"
  fs="$(echo "$fs" | tr -d ' ')"
  export TINAPPLE_FS="$fs"

  log "creating filesystems on target partitions (fs: %s)..." "$fs"

  tinapple_format_esp "$esp_part"
  tinapple_format_swap "$swap_part"
  tinapple_format_root "$root_part" "$fs"

  # Persist exported variables for subsequent stages
  if declare -f save_stage_env >/dev/null 2>&1; then
    save_stage_env
  fi

  log_ok "filesystem creation complete"
  done_step "$stage"
  return 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  tinapple_filesystem "$@"
fi
