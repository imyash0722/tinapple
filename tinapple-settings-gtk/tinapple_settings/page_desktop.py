"""
ChadWM Desktop Page: Look & Feel (Yellows and Greens), Gaps, Borders, and Remote Access.
"""

import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Adw

def build_desktop_page(cfg):
    page = Adw.PreferencesPage(
        title="ChadWM Desktop",
        icon_name="video-display-symbolic"
    )

    # Theme Group
    group_theme = Adw.PreferencesGroup(
        title="Visual Theme and Aesthetics",
        description="Minimalist, modern, and sleek Yellows and Greens design system."
    )

    row_pal = Adw.ActionRow(
        title="Active Theme: Tinapple Solar Forest",
        subtitle="Primary Accent: Solar Yellow (#facc15) · Action: Emerald Green (#10b981) · Base: Obsidian Forest (#0c110e)"
    )
    badge = Gtk.Label(label=" Modern &amp; Sleek ")
    badge.set_use_markup(True)
    badge.add_css_class("badge-green")
    row_pal.add_suffix(badge)
    group_theme.add(row_pal)

    row_font = Adw.ActionRow(
        title="System Font: JetBrainsMono Nerd Font",
        subtitle="Native glyphs for terminal status bar pill badges (RAM, Clock, Network, Thermal)"
    )
    badge_font = Gtk.Label(label=" Embedded ")
    badge_font.add_css_class("badge-yellow")
    row_font.add_suffix(badge_font)
    group_theme.add(row_font)

    page.add(group_theme)

    # Window Manager Metrics Group
    group_wm = Adw.PreferencesGroup(
        title="Window Layout and Borders",
        description="Geometry parameters for tiling and floating window placement."
    )

    row_gaps = Adw.SpinRow.new_with_range(0, 32, 2)
    row_gaps.set_title("Window Tiling Gaps (Pixels)")
    row_gaps.set_subtitle("Inner and outer spacing between tiled application windows")
    row_gaps.set_value(cfg.get("window_gaps", 8))
    row_gaps.connect("notify::value", lambda w, p: cfg.update({"window_gaps": int(w.get_value())}))
    group_wm.add(row_gaps)

    row_border = Adw.SpinRow.new_with_range(1, 8, 1)
    row_border.set_title("Window Border Width (Pixels)")
    row_border.set_subtitle("Subtle geometric outline around active and inactive client windows")
    row_border.set_value(cfg.get("border_width", 2))
    row_border.connect("notify::value", lambda w, p: cfg.update({"border_width": int(w.get_value())}))
    group_wm.add(row_border)

    page.add(group_wm)

    # Remote Access Group
    group_remote = Adw.PreferencesGroup(
        title="Remote Desktop Connectivity",
        description="Access your graphical ChadWM desktop session remotely over LAN or Tailscale."
    )

    row_rdp = Adw.SwitchRow(
        title="XRDP Remote Desktop Server (:3389)",
        subtitle="Connect seamlessly from Windows Remote Desktop Connection, macOS Microsoft Remote Desktop, or Linux Remmina."
    )
    row_rdp.set_active(cfg.get("xrdp_enabled", True))
    row_rdp.connect("notify::active", lambda w, p: cfg.update({"xrdp_enabled": w.get_active()}))
    group_remote.add(row_rdp)

    row_vnc = Adw.SwitchRow(
        title="TigerVNC Server (:5900)",
        subtitle="Lightweight RFB screen sharing for VNC clients."
    )
    row_vnc.set_active(cfg.get("vnc_enabled", False))
    row_vnc.connect("notify::active", lambda w, p: cfg.update({"vnc_enabled": w.get_active()}))
    group_remote.add(row_vnc)

    page.add(group_remote)
    return page
