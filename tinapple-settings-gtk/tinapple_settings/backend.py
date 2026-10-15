"""
Tinapple OS System Execution Backend
Applies hardware autotuning, closed-loop thermal PID governor, UFW packet dropping,
Tailnet LAN Guardian, dual-WiFi hotspot AP, and appliance services.
"""

import glob
import json
import os
import re
import shutil
import subprocess

def run_cmd(args, check=False):
    try:
        res = subprocess.run(args, capture_output=True, text=True, timeout=10)
        return res.returncode == 0, res.stdout.strip(), res.stderr.strip()
    except Exception as e:
        return False, "", str(e)

# ── Hardware & Interface Discovery ──────────────────────────────────────────

def get_network_interfaces():
    """Returns list of network interfaces with their type and operstate."""
    interfaces = []
    for iface_path in glob.glob("/sys/class/net/*"):
        iface = os.path.basename(iface_path)
        if iface == "lo":
            continue
        is_wireless = os.path.exists(os.path.join(iface_path, "wireless")) or os.path.exists(os.path.join(iface_path, "phy80211"))
        operstate = "unknown"
        op_file = os.path.join(iface_path, "operstate")
        if os.path.exists(op_file):
            try:
                with open(op_file) as f:
                    operstate = f.read().strip()
            except Exception:
                pass
        interfaces.append({
            "name": iface,
            "is_wireless": is_wireless,
            "operstate": operstate,
        })
    return interfaces

def get_wifi_interfaces():
    """Returns only wireless interfaces."""
    return [i["name"] for i in get_network_interfaces() if i["is_wireless"]]

def get_thermal_telemetry():
    """Reads live CPU package temperature and thermal zones."""
    temps = []
    for f in glob.glob("/sys/devices/platform/coretemp.*/hwmon/hwmon*/temp*_input"):
        try:
            with open(f) as fp:
                temps.append(int(fp.read().strip()) / 1000.0)
        except Exception:
            pass
    if not temps:
        for f in glob.glob("/sys/class/thermal/thermal_zone*/temp"):
            try:
                with open(f) as fp:
                    temps.append(int(fp.read().strip()) / 1000.0)
            except Exception:
                pass
    if temps:
        return max(temps)
    return 45.0

def get_tailscale_status():
    """Checks Tailscale connection state and self IP."""
    ok, out, _ = run_cmd(["tailscale", "status", "--json"])
    if ok and out:
        try:
            data = json.loads(out)
            self_node = data.get("Self", {})
            return {
                "online": self_node.get("Online", False),
                "ip": self_node.get("TailscaleIPs", [""])[0] if self_node.get("TailscaleIPs") else "Not assigned",
                "peers": len(data.get("Peer", {})),
                "backend_state": data.get("BackendState", "Stopped"),
            }
        except Exception:
            pass
    return {"online": False, "ip": "Inactive", "peers": 0, "backend_state": "Offline"}

# ── 1. Network Tuning & RPS/RFS ─────────────────────────────────────────────

def apply_network_tuning(cfg):
    logs = []
    if cfg.get("rps_rfs_enabled"):
        cpus = os.cpu_count() or 4
        mask = f"{(1 << cpus) - 1:x}"
        count = 0
        for rx_path in glob.glob("/sys/class/net/*/queues/rx-*"):
            iface = rx_path.split("/")[4]
            if iface in ("lo", "tailscale0"):
                continue
            try:
                with open(f"{rx_path}/rps_cpus", "w") as f:
                    f.write(mask)
                with open(f"{rx_path}/rps_flow_cnt", "w") as f:
                    f.write("4096")
                count += 1
            except Exception as e:
                logs.append(f"RPS warning on {rx_path}: {e}")
        # Enable RPS global socket flow table
        try:
            with open("/proc/sys/net/core/rps_sock_flow_entries", "w") as f:
                f.write("32768")
        except Exception:
            pass
        logs.append(f"✓ Multicore RPS/RFS active: {count} RX queues bound to CPU mask {mask}")
    
    if cfg.get("cake_aqm_enabled"):
        for iface in get_network_interfaces():
            if not iface["is_wireless"] and not iface["name"].startswith("en") and not iface["name"].startswith("eth"):
                continue
            ok, _, err = run_cmd(["tc", "qdisc", "replace", "dev", iface["name"], "root", "cake", "diffserv4"])
            if ok:
                logs.append(f"✓ CAKE diffserv4 AQM applied to {iface['name']}")
    
    if cfg.get("tcp_bbr_enabled"):
        run_cmd(["sysctl", "-w", "net.ipv4.tcp_congestion_control=bbr"])
        run_cmd(["sysctl", "-w", "net.core.default_qdisc=cake"])
        run_cmd(["sysctl", "-w", "net.ipv4.tcp_window_scaling=1"])
        logs.append("✓ TCP BBR congestion control and window scaling active")
        
    mem_prof = cfg.get("memory_profile", "zram")
    if mem_prof == "zram":
        run_cmd(["sysctl", "-w", "vm.swappiness=150"])
        run_cmd(["sysctl", "-w", "vm.page-cluster=0"])
        logs.append("✓ High-efficiency ZRAM memory profile active (swappiness=150)")
    else:
        run_cmd(["sysctl", "-w", "vm.swappiness=30"])
        run_cmd(["sysctl", "-w", "vm.vfs_cache_pressure=10"])
        run_cmd(["sysctl", "-w", "vm.dirty_ratio=50"])
        logs.append("✓ Low-wear Disk Swap memory profile active (swappiness=30)")
        
    return logs

# ── 2. Closed-Loop Thermal PID Governor & Power ─────────────────────────────

def apply_thermal_governor(cfg):
    logs = []
    gov_file = "/etc/default/tinarchy-resource-governor"
    gov_conf = f"""# Tinapple Closed-Loop Thermal PID Governor Configuration
TARGET_TEMP_TIER_0={cfg.get('target_temp_tier0', 76.0)}
TARGET_TEMP_TIER_1={cfg.get('target_temp_tier1', 79.0)}
TARGET_TEMP_TIER_2={cfg.get('target_temp_tier2', 82.0)}
TARGET_TEMP_TIER_3={cfg.get('target_temp_tier3', 84.0)}
MAX_SAFE_TEMP={cfg.get('max_safe_temp', 85.5)}
PID_KP=1.0
PID_KI=0.05
PID_KD=2.2
CHECK_INTERVAL_SECONDS=4
"""
    try:
        os.makedirs(os.path.dirname(gov_file), exist_ok=True)
        with open(gov_file, "w") as f:
            f.write(gov_conf)
        logs.append(f"✓ Written governor targets to {gov_file}")
    except Exception as e:
        logs.append(f"Warning writing governor config: {e}")

    if cfg.get("thermal_governor_enabled"):
        run_cmd(["systemctl", "enable", "--now", "tinarchy-resource-governor.service"])
        logs.append("✓ Thermal PID Governor service enabled and active")
    else:
        run_cmd(["systemctl", "stop", "tinarchy-resource-governor.service"])
        logs.append("✓ Thermal PID Governor service stopped")

    scaling_gov = cfg.get("cpu_scaling_governor", "powersave")
    run_cmd(["cpupower", "frequency-set", "-g", scaling_gov])
    logs.append(f"✓ CPU frequency scaling governor set to '{scaling_gov}'")

    if cfg.get("display_sleep_enabled"):
        run_cmd(["systemctl", "enable", "--now", "console-screen-blank.service"])
        logs.append("✓ 0-Watt LCD Screen Sleep active (DPMS powerdown after 3m inactivity)")

    if cfg.get("acpi_lid_ignore_suspend"):
        logind_conf = "/etc/systemd/logind.conf.d/99-tinapple-headless.conf"
        try:
            os.makedirs(os.path.dirname(logind_conf), exist_ok=True)
            with open(logind_conf, "w") as f:
                f.write("[Login]\nHandleLidSwitch=ignore\nHandleLidSwitchExternalPower=ignore\nHandleLidSwitchDocked=ignore\n")
            run_cmd(["systemctl", "restart", "systemd-logind"])
            logs.append("✓ ACPI Lid handling set to ignore (24/7 background appliance server)")
        except Exception as e:
            logs.append(f"Warning updating logind: {e}")

    return logs

# ── 3. UFW Firewall & Packet Dropping ───────────────────────────────────────

def apply_ufw_firewall(cfg):
    logs = []
    if not cfg.get("ufw_enabled"):
        run_cmd(["ufw", "disable"])
        logs.append("✓ UFW Firewall disabled")
        return logs

    # Ensure ipset exists
    run_cmd(["ipset", "create", "tailnet-peers", "hash:ip", "-exist"])

    # Default policy: DROP all unsolicited incoming packets silently
    if cfg.get("ufw_default_drop"):
        run_cmd(["ufw", "default", "deny", "incoming"])
        run_cmd(["ufw", "default", "allow", "outgoing"])
        logs.append("✓ Strict packet drop policy: UFW set to DROP all unsolicited incoming packets")
    else:
        run_cmd(["ufw", "default", "reject", "incoming"])
        logs.append("✓ UFW default incoming set to reject")

    # Local subnet access
    if cfg.get("ufw_unblock_local_network"):
        run_cmd(["ufw", "allow", "from", "192.168.0.0/16"])
        run_cmd(["ufw", "allow", "from", "10.0.0.0/8"])
        run_cmd(["ufw", "allow", "from", "172.16.0.0/12"])
        logs.append("✓ Completely unblocked local home network subnets (192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12)")
    else:
        run_cmd(["ufw", "delete", "allow", "from", "192.168.0.0/16"])
        run_cmd(["ufw", "delete", "allow", "from", "10.0.0.0/8"])
        run_cmd(["ufw", "delete", "allow", "from", "172.16.0.0/12"])
        logs.append("✓ Strict zero-trust local network: generic LAN access blocked")

    # Port rules
    for port in cfg.get("ufw_allowed_ports", []):
        run_cmd(["ufw", "allow", f"{port}/tcp"])
    for port in cfg.get("ufw_blocked_ports", []):
        run_cmd(["ufw", "deny", f"{port}/tcp"])

    # Insert tailnet-peers ipset match into UFW before input chain
    run_cmd(["iptables", "-I", "ufw-before-input", "-m", "set", "--match-set", "tailnet-peers", "src", "-j", "ACCEPT"])

    # Enable UFW
    run_cmd(["ufw", "--force", "enable"])
    run_cmd(["ufw", "reload"])
    logs.append(f"✓ UFW active with {len(cfg.get('ufw_allowed_ports', []))} open ports & tailnet-peers whitelist")
    return logs

# ── 4. Tailscale & Tailnet LAN Guardian ─────────────────────────────────────

def apply_tailnet(cfg):
    logs = []
    provider = cfg.get("vpn_provider", "tailscale")
    if provider == "tailscale":
        run_cmd(["systemctl", "enable", "--now", "tailscaled.service"])
        
        flags = []
        if cfg.get("tailscale_ssh_enabled"):
            flags.append("--ssh")
        routes = cfg.get("tailscale_advertise_routes", "").strip()
        if routes:
            flags.append(f"--advertise-routes={routes}")
        if cfg.get("tailscale_exit_node_enabled"):
            flags.append("--advertise-exit-node")
            
        if flags:
            run_cmd(["tailscale", "set"] + flags)
            logs.append(f"✓ Tailscale node updated with flags: {' '.join(flags)}")
            
        if cfg.get("tailnet_lan_guardian_enabled"):
            # Ensure script is executable
            run_cmd(["chmod", "+x", "/usr/local/bin/tailnet-lan-guardian"])
            run_cmd(["systemctl", "enable", "--now", "tailnet-lan-guardian.service"])
            logs.append("✓ Tailnet LAN Guardian enabled: verified Tailscale peers automatically unblocked in UFW on local network")
        else:
            run_cmd(["systemctl", "stop", "tailnet-lan-guardian.service"])
            logs.append("✓ Tailnet LAN Guardian stopped")
    return logs

# ── 5. Dual WiFi Cards & Hotspot AP Router ─────────────────────────────────

def apply_dual_wifi_ap(cfg):
    logs = []
    if not cfg.get("dual_wifi_enabled"):
        run_cmd(["systemctl", "stop", "tinapple-hotspot.service"])
        logs.append("✓ Dual WiFi Hotspot AP is disabled")
        return logs

    wifi_ifaces = get_wifi_interfaces()
    if len(wifi_ifaces) < 1:
        logs.append("⚠ No wireless interfaces detected for Hotspot AP setup.")
        return logs

    up_iface = cfg.get("upstream_wifi_interface", "auto")
    ap_iface = cfg.get("ap_wifi_interface", "auto")

    if up_iface == "auto" or up_iface not in wifi_ifaces:
        up_iface = wifi_ifaces[0]
    if ap_iface == "auto" or ap_iface not in wifi_ifaces or ap_iface == up_iface:
        ap_iface = wifi_ifaces[1] if len(wifi_ifaces) > 1 else wifi_ifaces[0]

    ssid = cfg.get("ap_ssid", "Tinapple-AP")
    passphrase = cfg.get("ap_passphrase", "tinapple-hotspot-pass")
    channel = cfg.get("ap_channel", 7)
    gw_ip = cfg.get("ap_gateway_ip", "192.168.50.1")

    # Generate hostapd configuration
    hostapd_conf = f"""interface={ap_iface}
driver=nl80211
ssid={ssid}
hw_mode=g
channel={channel}
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase={passphrase}
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
"""
    os.makedirs("/etc/tinapple", exist_ok=True)
    with open("/etc/tinapple/hostapd.conf", "w") as f:
        f.write(hostapd_conf)

    # Generate dnsmasq configuration for hotspot
    dhcp_range = cfg.get("ap_dhcp_range", "192.168.50.10,192.168.50.150")
    dnsmasq_conf = f"""interface={ap_iface}
bind-interfaces
dhcp-range={dhcp_range},255.255.255.0,24h
dhcp-option=option:router,{gw_ip}
dhcp-option=option:dns-server,{gw_ip},1.1.1.1
domain=tinapple.local
address=/tinapple.local/{gw_ip}
"""
    with open("/etc/tinapple/dnsmasq-hotspot.conf", "w") as f:
        f.write(dnsmasq_conf)

    # Hotspot startup script
    script_path = "/usr/local/bin/tinapple-hotspot"
    script_content = f"""#!/bin/bash
set -e
# 1. Assign static IP to AP interface
ip link set {ap_iface} down
ip addr flush dev {ap_iface}
ip link set {ap_iface} up
ip addr add {gw_ip}/24 dev {ap_iface}

# 2. Enable IP routing & NAT Masquerading
sysctl -w net.ipv4.ip_forward=1
iptables -t nat -A POSTROUTING -o {up_iface} -j MASQUERADE
iptables -A FORWARD -i {ap_iface} -o {up_iface} -j ACCEPT
iptables -A FORWARD -i {up_iface} -o {ap_iface} -m state --state RELATED,ESTABLISHED -j ACCEPT

# 3. Allow Hotspot clients through UFW to access server and internet
ufw allow in on {ap_iface}

# 4. Launch dnsmasq and hostapd
killall dnsmasq hostapd 2>/dev/null || true
dnsmasq -C /etc/tinapple/dnsmasq-hotspot.conf
exec hostapd /etc/tinapple/hostapd.conf
"""
    with open(script_path, "w") as f:
        f.write(script_content)
    os.chmod(script_path, 0o755)

    # Hotspot systemd service
    service_content = f"""[Unit]
Description=Tinapple Dual-WiFi Hotspot AP Router
After=network.target
Wants=network.target

[Service]
Type=simple
ExecStart={script_path}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
"""
    with open("/etc/systemd/system/tinapple-hotspot.service", "w") as f:
        f.write(service_content)

    run_cmd(["systemctl", "daemon-reload"])
    run_cmd(["systemctl", "enable", "--now", "tinapple-hotspot.service"])
    logs.append(f"✓ Hotspot AP router active on {ap_iface} (SSID: '{ssid}', Gateway: {gw_ip}, Uplink: {up_iface})")
    return logs

# ── 6. Appliance Services (Tinarchy) ────────────────────────────────────────

def apply_services(cfg):
    logs = []
    service_map = {
        "nginx_enabled": "nginx.service",
        "dashboard_enabled": "tinarchy.service",
        "jellyfin_enabled": "jellyfin.service",
        "arr_stack_enabled": "seerr.service",
        "suwayomi_enabled": "suwayomi-server.service",
        "qbittorrent_enabled": "qbittorrent-nox.service",
        "jdownloader_enabled": "jdownloader.service",
        "syncthing_enabled": "syncthing@root.service",
        "vaultwarden_enabled": "vaultwarden.service",
        "tor_proxy_enabled": "tor.service",
    }
    for key, unit in service_map.items():
        if cfg.get(key, False):
            run_cmd(["systemctl", "enable", "--now", unit])
            logs.append(f"✓ Started service: {unit}")
        else:
            run_cmd(["systemctl", "disable", "--now", unit])
    return logs

# ── Master Apply ────────────────────────────────────────────────────────────

def apply_all(cfg):
    all_logs = []
    all_logs.extend(apply_network_tuning(cfg))
    all_logs.extend(apply_thermal_governor(cfg))
    all_logs.extend(apply_ufw_firewall(cfg))
    all_logs.extend(apply_tailnet(cfg))
    all_logs.extend(apply_dual_wifi_ap(cfg))
    all_logs.extend(apply_services(cfg))
    return all_logs
