#!/usr/bin/env bash
# partition.sh — Disk partitioning module (wraps disk.sh)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/disk.sh"
