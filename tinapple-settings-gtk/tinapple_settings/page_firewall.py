"""
Firewall Page: UFW Network Management, Port Rules, Strict Packet Dropping, and Local Subnet Control.
"""

import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Adw

COMMON_SERVICES = [
    (22, "SSH Remote Shell", "Secure remote console terminal access"),
    (80, "HTTP Web Traffic", "Standard unencrypted reverse proxy gateway"),
    (443, "HTTPS Encrypted Web", "SSL/TLS secure web services gateway"),
    (8085, "Tinapple / Pinedash Server Dashboard", "Unified control center and telemetry web UI"),
    (8096, "Jellyfin Media Server", "Local and remote video and audio streaming"),
    (41641, "Tailscale WireGuard Direct UDP", "High-performance direct peer-to-peer tunnels"),
    (3389, "XRDP Remote Desktop", "Graphical remote desktop session"),
    (5900, "VNC Remote Display", "Virtual network computing screen sharing"),
]

def build_firewall_page(cfg):
    page = Adw.PreferencesPage(
        title="Firewall (UFW)",
        icon_name="security-high-symbolic"
    )

    # Master UFW Switch
    group_master = Adw.PreferencesGroup(
        title="UFW Firewall and Packet Dropping Policy",
        description="Configure packet filtering, intrusion mitigation, and port accessibility."
    )

    row_ufw = Adw.SwitchRow(
        title="Enable UFW (Uncomplicated Firewall)",
        subtitle="Enforces in-kernel iptables/nftables security filtering on all network interfaces."
    )
    row_ufw.set_active(cfg.get("ufw_enabled", True))
    row_ufw.connect("notify::active", lambda w, p: cfg.update({"ufw_enabled": w.get_active()}))
    group_master.add(row_ufw)

    row_drop = Adw.SwitchRow(
        title="Drop Packets Sent to Blocked/Closed Ports",
        subtitle="Silently DROPS unsolicited packets instead of sending ICMP/TCP reset rejects. Makes closed ports appear non-existent (stealth mode) and renders automated port scanners completely ineffective."
    )
    row_drop.set_active(cfg.get("ufw_default_drop", True))
    row_drop.connect("notify::active", lambda w, p: cfg.update({"ufw_default_drop": w.get_active()}))
    group_master.add(row_drop)

    row_local = Adw.SwitchRow(
        title="Completely Unblock Local Home Network (LAN)",
        subtitle="When enabled, opens full unrestricted access to all private RFC1918 subnets (192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12). When disabled, strict zero-trust rules apply and only explicit ports or Tailscale-verified peers are accepted."
    )
    row_local.set_active(cfg.get("ufw_unblock_local_network", False))
    row_local.connect("notify::active", lambda w, p: cfg.update({"ufw_unblock_local_network": w.get_active()}))
    group_master.add(row_local)

    page.add(group_master)

    # Group: Quick Presets for Known Services
    group_ports = Adw.PreferencesGroup(
        title="Appliance Port Rules",
        description="Toggle access for standard appliance services or manage specific listening ports."
    )

    allowed_set = set(cfg.get("ufw_allowed_ports", []))

    for port, name, desc in COMMON_SERVICES:
        row_p = Adw.SwitchRow(
            title=f"Port {port} — {name}",
            subtitle=f"{desc} (TCP/UDP)"
        )
        row_p.set_active(port in allowed_set)
        def make_handler(p):
            def handler(w, param):
                cur = set(cfg.get("ufw_allowed_ports", []))
                if w.get_active():
                    cur.add(p)
                else:
                    cur.discard(p)
                cfg["ufw_allowed_ports"] = sorted(list(cur))
            return handler
        row_p.connect("notify::active", make_handler(port))
        group_ports.add(row_p)

    # Custom Port Input
    row_custom = Adw.EntryRow(
        title="Add Custom Port to Unblock"
    )
    btn_add = Gtk.Button(label="Unblock Port")
    btn_add.add_css_class("suggested-action")
    def on_add_clicked(btn):
        text = row_custom.get_text().strip()
        if text.isdigit():
            p = int(text)
            cur = set(cfg.get("ufw_allowed_ports", []))
            cur.add(p)
            cfg["ufw_allowed_ports"] = sorted(list(cur))
            row_custom.set_text("")
    btn_add.connect("clicked", on_add_clicked)
    row_custom.add_suffix(btn_add)
    group_ports.add(row_custom)

    page.add(group_ports)
    return page
