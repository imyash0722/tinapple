"""
Tinapple OS Control Center & Settings Application (GTK4 & Libadwaita)
Modern, Sleek, Yellows and Greens Themed Step-by-Step Appliance Configuration.
"""

import sys
import os
import gi

gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Adw, GLib, Gio

from .theme import apply_theme
from .config import load_config, save_config
from .backend import apply_all
from .page_tuning import build_tuning_page
from .page_thermal import build_thermal_page
from .page_firewall import build_firewall_page
from .page_tailnet import build_tailnet_page
from .page_dualwifi import build_dualwifi_page
from .page_services import build_services_page
from .page_desktop import build_desktop_page
from .page_about import build_about_page

STEPS = [
    ("tuning", "1. Tuning & RPS", "network-wired-symbolic", build_tuning_page),
    ("thermal", "2. Thermal & Power", "sensors-temperature-symbolic", build_thermal_page),
    ("firewall", "3. Firewall & Drop", "security-high-symbolic", build_firewall_page),
    ("tailnet", "4. Tailnet & LAN", "network-vpn-symbolic", build_tailnet_page),
    ("dualwifi", "5. Dual-WiFi AP", "network-wireless-symbolic", build_dualwifi_page),
    ("services", "6. Services", "server-database-symbolic", build_services_page),
    ("desktop", "7. Desktop", "video-display-symbolic", build_desktop_page),
    ("about", "8. About", "help-about-symbolic", build_about_page),
]

class TinappleSettingsWindow(Adw.ApplicationWindow):
    def __init__(self, app, initial_step=0):
        super().__init__(application=app, title="Tinapple OS Control Center")
        self.set_default_size(980, 680)
        self.cfg = load_config()
        self.current_step_idx = initial_step

        self.toast_overlay = Adw.ToastOverlay()
        self.set_content(self.toast_overlay)

        # Main Vertical Container
        main_box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.toast_overlay.set_child(main_box)

        # ── Header Bar ──
        header = Adw.HeaderBar()
        header.add_css_class("flat")

        # Previous Step Button (Header Start)
        self.btn_prev = Gtk.Button(label="◀ Prev")
        self.btn_prev.connect("clicked", lambda b: self.go_to_step(self.current_step_idx - 1))
        header.pack_start(self.btn_prev)

        # Title Widget
        self.title_widget = Adw.WindowTitle(
            title="󰣇 TINAPPLE CONTROL CENTER",
            subtitle="Step 1 of 8: Network & Tuning"
        )
        header.set_title_widget(self.title_widget)

        # Apply & Save Button (Header End)
        btn_apply = Gtk.Button(label="✓ Save & Apply")
        btn_apply.add_css_class("suggested-action")
        btn_apply.connect("clicked", self.on_apply_all)
        header.pack_end(btn_apply)

        # Next Step Button (Header End)
        self.btn_next = Gtk.Button(label="Next ▶")
        self.btn_next.add_css_class("accent-action")
        self.btn_next.connect("clicked", self.on_next_clicked)
        header.pack_end(self.btn_next)

        main_box.append(header)

        # ── Scrollable Step Progress Indicator Bar ──
        scrolled_bar = Gtk.ScrolledWindow()
        scrolled_bar.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.NEVER)
        scrolled_bar.set_min_content_height(46)
        scrolled_bar.set_max_content_height(46)

        self.step_bar = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        self.step_bar.set_halign(Gtk.Align.CENTER)
        self.step_bar.set_margin_top(6)
        self.step_bar.set_margin_bottom(6)
        self.step_bar.set_margin_start(12)
        self.step_bar.set_margin_end(12)
        self.step_pills = []

        for idx, (step_id, step_name, icon_name, _) in enumerate(STEPS):
            pill_btn = Gtk.Button(label=step_name)
            pill_btn.add_css_class("step-pill")
            def make_pill_cb(i):
                return lambda b: self.go_to_step(i)
            pill_btn.connect("clicked", make_pill_cb(idx))
            self.step_bar.append(pill_btn)
            self.step_pills.append(pill_btn)

        scrolled_bar.set_child(self.step_bar)
        main_box.append(scrolled_bar)

        # Separator
        main_box.append(Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL))

        # ── View Stack (Pages) ──
        self.stack = Adw.ViewStack()
        self.stack.set_vexpand(True)
        self.stack.set_hexpand(True)

        for step_id, step_name, icon_name, builder_func in STEPS:
            page = builder_func(self.cfg)
            self.stack.add_titled_with_icon(page, step_id, step_name, icon_name)

        main_box.append(self.stack)

        self.update_ui_state()

    def go_to_step(self, idx):
        if 0 <= idx < len(STEPS):
            self.current_step_idx = idx
            step_id, step_name, _, _ = STEPS[idx]
            self.stack.set_visible_child_name(step_id)
            self.update_ui_state()

    def on_next_clicked(self, btn):
        if self.current_step_idx < len(STEPS) - 1:
            self.go_to_step(self.current_step_idx + 1)
        else:
            self.on_apply_all(btn)

    def update_ui_state(self):
        idx = self.current_step_idx
        step_id, step_name, _, _ = STEPS[idx]
        self.title_widget.set_subtitle(f"Step {idx + 1} of {len(STEPS)}: {step_name}")

        self.btn_prev.set_sensitive(idx > 0)
        if idx == len(STEPS) - 1:
            self.btn_next.set_label("✓ Finish")
            self.btn_next.remove_css_class("accent-action")
            self.btn_next.add_css_class("suggested-action")
        else:
            self.btn_next.set_label("Next ▶")
            self.btn_next.remove_css_class("suggested-action")
            self.btn_next.add_css_class("accent-action")

        for i, pill in enumerate(self.step_pills):
            pill.remove_css_class("active")
            pill.remove_css_class("completed")
            if i == idx:
                pill.add_css_class("active")
            elif i < idx:
                pill.add_css_class("completed")

    def on_apply_all(self, btn):
        ok, msg = save_config(self.cfg)
        if not ok:
            toast = Adw.Toast.new(f"Failed to save: {msg}")
            self.toast_overlay.add_toast(toast)
            return

        toast = Adw.Toast.new("Applying system configuration...")
        self.toast_overlay.add_toast(toast)

        def apply_task():
            logs = apply_all(self.cfg)
            GLib.idle_add(lambda: self.show_apply_results(logs))

        import threading
        threading.Thread(target=apply_task, daemon=True).start()

    def show_apply_results(self, logs):
        toast = Adw.Toast.new(f"✓ Configuration applied successfully ({len(logs)} tasks completed)")
        self.toast_overlay.add_toast(toast)

    def on_reload(self, btn):
        self.cfg = load_config()
        toast = Adw.Toast.new("↺ Settings reloaded from disk")
        self.toast_overlay.add_toast(toast)

class TinappleSettingsApp(Adw.Application):
    def __init__(self, initial_step=0):
        super().__init__(
            application_id="org.tinapple.Settings",
            flags=Gio.ApplicationFlags.FLAGS_NONE
        )
        self.initial_step = initial_step

    def do_activate(self):
        apply_theme()
        win = TinappleSettingsWindow(self, initial_step=self.initial_step)
        win.present()

def main():
    initial_step = 0
    apply_headless = False

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        arg = args[i]
        if arg in ("-h", "--help"):
            print("""󰣇 Tinapple OS Control Center & Settings
Usage: tinapple-settings [options]

Options:
  -s, --step <1-8>    Open directly to step number
  -t, --tab <name>    Open to section (tuning, thermal, firewall, tailnet, dualwifi, services, desktop, about)
  -a, --apply         Apply saved settings immediately and exit (headless)
  -h, --help          Show this help message
""")
            sys.exit(0)
        elif arg in ("-a", "--apply"):
            apply_headless = True
        elif arg in ("-s", "--step") and i + 1 < len(args):
            i += 1
            try:
                initial_step = max(0, min(len(STEPS) - 1, int(args[i]) - 1))
            except ValueError:
                pass
        elif arg in ("-t", "--tab") and i + 1 < len(args):
            i += 1
            target = args[i].lower()
            for idx, (step_id, _, _, _) in enumerate(STEPS):
                if target in step_id:
                    initial_step = idx
                    break
        i += 1

    if apply_headless:
        cfg = load_config()
        logs = apply_all(cfg)
        for line in logs:
            print(line)
        sys.exit(0)

    app = TinappleSettingsApp(initial_step=initial_step)
    app.run(None)

if __name__ == "__main__":
    main()
