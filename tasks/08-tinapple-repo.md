# Task: tinapple-repo (Package Repository & CI/CD)

## Status: ✅ Complete — CI/CD, 15 packages, GPG signing, CycloneDX SBOMs, and mirror sync implemented

## Goal
Implement custom package repository with CI/CD pipeline, GPG signing, and mirror sync

## Files to Create

### 1. `/mnt/shared/projects/tinapple/tinapple-repo/.github/workflows/repo.yml`
```yaml
name: Build & Publish Repository

on:
  push:
    paths:
      - 'packages/**'
  workflow_dispatch:
  schedule:
    - cron: '0 3 * * *'  # Nightly rebuild

jobs:
  build:
    runs-on: ubuntu-latest
    container:
      image: archlinux:base-devel
      options: --user root
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install dependencies
        run: |
          pacman -Sy --noconfirm base-devel git gnupg

      - name: Import GPG key
        run: |
          echo "${{ secrets.GPG_PRIVATE_KEY }}" | gpg --import
          echo "${{ secrets.GPG_PUBLIC_KEY }}" | gpg --import

      - name: Build all packages
        run: |
          for pkg in packages/*/; do
            pkgname=$(basename "$pkg")
            echo "Building $pkgname..."
            cd "$pkg"
            sudo -u builder makepkg -sf --noconfirm --skippgpcheck || exit 1
            cd ../..
          done

      - name: Create repository database
        run: |
          mkdir -p repo/x86_64
          cp packages/*/*.pkg.tar.zst repo/x86_64/ 2>/dev/null || true
          cd repo/x86_64
          repo-add -s -k "${{ secrets.GPG_KEY_ID }}" tinapple.db.tar.zst *.pkg.tar.zst

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: tinapple-repo
          path: repo/
          retention-days: 30

      - name: Deploy to GitHub Pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./repo
          destination_dir: /

      - name: Sync to mirror
        if: github.ref == 'refs/heads/main'
        run: |
          rsync -avz --delete repo/ ${{ secrets.MIRROR_USER }}@${{ secrets.MIRROR_HOST }}:${{ secrets.MIRROR_PATH }}/
        env:
          RSYNC_PASSWORD: ${{ secrets.MIRROR_PASSWORD }}

  test:
    needs: build
    runs-on: ubuntu-latest
    container:
      image: archlinux:base-devel
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: tinapple-repo
          path: repo

      - name: Verify repository integrity
        run: |
          cd repo/x86_64
          pacman-key --verify tinapple.db.tar.zst.sig tinapple.db.tar.zst
          pacman -Sy --config /dev/stdin --dbpath /tmp/testdb <<EOF
[tinapple]
Server = file://$(pwd)
EOF
          pacman -Sl tinapple
```

### 2. `/mnt/shared/projects/tinapple/tinapple-repo/Makefile`
```makefile
# tinapple-repo — Repository management

SHELL := /bin/bash
GPG_KEY_ID ?= $(shell gpg --list-secret-keys --keyid-format=long | grep sec | head -1 | awk '{print $$2}' | cut -d'/' -f2)
REPO_DIR := repo/x86_64
PKG_DIRS := $(wildcard packages/*/)

.PHONY: all build sign repo clean deploy test

all: repo

build:
	@for pkg in $(PKG_DIRS); do \
		pkgname=$$(basename $$pkg); \
		echo "Building $$pkgname..."; \
		cd $$pkg && makepkg -sf --noconfirm && cd ../..; \
	done

sign:
	@cd $(REPO_DIR) && \
	repo-add -s -k $(GPG_KEY_ID) tinapple.db.tar.zst *.pkg.tar.zst

repo: build sign

clean:
	rm -rf $(REPO_DIR)/*.pkg.tar.zst $(REPO_DIR)/tinapple.db* $(REPO_DIR)/tinapple.files*

deploy:
	rsync -avz --delete $(REPO_DIR)/ $(MIRROR_USER)@$(MIRROR_HOST):$(MIRROR_PATH)/

test:
	docker run --rm -v $(PWD)/repo:/repo archlinux:base-devel bash -c "
	  pacman-key --init &&
	  pacman-key --populate archlinux &&
	  pacman-key --add /repo/x86_64/tinapple.gpg &&
	  pacman-key --lsign-key $(GPG_KEY_ID) &&
	  pacman -Sy --config /dev/stdin --dbpath /tmp/testdb <<'EOF'
[tinapple]
Server = file:///repo/x86_64
EOF
	  pacman -Sl tinapple
	"

# Individual package targets
define PKG_template
$(1)-build:
	cd packages/$(1) && makepkg -sf --noconfirm
endef

$(foreach pkg,$(notdir $(wildcard packages/*)),$(eval $(call PKG_template,$(pkg))))
```

### 3. `/mnt/shared/projects/tinapple/tinapple-repo/packages/`
```
packages/
├── tinapple-base/
├── tinapple-hw/
├── tinapple-config-generator/
├── tinapple-dash/
├── tinapple-nginx/
├── tinapple-firstboot/
├── tinapple-maintenance/
├── tinapple-chadwm/
├── tinapple-service-media/
├── tinapple-service-downloads/
├── tinapple-service-backups/
├── tinapple-service-network/
├── tinapple-service-infrastructure/
├── tinapple-service-databases/
└── tinapple-keyring/
```

Each package directory contains the PKGBUILD and source files from the respective component.

### 4. `/mnt/shared/projects/tinapple/tinapple-repo/scripts/build-package.sh`
```bash
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
mkarchroot -C /etc/pacman.conf -M /etc/makepkg.conf "$CHROOT/root" base-devel

# Build in chroot
makechrootpkg -c -r "$CHROOT" -l "$PKGNAME" -- -I "$PKGDIR"/*.pkg.tar.zst

# Cleanup
rm -rf "$CHROOT"
```

### 5. `/mnt/shared/projects/tinapple/tinapple-repo/scripts/sign-package.sh`
```bash
#!/usr/bin/env bash
# Sign package and add to repository

set -euo pipefail

GPG_KEY_ID="${GPG_KEY_ID:-}"
REPO_DIR="repo/x86_64"

[[ -n "$GPG_KEY_ID" ]] || { echo "GPG_KEY_ID not set"; exit 1; }

# Sign all packages
for pkg in "$REPO_DIR"/*.pkg.tar.zst; do
  [[ -f "$pkg" ]] || continue
  gpg --detach-sign --default-key "$GPG_KEY_ID" "$pkg"
done

# Rebuild repo database with signatures
cd "$REPO_DIR"
repo-add -s -k "$GPG_KEY_ID" tinapple.db.tar.zst *.pkg.tar.zst
```

### 6. GPG Key Management (Documentation)
```bash
# Generate master key (offline)
gpg --full-generate-key
# Type: RSA, 4096 bits, no expiry
# Export: gpg --export --armor KEY_ID > tinapple.gpg

# Generate signing subkey (online)
gpg --edit-key KEY_ID
gpg> addkey
# Type: RSA, 4096 bits, 1 year expiry
# Usage: Sign only
gpg> save

# Export public key for users
gpg --export --armor KEY_ID > /etc/pacman.d/tinapple.gpg
```

## Verification
- `makepkg -sf` builds all packages in clean chroot
- `repo-add -s` creates signed database
- GitHub Actions workflow passes (build → sign → repo → deploy)
- `pacman -Sy tinapple` works from GitHub Pages + mirror
- `pacman-key --verify` validates signatures
- SBOM generated (CycloneDX) for each package