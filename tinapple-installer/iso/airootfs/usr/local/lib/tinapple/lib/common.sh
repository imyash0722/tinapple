#!/usr/bin/env bash
# common.sh — Shared helpers for tinapple-installer
# Logging, dry-run abstraction, progress sentinels, and utility functions.
# Sourced by other backend modules; do not execute directly.

# Colors
C_RESET='\033[0m'
C_BOLD='\033[1m'
C_GREEN='\033[32m'
C_YELLOW='\033[33m'
C_RED='\033[31m'
C_CYAN='\033[36m'
C_BLUE='\033[34m'

# Progress sentinel for TUI tracking
step() {
  local stage=$1
  TINAPPLE_STAGE="$stage"
  printf '@@STEP %s\n' "$stage"
}

done_step() {
  printf '@@DONE %s\n' "${1:-}"
}

# General logging
log() {
  local fmt=$1
  shift || true
  # shellcheck disable=SC2059
  printf "  [tinapple] ${fmt}\n" "$@"
}

log_info() {
  local fmt=$1
  shift || true
  # shellcheck disable=SC2059
  printf "  ${C_CYAN}[INFO]${C_RESET} ${fmt}\n" "$@"
}

log_warn() {
  local fmt=$1
  shift || true
  # shellcheck disable=SC2059
  printf "  ${C_YELLOW}[WARN]${C_RESET} ${fmt}\n" "$@"
}

log_ok() {
  local fmt=$1
  shift || true
  # shellcheck disable=SC2059
  printf "  ${C_GREEN}[OK]${C_RESET} ${fmt}\n" "$@"
}

die() {
  local fmt=$1
  shift || true
  # shellcheck disable=SC2059
  printf "${C_RED}[FATAL ERROR]${C_RESET} ${fmt}\n" "$@" >&2
  exit 1
}

# Run a command or echo if dry-run
run() {
  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    printf 'DRYRUN: %s\n' "$*"
    return 0
  fi
  "$@" </dev/null
}

# Run shell pipeline/string or echo if dry-run
run_sh() {
  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    printf 'DRYRUN: %s\n' "$1"
    return 0
  fi
  bash -c "$1" </dev/null
}

# Run secret input command (redacted under dryrun)
run_secret() {
  local label=$1; shift
  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    cat >/dev/null 2>&1 || true
    printf 'DRYRUN: %s\n' "$label"
    return 0
  fi
  "$@"
}

# Write stdin to target file
write_file() {
  local path=$1 content
  content=$(cat)
  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    printf 'DRYRUN: write %s\n' "$path"
    return 0
  fi
  mkdir -p "$(dirname "$path")"
  printf '%s\n' "$content" >"$path"
}

# Append stdin to target file
append_file() {
  local path=$1 content
  content=$(cat)
  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    printf 'DRYRUN: append %s\n' "$path"
    return 0
  fi
  mkdir -p "$(dirname "$path")"
  printf '%s\n' "$content" >>"$path"
}

# Deploy directory contents
deploy_dir() {
  local src=$1 dst=$2
  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    printf 'DRYRUN: mkdir -p %s && cp -rT %s %s\n' "$dst" "$src" "$dst"
    return 0
  fi
  [[ -d $src ]] || { log_warn "source %s not present, skipping" "$src"; return 0; }
  mkdir -p "$dst"
  cp -rT "$src" "$dst"
}

# Partition device naming helper (e.g. nvme0n1 -> nvme0n1p1 vs sda -> sda1)
part_dev() {
  local disk=$1 num=$2
  if [[ $disk == *[0-9] ]]; then
    printf '%sp%s' "$disk" "$num"
  else
    printf '%s%s' "$disk" "$num"
  fi
}

# Get partition number from device path
part_num() {
  [[ $1 =~ ([0-9]+)$ ]] && printf '%s' "${BASH_REMATCH[1]}"
}

# Arch-chroot helper wrapper
tinapple_chroot() {
  local target=${1:-/mnt}
  shift
  local cmd=("$@")
  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    log_info "DRYRUN: arch-chroot %s %s" "$target" "${cmd[*]}"
    return 0
  fi
  arch-chroot "$target" "${cmd[@]}"
}

# Get filesystem UUID for block device
dev_uuid() {
  local dev="$1"
  dev="${dev%%\[*}"
  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    printf '<UUID:%s>' "$dev"
    return 0
  fi
  local uuid
  uuid=$(blkid -s UUID -o value "$dev" 2>/dev/null) || true
  [[ -n $uuid ]] || return 1
  printf '%s' "$uuid"
}

# Load environment variables saved by previous stages without overriding existing env
load_stage_env() {
  for env_file in /run/tinapple/env /tmp/tinapple-env; do
    [[ -f "$env_file" ]] || continue
    while IFS= read -r line; do
      [[ "$line" =~ ^export\ ([A-Za-z_0-9]+)=\"(.*)\"$ ]] || continue
      local k="${BASH_REMATCH[1]}"
      local v="${BASH_REMATCH[2]}"
      if [[ -z "${!k+x}" ]]; then
        export "$k=$v"
      fi
    done < "$env_file"
  done
}

# Persist environment variables for subsequent stages
save_stage_env() {
  local vars=("$@")
  if [[ ${#vars[@]} -eq 0 ]]; then
    vars=(
      TINAPPLE_DISK
      TINAPPLE_FIRMWARE
      TINAPPLE_DISK_STRATEGY
      TINAPPLE_FS
      TINAPPLE_SWAP_GIB
      TINAPPLE_ESP_GIB
      TINAPPLE_PART_ESP
      TINAPPLE_PART_SWAP
      TINAPPLE_PART_ROOT
      TINAPPLE_LUKS
      TINAPPLE_LUKS_MAPPED
    )
  fi

  local out=""
  for var in "${vars[@]}"; do
    if [[ -n "${!var+x}" ]]; then
      out+="export ${var}=\"${!var}\""$'\n'
    fi
  done

  if mkdir -p /run/tinapple 2>/dev/null && [[ -w /run/tinapple ]]; then
    printf '%s' "$out" > /run/tinapple/env 2>/dev/null || true
  fi
  printf '%s' "$out" > /tmp/tinapple-env 2>/dev/null || true
}

