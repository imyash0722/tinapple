# tinapple-repo — Package Repository & CI/CD

Custom Arch Linux package repository infrastructure for **tinapple** homelab OS, featuring automated CI/CD builds, GPG package and database signing, CycloneDX SBOM generation, and mirror synchronization.

---

## Repository Structure

```
tinapple-repo/
├── .github/workflows/
│   └── repo.yml                  # GitHub Actions CI/CD: build, sign, db, SBOM, deploy
├── docs/
│   └── GPG_KEY_MANAGEMENT.md     # Key generation, rotation, and distribution guide
├── packages/                     # 15 Custom tinapple packages
│   ├── tinapple-base/            # Core meta-package & baseline configurations
│   ├── tinapple-hw/              # Hardware detection & power/thermal management
│   ├── tinapple-config-generator/# Go manifest.yaml generator
│   ├── tinapple-dash/            # Go web dashboard & telemetry daemon
│   ├── tinapple-nginx/           # Caddy reverse proxy core module
│   ├── tinapple-firstboot/       # Interactive TTY1 setup wizard
│   ├── tinapple-maintenance/     # Health checks, pacman hooks & snapper rollback
│   ├── tinapple-chadwm/          # Window manager, rices & session switcher
│   ├── tinapple-service-media/   # Jellyfin + *arr stack
│   ├── tinapple-service-downloads/# qBittorrent, Transmission, JDownloader2
│   ├── tinapple-service-backups/ # Restic, Borg, Rclone, Syncthing, SnapRAID
│   ├── tinapple-service-network/ # Tailscale, WireGuard, Pi-hole, Unbound
│   ├── tinapple-service-infrastructure/# Prometheus, Grafana, Loki, Tempo
│   ├── tinapple-service-databases/# PostgreSQL, MariaDB, Redis, MongoDB, InfluxDB
│   └── tinapple-keyring/         # Repository GPG signing key package
├── repo/
│   └── x86_64/                   # Output repository: *.pkg.tar.zst, *.sig, tinapple.db.tar.zst
├── scripts/
│   ├── build-package.sh          # Clean chroot package builder (makechrootpkg)
│   ├── sign-package.sh           # GPG package detached signer & repo-add indexer
│   ├── generate-sbom.py          # CycloneDX 1.5 JSON SBOM generator
│   └── generate-sbom.sh          # Wrapper for SBOM generation
└── Makefile                      # Local build, sign, test, and deploy targets
```

---

## Quickstart

### 1. Build and Index the Entire Repository
```bash
make repo
```
This builds all packages in `packages/*/`, copies output packages to `repo/x86_64/`, signs each package with GPG, and creates the signed pacman database `tinapple.db.tar.zst`.

### 2. Generate CycloneDX SBOMs
```bash
make sbom
```
Produces individual SBOMs (`<pkgname>-<pkgver>.cdx.json`) and an aggregate repo SBOM (`tinapple-repo.cdx.json`) inside `repo/x86_64/`.

### 3. Test Repository in Docker
```bash
make test
```
Runs an Arch Linux container that imports the GPG key, validates database signatures, and tests package querying via `pacman -Sl tinapple`.

---

## Client Configuration

To configure an Arch Linux system to use the `tinapple` repository:

```ini
# /etc/pacman.conf
[tinapple]
SigLevel = Required DatabaseOptional
Server = https://repo.tinapple.org/x86_64
Server = https://tinapple.github.io/tinapple-repo/x86_64
```
