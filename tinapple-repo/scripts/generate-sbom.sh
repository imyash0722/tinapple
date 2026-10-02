#!/usr/bin/env bash
# Generate CycloneDX SBOMs for tinapple-repo packages

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "$SCRIPT_DIR/generate-sbom.py"
