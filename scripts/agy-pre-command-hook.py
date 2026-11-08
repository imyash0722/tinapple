#!/usr/bin/env python3
"""
agy-pre-command-hook.py
Antigravity PreToolUse hook handler for run_command.
Intercepts git push commands to automatically synchronize GEMINI.md.
"""

import sys
import json
import subprocess
import os

def main():
    try:
        raw_input = sys.stdin.read()
        payload = json.loads(raw_input) if raw_input.strip() else {}
    except Exception:
        payload = {}

    tool_call = payload.get("toolCall", {})
    tool_name = tool_call.get("name", "")
    tool_args = tool_call.get("args", {})
    command_line = tool_args.get("CommandLine", "")

    # Check if command is git push or git commit
    if "git push" in command_line:
        script_path = "/home/tinapple/tinapple/scripts/sync-gemini-ledger.py"
        if os.path.isfile(script_path):
            try:
                subprocess.run(["python3", script_path, "--pre-push"], check=False)
            except Exception:
                pass

    # Always output allow decision on stdout
    output = {
        "decision": "allow"
    }
    sys.stdout.write(json.dumps(output))
    sys.stdout.flush()

if __name__ == "__main__":
    main()
