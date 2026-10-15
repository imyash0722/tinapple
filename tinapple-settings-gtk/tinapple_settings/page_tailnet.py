"""
Tailnet Page: Tailscale / NetBird Mesh VPN and Tailnet LAN Guardian.
Dynamically discovers Tailscale peers on the same local network and unblocks them in UFW.
"""

import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Adw
from .backend import get_tailscale_status

def build_tailnet_page(cfg):
    page = Adw.PreferencesPage(
        title="Tailnet and Mesh VPN",
        icon_name="network-vpn-symbolic"
    )

    # Status group
    ts_status = get_tailscale_status()
    group_status = Adw.PreferencesGroup(
        title="Tailscale Network Status",
        description="Encrypted WireGuard peer-to-peer mesh connectivity."
    )
    row_ts = Adw.ActionRow(
        title=f"Node IP: {ts_status['ip']}",
        subtitle=f"Status: {ts_status['backend_state']} · {ts_status['peers']} Connected Peers"
    )
    badge = Gtk.Label(label=" ONLINE " if ts_status["online"] else " OFFLINE ")
    badge.add_css_class("badge-green" if ts_status["online"] else "badge-yellow")
    row_ts.add_suffix(badge)
    group_status.add(row_ts)
    page.add(group_status)

    # Provider Selection
    group_provider = Adw.PreferencesGroup(
        title="VPN Mesh Provider",
        description="Select the underlying peer-to-peer overlay network architecture."
    )
    prov_model = Gtk.StringList.new(["Tailscale (WireGuard Mesh with MagicDNS)", "NetBird (Zero-Trust Overlay Network)"])
    row_prov = Adw.ComboRow(
        title="Mesh VPN Solution",
        subtitle="Tailscale is pre-integrated with Tailnet LAN Guardian for hardware-accelerated local network filtering.",
        model=prov_model
    )
    row_prov.set_selected(0 if cfg.get("vpn_provider") == "tailscale" else 1)
    def on_prov_change(w, p):
        cfg["vpn_provider"] = "tailscale" if w.get_selected() == 0 else "netbird"
    row_prov.connect("notify::selected", on_prov_change)
    group_provider.add(row_prov)
    page.add(group_provider)

    # Group: Tailnet LAN Guardian (Core Requested Feature)
    group_guardian = Adw.PreferencesGroup(
        title="Tailnet LAN Guardian (Zero-Trust Local Network Verification)",
        description="Dynamic event-driven peer authorization using the kernel ipset and Tailscale Unix domain socket."
    )

    row_guardian = Adw.SwitchRow(
        title="Enable Tailnet LAN Guardian Daemon",
        subtitle="Listens directly to Tailscale's socket (/run/tailscale/tailscaled.sock) with zero polling. When an authorized Tailscale device connects on the same physical WiFi or LAN, its local network IP is dynamically added to the in-kernel 'tailnet-peers' ipset. UFW instantly unblocks that peer's IP for direct WireGuard speeds. Devices without Tailscale authentication remain blocked!"
    )
    row_guardian.set_active(cfg.get("tailnet_lan_guardian_enabled", True))
    row_guardian.connect("notify::active", lambda w, p: cfg.update({"tailnet_lan_guardian_enabled": w.get_active()}))
    group_guardian.add(row_guardian)

    row_disco = Adw.ActionRow(
        title="Proactive WireGuard Disco Probing",
        subtitle="When an authenticated peer joins, Guardian automatically sends rate-limited direct disco pings (tailscale ping --until-direct=true) to resolve physical LAN IPs in seconds."
    )
    badge_disco = Gtk.Label(label=" Active ")
    badge_disco.add_css_class("badge-green")
    row_disco.add_suffix(badge_disco)
    group_guardian.add(row_disco)

    page.add(group_guardian)

    # Group: Routing & Remote Features
    group_routes = Adw.PreferencesGroup(
        title="Routing and Identity Features",
        description="Subnet routing and administrative features."
    )

    row_routes = Adw.EntryRow(
        title="Advertise Subnet Routes (e.g. 192.168.1.0/24)"
    )
    row_routes.set_text(cfg.get("tailscale_advertise_routes", ""))
    row_routes.connect("notify::text", lambda w, p: cfg.update({"tailscale_advertise_routes": w.get_text().strip()}))
    group_routes.add(row_routes)

    row_ssh = Adw.SwitchRow(
        title="Tailscale SSH Console Access",
        subtitle="Authenticate SSH sessions using Tailscale identity keys without managing authorized_keys files or passwords."
    )
    row_ssh.set_active(cfg.get("tailscale_ssh_enabled", True))
    row_ssh.connect("notify::active", lambda w, p: cfg.update({"tailscale_ssh_enabled": w.get_active()}))
    group_routes.add(row_ssh)

    row_exit = Adw.SwitchRow(
        title="Advertise as Global Exit Node",
        subtitle="Allows authorized mobile phones and laptops to route all their public internet traffic through this server."
    )
    row_exit.set_active(cfg.get("tailscale_exit_node_enabled", False))
    row_exit.connect("notify::active", lambda w, p: cfg.update({"tailscale_exit_node_enabled": w.get_active()}))
    group_routes.add(row_exit)

    page.add(group_routes)
    return page
