#!/usr/bin/env bash
# mirrors.sh — Rate and rank fastest Arch Linux & CachyOS mirrors

tinapple_rank_mirrors() {
  local target=${1:-/mnt}

  step "mirrors"
  log "ranking mirrors using rate-mirrors..."

  if [[ -n ${TINAPPLE_DRYRUN:-} ]]; then
    log_info "DRYRUN: would rank Arch and CachyOS mirrors into %s/etc/pacman.d/" "$target"
    return 0
  fi

  if command -v rate-mirrors >/dev/null 2>&1; then
    log_info "running rate-mirrors for arch..."
    rate-mirrors --allow-root arch | tee /tmp/arch-mirrorlist >/dev/null || true
    if [[ -s /tmp/arch-mirrorlist ]]; then
      mkdir -p "$target/etc/pacman.d" /etc/pacman.d
      cp /tmp/arch-mirrorlist "$target/etc/pacman.d/mirrorlist"
      cp /tmp/arch-mirrorlist /etc/pacman.d/mirrorlist
    fi
  elif command -v reflector >/dev/null 2>&1; then
    log_info "ranking mirrors using reflector..."
    mkdir -p "$target/etc/pacman.d" /etc/pacman.d
    reflector --latest 10 --protocol https --sort rate --connection-timeout 5 --download-timeout 5 --save "$target/etc/pacman.d/mirrorlist" || true
    if [[ -s "$target/etc/pacman.d/mirrorlist" ]]; then
      cp "$target/etc/pacman.d/mirrorlist" /etc/pacman.d/mirrorlist 2>/dev/null || true
    fi
  else
    log_info "mirror ranking tools not found; using existing mirrorlist"
  fi

  # Prepend fast global CDN mirrors at the very top of mirrorlist
  sed -i '1i Server = https://fastly.mirror.pkgbuild.com/$repo/os/$arch\nServer = https://geo.mirror.pkgbuild.com/$repo/os/$arch\nServer = https://mirrors.kernel.org/archlinux/$repo/os/$arch' "$target/etc/pacman.d/mirrorlist" 2>/dev/null || true
  sed -i '1i Server = https://fastly.mirror.pkgbuild.com/$repo/os/$arch\nServer = https://geo.mirror.pkgbuild.com/$repo/os/$arch\nServer = https://mirrors.kernel.org/archlinux/$repo/os/$arch' /etc/pacman.d/mirrorlist 2>/dev/null || true

  # Ensure CachyOS repos use the fast and reliable Cloudflare CDN
  for mlist in /etc/pacman.d/cachyos-v3-mirrorlist /etc/pacman.d/cachyos-mirrorlist "$target/etc/pacman.d/cachyos-v3-mirrorlist" "$target/etc/pacman.d/cachyos-mirrorlist"; do
    if [[ -f "$mlist" ]]; then
      if ! grep -q 'mirror.cachyos.org' "$mlist" 2>/dev/null; then
        sed -i '1i Server = https://mirror.cachyos.org/repo/$arch/$repo' "$mlist" 2>/dev/null || true
      fi
    fi
  done

  # Fallback: ensure /etc/pacman.d/mirrorlist and target have active mirrors
  mkdir -p "$target/etc/pacman.d" /etc/pacman.d
  if ! grep -q '^Server' "$target/etc/pacman.d/mirrorlist" 2>/dev/null; then
    log_info "populating target mirrorlist with default global mirrors..."
    cat << 'EOM' > "$target/etc/pacman.d/mirrorlist"
Server = https://geo.mirror.pkgbuild.com/$repo/os/$arch
Server = https://fastly.mirror.pkgbuild.com/$repo/os/$arch
Server = https://mirror.rackspace.com/archlinux/$repo/os/$arch
Server = https://mirrors.kernel.org/archlinux/$repo/os/$arch
EOM
  fi
  if ! grep -q '^Server' /etc/pacman.d/mirrorlist 2>/dev/null; then
    log_info "populating host mirrorlist with default global mirrors..."
    cp "$target/etc/pacman.d/mirrorlist" /etc/pacman.d/mirrorlist 2>/dev/null || true
  fi

  log_ok "mirrorlist configuration ready"
}

tinapple_mirrors() {
  tinapple_rank_mirrors "$@"
}
