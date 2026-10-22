#!/usr/bin/env python3
import sys
import socket
import json
import time
import os
from PIL import Image
SOCK_PATH = os.environ.get("QMP_SOCK", "/tmp/qemu-tinapple-qmp.sock")
if not os.path.exists(SOCK_PATH) and os.path.exists("/var/tmp/qmp-sock"):
    SOCK_PATH = "/var/tmp/qmp-sock"

def qmp_cmd(cmd_dict):
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.connect(SOCK_PATH)
    greeting = s.recv(4096)
    s.sendall(b'{"execute": "qmp_capabilities"}\n')
    caps_resp = s.recv(4096)
    s.sendall((json.dumps(cmd_dict) + "\n").encode())
    time.sleep(0.04)
    resp = s.recv(8192)
    s.close()
    return resp.decode()

def screendump(out_png):
    ppm_path = "/var/tmp/screen.ppm"
    res = qmp_cmd({"execute": "screendump", "arguments": {"filename": ppm_path}})
    time.sleep(0.2)
    img = Image.open(ppm_path)
    img.save(out_png)
    print(f"Screenshot saved to {out_png} ({img.width}x{img.height})")

def send_key(key):
    # key can be 'ret', 'spc', 'super-Return', etc.
    res = qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": k} for k in key.split("-")]}})
    print(f"Sent key {key}: {res}")

def send_text(text):
    for char in text:
        if char == '\n':
            send_key('ret')
        elif char == ' ':
            send_key('spc')
        elif char == '-':
            send_key('minus')
        elif char == '_':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": "minus"}]}})
        elif char == '/':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "slash"}]}})
        elif char == '.':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "dot"}]}})
        elif char == '>':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": "dot"}]}})
        elif char == '<':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": "comma"}]}})
        elif char == ',':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "comma"}]}})
        elif char == ':':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": "semicolon"}]}})
        elif char == ';':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "semicolon"}]}})
        elif char == '"':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": "apostrophe"}]}})
        elif char == "'":
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "apostrophe"}]}})
        elif char == '~':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": "grave_accent"}]}})
        elif char == '|':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": "backslash"}]}})
        elif char == '@':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": "2"}]}})
        elif char == '=':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "equal"}]}})
        elif char == '&':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": "7"}]}})
        elif char == '(':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": "9"}]}})
        elif char == ')':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": "0"}]}})
        elif char == '$':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": "4"}]}})
        elif char == '!':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": "1"}]}})
        elif char == '%':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": "5"}]}})
        elif char == '*':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": "8"}]}})
        elif char == '+':
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": "equal"}]}})
        elif char.isupper():
            qmp_cmd({"execute": "send-key", "arguments": {"keys": [{"type": "qcode", "data": "shift"}, {"type": "qcode", "data": char.lower()}]}})
        else:
            send_key(char.lower())
        time.sleep(0.04)

def mouse_move(x, y, width=1280, height=800):
    ax = int(float(x) / width * 32767)
    ay = int(float(y) / height * 32767)
    cmd = {"execute": "input-send-event", "arguments": {
        "events": [
            {"type": "abs", "data": {"axis": "x", "value": ax}},
            {"type": "abs", "data": {"axis": "y", "value": ay}}
        ]
    }}
    res = qmp_cmd(cmd)
    print(f"Mouse move to ({x}, {y}) -> ({ax}, {ay}): {res}")

def mouse_click(button="left"):
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.connect(SOCK_PATH)
    s.recv(4096)
    s.sendall(b'{"execute": "qmp_capabilities"}\n')
    s.recv(4096)
    cmd_press = {"execute": "input-send-event", "arguments": {
        "events": [{"type": "btn", "data": {"down": True, "button": button}}]
    }}
    s.sendall((json.dumps(cmd_press) + "\n").encode())
    s.recv(4096)
    time.sleep(0.08)
    cmd_release = {"execute": "input-send-event", "arguments": {
        "events": [{"type": "btn", "data": {"down": False, "button": button}}]
    }}
    s.sendall((json.dumps(cmd_release) + "\n").encode())
    res = s.recv(4096)
    s.close()
    print(f"Mouse click {button}: {res.decode()}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: qmp_control.py screenshot <file.png> | sendkey <key> | sendtext <text> | mousemove <x> <y> | click [left|right]")
        sys.exit(1)
    action = sys.argv[1]
    if action == "screenshot":
        screendump(sys.argv[2])
    elif action == "sendkey":
        send_key(sys.argv[2])
    elif action == "sendtext":
        send_text(sys.argv[2])
    elif action == "mousemove":
        mouse_move(sys.argv[2], sys.argv[3])
    elif action == "click":
        btn = sys.argv[2] if len(sys.argv) > 2 else "left"
        mouse_click(btn)
    else:
        print(f"Unknown action: {action}")
