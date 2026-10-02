#!/usr/bin/env bash
# fs-select.sh — Filesystem selection with recommendations
# Supported: ext4 (default), xfs, btrfs

tinapple_fs_select() {
  step "fs-select"
  log "selecting root filesystem..."

  local selected=${1:-${TINAPPLE_FS:-ext4}}
  case "$selected" in
    ext4)
      log_ok "filesystem: ext4 (RECOMMENDED DEFAULT — proven stability, low CPU overhead, excellent for homelab servers)"
      ;;
    xfs)
      log_ok "filesystem: XFS (high parallelism, optimized for large storage arrays and media pools)"
      ;;
    btrfs)
      log_ok "filesystem: Btrfs (CoW, subvolumes, native snapper snapshot integration)"
      ;;
    *)
      log_warn "unknown filesystem '%s', falling back to default 'ext4'" "$selected"
      selected="ext4"
      ;;
  esac

  export TINAPPLE_FS="$selected"
}

tinapple_fs_recommendation() {
  cat << 'EOM'
Available Filesystems:
  1. ext4 (Default)  - Maximum reliability and compatibility. Best for general homelab servers.
  2. xfs             - Scalable 64-bit journaling. Ideal for multi-terabyte media/backup pools.
  3. btrfs           - Copy-on-Write with instant subvolume snapshots (snapper). Higher CPU/RAM usage.
EOM
}

function tinapple_fs-select() {
  tinapple_fs_select "$@"
}
