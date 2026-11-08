#!/usr/bin/env python3
"""
sync-gemini-ledger.py
Automated synchronization utility for GEMINI.md and CODEX.md.
Ensures the AI ledger is always synchronized with git commits and state before pushing.
"""

import os
import sys
import subprocess
import datetime
import re

def run_git(args, cwd=None):
    try:
        res = subprocess.run(["git"] + args, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        return res.stdout.strip()
    except subprocess.CalledProcessError as e:
        return None

def get_repo_root():
    root = run_git(["rev-parse", "--show-toplevel"])
    if root and os.path.isfile(os.path.join(root, "GEMINI.md")):
        return root
    default_tinapple = "/home/tinapple/tinapple"
    if os.path.isfile(os.path.join(default_tinapple, "GEMINI.md")):
        return default_tinapple
    return os.getcwd()

def ensure_symlinks(repo_root):
    gemini_md = os.path.join(repo_root, "GEMINI.md")
    symlink_path = os.path.join(repo_root, "gemini.md")
    if os.path.isfile(gemini_md):
        if not os.path.exists(symlink_path) and not os.path.islink(symlink_path):
            try:
                os.symlink("GEMINI.md", symlink_path)
            except OSError:
                pass

def update_gemini_ledger(repo_root, commit_if_changed=False):
    gemini_path = os.path.join(repo_root, "GEMINI.md")
    if not os.path.isfile(gemini_path):
        return False, "GEMINI.md not found"

    with open(gemini_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Get latest commit info
    head_hash = run_git(["rev-parse", "--short", "HEAD"], cwd=repo_root)
    if not head_hash:
        return False, "Cannot determine HEAD commit"

    head_msg = run_git(["log", "-1", "--pretty=%s"], cwd=repo_root) or "No commit message"
    commit_date = run_git(["log", "-1", "--pretty=%cd", "--date=iso-strict"], cwd=repo_root) or datetime.datetime.now(datetime.timezone.utc).isoformat()
    files_changed = run_git(["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"], cwd=repo_root)
    file_list = [f for f in (files_changed.splitlines() if files_changed else []) if f.strip() and f != "GEMINI.md" and f != "gemini.md"]

    # Check if this commit hash is already mentioned in GEMINI.md
    if head_hash in content:
        # Commit already recorded
        ensure_symlinks(repo_root)
        return True, f"Commit {head_hash} already recorded in GEMINI.md"

    # Find where Section 5 starts
    section_marker = "## 5. Changelog & Active State Ledger"
    if section_marker not in content:
        return False, f"Marker '{section_marker}' not found in GEMINI.md"

    # Format new entry
    date_str = commit_date[:10]
    entry_lines = [
        f"### Commit `{head_hash}` | {head_msg} ({date_str})",
        f"- **Commit**: `{head_hash}`",
        f"- **Subject**: {head_msg}",
    ]
    if file_list:
        sample_files = file_list[:8]
        entry_lines.append(f"- **Key Files**: {', '.join([f'`{x}`' for x in sample_files])}" + (" (and more)" if len(file_list) > 8 else ""))
    entry_lines.append("")

    new_entry = "\n".join(entry_lines) + "\n"

    # Insert right below the section marker
    parts = content.split(section_marker, 1)
    updated_content = parts[0] + section_marker + "\n\n" + new_entry + parts[1].lstrip("\n")

    with open(gemini_path, "w", encoding="utf-8") as f:
        f.write(updated_content)

    ensure_symlinks(repo_root)

    # If requested, create a commit for GEMINI.md
    if commit_if_changed:
        run_git(["add", "GEMINI.md", "gemini.md"], cwd=repo_root)
        run_git(["commit", "-m", f"docs(gemini): record commit {head_hash} in AI context ledger"], cwd=repo_root)

    return True, f"Successfully recorded commit {head_hash} into GEMINI.md"

def verify_remote_sync(repo_root):
    # Fetch remote to ensure no commits exist upstream that we don't have
    fetch_res = subprocess.run(["git", "fetch", "origin"], cwd=repo_root, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if fetch_res.returncode != 0:
        return True, "Could not fetch origin (offline or no network), proceeding"

    unpulled = run_git(["rev-list", "HEAD..origin/main", "--count"], cwd=repo_root)
    if unpulled and unpulled.strip() != "0":
        return False, f"ERROR: origin/main has {unpulled.strip()} unpulled commit(s). Run 'git pull --rebase' before pushing."

    return True, "Remote is in sync, safe to push"

def main():
    repo_root = get_repo_root()
    pre_push = "--pre-push" in sys.argv
    pre_commit = "--pre-commit" in sys.argv
    check_only = "--check" in sys.argv
    do_commit = "--commit" in sys.argv or pre_push

    if pre_push:
        sync_ok, sync_msg = verify_remote_sync(repo_root)
        if not sync_ok:
            print(f"[sync-gemini-ledger] {sync_msg}", file=sys.stderr)
            sys.exit(1)

    success, msg = update_gemini_ledger(repo_root, commit_if_changed=do_commit and not check_only)
    if not success:
        print(f"[sync-gemini-ledger] {msg}", file=sys.stderr)
        if check_only:
            sys.exit(1)
    else:
        print(f"[sync-gemini-ledger] {msg}")

    sys.exit(0)

if __name__ == "__main__":
    main()
