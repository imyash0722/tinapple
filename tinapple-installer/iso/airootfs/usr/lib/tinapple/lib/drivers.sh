#!/usr/bin/env bash
# drivers.sh — Universal hardware detection & driver installation
# Inspired by: mhwd (Manjaro), ubuntu-drivers, nvidia-detect, hwdetect, dracut
# Scans PCI, USB, CPU, ACPI devices, resolves kernel module aliases,
# resolves microcode, handles firmware blobs, respects proprietary consent,
# and regenerates initramfs.

set -euo pipefail

# ─── Library Loading & Fallbacks ──────────────────────────────────────────

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
  # Minimal fallback functions if common.sh is not found
  step() { printf '@@STEP %s\n' "$1"; }
  done_step() { printf '@@DONE %s\n' "${1:-}"; }
  log() { printf "  [tinapple] %s\n" "$*"; }
  log_info() { printf "  \033[36m[INFO]\033[0m %s\n" "$*"; }
  log_warn() { printf "  \033[33m[WARN]\033[0m %s\n" "$*"; }
  log_ok() { printf "  \033[32m[OK]\033[0m %s\n" "$*"; }
  run() { if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then printf 'DRYRUN: %s\n' "$*"; return 0; fi; "$@" </dev/null; }
  run_sh() { if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then printf 'DRYRUN: %s\n' "$1"; return 0; fi; bash -c "$1" </dev/null; }
fi

if [[ -f "$(dirname "${BASH_SOURCE[0]}")/chroot.sh" ]]; then
  # shellcheck source=chroot.sh
  source "$(dirname "${BASH_SOURCE[0]}")/chroot.sh"
elif [[ -f "/usr/lib/tinapple-installer/backend/lib/chroot.sh" ]]; then
  # shellcheck source=/dev/null
  source "/usr/lib/tinapple-installer/backend/lib/chroot.sh"
fi

if ! declare -f tinapple_chroot >/dev/null; then
  tinapple_chroot() {
    local t=$1; shift
    if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
      log_info "DRYRUN: arch-chroot %s %s" "$t" "$*"
      return 0
    fi
    arch-chroot "$t" "$@"
  }
fi

if ! declare -f chroot_has >/dev/null; then
  chroot_has() {
    local target=${1:-/mnt}
    local bin=$2
    [[ -x "$target/usr/bin/$bin" || -x "$target/bin/$bin" ]]
  }
fi

if ! declare -f save_stage_env >/dev/null; then
  save_stage_env() {
    local target="${TINAPPLE_TARGET:-/mnt}"
    local env_dir="$target/etc/tinapple"
    mkdir -p "$env_dir" 2>/dev/null || true
    for var in "$@"; do
      if [[ -n "${!var:-}" ]]; then
        printf '%s=%q\n' "$var" "${!var}" >> "$env_dir/installer-env" 2>/dev/null || true
      fi
    done
  }
fi

DRIVERS_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="$(cd "${DRIVERS_LIB_DIR}/../../.." && pwd -P)"

# ─── Database and Alias Resolution Helpers ──────────────────────────────

find_pci_ids_file() {
  local target="${1:-/mnt}"
  local candidate
  for candidate in \
    "/usr/share/tinapple/hwdata/pci.ids" \
    "/usr/share/hwdata/pci.ids" \
    "${PROJECT_ROOT}/tinapple-hw/data/pci.ids" \
    "${PROJECT_ROOT}/tinapple-hw/data/hwdata/pci.ids" \
    "$target/usr/share/tinapple/hwdata/pci.ids" \
    "$target/usr/share/hwdata/pci.ids" \
    "/usr/share/misc/pci.ids"; do
    if [[ -f "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

find_hw_db_file() {
  local target="${1:-/mnt}"
  if [[ -n "${TINAPPLE_HW_DB:-}" && -f "${TINAPPLE_HW_DB}" ]]; then
    echo "${TINAPPLE_HW_DB}"
    return 0
  fi
  local candidate
  for candidate in \
    "/usr/share/tinapple/tinapple-hw-db.json" \
    "/usr/share/tinapple/data/tinapple-hw-db.json" \
    "${PROJECT_ROOT}/tinapple-hw/data/tinapple-hw-db.json" \
    "$target/usr/share/tinapple/tinapple-hw-db.json" \
    "$target/usr/share/tinapple/data/tinapple-hw-db.json"; do
    if [[ -f "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

find_modules_alias_file() {
  local target="${1:-/mnt}"
  local kver
  kver=$(uname -r 2>/dev/null || true)
  if [[ -n "$kver" && -f "/lib/modules/${kver}/modules.alias" ]]; then
    echo "/lib/modules/${kver}/modules.alias"
    return 0
  fi
  local f
  for f in /lib/modules/*/modules.alias; do
    if [[ -f "$f" ]]; then
      echo "$f"
      return 0
    fi
  done
  for f in "$target"/lib/modules/*/modules.alias "$target"/usr/lib/modules/*/modules.alias; do
    if [[ -f "$f" ]]; then
      echo "$f"
      return 0
    fi
  done
  return 1
}

find_usbmap_file() {
  local target="${1:-/mnt}"
  local kver
  kver=$(uname -r 2>/dev/null || true)
  if [[ -n "$kver" && -f "/lib/modules/${kver}/modules.usbmap" ]]; then
    echo "/lib/modules/${kver}/modules.usbmap"
    return 0
  fi
  local f
  for f in /lib/modules/*/modules.usbmap; do
    if [[ -f "$f" ]]; then
      echo "$f"
      return 0
    fi
  done
  for f in "$target"/lib/modules/*/modules.usbmap "$target"/usr/lib/modules/*/modules.usbmap; do
    if [[ -f "$f" ]]; then
      echo "$f"
      return 0
    fi
  done
  return 1
}

find_pcimap_file() {
  local target="${1:-/mnt}"
  local kver
  kver=$(uname -r 2>/dev/null || true)
  if [[ -n "$kver" && -f "/lib/modules/${kver}/modules.pcimap" ]]; then
    echo "/lib/modules/${kver}/modules.pcimap"
    return 0
  fi
  local f
  for f in /lib/modules/*/modules.pcimap; do
    if [[ -f "$f" ]]; then
      echo "$f"
      return 0
    fi
  done
  for f in "$target"/lib/modules/*/modules.pcimap "$target"/usr/lib/modules/*/modules.pcimap; do
    if [[ -f "$f" ]]; then
      echo "$f"
      return 0
    fi
  done
  return 1
}

resolve_pci_device_name() {
  local vendor="$1" device="$2" pci_ids_file="$3"
  [[ -f "$pci_ids_file" ]] || return 0

  awk -v v="$vendor" -v d="$device" '
    BEGIN { v=tolower(v); d=tolower(d); in_v=0; vname=""; dname="" }
    /^[0-9a-fA-F]{4}/ {
      if (tolower(substr($0,1,4)) == v) {
        in_v = 1
        vname = substr($0, 7)
      } else {
        in_v = 0
      }
    }
    in_v && /^\t[0-9a-fA-F]{4}/ {
      if (tolower(substr($0,2,4)) == d) {
        dname = substr($0, 8)
        print vname " - " dname
        exit
      }
    }
    END {
      if (dname == "" && vname != "") print vname
    }
  ' "$pci_ids_file" 2>/dev/null || true
}

resolve_module_aliases() {
  local pci_id="$1"  # format: vendor:device (e.g., 10de:1c82)
  local modules_alias="${2:-}"
  if [[ -z "$modules_alias" ]]; then
    modules_alias=$(find_modules_alias_file "" 2>/dev/null || true)
  fi
  [[ -n "$modules_alias" && -f "$modules_alias" ]] || return 0

  local vendor="${pci_id%%:*}"
  local device="${pci_id##*:}"
  local v_pad d_pad
  v_pad=$(printf "%08X" "0x$vendor" 2>/dev/null || echo "$vendor")
  d_pad=$(printf "%08X" "0x$device" 2>/dev/null || echo "$device")

  {
    grep -iE "alias pci:v(0000)?${vendor}d(0000)?${device}" "$modules_alias" 2>/dev/null || true
    grep -i "alias pci:v${v_pad}d${d_pad}" "$modules_alias" 2>/dev/null || true
  } | awk '{print $NF}' | sort -u
}

# ─── Detection Functions ────────────────────────────────────────────────

detect_cpu_microcode() {
  local cpu_vendor=""
  if [[ -f /proc/cpuinfo ]]; then
    cpu_vendor=$(grep -m1 'vendor_id' /proc/cpuinfo | awk '{print $3}')
  elif [[ -f /sys/devices/system/cpu/cpu0/uevent ]]; then
    cpu_vendor=$(grep 'VENDOR=' /sys/devices/system/cpu/cpu0/uevent | cut -d= -f2)
  fi

  case "$cpu_vendor" in
    GenuineIntel|Intel)
      detected_microcode="intel-ucode"
      essential_pkgs+=("intel-ucode")
      log_info "Intel CPU detected (%s) → intel-ucode" "$cpu_vendor"
      ;;
    AuthenticAMD|AMD)
      detected_microcode="amd-ucode"
      essential_pkgs+=("amd-ucode")
      log_info "AMD CPU detected (%s) → amd-ucode" "$cpu_vendor"
      ;;
    *)
      log_info "CPU detected: %s (no specific microcode package required)" "${cpu_vendor:-unknown}"
      ;;
  esac
}

detect_pci_devices() {
  local target="$1"
  local modules_alias="$2"
  local pci_ids_file="$3"
  local pcimap_file="$4"

  log_info "scanning PCI devices..."

  # 1. Scan via lspci -nn if available
  if command -v lspci >/dev/null 2>&1; then
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      local dev_id="" class_code=""
      # Extract [vendor:device]
      if [[ "$line" =~ \[([0-9a-fA-F]{4}):([0-9a-fA-F]{4})\] ]]; then
        dev_id="${BASH_REMATCH[1],,}:${BASH_REMATCH[2],,}"
      fi
      # Extract [class]:
      if [[ "$line" =~ \[([0-9a-fA-F]{4})\]: ]]; then
        class_code="${BASH_REMATCH[1],,}"
      fi
      if [[ -n "$dev_id" && -z "${TINAPPLE_PCI_CLASSES[$dev_id]:-}" ]]; then
        TINAPPLE_PCI_CLASSES["$dev_id"]="${class_code:-0000}"
        detected_pci_ids+=("$dev_id")
      fi
    done < <(lspci -nn 2>/dev/null || true)
  fi

  # 2. Augment / fallback from /sys/bus/pci/devices
  if [[ -d /sys/bus/pci/devices ]]; then
    local dev_dir
    for dev_dir in /sys/bus/pci/devices/*; do
      [[ -d "$dev_dir" ]] || continue
      local vendor="" device="" class=""
      if [[ -f "$dev_dir/vendor" ]]; then
        vendor=$(sed 's/0x//' "$dev_dir/vendor" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')
      fi
      if [[ -f "$dev_dir/device" ]]; then
        device=$(sed 's/0x//' "$dev_dir/device" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')
      fi
      if [[ -f "$dev_dir/class" ]]; then
        class=$(sed 's/0x//' "$dev_dir/class" | tr '[:upper:]' '[:lower:]' | cut -c 1-4)
      fi
      [[ -n "$vendor" && -n "$device" ]] || continue

      local pci_key="${vendor}:${device}"
      if [[ -z "${TINAPPLE_PCI_CLASSES[$pci_key]:-}" ]]; then
        TINAPPLE_PCI_CLASSES["$pci_key"]="${class:-0000}"
        detected_pci_ids+=("$pci_key")
      elif [[ -n "$class" && "${TINAPPLE_PCI_CLASSES[$pci_key]}" == "0000" ]]; then
        TINAPPLE_PCI_CLASSES["$pci_key"]="$class"
      fi
    done
  fi

  log_info "detected %d PCI device(s)" "${#detected_pci_ids[@]}"

  # Resolve modules and readable names for each PCI device
  local pci_id
  for pci_id in "${detected_pci_ids[@]}"; do
    local v="${pci_id%%:*}"
    local d="${pci_id##*:}"
    local class="${TINAPPLE_PCI_CLASSES[$pci_id]:-0000}"

    local dev_name=""
    if [[ -n "$pci_ids_file" ]]; then
      dev_name=$(resolve_pci_device_name "$v" "$d" "$pci_ids_file")
    fi

    # Query kernel module aliases
    local mod_list=()
    if [[ -n "$modules_alias" && -f "$modules_alias" ]]; then
      local v_pad d_pad
      v_pad=$(printf "%08X" "0x$v" 2>/dev/null || echo "$v")
      d_pad=$(printf "%08X" "0x$d" 2>/dev/null || echo "$d")

      # Match exact vendor + device from modules.alias
      while read -r mod; do
        [[ -n "$mod" ]] && mod_list+=("$mod")
      done < <({
        grep -iE "alias pci:v(0000)?${v}d(0000)?${d}" "$modules_alias" 2>/dev/null || true
        grep -i "alias pci:v${v_pad}d${d_pad}" "$modules_alias" 2>/dev/null || true
      } | awk '{print $NF}' | sort -u)

      # Class wildcard match for display controllers (03xx)
      if [[ ${#mod_list[@]} -eq 0 && "$class" =~ ^03 ]]; then
        while read -r mod; do
          [[ -n "$mod" ]] && mod_list+=("$mod")
        done < <(grep -i "alias pci:v${v_pad}d\*.*bc03" "$modules_alias" 2>/dev/null | awk '{print $NF}' | sort -u)
      fi
    fi

    # Check modules.pcimap if available
    if [[ -n "$pcimap_file" && -f "$pcimap_file" ]]; then
      while read -r mod; do
        [[ -n "$mod" ]] && mod_list+=("$mod")
      done < <(awk -v v="0x${v}" -v d="0x${d}" '
        BEGIN { v=tolower(v); d=tolower(d) }
        !/^#/ && NF >= 3 {
          if (tolower($2) == v && (tolower($3) == d || $3 == "0xffffffff")) print $1
        }
      ' "$pcimap_file" 2>/dev/null | sort -u)
    fi

    # Deduplicate module list for device
    local -a unique_mods=()
    local -A seen_m=()
    for m in "${mod_list[@]}"; do
      if [[ -z "${seen_m[$m]:-}" ]]; then
        seen_m["$m"]=1
        unique_mods+=("$m")
      fi
    done

    if [[ ${#unique_mods[@]} -gt 0 ]]; then
      TINAPPLE_DEV_MODULES["$pci_id"]="${unique_mods[*]}"
      for m in "${unique_mods[@]}"; do
        detected_modules+=("$m")
      done
      if [[ -n "$dev_name" ]]; then
        log_info "PCI %s (%s) → module: %s" "$pci_id" "$dev_name" "${unique_mods[*]}"
      else
        log_info "PCI %s → module: %s" "$pci_id" "${unique_mods[*]}"
      fi
    elif [[ -n "$dev_name" ]]; then
      log_info "PCI %s (%s)" "$pci_id" "$dev_name"
    fi
  done
}

detect_usb_devices() {
  local target="$1"
  local modules_alias="$2"
  local usbmap_file="$3"

  log_info "scanning USB devices..."
  local -A scanned_usb=()

  # 1. Scan via lsusb if available
  if command -v lsusb >/dev/null 2>&1; then
    while IFS= read -r line; do
      local id_part
      id_part=$(awk '{for(i=1;i<=NF;i++) if($i ~ /^[0-9a-fA-F]{4}:[0-9a-fA-F]{4}$/) print $i}' <<< "$line" | head -n1 | tr '[:upper:]' '[:lower:]')
      if [[ -n "$id_part" && -z "${scanned_usb[$id_part]:-}" ]]; then
        scanned_usb["$id_part"]=1
        detected_usb_ids+=("$id_part")
      fi
    done < <(lsusb 2>/dev/null || true)
  fi

  # 2. Augment / fallback from /sys/bus/usb/devices
  if [[ -d /sys/bus/usb/devices ]]; then
    local dev_dir
    for dev_dir in /sys/bus/usb/devices/*; do
      [[ -d "$dev_dir" ]] || continue
      local vendor="" product=""
      if [[ -f "$dev_dir/idVendor" ]]; then
        vendor=$(sed 's/0x//' "$dev_dir/idVendor" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')
      fi
      if [[ -f "$dev_dir/idProduct" ]]; then
        product=$(sed 's/0x//' "$dev_dir/idProduct" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')
      fi
      [[ -n "$vendor" && -n "$product" ]] || continue

      local usb_key="${vendor}:${product}"
      if [[ -z "${scanned_usb[$usb_key]:-}" ]]; then
        scanned_usb["$usb_key"]=1
        detected_usb_ids+=("$usb_key")
      fi
    done
  fi

  log_info "detected %d USB device(s)" "${#detected_usb_ids[@]}"

  # Check kernel module aliases and usbmap for USB devices
  local usb_id
  for usb_id in "${detected_usb_ids[@]}"; do
    local v="${usb_id%%:*}"
    local p="${usb_id##*:}"
    # Ignore Linux Foundation root hubs (1d6b)
    [[ "$v" == "1d6b" ]] && continue

    local mod_list=()

    # Query modules.usbmap if present
    if [[ -n "$usbmap_file" && -f "$usbmap_file" ]]; then
      while read -r mod; do
        [[ -n "$mod" ]] && mod_list+=("$mod")
      done < <(awk -v v="0x${v}" -v p="0x${p}" '
        BEGIN { v=tolower(v); p=tolower(p) }
        !/^#/ && NF >= 4 {
          if (tolower($3) == v && (tolower($4) == p || $4 == "0xffff")) print $1
        }
      ' "$usbmap_file" 2>/dev/null | sort -u)
    fi

    # Query modules.alias for USB aliases
    if [[ -n "$modules_alias" && -f "$modules_alias" ]]; then
      local v_pad p_pad
      v_pad=$(printf "%04X" "0x$v" 2>/dev/null || echo "$v")
      p_pad=$(printf "%04X" "0x$p" 2>/dev/null || echo "$p")

      while read -r mod; do
        [[ -n "$mod" ]] && mod_list+=("$mod")
      done < <(grep -i "alias usb:v${v_pad}p${p_pad}" "$modules_alias" 2>/dev/null | awk '{print $NF}' | sort -u)
    fi

    local -a unique_mods=()
    local -A seen_m=()
    for m in "${mod_list[@]}"; do
      if [[ -z "${seen_m[$m]:-}" ]]; then
        seen_m["$m"]=1
        unique_mods+=("$m")
      fi
    done

    if [[ ${#unique_mods[@]} -gt 0 ]]; then
      for m in "${unique_mods[@]}"; do
        detected_modules+=("$m")
      done
      log_info "USB %s → module: %s" "$usb_id" "${unique_mods[*]}"
    fi
  done
}

detect_acpi_devices() {
  log_info "scanning ACPI devices..."
  if [[ -d /sys/bus/acpi/devices ]]; then
    local acpi_dev
    for acpi_dev in /sys/bus/acpi/devices/*; do
      [[ -d "$acpi_dev" ]] || continue
      local modalias=""
      if [[ -f "$acpi_dev/modalias" ]]; then
        modalias=$(head -n1 "$acpi_dev/modalias" | tr -d '[:space:]')
      fi
      case "$modalias" in
        acpi:ACPI0003:*)
          detected_modules+=("ac")
          ;;
        acpi:PNP0C0A:*)
          detected_modules+=("battery")
          ;;
        acpi:PNP0C0D:*)
          detected_modules+=("button")
          ;;
        acpi:MSFT0101:*|acpi:PNP0C31:*)
          detected_modules+=("tpm_crb" "tpm_tis")
          ;;
        acpi:LNXTHERM:*|acpi:INT3400:*)
          detected_modules+=("thermal")
          ;;
      esac
    done
  fi

  # Check chassis/laptop status
  if [[ -f /sys/class/dmi/id/chassis_type ]]; then
    local ct
    ct=$(cat /sys/class/dmi/id/chassis_type 2>/dev/null || true)
    case "$ct" in
      8|9|10|11|12|14|18|21|30|31|32)
        log_info "laptop chassis detected (type %s)" "$ct"
        ;;
    esac
  fi
}

match_proprietary_drivers() {
  local target="$1"
  local hw_db_file="$2"

  log_info "matching proprietary and vendor-specific drivers..."

  # Table of known hardware mappings: ID -> packages
  # Key format: vendor:device (or vendor:* for family matches)
  declare -A proprietary_map=(
    # Broadcom WiFi (PCI)
    ["14e4:4359"]="broadcom-wl-dkms"      # BCM43228
    ["14e4:43a0"]="broadcom-wl-dkms"      # BCM4360
    ["14e4:4365"]="broadcom-wl-dkms"      # BCM43142
    ["14e4:43b1"]="broadcom-wl-dkms"      # BCM4352
    ["14e4:432b"]="broadcom-wl-dkms"      # BCM4322
    ["14e4:4331"]="broadcom-wl-dkms"      # BCM4331
    ["14e4:4358"]="broadcom-wl-dkms"      # BCM43227
    ["14e4:4727"]="broadcom-wl-dkms"      # BCM4313
    ["14e4:43a3"]="broadcom-wl-dkms"      # BCM4350
    ["14e4:43ba"]="broadcom-wl-dkms"      # BCM43602
    ["14e4:43ec"]="broadcom-wl-dkms"      # BCM4356
    ["14e4:43ef"]="broadcom-wl-dkms"      # BCM43570

    # Realtek PCIe Ethernet & WiFi
    ["10ec:8168"]="r8168-dkms"
    ["10ec:8125"]="r8125-dkms"
    ["10ec:8126"]="r8125-dkms"
    ["10ec:8169"]="linux-firmware"
    ["10ec:8852"]="rtl8852be-dkms"
    ["10ec:c852"]="linux-firmware"
    ["10ec:8821"]="rtl8821ce-dkms"
    ["10ec:c821"]="rtl8821ce-dkms"
    ["10ec:8822"]="rtl8822ce-dkms"
    ["10ec:c822"]="rtl8822ce-dkms"
    ["10ec:b822"]="rtl8822ce-dkms"

    # Realtek USB WiFi
    ["0bda:b812"]="rtl88x2bu-dkms-git"
    ["0bda:b82c"]="rtl88x2bu-dkms-git"
    ["0bda:c811"]="rtl8821cu-dkms-git"
    ["0bda:1a2b"]="rtl8821cu-dkms-git"
    ["0bda:8812"]="rtl8812au-dkms-git"
    ["0bda:a811"]="rtl8812au-dkms-git"
    ["0bda:0821"]="rtl8812au-dkms-git"
    ["0bda:c820"]="rtl8822bu-dkms-git"
    ["0bda:2822"]="rtl8822bu-dkms-git"
    ["0bda:8813"]="rtl8814au-dkms-git"

    # MediaTek WiFi
    ["0e8d:7610"]="mt76x2u-firmware"
    ["0e8d:7650"]="mt7663u-firmware"
    ["0e8d:7961"]="mt7921u-firmware"
    ["148f:761a"]="mt76x2u-firmware"
    ["148f:760a"]="mt7601u-firmware"
  )

  # Check PCI devices
  local pci_id
  for pci_id in "${detected_pci_ids[@]}"; do
    local v="${pci_id%%:*}"
    local d="${pci_id##*:}"
    local class="${TINAPPLE_PCI_CLASSES[$pci_id]:-0000}"
    local dev_mods="${TINAPPLE_DEV_MODULES[$pci_id]:-}"

    # NVIDIA GPU matching: 10de:* (Display controller class 03xx or fallback)
    if [[ "$v" == "10de" && ( "$class" =~ ^03 || "$class" == "0000" ) ]]; then
      log_info "NVIDIA device detected (%s) → nvidia-dkms, nvidia-utils" "$pci_id"
      proprietary_pkgs+=("nvidia-dkms" "nvidia-utils")
      has_nvidia=1
    fi

    # AMD GPU matching: 1002:* (Display controller class 03xx or module amdgpu/radeon)
    if [[ "$v" == "1002" && ( "$class" =~ ^03 || "$class" == "0000" ) ]]; then
      if [[ "$dev_mods" =~ amdgpu || "$dev_mods" =~ radeon || "$class" =~ ^03 ]]; then
        log_info "AMD GPU detected (%s) → xf86-video-amdgpu, mesa, vulkan-radeon" "$pci_id"
        essential_pkgs+=("xf86-video-amdgpu" "mesa" "vulkan-radeon")
      fi
    fi

    # Intel GPU matching: 8086:* (Display controller class 03xx or module i915/xe)
    if [[ "$v" == "8086" && ( "$class" =~ ^03 || "$class" == "0000" ) ]]; then
      if [[ "$dev_mods" =~ i915 || "$dev_mods" =~ xe || "$class" =~ ^03 ]]; then
        log_info "Intel GPU detected (%s) → intel-media-driver, intel-gpu-tools, mesa, vulkan-intel" "$pci_id"
        essential_pkgs+=("intel-media-driver" "intel-gpu-tools" "mesa" "vulkan-intel")
      fi
    fi

    # Specific PCI device map check
    if [[ -n "${proprietary_map[$pci_id]:-}" ]]; then
      local pkgs="${proprietary_map[$pci_id]}"
      log_info "matched hardware profile for %s → %s" "$pci_id" "$pkgs"
      for p in $pkgs; do
        if [[ "$p" =~ dkms || "$p" =~ nvidia ]]; then
          proprietary_pkgs+=("$p")
        else
          essential_pkgs+=("$p")
        fi
      done
    fi
  done

  # Check USB devices
  local usb_id
  for usb_id in "${detected_usb_ids[@]}"; do
    if [[ -n "${proprietary_map[$usb_id]:-}" ]]; then
      local pkgs="${proprietary_map[$usb_id]}"
      log_info "matched USB hardware profile for %s → %s" "$usb_id" "$pkgs"
      for p in $pkgs; do
        if [[ "$p" =~ dkms || "$p" =~ -git ]]; then
          proprietary_pkgs+=("$p")
        else
          essential_pkgs+=("$p")
        fi
      done
    fi
  done

  # Also query tinapple-hw-db.json if available
  if [[ -n "$hw_db_file" && -f "$hw_db_file" ]] && command -v jq >/dev/null 2>&1; then
    log_info "querying hardware database (%s)..." "$hw_db_file"
    local all_scanned=("${detected_pci_ids[@]}" "${detected_usb_ids[@]}")
    for id in "${all_scanned[@]}"; do
      local v="${id%%:*}"
      local d="${id##*:}"
      local pkgs
      pkgs=$(jq -r --arg v "$v" --arg d "$d" \
        '.devices[] | select((.vendor_id|ascii_downcase) == ($v|ascii_downcase) and (.device_id|ascii_downcase) == ($d|ascii_downcase)) | .packages[]?' \
        "$hw_db_file" 2>/dev/null || true)
      if [[ -n "$pkgs" ]]; then
        while read -r p; do
          [[ -n "$p" ]] || continue
          if [[ "$p" =~ dkms || "$p" =~ nvidia || "$p" =~ broadcom || "$p" =~ -git ]]; then
            proprietary_pkgs+=("$p")
          else
            essential_pkgs+=("$p")
          fi
        done <<< "$pkgs"
      fi
    done
  fi
}

detect_firmware_needs() {
  log_info "analyzing kernel modules for firmware requirements..."

  # Kernel module -> firmware / userspace package mappings
  declare -A firmware_map=(
    # Graphics
    ["amdgpu"]="linux-firmware amd-ucode"
    ["radeon"]="linux-firmware"
    ["i915"]="linux-firmware intel-media-driver intel-gpu-tools"
    ["xe"]="linux-firmware intel-media-driver intel-gpu-tools"
    ["nouveau"]="linux-firmware"
    ["nvidia"]="linux-firmware"

    # Wireless & Bluetooth
    ["iwlwifi"]="linux-firmware"
    ["iwlmvm"]="linux-firmware"
    ["btusb"]="linux-firmware"
    ["btrtl"]="linux-firmware"
    ["btintel"]="linux-firmware"
    ["btbcm"]="linux-firmware"
    ["btmtk"]="linux-firmware"
    ["ath9k"]="linux-firmware"
    ["ath9k_htc"]="linux-firmware"
    ["ath10k_core"]="linux-firmware"
    ["ath10k_pci"]="linux-firmware"
    ["ath11k"]="linux-firmware"
    ["ath11k_pci"]="linux-firmware"
    ["ath12k"]="linux-firmware"
    ["brcmfmac"]="linux-firmware"
    ["brcmsmac"]="linux-firmware"
    ["rtl8821ce"]="linux-firmware"
    ["rtl8822ce"]="linux-firmware"
    ["rtw88_core"]="linux-firmware"
    ["rtw88_pci"]="linux-firmware"
    ["rtw88_8822ce"]="linux-firmware"
    ["rtw88_8821ce"]="linux-firmware"
    ["rtw89_core"]="linux-firmware"
    ["rtw89_pci"]="linux-firmware"
    ["mt76"]="linux-firmware"
    ["mt76x0u"]="linux-firmware"
    ["mt76x2u"]="linux-firmware"
    ["mt7601u"]="linux-firmware"
    ["mt7921e"]="linux-firmware"
    ["mt7921u"]="linux-firmware"
    ["mt7915e"]="linux-firmware"

    # Audio DSP
    ["snd_hda_intel"]="sof-firmware alsa-firmware"
    ["snd_sof_pci"]="sof-firmware alsa-firmware"
    ["snd_sof_amd_rembrandt"]="sof-firmware alsa-firmware"
    ["snd_sof_amd_renoir"]="sof-firmware alsa-firmware"
    ["snd_sof_amd_vangogh"]="sof-firmware alsa-firmware"
    ["snd_sof_intel_hda_common"]="sof-firmware alsa-firmware"

    # Ethernet
    ["r8169"]="linux-firmware"
    ["e1000e"]="linux-firmware"
    ["igb"]="linux-firmware"
    ["igc"]="linux-firmware"
    ["tg3"]="linux-firmware"
    ["bnx2"]="linux-firmware"

    # Storage
    ["mpt3sas"]="linux-firmware"
    ["megaraid_sas"]="linux-firmware"
    ["qla2xxx"]="linux-firmware"
  )

  local mod
  for mod in "${detected_modules[@]}"; do
    for pattern in "${!firmware_map[@]}"; do
      if [[ "$mod" == "$pattern" ]]; then
        for pkg in ${firmware_map[$pattern]}; do
          essential_pkgs+=("$pkg")
        done
        break
      fi
    done
  done
}

confirm_install() {
  local pkgs=("$@")
  if [[ ${TINAPPLE_ENABLE_PROPRIETARY:-0} == 1 || "${TINAPPLE_PROPRIETARY_DRIVERS:-}" =~ ^[Yy] ]]; then
    return 0
  fi

  # In non-interactive or dry-run mode, do not prompt and default to no
  if [[ ! -t 0 || ! -t 1 || -n "${TINAPPLE_DRYRUN:-}" || -n "${TINAPPLE_AUTO_YES:-}" || "${CI:-}" == "true" ]]; then
    log_info "non-interactive / automated mode: skipping proprietary drivers (set TINAPPLE_ENABLE_PROPRIETARY=1 to enable)"
    return 1
  fi

  # Interactive prompt with TTY
  if [[ -c /dev/tty ]]; then
    echo
    printf "The following proprietary driver packages are recommended:\n"
    printf '  %s\n' "${pkgs[@]}"
    local confirm=""
    read -rp "Install these proprietary packages? [y/N]: " confirm </dev/tty || true
    [[ "${confirm,,}" == "y" || "${confirm,,}" == "yes" ]]
  else
    return 1
  fi
}

install_packages() {
  local target="$1"; shift
  local pkgs=("$@")
  [[ ${#pkgs[@]} -gt 0 ]] || return 0

  log "installing driver & firmware packages: %s" "${pkgs[*]}"

  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    log_info "DRYRUN: would install in %s: %s" "$target" "${pkgs[*]}"
    for p in "${pkgs[@]}"; do
      installed_pkgs+=("$p")
    done
    return 0
  fi

  local official_pkgs=()
  local aur_pkgs=()

  for p in "${pkgs[@]}"; do
    if [[ "$p" =~ -git$ || "$p" == "rtl8821ce-dkms" || "$p" == "rtl8822ce-dkms" || "$p" == "rtl8852be-dkms" ]]; then
      aur_pkgs+=("$p")
    else
      official_pkgs+=("$p")
    fi
  done

  # Install official packages via pacman in chroot
  if [[ ${#official_pkgs[@]} -gt 0 ]]; then
    log_info "installing official packages via pacman: %s" "${official_pkgs[*]}"
    if ! tinapple_chroot "$target" pacman -S --noconfirm --needed "${official_pkgs[@]}"; then
      log_warn "batch pacman install failed; attempting individual package installation..."
      for p in "${official_pkgs[@]}"; do
        if [[ "$p" == "nvidia-dkms" ]] && ! tinapple_chroot "$target" pacman -S --noconfirm --needed "$p" 2>/dev/null; then
          log_info "nvidia-dkms not found; attempting nvidia-open-dkms..."
          tinapple_chroot "$target" pacman -S --noconfirm --needed "nvidia-open-dkms" || log_warn "failed to install nvidia dkms"
        else
          tinapple_chroot "$target" pacman -S --noconfirm --needed "$p" || log_warn "failed to install: %s" "$p"
        fi
      done
    fi
    for p in "${official_pkgs[@]}"; do
      installed_pkgs+=("$p")
    done
  fi

  # Install AUR packages via paru or yay if present
  if [[ ${#aur_pkgs[@]} -gt 0 ]]; then
    log_info "handling AUR packages: %s" "${aur_pkgs[*]}"
    if chroot_has "$target" paru; then
      tinapple_chroot "$target" paru -S --noconfirm --needed "${aur_pkgs[@]}" || log_warn "some AUR driver packages failed"
      for p in "${aur_pkgs[@]}"; do installed_pkgs+=("$p"); done
    elif chroot_has "$target" yay; then
      tinapple_chroot "$target" yay -S --noconfirm --needed "${aur_pkgs[@]}" || log_warn "some AUR driver packages failed"
      for p in "${aur_pkgs[@]}"; do installed_pkgs+=("$p"); done
    else
      log_warn "neither paru nor yay found in target; deferred AUR driver packages: %s" "${aur_pkgs[*]}"
    fi
  fi
}

configure_early_kms() {
  local target="$1"
  if [[ $has_nvidia -eq 1 ]]; then
    log_info "configuring NVIDIA DRM modeset and early KMS hooks..."
    if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
      log_info "DRYRUN: would configure /etc/modprobe.d/tinapple-nvidia.conf"
      return 0
    fi
    mkdir -p "$target/etc/modprobe.d"
    cat << 'EOF' > "$target/etc/modprobe.d/tinapple-nvidia.conf"
# Tinapple OS NVIDIA configuration
options nvidia-drm modeset=1 fbdev=1
EOF

    # Add NVIDIA modules to mkinitcpio configuration if mkinitcpio is present
    if [[ -d "$target/etc/mkinitcpio.conf.d" ]]; then
      cat << 'EOF' > "$target/etc/mkinitcpio.conf.d/tinapple-nvidia.conf"
MODULES+=(nvidia nvidia_modeset nvidia_uvm nvidia_drm)
EOF
    fi
  fi
}

regenerate_initramfs_if_needed() {
  local target="$1"
  log_info "checking if initramfs regeneration is needed..."

  if [[ ${#installed_pkgs[@]} -eq 0 && -z "${detected_microcode:-}" ]]; then
    log_info "no new kernel modules or microcode installed; skipping initramfs regeneration"
    return 0
  fi

  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    log_info "DRYRUN: would regenerate initramfs in target %s" "$target"
    return 0
  fi

  if chroot_has "$target" mkinitcpio; then
    log_info "regenerating initramfs with mkinitcpio..."
    tinapple_chroot "$target" mkinitcpio -P || log_warn "mkinitcpio regeneration returned non-zero"
  elif chroot_has "$target" dracut; then
    log_info "regenerating initramfs with dracut..."
    tinapple_chroot "$target" dracut --regenerate-all --force || log_warn "dracut regeneration returned non-zero"
  else
    log_info "neither mkinitcpio nor dracut found in target; skipping initramfs regeneration"
  fi
}

# ─── Main Entry Point ──────────────────────────────────────────────────

tinapple_drivers() {
  local target=${1:-${TINAPPLE_TARGET:-/mnt}}

  step "drivers"
  log "performing universal hardware detection & driver resolution..."

  local -a detected_pci_ids=()
  local -a detected_usb_ids=()
  local -a detected_modules=()
  local -a essential_pkgs=()
  local -a proprietary_pkgs=()
  local -a to_install=()
  local -a installed_pkgs=()
  local detected_microcode=""
  local has_nvidia=0
  declare -g -A TINAPPLE_PCI_CLASSES=()
  declare -g -A TINAPPLE_DEV_MODULES=()

  # Locate database and alias files
  local pci_ids_file modules_alias hw_db_file usbmap_file pcimap_file
  pci_ids_file=$(find_pci_ids_file "$target" 2>/dev/null || true)
  modules_alias=$(find_modules_alias_file "$target" 2>/dev/null || true)
  hw_db_file=$(find_hw_db_file "$target" 2>/dev/null || true)
  usbmap_file=$(find_usbmap_file "$target" 2>/dev/null || true)
  pcimap_file=$(find_pcimap_file "$target" 2>/dev/null || true)

  log_info "PCI database: %s" "${pci_ids_file:-not found (using raw IDs)}"
  log_info "Kernel modules alias: %s" "${modules_alias:-not found}"
  log_info "Hardware database: %s" "${hw_db_file:-not found}"

  # 1. CPU Microcode Detection
  detect_cpu_microcode

  # 2. PCI Device Scan + Module Resolution
  detect_pci_devices "$target" "$modules_alias" "$pci_ids_file" "$pcimap_file"

  # 3. USB Device Scan + Module Resolution
  detect_usb_devices "$target" "$modules_alias" "$usbmap_file"

  # 4. ACPI & System Features
  detect_acpi_devices

  # 5. Proprietary Driver Matching
  match_proprietary_drivers "$target" "$hw_db_file"

  # 6. Firmware Requirements Mapping
  detect_firmware_needs

  # 7. Deduplicate Essential and Proprietary Package Lists
  local -a unique_essential=()
  local -A seen_essential=()
  for p in "${essential_pkgs[@]}"; do
    if [[ -z "${seen_essential[$p]:-}" ]]; then
      seen_essential["$p"]=1
      unique_essential+=("$p")
    fi
  done

  local -a unique_proprietary=()
  local -A seen_proprietary=()
  for p in "${proprietary_pkgs[@]}"; do
    if [[ -z "${seen_proprietary[$p]:-}" && -z "${seen_essential[$p]:-}" ]]; then
      seen_proprietary["$p"]=1
      unique_proprietary+=("$p")
    fi
  done

  # Essential packages (microcode, linux-firmware, open-source GPU) are always queued
  to_install+=("${unique_essential[@]}")

  # 8. User Consent for Proprietary Drivers
  if [[ ${#unique_proprietary[@]} -gt 0 ]]; then
    log_info "detected proprietary driver packages: %s" "${unique_proprietary[*]}"
    if confirm_install "${unique_proprietary[@]}"; then
      log_ok "user consent granted for proprietary drivers"
      to_install+=("${unique_proprietary[@]}")
    else
      log_info "proprietary driver installation skipped per user preference; retaining open-source stack"
    fi
  fi

  # 9. DKMS Dependency Resolution
  local needs_dkms=0
  for p in "${to_install[@]}"; do
    if [[ "$p" =~ dkms ]]; then
      needs_dkms=1
      break
    fi
  done

  if [[ $needs_dkms -eq 1 ]]; then
    to_install+=("dkms")
    # Resolve kernel headers package
    local kpkg="${TINAPPLE_KERNEL_PKG:-linux-lts}"
    local kprofile="${TINAPPLE_KERNEL_PROFILE:-lts}"
    case "$kprofile" in
      hardened) to_install+=("linux-hardened-headers") ;;
      current|linux) to_install+=("linux-headers") ;;
      cachyos*) to_install+=("linux-cachyos-headers") ;;
      *) to_install+=("linux-lts-headers") ;;
    esac
  fi

  # Deduplicate to_install
  local -a final_to_install=()
  local -A seen_install=()
  for p in "${to_install[@]}"; do
    if [[ -z "${seen_install[$p]:-}" ]]; then
      seen_install["$p"]=1
      final_to_install+=("$p")
    fi
  done

  local all_detected=("${unique_essential[@]}" "${unique_proprietary[@]}")
  export TINAPPLE_DETECTED_DRIVER_PKGS="${all_detected[*]}"
  export TINAPPLE_DETECTED_MODULES="${detected_modules[*]}"
  export TINAPPLE_MICROCODE_PKG="${detected_microcode:-none}"

  log_ok "detected recommended packages: %s" "${TINAPPLE_DETECTED_DRIVER_PKGS:-none}"

  # 10. Install Packages
  if [[ ${#final_to_install[@]} -gt 0 ]]; then
    install_packages "$target" "${final_to_install[@]}"
  fi

  # 11. Early KMS Configuration
  configure_early_kms "$target"

  # 12. Regenerate Initramfs if Needed
  regenerate_initramfs_if_needed "$target"

  export TINAPPLE_INSTALLED_DRIVER_PKGS="${installed_pkgs[*]}"
  save_stage_env TINAPPLE_DETECTED_DRIVER_PKGS TINAPPLE_INSTALLED_DRIVER_PKGS TINAPPLE_DETECTED_MODULES TINAPPLE_MICROCODE_PKG

  done_step "drivers"
  log_ok "Universal driver detection & installation complete"
  return 0
}

tinapple_detect_drivers() {
  tinapple_drivers "$@"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  tinapple_drivers "$@"
fi
