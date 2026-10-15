"""
Tinapple OS Configuration Model & Persistence Store
Handles serialization, validation, and disk persistence to /etc/tinapple/settings.json
"""

import json
import os
import shutil

CONFIG_PATHS = [
    "/etc/tinapple/settings.json",
    os.path.expanduser("~/.config/tinapple/settings.json"),
    "/tmp/tinapple-settings.json",
]

DEFAULT_CONFIG = {
    # ── 1. Multicore RPS/RFS & Hardware Tuning ──
    "rps_rfs_enabled": True,
    "cake_aqm_enabled": True,
    "tcp_bbr_enabled": True,
    "memory_profile": "zram",  # "zram" or "disk_swap"
    
    # ── 2. Closed-Loop Thermal PID Governor & Power ──
    "thermal_governor_enabled": True,
    "cpu_scaling_governor": "powersave",  # "powersave", "performance", "schedutil"
    "target_temp_tier0": 76.0,
    "target_temp_tier1": 79.0,
    "target_temp_tier2": 82.0,
    "target_temp_tier3": 84.0,
    "max_safe_temp": 85.5,
    "display_sleep_enabled": True,
    "acpi_lid_ignore_suspend": True,

    # ── 3. UFW Firewall & Packet Dropping ──
    "ufw_enabled": True,
    "ufw_default_drop": True,  # Silently DROP incoming packets on blocked ports
    "ufw_unblock_local_network": False,  # Open full 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12
    "ufw_allowed_ports": [22, 80, 443, 8085, 8096, 41641],
    "ufw_blocked_ports": [],

    # ── 4. Tailscale / NetBird & Tailnet LAN Guardian ──
    "vpn_provider": "tailscale",  # "tailscale" or "netbird"
    "tailnet_lan_guardian_enabled": True,  # Dynamically allow Tailscale peer LAN IPs via ipset
    "tailscale_advertise_routes": "",
    "tailscale_ssh_enabled": True,
    "tailscale_exit_node_enabled": False,

    # ── 5. Dual WiFi Station + Hotspot AP Router ──
    "dual_wifi_enabled": False,
    "upstream_wifi_interface": "auto",
    "ap_wifi_interface": "auto",
    "ap_ssid": "Tinapple-AP",
    "ap_passphrase": "tinapple-hotspot-pass",
    "ap_channel": 7,
    "ap_gateway_ip": "192.168.50.1",
    "ap_dhcp_range": "192.168.50.10,192.168.50.150",
    "ap_nat_internet_sharing": True,
    "ap_server_client_access": True,

    # ── 6. Self-Hosted Appliance Services (Tinarchy) ──
    "nginx_enabled": True,
    "dashboard_enabled": True,
    "jellyfin_enabled": False,
    "arr_stack_enabled": False,
    "suwayomi_enabled": False,
    "qbittorrent_enabled": False,
    "jdownloader_enabled": False,
    "syncthing_enabled": True,
    "vaultwarden_enabled": False,
    "tor_proxy_enabled": False,

    # ── 7. ChadWM Desktop & Look-and-Feel ──
    "window_gaps": 8,
    "border_width": 2,
    "border_focused": "#10b981",
    "border_unfocused": "#223029",
    "terminal": "alacritty",
    "xrdp_enabled": True,
    "vnc_enabled": False,
}

def get_config_path():
    for p in CONFIG_PATHS:
        parent = os.path.dirname(p)
        if os.path.exists(parent) and os.access(parent, os.W_OK):
            return p
    return CONFIG_PATHS[-1]

def load_config():
    path = get_config_path()
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                data = json.load(f)
                cfg = dict(DEFAULT_CONFIG)
                cfg.update(data)
                return cfg
        except Exception as e:
            print(f"[config] Error reading {path}: {e}")
    return dict(DEFAULT_CONFIG)

def save_config(cfg):
    path = get_config_path()
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump(cfg, f, indent=2)
        return True, f"Configuration saved to {path}"
    except Exception as e:
        return False, f"Failed to save configuration: {e}"
