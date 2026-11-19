#!/usr/bin/env python3
"""
Tinapple Full Homelab Service & Connection Failpoint Audit Suite
Exhaustively tests all 30 services, reverse-proxy subpaths, socket bindings,
Proton split-routing, DNS listeners, and failpoints on pineapple-server.
"""

import sys
import os
import time
import json
import socket
import ssl
import urllib.request
import urllib.error
import urllib.parse
import subprocess

results = []

def check(name, category, test_fn):
    t0 = time.time()
    try:
        status, details, failpoint_notes = test_fn()
        elapsed = round((time.time() - t0) * 1000, 1)
        results.append({
            "name": name,
            "category": category,
            "status": status,
            "latency_ms": elapsed,
            "details": details,
            "failpoint_notes": failpoint_notes
        })
    except Exception as e:
        elapsed = round((time.time() - t0) * 1000, 1)
        results.append({
            "name": name,
            "category": category,
            "status": "FAIL",
            "latency_ms": elapsed,
            "details": str(e)[:50],
            "failpoint_notes": "Unhandled exception during probe"
        })

def probe_http(url, expected=(200,), method="GET", data=None, headers=None, timeout=5):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
            code = r.status
            ct = r.headers.get("Content-Type", "").split(";")[0]
            if code in expected:
                return "PASS", f"HTTP {code} ({ct})", "Operational"
            return "WARN", f"HTTP {code} (expected {expected})", "Unexpected HTTP status"
    except urllib.error.HTTPError as e:
        if e.code in expected:
            return "PASS", f"HTTP {e.code} (expected)", "Operational"
        return "FAIL", f"HTTP {e.code}", f"Endpoint returned error {e.code}"
    except Exception as e:
        return "FAIL", str(e)[:35], "Connection refused or timed out"

def probe_tcp(host, port, timeout=3):
    try:
        s = socket.create_connection((host, port), timeout=timeout)
        s.close()
        return "PASS", f"TCP port {port} open", "Operational"
    except Exception as e:
        return "FAIL", f"TCP port {port} closed/unreachable", str(e)[:40]

# --- 1. Core Media Services ---
check("Jellyfin Core", "Media", lambda: probe_http("http://127.0.0.1:8096/health", (200,)))
check("Jellyfin Web Client", "Media", lambda: probe_http("http://127.0.0.1:8096/web/index.html", (200,)))
check("Suwayomi Manga Web", "Media", lambda: probe_http("http://127.0.0.1:4567/suwayomi", (200, 302)))
check("Suwayomi GraphQL API", "Media", lambda: probe_http(
    "http://127.0.0.1:4567/suwayomi/api/graphql",
    (200,),
    method="POST",
    data=json.dumps({"query": "{ aboutServer { version } }"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
))
check("Navidrome Music Server", "Media", lambda: probe_http("http://127.0.0.1:4533/ping", (200,)))
check("Pinchflat YouTube Engine", "Media", lambda: probe_http("http://127.0.0.1:8945/", (200, 302)))
check("Ombi Media Requests", "Media", lambda: probe_http("http://127.0.0.1:5000/", (200, 302)))

# --- 2. Automation & Download Pipeline ---
check("qBittorrent WebAPI", "Downloads", lambda: probe_http("http://127.0.0.1:8080/api/v2/app/version", (200,)))
check("Sonarr TV Automation", "Automation", lambda: probe_http("http://127.0.0.1:8989/ping", (200,)))
check("Radarr Movie Automation", "Automation", lambda: probe_http("http://127.0.0.1:7878/ping", (200,)))
check("Prowlarr Indexer Proxy", "Automation", lambda: probe_http("http://127.0.0.1:9696/ping", (200,)))
check("Bazarr Subtitles", "Automation", lambda: probe_http("http://127.0.0.1:6767/ping", (200,)))
check("FlareSolverr Solver Engine", "Automation", lambda: probe_http("http://127.0.0.1:8191/v1", (405,)))

# --- 3. System & Appliance Management ---
check("Tinapple Dash API", "System", lambda: probe_http("http://127.0.0.1:8088/api/v1/health", (200,)))
check("Homarr 2D Canvas", "System", lambda: probe_http("http://127.0.0.1:7575/", (200, 302)))

# --- 4. Security & Storage ---
check("Vaultwarden Web Vault", "Security", lambda: probe_http("http://127.0.0.1:8000/vault/", (200,)))
check("AdGuard Home Web", "Network", lambda: probe_http("http://127.0.0.1:3000/", (200, 302, 401)))
check("AdGuard DNS Listener", "Network", lambda: probe_tcp("127.0.0.1", 53))
check("Matrix Synapse Homeserver", "Network", lambda: probe_http("http://127.0.0.1:8008/_matrix/client/versions", (200,)))
check("Tor Onion Proxy", "Security", lambda: probe_tcp("127.0.0.1", 9050))
check("Syncthing Mesh Sync", "Storage", lambda: probe_http("http://127.0.0.1:8384/", (200, 302, 401)))
check("Filebrowser Storage Manager", "Storage", lambda: probe_http("http://127.0.0.1:8081/", (200, 302)))
check("CouchDB Database Engine", "Storage", lambda: probe_http("http://127.0.0.1:5984/", (200,)))
check("Samba SMB File Sharing", "Storage", lambda: probe_tcp("127.0.0.1", 445))
check("Samba NetBIOS", "Storage", lambda: probe_tcp("127.0.0.1", 139))
check("Tinapple Hotspot DHCP/DNS", "Network", lambda: probe_tcp("192.168.4.1", 53))

# --- 5. Proton WireGuard Selective Proxy ---
def test_proton_proxy():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(3)
    try:
        s.connect(("127.0.0.1", 1088))
        s.sendall(b"\x05\x01\x00")
        resp = s.recv(2)
        if resp == b"\x05\x00":
            return "PASS", "SOCKS5 handshake OK (127.0.0.1:1088)", "WireGuard tunnel dev proton active"
        return "WARN", f"SOCKS5 unexpected reply: {resp.hex()}", "Handshake rejected"
    finally:
        s.close()

check("Proton Selective Proxy", "Network", test_proton_proxy)

# --- 6. Caddy Ingress & Subpath Routing ---
check("Caddy Root Ingress (:80)", "Proxy", lambda: probe_http("http://127.0.0.1:80/", (200, 301, 308)))
check("Caddy Subpath /suwayomi", "Proxy", lambda: probe_http("http://127.0.0.1:80/suwayomi", (200, 301, 302, 308)))
check("Caddy Subpath /jellyfin/", "Proxy", lambda: probe_http("http://127.0.0.1:80/jellyfin/", (200, 301, 302, 308)))
check("Caddy Subpath /vault/", "Proxy", lambda: probe_http("http://127.0.0.1:80/vault/", (200, 301, 302, 308)))
check("Caddy Subpath /tsumiru/", "Proxy", lambda: probe_http("http://127.0.0.1:80/tsumiru/", (200, 301, 302, 308)))
check("Caddy Asset /icons/tailscale.svg", "Proxy", lambda: probe_http("http://127.0.0.1:80/icons/tailscale.svg", (200, 301, 308)))

def print_summary():
    passes = sum(1 for r in results if r["status"] == "PASS")
    fails = sum(1 for r in results if r["status"] == "FAIL")
    warns = sum(1 for r in results if r["status"] == "WARN")
    
    print("\n" + "=" * 80)
    print(f" TINAPPLE COMPREHENSIVE SERVICE & FAILPOINT AUDIT ({len(results)} Probes)")
    print("=" * 80)
    print(f"{'Service Name':<30} | {'Category':<12} | {'Status':<6} | {'Latency':<8} | {'Details'}")
    print("-" * 80)
    for r in results:
        stat = r['status']
        print(f"{r['name']:<30} | {r['category']:<12} | {stat:<6} | {r['latency_ms']:<6}ms | {r['details']}")
    print("=" * 80)
    print(f"Summary: {passes} PASSED | {warns} WARNINGS | {fails} FAILED")
    print("=" * 80)

if __name__ == "__main__":
    print_summary()
