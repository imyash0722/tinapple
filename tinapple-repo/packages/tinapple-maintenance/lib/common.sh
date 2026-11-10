#!/usr/bin/env bash
# Shared maintenance helpers; sourced by packaged entry points.
set -euo pipefail
ROOT=${TINAPPLE_ROOT:-/}
ROOT=${ROOT%/}
ROOT=${ROOT:-/}
ROOT=$(realpath -m -- "$ROOT")
DRY_RUN=${DRY_RUN:-0}
log() { printf '[tinapple-maintenance] %s\n' "$*" >&2; }
die() { log "ERROR: $*"; exit 1; }
run() { if (( DRY_RUN )); then printf '[dry-run] '; printf '%q ' "$@"; printf '\n'; else "$@"; fi; }
need_root() { (( DRY_RUN )) || [[ $EUID == 0 ]] || die 'Must run as root'; }
root_path() { printf '%s/%s' "${ROOT%/}" "${1#/}"; }
lock_maintenance() {
  (( DRY_RUN )) && return 0
  mkdir -p "${TINAPPLE_RUN_DIR:-/run/tinapple}"
  exec 9>"${TINAPPLE_RUN_DIR:-/run/tinapple}/maintenance.lock"
  flock -w 30 9 || die 'Another maintenance operation is active'
}
require_btrfs() {
  [[ $(findmnt -n -o FSTYPE -T "$ROOT") == btrfs ]] || die 'Root is not Btrfs; snapshot rollback is unavailable'
  [[ $(findmnt -n -o FSROOT -T "$ROOT") == /@ ]] || die 'Expected root subvolume @; restore from live media if booted into recovery'
}
maintenance_lib=${TINAPPLE_MAINTENANCE_LIB:-/usr/lib/tinapple-maintenance}
