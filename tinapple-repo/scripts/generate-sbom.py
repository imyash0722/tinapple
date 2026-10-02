#!/usr/bin/env python3
"""
Generate CycloneDX 1.5 JSON SBOMs for tinapple repository packages.
"""

import os
import sys
import json
import uuid
import datetime
import subprocess
from pathlib import Path

def parse_pkgbuild(pkgdir):
    script = f"""
    cd "{pkgdir}"
    unset pkgname pkgver pkgrel pkgdesc arch license depends
    source ./PKGBUILD >/dev/null 2>&1
    echo "$pkgname"
    echo "$pkgver"
    echo "$pkgrel"
    echo "$pkgdesc"
    echo "${{arch[*]}}"
    echo "${{license[*]}}"
    printf '%s;' "${{depends[@]}}"
    echo
    """
    try:
        out = subprocess.check_output(["bash", "-c", script], universal_newlines=True).strip().splitlines()
        if len(out) >= 6:
            pkgname = out[0].strip()
            pkgver = out[1].strip()
            pkgrel = out[2].strip()
            pkgdesc = out[3].strip()
            arch = out[4].strip().split()[0] if out[4].strip() else "x86_64"
            license_val = out[5].strip()
            deps = [d.strip() for d in out[6].strip().split(";") if d.strip()] if len(out) > 6 else []
            return {
                "name": pkgname,
                "version": f"{pkgver}-{pkgrel}",
                "description": pkgdesc,
                "arch": arch,
                "license": license_val or "MIT",
                "depends": deps,
                "path": str(pkgdir)
            }
    except Exception as e:
        print(f"Warning: could not parse {pkgdir}: {e}", file=sys.stderr)
    return None

def build_cyclonedx_doc(components, metadata_name="tinapple-repository"):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    doc = {
        "$schema": "http://cyclonedx.org/schema/bom-1.5.json",
        "bomFormat": "CycloneDX",
        "specVersion": "1.5",
        "serialNumber": f"urn:uuid:{uuid.uuid4()}",
        "version": 1,
        "metadata": {
            "timestamp": now,
            "tools": {
                "components": [
                    {
                        "type": "application",
                        "name": "tinapple-sbom-generator",
                        "version": "0.0.1"
                    }
                ]
            },
            "component": {
                "type": "operating-system",
                "name": metadata_name,
                "version": "0.0.1",
                "description": "Tinapple homelab OS custom package repository"
            }
        },
        "components": components,
        "dependencies": [
            {
                "ref": c["bom-ref"],
                "depends": []
            }
            for c in components
        ]
    }
    return doc

def main():
    root = Path(__file__).resolve().parent.parent
    packages_dir = root / "packages"
    repo_dir = root / "repo" / "x86_64"
    repo_dir.mkdir(parents=True, exist_ok=True)

    components = []
    print(f"Generating CycloneDX SBOMs for packages in {packages_dir}...")

    for pkg_dir in sorted(packages_dir.iterdir()):
        if not pkg_dir.is_dir() or not (pkg_dir / "PKGBUILD").exists():
            continue
        info = parse_pkgbuild(pkg_dir)
        if not info:
            continue

        bom_ref = f"pkg:alpm/tinapple/{info['name']}@{info['version']}?arch={info['arch']}"
        comp = {
            "type": "application",
            "bom-ref": bom_ref,
            "name": info["name"],
            "version": info["version"],
            "description": info["description"],
            "licenses": [{"license": {"id": info["license"]}}],
            "purl": bom_ref,
            "properties": [
                {"name": "arch", "value": info["arch"]},
                {"name": "distribution", "value": "tinapple"}
            ]
        }
        if info["depends"]:
            comp["properties"].append({
                "name": "dependencies",
                "value": ", ".join(info["depends"])
            })

        components.append(comp)

        # Write single-component SBOM
        single_doc = build_cyclonedx_doc([comp], metadata_name=info["name"])
        single_path = repo_dir / f"{info['name']}-{info['version']}.cdx.json"
        with open(single_path, "w") as f:
            json.dump(single_doc, f, indent=2)
        print(f"  ✓ {single_path.name}")

    # Write aggregate repo SBOM
    aggregate_doc = build_cyclonedx_doc(components, metadata_name="tinapple-repository")
    aggregate_path = repo_dir / "tinapple-repo.cdx.json"
    with open(aggregate_path, "w") as f:
        json.dump(aggregate_doc, f, indent=2)
    print(f"  ✓ Aggregate SBOM: {aggregate_path.name} ({len(components)} components)")

if __name__ == "__main__":
    main()
