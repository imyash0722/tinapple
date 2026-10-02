#!/usr/bin/env bash
# luks.sh — LUKS2 disk encryption, keyfiles, TPM2 auto-unlock

tinapple_luks_format() {
  local part=$1
  local map_name=${2:-tinapple-crypt}
  local passphrase=$3

  step "luks"
  log "setting up LUKS2 encryption on %s -> %s..." "$part" "$map_name"

  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    log_info "DRYRUN: cryptsetup luksFormat --type luks2 %s" "$part"
    log_info "DRYRUN: cryptsetup open %s %s" "$part" "$map_name"
    export TINAPPLE_LUKS_MAPPED="/dev/mapper/$map_name"
    return 0
  fi

  echo -n "$passphrase" | cryptsetup luksFormat \
    --type luks2 \
    --cipher aes-xts-plain64 \
    --key-size 512 \
    --hash sha512 \
    --pbkdf argon2id \
    --batch-mode \
    "$part" - || die "failed to format LUKS2 on %s" "$part"

  echo -n "$passphrase" | cryptsetup open "$part" "$map_name" - || die "failed to open LUKS2 partition %s" "$part"
  export TINAPPLE_LUKS_MAPPED="/dev/mapper/$map_name"
  log_ok "LUKS2 unlocked as %s" "$TINAPPLE_LUKS_MAPPED"
}

tinapple_luks_enable_tpm2() {
  local part=$1
  log "enrolling TPM2 auto-unlock on %s..." "$part"
  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    log_info "DRYRUN: systemd-cryptenroll --tpm2-device=auto %s" "$part"
    return 0
  fi
  if systemd-cryptenroll --tpm2-device=list 2>/dev/null | grep -q "TPM2"; then
    systemd-cryptenroll --tpm2-device=auto "$part" || log_warn "TPM2 enrollment failed, manual passphrase required"
  else
    log_info "no compatible TPM2 device found; skipping TPM2 auto-unlock"
  fi
}

tinapple_luks() {
  local stage="${TINAPPLE_STAGE:-luks}"
  step "$stage"
  if [[ "${TINAPPLE_LUKS:-no}" == "yes" ]]; then
    local disk="${TINAPPLE_DISK:-/dev/vda}"
    local part="${TINAPPLE_PART_ROOT:-$(part_dev "$disk" 3)}"
    local passphrase="${TINAPPLE_LUKS_PASSPHRASE:-tinapple}"
    tinapple_luks_format "$part" "tinapple-crypt" "$passphrase"
  else
    log "disk encryption disabled, skipping LUKS"
    log_ok "LUKS step skipped (encryption not selected)"
  fi
  done_step "$stage"
  return 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  tinapple_luks "$@"
fi

