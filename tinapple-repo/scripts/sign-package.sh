#!/usr/bin/env bash
# Sign package and add to repository

set -euo pipefail

GPG_KEY_ID="${GPG_KEY_ID:-$(gpg --list-secret-keys --keyid-format=long 2>/dev/null | grep sec | head -1 | awk '{print $2}' | cut -d'/' -f2)}"
REPO_DIR="${REPO_DIR:-repo/x86_64}"

[[ -n "$GPG_KEY_ID" ]] || { echo "GPG_KEY_ID not set and no secret key found in gpg keyring"; exit 1; }

mkdir -p "$REPO_DIR"

# Copy keyring public key if present
if [[ -f "packages/tinapple-keyring/tinapple.gpg" ]]; then
  cp -f "packages/tinapple-keyring/tinapple.gpg" "$REPO_DIR/tinapple.gpg"
fi

# Sign all packages
for pkg in "$REPO_DIR"/*.pkg.tar.zst; do
  [[ -f "$pkg" ]] || continue
  echo "Signing $(basename "$pkg")..."
  gpg --batch --yes --detach-sign --default-key "$GPG_KEY_ID" "$pkg"
done

# Rebuild repo database with signatures
cd "$REPO_DIR"
shopt -s nullglob
pkgs=(*.pkg.tar.zst)
if (( ${#pkgs[@]} > 0 )); then
  rm -f tinapple.db* tinapple.files*
  echo "Updating repository database tinapple.db.tar.zst..."
  repo-add -s -k "$GPG_KEY_ID" tinapple.db.tar.zst "${pkgs[@]}"
else
  echo "No packages found in $REPO_DIR"
fi
