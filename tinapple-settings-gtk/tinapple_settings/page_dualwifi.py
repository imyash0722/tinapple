"""
Dual-WiFi Page: Upstream Station WiFi + Hotspot AP Router with Internet NAT Sharing and Server Access.
Supports internal laptop WiFi card for persistent internet + USB dongle as Access Point.
"""

import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Adw
from .backend import get_wifi_interfaces

def build_dualwifi_page(cfg):
    page = Adw.PreferencesPage(
        title="Dual-WiFi and Hotspot AP",
        icon_name="network-wireless-symbolic"
    )

    wifi_ifaces = get_wifi_interfaces()
    if not wifi_ifaces:
        wifi_ifaces = ["wlan0 (Internal)", "wlan1 (USB Dongle)"]

    # Master Hotspot Switch
    group_master = Adw.PreferencesGroup(
        title="Dual-Interface Wireless Hotspot Architecture",
        description="Run two Wi-Fi adapters simultaneously: one dedicated to client internet access and the second as a standalone broadcast Access Point (AP)."
    )

    row_master = Adw.SwitchRow(
        title="Enable Dual-WiFi Hotspot AP Router",
        subtitle="Spawns hostapd and dnsmasq on your secondary Wi-Fi adapter while keeping your primary adapter persistently connected to your upstream network."
    )
    row_master.set_active(cfg.get("dual_wifi_enabled", False))
    row_master.connect("notify::active", lambda w, p: cfg.update({"dual_wifi_enabled": w.get_active()}))
    group_master.add(row_master)

    # Status notice
    row_detected = Adw.ActionRow(
        title=f"Detected Wireless Interfaces: {len(wifi_ifaces)}",
        subtitle="Interfaces: " + ", ".join(wifi_ifaces)
    )
    badge_iface = Gtk.Label(label=" 2+ Cards Ready " if len(wifi_ifaces) >= 2 else " Single Card ")
    badge_iface.add_css_class("badge-green" if len(wifi_ifaces) >= 2 else "badge-yellow")
    row_detected.add_suffix(badge_iface)
    group_master.add(row_detected)

    page.add(group_master)

    # Adapter Assignment Group
    group_adapters = Adw.PreferencesGroup(
        title="Hardware Adapter Roles",
        description="Assign your internal laptop Wi-Fi card and external USB dongle."
    )

    model_up = Gtk.StringList.new([f"{i} (Upstream Internet)" for i in wifi_ifaces])
    row_up = Adw.ComboRow(
        title="Primary Adapter (Upstream Internet Access)",
        subtitle="Connects persistently to your home Wi-Fi or router for internet connectivity.",
        model=model_up
    )
    row_up.set_selected(0)
    group_adapters.add(row_up)

    model_ap = Gtk.StringList.new([f"{i} (Hotspot Broadcast AP)" for i in wifi_ifaces])
    row_ap = Adw.ComboRow(
        title="Secondary Adapter (Hotspot AP Broadcast)",
        subtitle="Configured as an 802.11 Access Point (AP mode) to host wireless clients.",
        model=model_ap
    )
    row_ap.set_selected(1 if len(wifi_ifaces) > 1 else 0)
    group_adapters.add(row_ap)

    page.add(group_adapters)

    # Hotspot AP Network Settings
    group_ap = Adw.PreferencesGroup(
        title="Wireless AP Configuration",
        description="Network broadcast and security parameters."
    )

    row_ssid = Adw.EntryRow(title="Hotspot Network Name (SSID)")
    row_ssid.set_text(cfg.get("ap_ssid", "Tinapple-AP"))
    row_ssid.connect("notify::text", lambda w, p: cfg.update({"ap_ssid": w.get_text().strip()}))
    group_ap.add(row_ssid)

    row_pass = Adw.EntryRow(title="WPA2 Passphrase")
    row_pass.set_text(cfg.get("ap_passphrase", "tinapple-hotspot-pass"))
    row_pass.connect("notify::text", lambda w, p: cfg.update({"ap_passphrase": w.get_text().strip()}))
    group_ap.add(row_pass)

    row_gw = Adw.EntryRow(title="Hotspot Gateway IP")
    row_gw.set_text(cfg.get("ap_gateway_ip", "192.168.50.1"))
    row_gw.connect("notify::text", lambda w, p: cfg.update({"ap_gateway_ip": w.get_text().strip()}))
    group_ap.add(row_gw)

    row_dhcp = Adw.EntryRow(title="DHCP Client IP Range")
    row_dhcp.set_text(cfg.get("ap_dhcp_range", "192.168.50.10,192.168.50.150"))
    row_dhcp.connect("notify::text", lambda w, p: cfg.update({"ap_dhcp_range": w.get_text().strip()}))
    group_ap.add(row_dhcp)

    page.add(group_ap)

    # Routing & Client Server Access
    group_routing = Adw.PreferencesGroup(
        title="Internet Sharing and Server Access",
        description="Packet forwarding, NAT masquerading, and local service exposure."
    )

    row_nat = Adw.SwitchRow(
        title="Share Internet with Hotspot Clients (NAT Masquerade)",
        subtitle="Enables net.ipv4.ip_forward=1 and iptables POSTROUTING MASQUERADE. All phones and laptops connected to the Hotspot AP seamlessly access the internet via your primary Wi-Fi card."
    )
    row_nat.set_active(cfg.get("ap_nat_internet_sharing", True))
    row_nat.connect("notify::active", lambda w, p: cfg.update({"ap_nat_internet_sharing": w.get_active()}))
    group_routing.add(row_nat)

    row_srv = Adw.SwitchRow(
        title="Expose Appliance Server Services to AP Clients",
        subtitle="Configures UFW and Nginx so that clients connected to the Hotspot AP can directly access self-hosted services (Jellyfin, Server Dashboard, Syncthing) at http://192.168.50.1 or http://tinapple.local."
    )
    row_srv.set_active(cfg.get("ap_server_client_access", True))
    row_srv.connect("notify::active", lambda w, p: cfg.update({"ap_server_client_access": w.get_active()}))
    group_routing.add(row_srv)

    page.add(group_routing)
    return page
