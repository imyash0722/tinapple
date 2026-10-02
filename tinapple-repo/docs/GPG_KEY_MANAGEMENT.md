# GPG Key Management for tinapple-repo

This document details the GPG key lifecycle, key generation, signing architecture, distribution, and rotation procedures for the `tinapple` custom package repository.

---

## 1. Key Architecture

The Tinapple signing architecture separates the master certification key from operational subkeys:

- **Master Key (Offline / Air-Gapped)**:
  - Algorithm: RSA 4096-bit
  - Capabilities: `[C]` (Certify only)
  - Expiration: Never
  - Storage: Offline storage / secure hardware token

- **Release Signing Subkey (Online / CI/CD)**:
  - Algorithm: RSA 4096-bit
  - Capabilities: `[S]` (Sign only)
  - Expiration: 1 year (rotated annually)
  - Storage: Encrypted in CI secrets (`GPG_PRIVATE_KEY`) or build host

---

## 2. Generating Keys

### Step 2.1: Generate Master Key (Offline)

```bash
# Generate master key
gpg --full-generate-key
# Select: (1) RSA and RSA (default) or RSA (set your own capabilities) -> Certify only
# Keysize: 4096 bits
# Expiration: 0 (does not expire)
# Real name: Tinapple Release Key
# Email: releases@tinapple.org
# Passphrase: <Strong Master Passphrase>

# Note the Key ID and Fingerprint:
KEY_ID=$(gpg --list-secret-keys --keyid-format=long | grep sec | head -1 | awk '{print $2}' | cut -d'/' -f2)
echo "Master Key ID: $KEY_ID"
```

### Step 2.2: Generate Signing Subkey (Online)

```bash
# Add signing subkey
gpg --edit-key "$KEY_ID"
gpg> addkey
# Select: (4) RSA (sign only)
# Keysize: 4096 bits
# Expiration: 1y (1 year)
gpg> save
```

### Step 2.3: Export Keys

```bash
# Export public keyring for pacman distribution
gpg --export "$KEY_ID" > tinapple.gpg

# Export ASCII armor public key for manual import
gpg --export --armor "$KEY_ID" > /etc/pacman.d/tinapple.gpg

# Export private signing key for CI/CD secret
gpg --export-secret-subkeys --armor "$KEY_ID" > tinapple-signing-subkey.asc
```

---

## 3. Client Installation & Trust

### Option A: Using `tinapple-keyring` package (Recommended)

Clients installing `tinapple-keyring` automatically populate pacman's trust database:

```bash
# The package installs:
#   /usr/share/pacman/keyrings/tinapple.gpg
#   /usr/share/pacman/keyrings/tinapple-trusted
#   /usr/share/pacman/keyrings/tinapple-revoked
pacman-key --populate tinapple
```

### Option B: Manual pacman-key import

```bash
# Import key into local pacman keyring
pacman-key --add /etc/pacman.d/tinapple.gpg

# Locally sign key to trust it for repository verification
pacman-key --lsign-key "$KEY_ID"
```

---

## 4. Key Rotation Procedure

1. Generate new signing subkey or new key pair.
2. Export updated public key to `packages/tinapple-keyring/tinapple.gpg`.
3. Add the new key fingerprint with `:4:` trust level to `packages/tinapple-keyring/tinapple-trusted`.
4. If revoking an old key, append its fingerprint to `packages/tinapple-keyring/tinapple-revoked`.
5. Bump `pkgver` in `packages/tinapple-keyring/PKGBUILD` and rebuild the repository.
6. When clients run `pacman -Syu`, the updated `tinapple-keyring` package runs `pacman-key --populate tinapple`, updating trust automatically.
