"""
About Page: System Telemetry, Kernel, Appliance State, and Hardware Metrics.
"""

import os
import platform
import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Adw
from .backend import get_thermal_telemetry, get_tailscale_status

def build_about_page(cfg):
    page = Adw.PreferencesPage(
        title="About Appliance",
        icon_name="help-about-symbolic"
    )

    group_os = Adw.PreferencesGroup(
        title="Tinapple OS Appliance Information",
        description="Minimalist Arch Linux appliance operating system with ChadWM."
    )

    row_ver = Adw.ActionRow(
        title="Tinapple OS Version",
        subtitle="v0.0.1 (Arch Linux Base · Linux 6.16+ · ChadWM 6.5)"
    )
    badge = Gtk.Label(label=" Stable ")
    badge.add_css_class("badge-green")
    row_ver.add_suffix(badge)
    group_os.add(row_ver)

    uname = platform.uname()
    row_kernel = Adw.ActionRow(
        title=f"Kernel: {uname.release}",
        subtitle=f"Architecture: {uname.machine} · Node: {uname.node}"
    )
    group_os.add(row_kernel)

    temp = get_thermal_telemetry()
    ts = get_tailscale_status()
    row_status = Adw.ActionRow(
        title="Live Appliance Status",
        subtitle=f"CPU Package: {temp:.1f}°C · Tailnet: {ts['backend_state']} ({ts['peers']} peers)"
    )
    group_os.add(row_status)

    page.add(group_os)
    return page
