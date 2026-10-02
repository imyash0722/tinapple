#!/usr/bin/env bash
# /usr/lib/tinapple-installer/backend/run-stage.sh
# Runs a single backend stage with manifest environment

set -euo pipefail

STAGE="${1:-}"
[[ -z "$STAGE" ]] && { echo "Usage: $0 <stage>"; exit 1; }

# Log all stage output to persistent installer log file
LOG_FILE="/var/log/tinapple-install.log"
if ! touch "$LOG_FILE" 2>/dev/null; then
    LOG_FILE="/tmp/tinapple-install.log"
fi
exec > >(tee -a "$LOG_FILE") 2>&1


# Locate backend library directory
if [[ -f "/usr/lib/tinapple-installer/backend/lib/common.sh" ]]; then
    BACKEND_LIB="/usr/lib/tinapple-installer/backend/lib"
elif [[ -n "${TINAPPLE_BACKEND_DIR:-}" && -f "${TINAPPLE_BACKEND_DIR}/lib/common.sh" ]]; then
    BACKEND_LIB="${TINAPPLE_BACKEND_DIR}/lib"
else
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [[ -f "${SCRIPT_DIR}/lib/common.sh" ]]; then
        BACKEND_LIB="${SCRIPT_DIR}/lib"
    elif [[ -f "${SCRIPT_DIR}/../backend/lib/common.sh" ]]; then
        BACKEND_LIB="$(cd "${SCRIPT_DIR}/../backend/lib" && pwd)"
    else
        BACKEND_LIB="/usr/lib/tinapple-installer/backend/lib"
    fi
fi

# Source common functions
source "${BACKEND_LIB}/common.sh"

# Source the specific stage module
STAGE_FILE="${BACKEND_LIB}/${STAGE}.sh"
if [[ ! -f "$STAGE_FILE" && "$STAGE" == "partition" && -f "${BACKEND_LIB}/disk.sh" ]]; then
    STAGE_FILE="${BACKEND_LIB}/disk.sh"
fi
[[ -f "$STAGE_FILE" ]] || { echo "Stage file not found: $STAGE_FILE"; exit 1; }
source "$STAGE_FILE"

# Call the stage function: tinapple_<stage>
FUNC="tinapple_${STAGE}"
FUNC_ALT="tinapple_${STAGE//-/_}"

TARGET_FUNC=""
if declare -f "$FUNC" > /dev/null; then
    TARGET_FUNC="$FUNC"
elif declare -f "$FUNC_ALT" > /dev/null; then
    TARGET_FUNC="$FUNC_ALT"
elif [[ "$STAGE" == "partition" ]] && declare -f "tinapple_partition_whole_disk" > /dev/null; then
    TARGET_FUNC="tinapple_partition_whole_disk"
elif [[ "$STAGE" == "filesystem" ]] && declare -f "tinapple_format_root" > /dev/null; then
    TARGET_FUNC="tinapple_format_root"
elif [[ "$STAGE" == "mount" ]] && declare -f "tinapple_mount_all" > /dev/null; then
    TARGET_FUNC="tinapple_mount_all"
elif [[ "$STAGE" == "mirrors" ]] && declare -f "tinapple_rank_mirrors" > /dev/null; then
    TARGET_FUNC="tinapple_rank_mirrors"
elif [[ "$STAGE" == "cachyos-repo" ]] && declare -f "tinapple_configure_cachyos_repo" > /dev/null; then
    TARGET_FUNC="tinapple_configure_cachyos_repo"
elif [[ "$STAGE" == "configure" ]] && declare -f "tinapple_configure_base" > /dev/null; then
    TARGET_FUNC="tinapple_configure_base"
elif [[ "$STAGE" == "deploy" ]] && declare -f "tinapple_deploy_configs" > /dev/null; then
    TARGET_FUNC="tinapple_deploy_configs"
elif [[ "$STAGE" == "network" ]] && declare -f "tinapple_configure_network" > /dev/null; then
    TARGET_FUNC="tinapple_configure_network"
elif [[ "$STAGE" == "drivers" ]] && declare -f "tinapple_detect_drivers" > /dev/null; then
    TARGET_FUNC="tinapple_detect_drivers"
fi

if [[ -n "$TARGET_FUNC" ]]; then
    log "Starting stage: $STAGE"
    "$TARGET_FUNC"
    log "Completed stage: $STAGE"
else
    echo "Function $FUNC not found in $STAGE_FILE"
    exit 1
fi
