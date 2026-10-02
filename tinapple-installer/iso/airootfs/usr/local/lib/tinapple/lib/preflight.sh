#!/usr/bin/env bash
# preflight.sh — System pre-flight checks for tinapple installer
# Sourced by installer; checks architecture, privileges, firmware, disks.

TINAPPLE_MIN_DISK_BYTES=$(( 16 * 1024 * 1024 * 1024 )) # 16 GiB min for server

tinapple_secureboot_enabled() {
  local var=${TINAPPLE_SB_VAR:-/sys/firmware/efi/efivars/SecureBoot-8be4df61-93ca-11d2-aa0d-00e098032b8c}
  [[ -e $var ]] || return 1
  local last
  last=$(tail -c1 "$var" 2>/dev/null | od -An -tu1 2>/dev/null | tr -d '[:space:]' || true)
  [[ $last == 1 ]]
}

tinapple_preflight() {
  step "preflight"
  log "running pre-flight system checks..."

  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    log_info "DRYRUN: would check EUID==0, x86_64 arch, UEFI/BIOS firmware, target disk"
    return 0
  fi

  # Root privileges
  [[ $EUID -eq 0 ]] || die "installer must run as root"

  # CPU Architecture
  local arch
  arch=$(uname -m)
  [[ "$arch" == "x86_64" ]] || die "unsupported CPU architecture: %s (tinapple requires x86_64)" "$arch"

  # Firmware detection
  if [[ -d /sys/firmware/efi ]]; then
    export TINAPPLE_FIRMWARE="uefi"
    log_info "detected UEFI firmware"
    if tinapple_secureboot_enabled && [[ ${TINAPPLE_ALLOW_SECUREBOOT:-0} != 1 ]]; then
      log_warn "Secure Boot is enabled. Limine bootloader may require enrolled keys or disabling Secure Boot in firmware."
    fi
  else
    export TINAPPLE_FIRMWARE="bios"
    log_info "detected Legacy BIOS firmware"
  fi

  # Target disk checks if disk is specified
  if [[ -n ${TINAPPLE_DISK:-} ]]; then
    [[ -b "$TINAPPLE_DISK" ]] || die "target disk %s is not a block device" "$TINAPPLE_DISK"
    
    local dtype
    dtype=$(lsblk -dno TYPE "$TINAPPLE_DISK" 2>/dev/null || true)
    [[ "$dtype" == "disk" ]] || die "target %s is a %s, not a whole disk" "$TINAPPLE_DISK" "${dtype:-unknown}"
    
    local size
    size=$(blockdev --getsize64 "$TINAPPLE_DISK")
    (( size >= TINAPPLE_MIN_DISK_BYTES )) || die "%s size is %d GiB; tinapple requires >= 16 GiB" "$TINAPPLE_DISK" "$(( size / 1024 / 1024 / 1024 ))"
    log_ok "disk %s verified (%d GiB)" "$TINAPPLE_DISK" "$(( size / 1024 / 1024 / 1024 ))"
  fi

  log_ok "pre-flight checks passed successfully"
}
