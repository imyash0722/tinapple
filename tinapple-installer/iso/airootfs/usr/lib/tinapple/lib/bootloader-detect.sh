#!/usr/bin/env bash
# bootloader-detect.sh — Detect firmware type, existing bootloader, and recommend GRUB vs Limine
# Following tinapple architecture specification (GRUB + Limine only)

tinapple_bootloader_detect() {
  step "bootloader-detect"
  log "detecting firmware and existing bootloaders..."

  # 1. Firmware type
  if [[ -d /sys/firmware/efi ]]; then
    export TINAPPLE_FIRMWARE="uefi"
  else
    export TINAPPLE_FIRMWARE="bios"
  fi

  # 2. Existing bootloader (for in-place transforms or dual-boot inspection)
  if [[ -f /boot/grub/grub.cfg ]] || [[ -f /boot/grub2/grub.cfg ]] || [[ -d /boot/grub ]]; then
    export TINAPPLE_EXISTING_BOOTLOADER="grub"
  elif [[ -f /boot/EFI/limine/limine.conf ]] || [[ -f /boot/limine.conf ]] || [[ -d /boot/EFI/limine ]]; then
    export TINAPPLE_EXISTING_BOOTLOADER="limine"
  else
    export TINAPPLE_EXISTING_BOOTLOADER="none"
  fi

  # 3. Recommendation logic
  case "$TINAPPLE_FIRMWARE" in
    uefi)
      if [[ "$TINAPPLE_EXISTING_BOOTLOADER" == "grub" ]]; then
        export TINAPPLE_RECOMMENDED_BOOTLOADER="grub"
      else
        export TINAPPLE_RECOMMENDED_BOOTLOADER="limine" # modern, UKI-native for UEFI
      fi
      ;;
    bios)
      # BIOS: ONLY GRUB works; Limine cannot boot legacy BIOS
      export TINAPPLE_RECOMMENDED_BOOTLOADER="grub"
      ;;
  esac

  log_info "firmware: %s" "$TINAPPLE_FIRMWARE"
  log_info "existing bootloader: %s" "$TINAPPLE_EXISTING_BOOTLOADER"
  log_ok "recommended bootloader: %s" "$TINAPPLE_RECOMMENDED_BOOTLOADER"
}

tinapple_validate_bootloader_selection() {
  local selected=${1:-${TINAPPLE_BOOTLOADER:-$TINAPPLE_RECOMMENDED_BOOTLOADER}}
  if [[ "$TINAPPLE_FIRMWARE" == "bios" && "$selected" == "limine" ]]; then
    die "Limine bootloader is only supported on UEFI systems. BIOS systems MUST use GRUB."
  fi
  export TINAPPLE_BOOTLOADER="$selected"
}

function tinapple_bootloader-detect() {
  tinapple_bootloader_detect "$@"
}
