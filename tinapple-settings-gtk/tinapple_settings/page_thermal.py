"""
Thermal Page: Closed-Loop Thermal PID Governor, 4-Tier Demand Ladder, and Power Management.
"""

import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Adw
from .backend import get_thermal_telemetry

def build_thermal_page(cfg):
    page = Adw.PreferencesPage(
        title="Thermal and Power",
        icon_name="sensors-temperature-symbolic"
    )

    # Telemetry live monitor badge
    current_temp = get_thermal_telemetry()
    group_status = Adw.PreferencesGroup(
        title="Live Thermal Telemetry",
        description=f"Current CPU Package Temperature: {current_temp:.1f}°C"
    )
    row_cur = Adw.ActionRow(
        title="CPU Thermal Sensor",
        subtitle="Monitored in real-time by the kernel hwmon sysfs driver"
    )
    badge = Gtk.Label(label=f" {current_temp:.1f}°C ")
    badge.add_css_class("badge-green" if current_temp < 75 else "badge-yellow")
    row_cur.add_suffix(badge)
    group_status.add(row_cur)
    page.add(group_status)

    # Group: Closed-Loop Thermal PID Governor
    group_pid = Adw.PreferencesGroup(
        title="Closed-Loop Thermal PID Governor",
        description="Autonomous closed-loop PID orchestrator that continuously tracks package temperature T(t), thermal velocity (dT/dt), and steady-state integral to dynamically adjust CPU clock ceilings."
    )

    row_gov = Adw.SwitchRow(
        title="Autonomous Thermal PID Governor Service",
        subtitle="Enables the tinarchy-resource-governor daemon. Anticipates rapid thermal spikes (Kd * dT/dt) and dynamically brakes frequency to protect hardware while maximizing performance."
    )
    row_gov.set_active(cfg.get("thermal_governor_enabled", True))
    row_gov.connect("notify::active", lambda w, p: cfg.update({"thermal_governor_enabled": w.get_active()}))
    group_pid.add(row_gov)

    # 4-Tier Activity Ladder Expander
    expander_ladder = Adw.ExpanderRow(
        title="4-Tier Dynamic Activity and Demand Ladder",
        subtitle="Automatically scales operational thermal budgets based on user inactivity and workload demand."
    )

    row_t0 = Adw.ActionRow(
        title="Tier 0: Active Interactive (&lt; 15 mins since keystrokes/streaming)",
        subtitle="Target: 76.0°C | Base Clock: 1.8-2.2 GHz | Turbo: OFF | Whisper-quiet fan and instant responsiveness for interactive use."
    )
    expander_ladder.add_row(row_t0)

    row_t1 = Adw.ActionRow(
        title="Tier 1: Short Idle (15 - 30 mins inactivity)",
        subtitle="Target: 79.0°C | Base Clock: 2.2-2.5 GHz | Turbo: OFF | Smooth thermal ramp for background batch tasks as user steps away."
    )
    expander_ladder.add_row(row_t1)

    row_t2 = Adw.ActionRow(
        title="Tier 2: Idle Acceleration (30 - 60 mins inactivity)",
        subtitle="Target: 82.0°C | Freq: 2.5-2.8 GHz | Turbo: Conditional | Acceleration for download queues and background workers."
    )
    expander_ladder.add_row(row_t2)

    row_t3 = Adw.ActionRow(
        title="Tier 3: Unconstrained Sprint (&gt; 60 mins deep idle)",
        subtitle="Target: 84.0°C | Freq: 3.10 GHz Max Hardware | Turbo: Fully Unlocked | Maximum hardware throughput to drain heavy queues."
    )
    expander_ladder.add_row(row_t3)
    group_pid.add(expander_ladder)

    # CPU Governor Selector
    gov_model = Gtk.StringList.new(["powersave (Intel P-State Dynamic)", "performance (Maximum Clocks)", "schedutil (Kernel Scheduler Driven)"])
    row_cpu_gov = Adw.ComboRow(
        title="CPU Frequency Scaling Governor",
        subtitle="Select the baseline kernel scaling governor. 'powersave' with intel_pstate is recommended for modern Intel/AMD processors to allow rapid hardware P-state transitions.",
        model=gov_model
    )
    current_gov = cfg.get("cpu_scaling_governor", "powersave")
    row_cpu_gov.set_selected(0 if current_gov == "powersave" else (1 if current_gov == "performance" else 2))
    def on_gov_change(w, p):
        idx = w.get_selected()
        cfg["cpu_scaling_governor"] = ["powersave", "performance", "schedutil"][idx]
    row_cpu_gov.connect("notify::selected", on_gov_change)
    group_pid.add(row_cpu_gov)

    page.add(group_pid)

    # Group: Laptop Display & Power Saving
    group_power = Adw.PreferencesGroup(
        title="Display and Power Management",
        description="Power saving behaviors for headless servers and repurposed laptops."
    )

    row_display = Adw.SwitchRow(
        title="True 0-Watt LCD Screen Sleep",
        subtitle="Powers down display backlight via VESA DPMS (bl_power=4, actual_brightness=0) after 3 minutes of console inactivity. Wakes immediately upon physical keystroke."
    )
    row_display.set_active(cfg.get("display_sleep_enabled", True))
    row_display.connect("notify::active", lambda w, p: cfg.update({"display_sleep_enabled": w.get_active()}))
    group_power.add(row_display)

    row_lid = Adw.SwitchRow(
        title="Prevent Sleep on Laptop Lid Close (24/7 Server Mode)",
        subtitle="Instructs systemd-logind to ignore laptop lid close events. Displays power off to save battery/backlight while keeping all background services, Tailscale, and Nginx running 24/7."
    )
    row_lid.set_active(cfg.get("acpi_lid_ignore_suspend", True))
    row_lid.connect("notify::active", lambda w, p: cfg.update({"acpi_lid_ignore_suspend": w.get_active()}))
    group_power.add(row_lid)

    page.add(group_power)
    return page
