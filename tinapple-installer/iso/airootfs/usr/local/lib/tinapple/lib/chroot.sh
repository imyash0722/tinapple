#!/usr/bin/env bash
# chroot.sh — arch-chroot helpers and execution wrappers

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

tinapple_chroot_sh() {
  local target=${1:-/mnt}
  local script=$2

  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    log_info "DRYRUN: arch-chroot %s bash -c '%s'" "$target" "$script"
    return 0
  fi

  arch-chroot "$target" /usr/bin/bash -c "$script"
}

chroot_has() {
  local target=${1:-/mnt}
  local bin=$2
  [[ -x "$target/usr/bin/$bin" || -x "$target/bin/$bin" ]]
}
