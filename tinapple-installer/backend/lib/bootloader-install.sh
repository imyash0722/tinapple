#!/usr/bin/env bash
# bootloader-install.sh — Install and configure bootloader: GRUB (BIOS) or systemd-boot + Limine (UEFI)
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

tinapple_bootloader_install() {
  local target=${1:-/mnt}
  local disk=${TINAPPLE_DISK:-/dev/sda}

  # Dynamically and authoritatively detect root partition
  local root_part="${TINAPPLE_LUKS_MAPPED:-${TINAPPLE_PART_ROOT:-}}"
  if [[ -z "$root_part" ]]; then
    root_part=$(findmnt -n -o SOURCE "$target" 2>/dev/null || true)
  fi
  root_part="${root_part%%\[*}"
  if [[ -z "$root_part" ]]; then
    if [[ -n "${TINAPPLE_SWAP_GIB:-}" && "${TINAPPLE_SWAP_GIB}" -eq 0 ]] || [[ "${TINAPPLE_PART_SWAP:-}" == "none" ]]; then
      root_part="$(part_dev "$disk" 2)"
    else
      root_part="$(part_dev "$disk" 3)"
    fi
  fi

  # Dynamically and authoritatively detect ESP partition
  local esp_part="${TINAPPLE_PART_ESP:-}"
  if [[ -z "$esp_part" ]]; then
    esp_part=$(findmnt -n -o SOURCE "$target/boot" 2>/dev/null || true)
  fi
  esp_part="${esp_part%%\[*}"
  if [[ -z "$esp_part" ]]; then
    esp_part="$(part_dev "$disk" 1)"
  fi

  local raw_root=${TINAPPLE_PART_ROOT:-$root_part}
  local swap_part=${TINAPPLE_PART_SWAP:-}
  if [[ -z "$swap_part" && "${TINAPPLE_SWAP_GIB:-1}" -ne 0 && "${TINAPPLE_PART_SWAP:-}" != "none" ]]; then
    swap_part="$(part_dev "$disk" 2)"
  fi
  local luks=${TINAPPLE_LUKS:-no}
  local kernel_profile=${TINAPPLE_KERNEL_PROFILE:-lts}
  local bootloader=${TINAPPLE_BOOTLOADER:-${TINAPPLE_RECOMMENDED_BOOTLOADER:-limine}}

  # Firmware detection: [[ -d /sys/firmware/efi ]] -> uefi, else bios
  local firmware="${TINAPPLE_FIRMWARE:-}"
  if [[ -z "$firmware" ]]; then
    if [[ -d /sys/firmware/efi ]]; then
      firmware="uefi"
    else
      firmware="bios"
    fi
  fi

  step "bootloader-install"
  log "installing bootloader for %s firmware on disk %s..." "$firmware" "$disk"

  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    log_info "DRYRUN: installing %s bootloader on %s" "$bootloader" "$disk"
    done_step "bootloader-install"
    log_ok "bootloader installation completed (dry-run)"
    return 0
  fi

  # Kernel image naming
  local kernel_pkg="linux-lts"
  local initrd="initramfs-linux-lts.img"
  local initrd_fallback="initramfs-linux-lts-fallback.img"
  case "$kernel_profile" in
    hardened)
      kernel_pkg="linux-hardened"
      initrd="initramfs-linux-hardened.img"
      initrd_fallback="initramfs-linux-hardened-fallback.img"
      ;;
    current|linux)
      kernel_pkg="linux"
      initrd="initramfs-linux.img"
      initrd_fallback="initramfs-linux-fallback.img"
      ;;
  esac

  # Determine root device UUID
  local root_uuid
  root_uuid=$(dev_uuid "$root_part") || root_uuid="ROOT-UUID"

  # Kernel command-line generation
  local fs_type="${TINAPPLE_FS:-}"
  if [[ -z "$fs_type" ]]; then
    fs_type=$(findmnt -n -o FSTYPE "$target" 2>/dev/null || true)
  fi
  local fs_opts=""
  if [[ "$fs_type" == "btrfs" ]]; then
    local subvol
    subvol=$(findmnt -n -o FSROOT "$target" 2>/dev/null || echo "/@")
    subvol="${subvol#/}"
    [[ -z "$subvol" ]] && subvol="@"
    fs_opts="rootflags=subvol=${subvol} "
  fi
  local cmdline="root=UUID=$root_uuid ${fs_opts}rw console=ttyS0,115200 console=tty1 quiet loglevel=3 audit=0"

  # Handle LUKS encryption
  local is_luks=0
  local luks_uuid=""
  if [[ "$luks" == "yes" || -n "${TINAPPLE_LUKS_MAPPED:-}" ]]; then
    is_luks=1
    luks_uuid=$(dev_uuid "$raw_root") || luks_uuid="LUKS-UUID"
    cmdline="rd.luks.name=$luks_uuid=tinapple-crypt root=/dev/mapper/tinapple-crypt ${fs_opts}rw console=ttyS0,115200 console=tty1 quiet loglevel=3 audit=0"
  fi

  # Add resume partition if swap exists
  if [[ -n "$swap_part" ]]; then
    local swap_uuid
    swap_uuid=$(dev_uuid "$swap_part") || swap_uuid=""
    if [[ -n "$swap_uuid" ]]; then
      cmdline="$cmdline resume=UUID=$swap_uuid"
    fi
  fi

  if [[ "$firmware" == "uefi" ]]; then
    if [[ "$bootloader" == "grub" ]]; then
      log_info "installing UEFI bootloader (GRUB)..."
      run_sh "mkdir -p $target/boot/grub $target/etc/default"
      if (( is_luks == 1 )); then
        run_sh "echo 'GRUB_ENABLE_CRYPTODISK=y' >> $target/etc/default/grub"
        run_sh "sed -i 's|^GRUB_CMDLINE_LINUX=.*|GRUB_CMDLINE_LINUX=\"$cmdline\"|' $target/etc/default/grub 2>/dev/null || echo 'GRUB_CMDLINE_LINUX=\"$cmdline\"' >> $target/etc/default/grub"
      fi
      run arch-chroot "$target" grub-install --target=x86_64-efi --efi-directory=/boot --bootloader-id=tinapple --removable --recheck || true
      run arch-chroot "$target" grub-mkconfig -o /boot/grub/grub.cfg

      # Ensure grub.cfg and modules are accessible regardless of search prefix
      run_sh "cp $target/boot/grub/grub.cfg $target/boot/EFI/BOOT/grub.cfg 2>/dev/null || true"
      run_sh "mkdir -p $target/boot/boot && cp -a $target/boot/grub $target/boot/boot/ 2>/dev/null || true"
    else
      log_info "installing UEFI bootloader (systemd-boot + Limine)..."

      # 1. systemd-boot: bootctl install --path=/boot
      run arch-chroot "$target" bootctl install --path=/boot || true

      # 2. Create loader entries in /boot/loader/entries/
      mkdir -p "$target/boot/loader/entries"
      cat << EOF > "$target/boot/loader/loader.conf"
default tinapple.conf
timeout 3
console-mode max
editor no
EOF

      cat << EOF > "$target/boot/loader/entries/tinapple.conf"
title   tinapple OS (${kernel_profile})
linux   /vmlinuz-$kernel_pkg
initrd  /$initrd
options $cmdline
EOF

      cat << EOF > "$target/boot/loader/entries/tinapple-fallback.conf"
title   tinapple OS (${kernel_profile} fallback)
linux   /vmlinuz-$kernel_pkg
initrd  /$initrd_fallback
options $cmdline
EOF

      # 3. Install limine UEFI binary if available
      mkdir -p "$target/boot/EFI/BOOT" "$target/boot/EFI/limine" "$target/boot/limine"
      if [[ -f "$target/usr/share/limine/BOOTX64.EFI" ]]; then
        cp "$target/usr/share/limine/BOOTX64.EFI" "$target/boot/EFI/BOOT/BOOTX64.EFI"
        cp "$target/usr/share/limine/BOOTX64.EFI" "$target/boot/EFI/limine/BOOTX64.EFI"
      fi

      # 4. Configure limine: /boot/limine.conf
      cat << EOF > "$target/boot/limine.conf"
timeout: 5
default_entry: 1
interface_branding: tinapple OS (Limine Boot Manager)
serial: yes

/tinapple OS (${kernel_profile})
    protocol: linux
    path: boot():/vmlinuz-$kernel_pkg
    cmdline: $cmdline
    module_path: boot():/$initrd

/tinapple OS (Fallback)
    protocol: linux
    path: boot():/vmlinuz-$kernel_pkg
    cmdline: $cmdline
    module_path: boot():/$initrd_fallback
EOF

      cp "$target/boot/limine.conf" "$target/boot/EFI/BOOT/limine.conf" 2>/dev/null || true
      cp "$target/boot/limine.conf" "$target/boot/EFI/limine/limine.conf" 2>/dev/null || true
      sync
    fi

  else
    log_info "installing BIOS bootloader (GRUB)..."

    # 1. BIOS (GRUB): grub-install --target=i386-pc /dev/sdX
    run arch-chroot "$target" grub-install --target=i386-pc "$disk"

    # 2. Handle LUKS: GRUB_ENABLE_CRYPTODISK=y
    if (( is_luks == 1 )); then
      run_sh "mkdir -p $target/etc/default && echo 'GRUB_ENABLE_CRYPTODISK=y' >> $target/etc/default/grub"
      run_sh "sed -i 's|^GRUB_CMDLINE_LINUX=.*|GRUB_CMDLINE_LINUX=\"$cmdline\"|' $target/etc/default/grub 2>/dev/null || echo 'GRUB_CMDLINE_LINUX=\"$cmdline\"' >> $target/etc/default/grub"
    fi

    # 3. grub-mkconfig -o /boot/grub/grub.cfg
    run arch-chroot "$target" grub-mkconfig -o /boot/grub/grub.cfg
  fi

  # Export output variables for next stage
  export TINAPPLE_BOOTLOADER_INSTALLED="true"
  export TINAPPLE_STAGE="bootloader-install"
  export TINAPPLE_CMDLINE="$cmdline"
  export TINAPPLE_BOOTLOADER_FIRMWARE="$firmware"

  done_step "bootloader-install"
  log_ok "bootloader installation completed successfully"
  return 0
}

tinapple_install_bootloader() {
  tinapple_bootloader_install "$@"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  tinapple_bootloader_install "$@"
fi
