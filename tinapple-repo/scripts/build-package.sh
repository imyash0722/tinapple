#!/usr/bin/env bash
# Build a single package in clean chroot

set -euo pipefail

PKGNAME="${1:-}"
[[ -n "$PKGNAME" ]] || { echo "Usage: $0 <package-name>"; exit 1; }

PKGDIR="packages/$PKGNAME"
[[ -d "$PKGDIR" ]] || { echo "Package $PKGNAME not found"; exit 1; }

# Create clean chroot
CHROOT="/tmp/tinapple-chroot-$$"
mkdir -p "$CHROOT"
trap 'rm -rf "$CHROOT"' EXIT INT TERM

mkarchroot -C /etc/pacman.conf -M /etc/makepkg.conf "$CHROOT/root" base-devel

# Build in chroot
makechrootpkg -c -r "$CHROOT" -l "$PKGNAME" -- -I "$PKGDIR"/*.pkg.tar.zst
