# tinapple-repo — Repository management

SHELL := /bin/bash
GPG_KEY_ID ?= $(shell gpg --list-secret-keys --keyid-format=long 2>/dev/null | grep sec | head -1 | awk '{print $$2}' | cut -d'/' -f2)
REPO_DIR := repo/x86_64
PKG_DIRS := $(wildcard packages/*/)
BUILDDIR ?= /tmp/tinapple-makepkg
MAKEPKG_FLAGS ?= $(shell sudo -n true 2>/dev/null && echo "-sf --noconfirm" || echo "--nodeps -f")
export BUILDDIR

.PHONY: all build sign repo clean deploy test sbom

all: repo

build:
	@mkdir -p $(REPO_DIR)
	@for pkg in $(PKG_DIRS); do \
		pkgname=$$(basename $$pkg); \
		echo "Building $$pkgname..."; \
		(cd $$pkg && makepkg $(MAKEPKG_FLAGS)) || exit 1; \
		cp -f $$pkg*.pkg.tar.zst $(REPO_DIR)/ 2>/dev/null || true; \
	done
	@cp -f packages/*/*.pkg.tar.zst $(REPO_DIR)/ 2>/dev/null || true

sign:
	@REPO_DIR="$(REPO_DIR)" GPG_KEY_ID="$(GPG_KEY_ID)" ./scripts/sign-package.sh

repo: build sign

sbom:
	@./scripts/generate-sbom.sh

clean:
	rm -rf $(REPO_DIR)/*.pkg.tar.zst $(REPO_DIR)/tinapple.db* $(REPO_DIR)/tinapple.files* $(REPO_DIR)/*.sig packages/*/*.pkg.tar.zst

deploy:
	rsync -avz --delete $(REPO_DIR)/ $(MIRROR_USER)@$(MIRROR_HOST):$(MIRROR_PATH)/

test:
	docker run --rm -v $(PWD)/repo:/repo archlinux:base-devel bash -c " \
	  pacman-key --init && \
	  pacman-key --populate archlinux && \
	  pacman-key --add /repo/x86_64/tinapple.gpg && \
	  pacman-key --lsign-key $(GPG_KEY_ID) && \
	  pacman -Sy --config /dev/stdin --dbpath /tmp/testdb <<'EOF' \
[tinapple] \
Server = file:///repo/x86_64 \
EOF \
	  pacman -Sl tinapple \
	"

# Individual package targets
define PKG_template
$(1)-build:
	@mkdir -p $(REPO_DIR)
	cd packages/$(1) && makepkg $(MAKEPKG_FLAGS)
	cp -f packages/$(1)/*.pkg.tar.zst $(REPO_DIR)/ 2>/dev/null || true
endef

$(foreach pkg,$(notdir $(patsubst %/,%,$(wildcard packages/*))),$(eval $(call PKG_template,$(pkg))))
