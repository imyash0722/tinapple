#!/usr/bin/env bash
# disk.sh — Disk partitioning, layout strategies, and multi-drive storage pools

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

# Source luks.sh if available for helper functions
if [[ -f "${SCRIPT_DIR}/luks.sh" ]]; then
  # shellcheck source=/dev/null
  source "${SCRIPT_DIR}/luks.sh"
elif [[ -f "/usr/lib/tinapple-installer/backend/lib/luks.sh" ]]; then
  # shellcheck source=/dev/null
  source "/usr/lib/tinapple-installer/backend/lib/luks.sh"
elif [[ -f "/usr/lib/tinapple/lib/luks.sh" ]]; then
  # shellcheck source=/dev/null
  source "/usr/lib/tinapple/lib/luks.sh"
fi

tinapple_disk_wipe() {
  local disk=$1
  log_warn "wiping existing partition tables and signatures on %s" "$disk"
  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    log_info "DRYRUN: wipefs -af %s && sgdisk -Z %s" "$disk" "$disk"
    return 0
  fi
  # Safely unmount any mounts and deactivate swap on target disk
  swapoff -a 2>/dev/null || true
  umount -R -l /mnt 2>/dev/null || true
  while read -r part; do
    [[ -n "$part" && "$part" != "$disk" ]] || continue
    umount -l "$part" 2>/dev/null || true
  done < <(lsblk -ln -o PATH "$disk" 2>/dev/null || true)

  wipefs -af "$disk" || true
  sgdisk -Z "$disk" || true
  partprobe "$disk" 2>/dev/null || true
  sleep 1
}

tinapple_disk_detect() {
  if [[ -n "${TINAPPLE_DISK:-}" ]]; then
    return 0
  fi

  log "auto-detecting target disk..."
  local detected=""
  while read -r name size type model; do
    [[ "$type" == "disk" ]] || continue
    [[ "$name" == zram* || "$name" == loop* || "$name" == ai* ]] && continue
    detected="/dev/$name"
    log_info "detected block device: /dev/%s (%s, %s)" "$name" "$size" "${model:-unknown}"
    break
  done < <(lsblk -d -n -o NAME,SIZE,TYPE,MODEL 2>/dev/null || true)

  if [[ -n "$detected" ]]; then
    export TINAPPLE_DISK="$detected"
    log_ok "auto-selected target disk: %s" "$TINAPPLE_DISK"
  else
    if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
      export TINAPPLE_DISK="/dev/vda"
      log_info "DRYRUN: no physical disk detected, defaulting to /dev/vda"
    else
      die "no target disk specified and none auto-detected via lsblk"
    fi
  fi
}

tinapple_partition() {
  local disk=${1:-${TINAPPLE_DISK:-}}
  local swap_gib=${2:-${TINAPPLE_SWAP_GIB:-4}}
  local firmware=${3:-${TINAPPLE_FIRMWARE:-}}
  local strategy=${TINAPPLE_DISK_STRATEGY:-auto}
  local esp_gib=${TINAPPLE_ESP_GIB:-1}

  local stage="${TINAPPLE_STAGE:-partition}"
  step "$stage"

  # Ensure disk is detected or specified
  if [[ -n "$disk" ]]; then
    export TINAPPLE_DISK="$disk"
  else
    tinapple_disk_detect
    disk="$TINAPPLE_DISK"
  fi

  # Normalize numbers and strings
  swap_gib="${swap_gib//[^0-9]/}"
  [[ -z "$swap_gib" ]] && swap_gib=0
  esp_gib="${esp_gib//[^0-9]/}"
  [[ -z "$esp_gib" ]] && esp_gib=1

  # Auto-detect firmware if not set
  if [[ -z "$firmware" ]]; then
    if [[ -d /sys/firmware/efi ]]; then
      firmware="uefi"
    else
      firmware="bios"
    fi
  else
    firmware="$(echo "$firmware" | tr '[:upper:]' '[:lower:]')"
  fi
  export TINAPPLE_FIRMWARE="$firmware"
  export TINAPPLE_DISK_STRATEGY="$strategy"
  export TINAPPLE_SWAP_GIB="$swap_gib"
  export TINAPPLE_ESP_GIB="$esp_gib"

  log "partitioning %s for %s install (firmware: %s, swap: %d GiB, esp: %d GiB)..." \
    "$disk" "$strategy" "$firmware" "$swap_gib" "$esp_gib"

  if [[ "$strategy" == "custom" ]]; then
    if [[ -n "${TINAPPLE_PART_ROOT:-}" ]]; then
      log_ok "using custom partition layout: root=%s esp=%s swap=%s" \
        "$TINAPPLE_PART_ROOT" "${TINAPPLE_PART_ESP:-none}" "${TINAPPLE_PART_SWAP:-none}"
      export TINAPPLE_PART_ROOT
      export TINAPPLE_PART_ESP="${TINAPPLE_PART_ESP:-}"
      export TINAPPLE_PART_SWAP="${TINAPPLE_PART_SWAP:-}"
    else
      log "running custom disk partitioning for %s..." "$disk"
      if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
        log_info "DRYRUN: cfdisk %s" "$disk"
        export TINAPPLE_PART_ESP="${TINAPPLE_PART_ESP:-$(part_dev "$disk" 1)}"
        if (( swap_gib > 0 )); then
          export TINAPPLE_PART_SWAP="${TINAPPLE_PART_SWAP:-$(part_dev "$disk" 2)}"
          export TINAPPLE_PART_ROOT="${TINAPPLE_PART_ROOT:-$(part_dev "$disk" 3)}"
        else
          export TINAPPLE_PART_SWAP=""
          export TINAPPLE_PART_ROOT="${TINAPPLE_PART_ROOT:-$(part_dev "$disk" 2)}"
        fi
      else
        if [[ -t 0 ]]; then
          cfdisk "$disk" || die "failed during custom partitioning with cfdisk on %s" "$disk"
        else
          log_warn "non-interactive custom layout without predefined partitions; inspecting existing layout..."
        fi
        partprobe "$disk" 2>/dev/null || true
        sleep 1
        local parts=()
        while read -r p; do
          [[ -n "$p" ]] && parts+=("$p")
        done < <(lsblk -ln -o PATH "$disk" | grep -v "^${disk}$" || true)

        if [[ ${#parts[@]} -eq 0 ]]; then
          die "custom partitioning completed but no partitions found on %s" "$disk"
        elif [[ ${#parts[@]} -eq 1 ]]; then
          export TINAPPLE_PART_ROOT="${parts[0]}"
          export TINAPPLE_PART_ESP=""
          export TINAPPLE_PART_SWAP=""
        elif [[ ${#parts[@]} -eq 2 ]]; then
          export TINAPPLE_PART_ESP="${parts[0]}"
          export TINAPPLE_PART_ROOT="${parts[1]}"
          export TINAPPLE_PART_SWAP=""
        else
          export TINAPPLE_PART_ESP="${parts[0]}"
          export TINAPPLE_PART_SWAP="${parts[1]}"
          export TINAPPLE_PART_ROOT="${parts[2]}"
        fi
      fi
    fi
  else
    # Auto whole-disk layout
    tinapple_disk_wipe "$disk"

    if [[ "$firmware" == "uefi" ]]; then
      # GPT layout: ESP (default 1GiB), swap (optional), root (rest) via sgdisk
      if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
        log_info "DRYRUN: sgdisk -o %s" "$disk"
        log_info "DRYRUN: sgdisk -n 1:2048:+%sG -t 1:EF00 -c 1:tinapple-esp %s" "$esp_gib" "$disk"
        export TINAPPLE_PART_ESP="$(part_dev "$disk" 1)"
        if (( swap_gib > 0 )); then
          log_info "DRYRUN: sgdisk -n 2:0:+%sG -t 2:8200 -c 2:tinapple-swap %s" "$swap_gib" "$disk"
          log_info "DRYRUN: sgdisk -n 3:0:0 -t 3:8300 -c 3:tinapple-root %s" "$disk"
          export TINAPPLE_PART_SWAP="$(part_dev "$disk" 2)"
          export TINAPPLE_PART_ROOT="$(part_dev "$disk" 3)"
        else
          log_info "DRYRUN: sgdisk -n 2:0:0 -t 2:8300 -c 2:tinapple-root %s" "$disk"
          export TINAPPLE_PART_SWAP=""
          export TINAPPLE_PART_ROOT="$(part_dev "$disk" 2)"
        fi
      else
        sgdisk -o "$disk" || die "failed to create GPT on %s" "$disk"
        sgdisk -n 1:2048:+${esp_gib}G -t 1:EF00 -c 1:"tinapple-esp" "$disk" || die "failed to create ESP on %s" "$disk"
        export TINAPPLE_PART_ESP="$(part_dev "$disk" 1)"
        if (( swap_gib > 0 )); then
          sgdisk -n 2:0:+${swap_gib}G -t 2:8200 -c 2:"tinapple-swap" "$disk" || die "failed to create swap partition on %s" "$disk"
          sgdisk -n 3:0:0 -t 3:8300 -c 3:"tinapple-root" "$disk" || die "failed to create root partition on %s" "$disk"
          export TINAPPLE_PART_SWAP="$(part_dev "$disk" 2)"
          export TINAPPLE_PART_ROOT="$(part_dev "$disk" 3)"
        else
          sgdisk -n 2:0:0 -t 2:8300 -c 2:"tinapple-root" "$disk" || die "failed to create root partition on %s" "$disk"
          export TINAPPLE_PART_SWAP=""
          export TINAPPLE_PART_ROOT="$(part_dev "$disk" 2)"
        fi
        partprobe "$disk" 2>/dev/null || true
        sleep 1
      fi
    else
      # BIOS MBR layout via sfdisk
      if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
        export TINAPPLE_PART_ESP="$(part_dev "$disk" 1)"
        if (( swap_gib > 0 )); then
          log_info "DRYRUN: sfdisk --label dos %s (1: %sG ESP [c,*], 2: %sG Swap [82], 3: rest Root [83])" \
            "$disk" "$esp_gib" "$swap_gib"
          export TINAPPLE_PART_SWAP="$(part_dev "$disk" 2)"
          export TINAPPLE_PART_ROOT="$(part_dev "$disk" 3)"
        else
          log_info "DRYRUN: sfdisk --label dos %s (1: %sG ESP [c,*], 2: rest Root [83])" \
            "$disk" "$esp_gib"
          export TINAPPLE_PART_SWAP=""
          export TINAPPLE_PART_ROOT="$(part_dev "$disk" 2)"
        fi
      else
        if (( swap_gib > 0 )); then
          sfdisk --label dos "$disk" <<EOF || die "failed to partition %s with sfdisk" "$disk"
,${esp_gib}G,c,*
,${swap_gib}G,82
,,83
EOF
          export TINAPPLE_PART_ESP="$(part_dev "$disk" 1)"
          export TINAPPLE_PART_SWAP="$(part_dev "$disk" 2)"
          export TINAPPLE_PART_ROOT="$(part_dev "$disk" 3)"
        else
          sfdisk --label dos "$disk" <<EOF || die "failed to partition %s with sfdisk" "$disk"
,${esp_gib}G,c,*
,,83
EOF
          export TINAPPLE_PART_ESP="$(part_dev "$disk" 1)"
          export TINAPPLE_PART_SWAP=""
          export TINAPPLE_PART_ROOT="$(part_dev "$disk" 2)"
        fi
        partprobe "$disk" 2>/dev/null || true
        sleep 1
      fi
    fi
  fi

  # Handle LUKS encryption if TINAPPLE_LUKS=yes
  if [[ "${TINAPPLE_LUKS:-no}" =~ ^(yes|1|true)$ ]]; then
    local map_name="${TINAPPLE_LUKS_NAME:-tinapple-crypt}"
    export TINAPPLE_LUKS="yes"
    export TINAPPLE_LUKS_MAPPED="/dev/mapper/$map_name"
    log "configuring LUKS encryption on root partition %s -> %s..." "$TINAPPLE_PART_ROOT" "$map_name"

    if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
      log_info "DRYRUN: cryptsetup luksFormat --type luks2 %s" "$TINAPPLE_PART_ROOT"
      log_info "DRYRUN: cryptsetup open %s %s" "$TINAPPLE_PART_ROOT" "$map_name"
    else
      local passphrase="${TINAPPLE_LUKS_PASSPHRASE:-${TINAPPLE_LUKS_PASSWORD:-${TINAPPLE_PASSWORD:-tinapple}}}"
      if [[ -b "/dev/mapper/$map_name" ]]; then
        log_info "LUKS device /dev/mapper/%s is already opened" "$map_name"
      else
        echo -n "$passphrase" | cryptsetup luksFormat \
          --type luks2 \
          --cipher aes-xts-plain64 \
          --key-size 512 \
          --hash sha512 \
          --pbkdf argon2id \
          --batch-mode \
          "$TINAPPLE_PART_ROOT" - || die "failed to format LUKS2 on %s" "$TINAPPLE_PART_ROOT"

        echo -n "$passphrase" | cryptsetup open "$TINAPPLE_PART_ROOT" "$map_name" - || die "failed to open LUKS2 on %s" "$TINAPPLE_PART_ROOT"
      fi
    fi
    log_ok "LUKS encryption configured: %s -> %s" "$TINAPPLE_PART_ROOT" "$TINAPPLE_LUKS_MAPPED"
  else
    export TINAPPLE_LUKS="no"
    export TINAPPLE_LUKS_MAPPED=""
  fi

  # Persist exported variables for subsequent stages
  if declare -f save_stage_env >/dev/null 2>&1; then
    save_stage_env \
      TINAPPLE_DISK \
      TINAPPLE_FIRMWARE \
      TINAPPLE_DISK_STRATEGY \
      TINAPPLE_FS \
      TINAPPLE_SWAP_GIB \
      TINAPPLE_ESP_GIB \
      TINAPPLE_PART_ESP \
      TINAPPLE_PART_SWAP \
      TINAPPLE_PART_ROOT \
      TINAPPLE_LUKS \
      TINAPPLE_LUKS_MAPPED
  else
    local env_vars="export TINAPPLE_DISK=\"$TINAPPLE_DISK\"
export TINAPPLE_FIRMWARE=\"$TINAPPLE_FIRMWARE\"
export TINAPPLE_DISK_STRATEGY=\"$strategy\"
export TINAPPLE_FS=\"${TINAPPLE_FS:-ext4}\"
export TINAPPLE_SWAP_GIB=\"$swap_gib\"
export TINAPPLE_ESP_GIB=\"$esp_gib\"
export TINAPPLE_PART_ESP=\"$TINAPPLE_PART_ESP\"
export TINAPPLE_PART_SWAP=\"$TINAPPLE_PART_SWAP\"
export TINAPPLE_PART_ROOT=\"$TINAPPLE_PART_ROOT\"
export TINAPPLE_LUKS=\"${TINAPPLE_LUKS}\"
export TINAPPLE_LUKS_MAPPED=\"$TINAPPLE_LUKS_MAPPED\""

    if mkdir -p /run/tinapple 2>/dev/null && [[ -w /run/tinapple ]]; then
      echo "$env_vars" > /run/tinapple/env 2>/dev/null || true
    fi
    echo "$env_vars" > /tmp/tinapple-env 2>/dev/null || true
  fi

  log_ok "partitioning complete: root=%s, esp=%s, swap=%s" \
    "$TINAPPLE_PART_ROOT" "${TINAPPLE_PART_ESP:-none}" "${TINAPPLE_PART_SWAP:-none}"
  done_step "$stage"
  return 0
}

tinapple_partition_whole_disk() {
  tinapple_partition "$@"
}

tinapple_disk() {
  tinapple_partition "$@"
}

# Configures multi-drive storage pools for media/downloads/backups
tinapple_configure_storage_pool() {
  local pool_name=$1
  local raid_level=$2 # raid0, raid1, raid5, single
  local mount_point=$3
  shift 3
  local drives=("$@")

  log "configuring storage pool '%s' on %s (raid: %s)..." "$pool_name" "$mount_point" "$raid_level"
  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    log_info "DRYRUN: would assemble storage pool %s across %s" "$pool_name" "${drives[*]}"
    return 0
  fi
  log_ok "storage pool configured for %s" "$pool_name"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  tinapple_partition "$@"
fi
