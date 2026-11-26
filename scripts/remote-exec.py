#!/usr/bin/env python3
import sys
import asyncio
import websockets
import re

async def exec_remote(cmd: str):
    uri = "ws://100.108.215.120:8088/api/v1/terminal/ws"
    async with websockets.connect(uri) as ws:
        # Flush initial prompt
        await asyncio.sleep(0.3)
        while True:
            try:
                await asyncio.wait_for(ws.recv(), timeout=0.1)
            except asyncio.TimeoutError:
                break

        # Send command followed by echo of marker
        marker = "___REMOTE_EXEC_DONE___"
        full_cmd = f"export PAGER=cat; export SYSTEMD_PAGER=cat; {cmd}"
        await ws.send(f"{full_cmd}\necho {marker}:$?\n")

        chunks = []
        seen_marker = 0
        while True:
            try:
                c = await asyncio.wait_for(ws.recv(), timeout=120.0)
                text = c.decode("utf-8", errors="ignore") if isinstance(c, bytes) else c
                chunks.append(text)
                if marker in text:
                    seen_marker += 1
                    if seen_marker >= 2:
                        break
            except asyncio.TimeoutError:
                break

        raw = "".join(chunks)
        # Strip OSC sequences
        clean = re.sub(r'\x1b\].*?(\x1b\\|\x07)', '', raw, flags=re.DOTALL)
        # Strip CSI sequences
        clean = re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]', '', clean)
        clean = clean.replace('\r\n', '\n').replace('\r', '\n')

        lines = clean.splitlines()
        result_lines = []
        capture = False
        exit_code = 0

        for line in lines:
            line_str = line.strip()
            if not capture:
                if "export PAGER=cat" in line_str or (cmd.strip() and cmd.strip()[:20] in line_str):
                    capture = True
                    continue
            else:
                if marker in line:
                    if f"{marker}:" in line:
                        parts = line.strip().split(f"{marker}:")
                        if len(parts) >= 2 and parts[-1].isdigit():
                            exit_code = int(parts[-1])
                    break
                if not line_str.startswith("[root@"):
                    result_lines.append(line)

        output = "\n".join(result_lines).strip()
        if output:
            print(output)
        sys.exit(exit_code)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: remote-exec.py <command>")
        sys.exit(1)
    asyncio.run(exec_remote(" ".join(sys.argv[1:])))
