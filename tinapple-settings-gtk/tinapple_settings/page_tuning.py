"""
Tuning Page: Multicore RPS/RFS Packet Steering, CAKE AQM, TCP BBR, and Memory Profiles.
"""

import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Adw

def build_tuning_page(cfg):
    page = Adw.PreferencesPage(
        title="Network &amp; Tuning",
        icon_name="network-wired-symbolic"
    )

    # Group: Multicore Network Packet Steering
    group_rps = Adw.PreferencesGroup(
        title="Multicore Packet Steering and Queue Management",
        description="Kernel-level network acceleration to prevent single-core IRQ bottlenecks during high-throughput transfers."
    )

    row_rps = Adw.SwitchRow(
        title="Multicore RPS and RFS Packet Steering",
        subtitle="Distributes network receive packet processing across all CPU cores (rps_cpus) and dynamically tracks socket flows (rps_flow_cnt=4096). Eliminates packet drops under heavy network loads."
    )
    row_rps.set_active(cfg.get("rps_rfs_enabled", True))
    row_rps.connect("notify::active", lambda w, p: cfg.update({"rps_rfs_enabled": w.get_active()}))
    group_rps.add(row_rps)

    row_cake = Adw.SwitchRow(
        title="CAKE Active Queue Management (diffserv4)",
        subtitle="Replaces standard pfifo_fast queues with CAKE and diffserv4 packet classification on all physical/wireless adapters. Crushes bufferbloat and prioritizes low-latency interactive traffic."
    )
    row_cake.set_active(cfg.get("cake_aqm_enabled", True))
    row_cake.connect("notify::active", lambda w, p: cfg.update({"cake_aqm_enabled": w.get_active()}))
    group_rps.add(row_cake)

    row_bbr = Adw.SwitchRow(
        title="TCP BBR Congestion Control and Window Scaling",
        subtitle="Deploys Google's bottleneck bandwidth and RTT (BBR) congestion control algorithm and dynamically scales socket buffers up to 64MB for maximum throughput across remote links."
    )
    row_bbr.set_active(cfg.get("tcp_bbr_enabled", True))
    row_bbr.connect("notify::active", lambda w, p: cfg.update({"tcp_bbr_enabled": w.get_active()}))
    group_rps.add(row_bbr)

    page.add(group_rps)

    # Group: Memory & Swap Profiles
    group_mem = Adw.PreferencesGroup(
        title="Hardware Memory and Virtual Memory Profile",
        description="Adaptive kernel memory management tuned for modern zram vs physical swap storage."
    )

    mem_model = Gtk.StringList.new(["High-Efficiency ZRAM (Compressed RAM, Swappiness 150)", "Low-Wear Disk Swap (Physical SSD/HDD, Swappiness 30)"])
    row_mem = Adw.ComboRow(
        title="Virtual Memory Profile",
        subtitle="Choose 'ZRAM' for compressed in-RAM swap with zero disk wear, or 'Disk Swap' for physical SSD/HDD swap partitions with conservative write caching.",
        model=mem_model
    )
    row_mem.set_selected(0 if cfg.get("memory_profile") == "zram" else 1)
    def on_mem_change(w, p):
        cfg["memory_profile"] = "zram" if w.get_selected() == 0 else "disk_swap"
    row_mem.connect("notify::selected", on_mem_change)
    group_mem.add(row_mem)

    page.add(group_mem)
    return page
