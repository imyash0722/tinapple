#!/usr/bin/env python3
"""
Tinapple Official Android APK Signer & Bundler
Generates valid JAR (v1) and CMS digital signatures for Android APKs.
"""

import sys
import os
import zipfile
import hashlib
import base64
import subprocess
import tempfile

def sign_apk(in_apk, out_apk, cert_pem, key_pem):
    if not os.path.exists(in_apk):
        raise FileNotFoundError(f"Source APK not found: {in_apk}")
    if not os.path.exists(cert_pem):
        raise FileNotFoundError(f"Certificate not found: {cert_pem}")
    if not os.path.exists(key_pem):
        raise FileNotFoundError(f"Key not found: {key_pem}")

    print(f"Reading source APK: {in_apk}")
    with zipfile.ZipFile(in_apk, 'r') as zin:
        entries = {}
        for item in zin.infolist():
            # Skip old signatures
            if item.filename.startswith('META-INF/'):
                continue
            data = zin.read(item.filename)
            entries[item.filename] = (item, data, hashlib.sha256(data).digest())

    print(f"Hashing {len(entries)} archive entries...")
    # 1. Generate MANIFEST.MF
    manifest_lines = [
        "Manifest-Version: 1.0\r\n",
        "Created-By: 1.0 (Tinapple Android Release Engine)\r\n\r\n"
    ]
    sf_entries = {}
    for name in sorted(entries.keys()):
        item, data, digest = entries[name]
        b64 = base64.b64encode(digest).decode('ascii')
        entry_str = f"Name: {name}\r\nSHA-256-Digest: {b64}\r\n\r\n"
        manifest_lines.append(entry_str)
        sf_entries[name] = base64.b64encode(hashlib.sha256(entry_str.encode('utf-8')).digest()).decode('ascii')

    manifest_bytes = "".join(manifest_lines).encode('utf-8')
    manifest_digest = base64.b64encode(hashlib.sha256(manifest_bytes).digest()).decode('ascii')

    # 2. Generate TINAPPLE.SF
    sf_lines = [
        "Signature-Version: 1.0\r\n",
        "Created-By: 1.0 (Tinapple Android Release Engine)\r\n",
        f"SHA-256-Digest-Manifest: {manifest_digest}\r\n\r\n"
    ]
    for name in sorted(sf_entries.keys()):
        sf_lines.append(f"Name: {name}\r\nSHA-256-Digest: {sf_entries[name]}\r\n\r\n")
    sf_bytes = "".join(sf_lines).encode('utf-8')

    # 3. Sign .SF file using OpenSSL CMS PKCS#7
    with tempfile.NamedTemporaryFile(delete=False) as f_sf:
        f_sf.write(sf_bytes)
        f_sf_path = f_sf.name

    f_rsa_path = f_sf_path + ".rsa"
    try:
        subprocess.check_call([
            "openssl", "cms", "-sign", "-in", f_sf_path, "-binary",
            "-outform", "DER", "-signer", cert_pem, "-inkey", key_pem,
            "-out", f_rsa_path, "-nosmimecap", "-noattr"
        ])
        with open(f_rsa_path, "rb") as f_rsa:
            rsa_bytes = f_rsa.read()
    finally:
        if os.path.exists(f_sf_path):
            os.unlink(f_sf_path)
        if os.path.exists(f_rsa_path):
            os.unlink(f_rsa_path)

    # 4. Write output signed APK
    print(f"Writing signed APK: {out_apk}")
    os.makedirs(os.path.dirname(os.path.abspath(out_apk)), exist_ok=True)
    with zipfile.ZipFile(out_apk, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        # Write META-INF digital signature blocks first
        zout.writestr("META-INF/MANIFEST.MF", manifest_bytes)
        zout.writestr("META-INF/TINAPPLE.SF", sf_bytes)
        zout.writestr("META-INF/TINAPPLE.RSA", rsa_bytes)

        for name in sorted(entries.keys()):
            item, data, _ = entries[name]
            compress_type = zipfile.ZIP_STORED if (name == 'resources.arsc' or item.compress_type == zipfile.ZIP_STORED) else zipfile.ZIP_DEFLATED
            zout.writestr(item.filename, data, compress_type=compress_type)

    size = os.path.getsize(out_apk)
    print(f"SUCCESS: Signed APK created successfully ({size} bytes, {size / (1024*1024):.2f} MB)")

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: sign-apk.py <in_apk> <out_apk> <cert_pem> <key_pem>")
        sys.exit(1)
    sign_apk(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
