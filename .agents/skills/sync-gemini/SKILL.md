---
name: sync-gemini
description: Automatically synchronizes GEMINI.md and CODEX.md with the latest git changes, commits, and system architecture before committing or pushing to Git. Run before every push to guarantee AI context coherence across agents.
---

# Sync Gemini & Codex AI Context Ledger

This skill ensures `GEMINI.md` (and `gemini.md`) is always up to date with recent commits, modified files, and architectural state before changes are committed or pushed to Git.

## Automated Execution

Run the sync script directly:
```bash
python3 /home/tinapple/tinapple/scripts/sync-gemini-ledger.py
```

### Options:
- `--check`: Verifies if the latest HEAD commit is documented in `GEMINI.md` without modifying files.
- `--pre-push`: Verifies that `origin/main` has no unpulled remote commits, updates `GEMINI.md` with the latest commit, and automatically stages/commits it before pushing.
- `--commit`: Automatically stages `GEMINI.md` and creates a documentation commit if changes were made.

## Verification
Ensure the symlink `gemini.md -> GEMINI.md` exists and verify the ledger:
```bash
git status --short GEMINI.md
```
