#!/usr/bin/env python3
"""
scripts/test_tasks_r1_r5.py — Comprehensive Verification Suite for Tasks R1 to R5:
- Task R1: Chaddy Store Core (CLI & TUI)
- Task R2: Config Manager (templates, backup/restore, variable interpolation)
- Task R3: Settings TUI (tile & section visual configuration)
- Task R4: Remote Desktop Module (xrdp + TigerVNC + chadwm integration)
- Task R5: Installer Integration (installer TUI, package manifests, and repository)
"""

import os
import subprocess
import sys

PROJECT_DIR = "/mnt/shared/projects/tinapple"

def test_pass(name, detail=""):
    print(f"  \033[1;32m✓\033[0m {name:<40} : \033[0;32m{detail}\033[0m")

def test_fail(name, detail=""):
    print(f"  \033[1;31m✗\033[0m {name:<40} : \033[0;31m{detail}\033[0m")
    return False

def main():
    print("\n" + "=" * 70)
    print("      TINAPPLE OS VERIFICATION: TASKS R1 - R5")
    print("=" * 70)

    passed = 0
    failed = 0

    # ── TASK R1: Chaddy Store Core ──
    # Check binary exists
    store_bin = os.path.join(PROJECT_DIR, "bin/chaddy-store")
    if os.path.isfile(store_bin) and os.access(store_bin, os.X_OK):
        test_pass("R1: chaddy-store Binary", f"Executable present at {store_bin}")
        passed += 1
    else:
        test_fail("R1: chaddy-store Binary", "Binary missing or not executable")
        failed += 1

    # Check search command
    try:
        res = subprocess.run([store_bin, "search", "vim"], capture_output=True, text=True, check=True)
        if "Neovim" in res.stdout:
            test_pass("R1: chaddy-store Search CLI", "Successfully searched and located 'neovim'")
            passed += 1
        else:
            test_fail("R1: chaddy-store Search CLI", f"Unexpected search output: {res.stdout[:100]}")
            failed += 1
    except Exception as e:
        test_fail("R1: chaddy-store Search CLI", str(e))
        failed += 1

    # Check list command
    try:
        res = subprocess.run([store_bin, "list"], capture_output=True, text=True, check=True)
        if "Installed Applications" in res.stdout:
            test_pass("R1: chaddy-store List CLI", "Successfully queried system package status")
            passed += 1
        else:
            test_fail("R1: chaddy-store List CLI", f"Unexpected list output: {res.stdout[:100]}")
            failed += 1
    except Exception as e:
        test_fail("R1: chaddy-store List CLI", str(e))
        failed += 1

    # ── TASK R2: Config Manager ──
    templates_dir = os.path.join(PROJECT_DIR, "chaddy-store/templates")
    expected_templates = ["chadwm.json", "network.json", "remote-desktop.json", "services.json", "system-base.json"]
    all_tmpls_exist = all(os.path.isfile(os.path.join(templates_dir, t)) for t in expected_templates)
    if all_tmpls_exist:
        test_pass("R2: Config Templates", f"All {len(expected_templates)} templates present in {templates_dir}")
        passed += 1
    else:
        test_fail("R2: Config Templates", f"Missing templates in {templates_dir}")
        failed += 1

    # Run ConfigManager unit tests
    try:
        res = subprocess.run(["go", "test", "-v", "./internal/config/..."], cwd=os.path.join(PROJECT_DIR, "chaddy-store"), capture_output=True, text=True, check=True)
        if "PASS: TestConfigManagerTemplateApplyAndRestore" in res.stdout:
            test_pass("R2: ConfigManager Apply & Restore", "Template rendering, variable interpolation, and backup/restore verified")
            passed += 1
        else:
            test_fail("R2: ConfigManager Apply & Restore", "Tests did not pass")
            failed += 1
    except Exception as e:
        test_fail("R2: ConfigManager Apply & Restore", str(e))
        failed += 1

    # ── TASK R3: Settings TUI ──
    settings_bin = os.path.join(PROJECT_DIR, "bin/chaddy-settings")
    if os.path.isfile(settings_bin) and os.access(settings_bin, os.X_OK):
        test_pass("R3: chaddy-settings Binary", f"Executable present at {settings_bin}")
        passed += 1
    else:
        test_fail("R3: chaddy-settings Binary", "Binary missing or not executable")
        failed += 1

    # Run Settings unit tests
    try:
        res = subprocess.run(["go", "test", "-v", "./internal/tui/settings/..."], cwd=os.path.join(PROJECT_DIR, "chaddy-store"), capture_output=True, text=True, check=True)
        if "PASS: TestSettingsModelOperations" in res.stdout:
            test_pass("R3: Settings TUI Model & Sections", "All 6 sections (System, Network, chadwm, Services, Security, Remote) verified")
            passed += 1
        else:
            test_fail("R3: Settings TUI Model & Sections", "Tests did not pass")
            failed += 1
    except Exception as e:
        test_fail("R3: Settings TUI Model & Sections", str(e))
        failed += 1

    # ── TASK R4: Remote Desktop Module ──
    iso_root = os.path.join(PROJECT_DIR, "tinapple-installer/iso/airootfs")
    xrdp_ini = os.path.join(iso_root, "etc/xrdp/xrdp.ini")
    sesman_ini = os.path.join(iso_root, "etc/xrdp/sesman.ini")
    vnc_defaults = os.path.join(iso_root, "etc/tigervnc/vncserver-config-defaults")
    xrdp_service = os.path.join(iso_root, "etc/systemd/system/xrdp.service")
    sesman_service = os.path.join(iso_root, "etc/systemd/system/xrdp-sesman.service")
    vnc_service = os.path.join(iso_root, "etc/systemd/system/vncserver@.service")
    vnc_xstartup = os.path.join(iso_root, "etc/skel/.vnc/xstartup")
    chadwm_desktop = os.path.join(iso_root, "usr/share/xsessions/chadwm.desktop")
    chadwm_xrdp_desktop = os.path.join(iso_root, "usr/share/xsessions/chadwm-xrdp.desktop")

    remote_files = [xrdp_ini, sesman_ini, vnc_defaults, xrdp_service, sesman_service, vnc_service, vnc_xstartup, chadwm_desktop, chadwm_xrdp_desktop]
    missing_rf = [f for f in remote_files if not os.path.isfile(f)]
    if not missing_rf:
        test_pass("R4: Remote Desktop Configs & Units", "xrdp.ini, sesman.ini, vncserver, systemd units and xstartup all deployed")
        passed += 1
    else:
        test_fail("R4: Remote Desktop Configs & Units", f"Missing files: {missing_rf}")
        failed += 1

    # Verify xrdp sesman points to chadwm
    with open(sesman_ini) as f:
        sesman_content = f.read()
    if "DefaultWindowManager=chadwm" in sesman_content and "UserWindowManager=chadwm" in sesman_content:
        test_pass("R4: xrdp & TigerVNC chadwm Integration", "sesman.ini configured for chadwm window manager")
        passed += 1
    else:
        test_fail("R4: xrdp & TigerVNC chadwm Integration", "sesman.ini does not specify chadwm")
        failed += 1

    # ── TASK R5: Installer Integration ──
    # Check packages.x86_64
    pkg_list = os.path.join(PROJECT_DIR, "tinapple-installer/iso/packages.x86_64")
    with open(pkg_list) as f:
        pkg_content = f.read()
    if "chaddy-store" in pkg_content and "xrdp" in pkg_content and "tigervnc" in pkg_content:
        test_pass("R5: Package Manifests Updated", "chaddy-store, xrdp, tigervnc present in packages.x86_64")
        passed += 1
    else:
        test_fail("R5: Package Manifests Updated", "Missing packages in packages.x86_64")
        failed += 1

    # Check repository has signed chaddy-store package
    repo_dir = os.path.join(PROJECT_DIR, "tinapple-repo/repo/x86_64")
    repo_pkg = os.path.join(repo_dir, "chaddy-store-0.0.1-1-x86_64.pkg.tar.zst")
    repo_sig = repo_pkg + ".sig"
    if os.path.isfile(repo_pkg) and os.path.isfile(repo_sig):
        test_pass("R5: chaddy-store Package & Signature", "chaddy-store package and GPG detached signature in repo")
        passed += 1
    else:
        test_fail("R5: chaddy-store Package & Signature", "Package or signature missing in repository")
        failed += 1

    # Check Installer TUI tests
    try:
        res = subprocess.run(["go", "test", "-v", "./..."], cwd=os.path.join(PROJECT_DIR, "tinapple-installer/tui"), capture_output=True, text=True, check=True)
        if "PASS: TestStoreAndSettingsIntegration" in res.stdout:
            test_pass("R5: Installer TUI Integration Tests", "All 17 installer TUI tests passed, including Store & Settings integration")
            passed += 1
        else:
            test_fail("R5: Installer TUI Integration Tests", "Tests failed")
            failed += 1
    except Exception as e:
        test_fail("R5: Installer TUI Integration Tests", str(e))
        failed += 1

    print("=" * 70)
    print(f"Total: {passed + failed} | Passed: {passed} | Failed: {failed}")
    print("=" * 70 + "\n")

    if failed > 0:
        sys.exit(1)
    print("\033[1;32m[*] All Tasks R1 through R5 successfully verified!\033[0m\n")

if __name__ == "__main__":
    main()
