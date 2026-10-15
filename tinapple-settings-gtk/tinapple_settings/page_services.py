"""
Appliance Services Page: All Features from Tinarchy.
Nginx Gateway, Tinarchy Dashboard, Jellyfin, *Arr, Suwayomi, qBittorrent, Syncthing, Vaultwarden, Tor, Beeper.
"""

import gi
gi.require_version('Gtk', '4.0')
gi.require_version('Adw', '1')
from gi.repository import Gtk, Adw

def build_services_page(cfg):
    page = Adw.PreferencesPage(
        title="Appliance Services",
        icon_name="server-database-symbolic"
    )

    # Group: Reverse Proxy & Core Dashboard
    group_core = Adw.PreferencesGroup(
        title="Web Gateway and Control Center",
        description="Unified Nginx reverse proxying and real-time telemetry streaming."
    )

    row_nginx = Adw.SwitchRow(
        title="Nginx Unified Reverse Proxy (:80, :443)",
        subtitle="Consolidates all appliance web services under standard ports with upstream keepalives, SSL/TLS certificates, and zero-buffering for SSE telemetry streams."
    )
    row_nginx.set_active(cfg.get("nginx_enabled", True))
    row_nginx.connect("notify::active", lambda w, p: cfg.update({"nginx_enabled": w.get_active()}))
    group_core.add(row_nginx)

    row_dash = Adw.SwitchRow(
        title="Tinarchy / Pinedash Server Control Center (:8085)",
        subtitle="Lightweight glassmorphic web dashboard with Pywal dynamic theming, live 2s delta SSE telemetry, and draggable Homarr-style widget cards."
    )
    row_dash.set_active(cfg.get("dashboard_enabled", True))
    row_dash.connect("notify::active", lambda w, p: cfg.update({"dashboard_enabled": w.get_active()}))
    group_core.add(row_dash)

    page.add(group_core)

    # Group: Media & Streaming Stack
    group_media = Adw.PreferencesGroup(
        title="Media and Entertainment Pipeline",
        description="Self-hosted streaming, discovery, and automated manga indexing."
    )

    row_jelly = Adw.SwitchRow(
        title="Jellyfin Media Server (:8096)",
        subtitle="Open-source media streaming system for movies, TV shows, and music with hardware Intel QuickSync / VA-API video transcoding."
    )
    row_jelly.set_active(cfg.get("jellyfin_enabled", False))
    row_jelly.connect("notify::active", lambda w, p: cfg.update({"jellyfin_enabled": w.get_active()}))
    group_media.add(row_jelly)

    row_arr = Adw.SwitchRow(
        title="Automated *Arr Media Suite (Seerr, Sonarr, Radarr, Prowlarr)",
        subtitle="Automated media requests and tracking pipeline with atomic hardlinking in $HOME/storage/ without duplicate disk usage."
    )
    row_arr.set_active(cfg.get("arr_stack_enabled", False))
    row_arr.connect("notify::active", lambda w, p: cfg.update({"arr_stack_enabled": w.get_active()}))
    group_media.add(row_arr)

    row_suwayomi = Adw.SwitchRow(
        title="Suwayomi Manga Server (:4567) + FlareSolverr",
        subtitle="Self-hosted Tachiyomi server paired with two-layer high-DPI 340px WebP thumbnail pre-caching, FlareSolverr Cloudflare bypass, and headless Xvfb framebuffer."
    )
    row_suwayomi.set_active(cfg.get("suwayomi_enabled", False))
    row_suwayomi.connect("notify::active", lambda w, p: cfg.update({"suwayomi_enabled": w.get_active()}))
    group_media.add(row_suwayomi)

    page.add(group_media)

    # Group: Download Engines & Cloud Sync
    group_transfers = Adw.PreferencesGroup(
        title="Downloads and Decentralized File Sync",
        description="High-throughput torrenting, headless direct downloads, and continuous folder synchronization."
    )

    row_qbit = Adw.SwitchRow(
        title="qBittorrent Multicore Daemon (:8084)",
        subtitle="Headless torrent client configured with 8 parallel SHA-1 hashing threads, 10 async disk I/O workers, and 256MB RAM cache."
    )
    row_qbit.set_active(cfg.get("qbittorrent_enabled", False))
    row_qbit.connect("notify::active", lambda w, p: cfg.update({"qbittorrent_enabled": w.get_active()}))
    group_transfers.add(row_qbit)

    row_jd = Adw.SwitchRow(
        title="JDownloader 2 Headless and Quick-Add Grabber",
        subtitle="24/7 direct-download daemon integrated with MyJDownloader cloud, live transfer metrics, and dashboard quick-add link grabber."
    )
    row_jd.set_active(cfg.get("jdownloader_enabled", False))
    row_jd.connect("notify::active", lambda w, p: cfg.update({"jdownloader_enabled": w.get_active()}))
    group_transfers.add(row_jd)

    row_sync = Adw.SwitchRow(
        title="Syncthing Continuous Folder Sync (:8384)",
        subtitle="Decentralized, end-to-end encrypted synchronization for $HOME/drive/ with forced LZ4/Zstandard block compression and native Obsidian vault sync."
    )
    row_sync.set_active(cfg.get("syncthing_enabled", True))
    row_sync.connect("notify::active", lambda w, p: cfg.update({"syncthing_enabled": w.get_active()}))
    group_transfers.add(row_sync)

    page.add(group_transfers)

    # Group: Privacy & Identity
    group_sec = Adw.PreferencesGroup(
        title="Privacy, Passwords and Matrix Bridges",
        description="Zero-knowledge password vault, onion routing, and chat orchestration."
    )

    row_vault = Adw.SwitchRow(
        title="Vaultwarden Password Vault (:8000)",
        subtitle="Lightweight Bitwarden-compatible password manager with client-side AES-256 encryption and free TOTP 2FA authenticator."
    )
    row_vault.set_active(cfg.get("vaultwarden_enabled", False))
    row_vault.connect("notify::active", lambda w, p: cfg.update({"vaultwarden_enabled": w.get_active()}))
    group_sec.add(row_vault)

    row_tor = Adw.SwitchRow(
        title="Tor SOCKS5 Proxy (:9050) and Exit Node",
        subtitle="Local onion routing proxy and optional global Tailscale exit node routing via iptables."
    )
    row_tor.set_active(cfg.get("tor_proxy_enabled", False))
    row_tor.connect("notify::active", lambda w, p: cfg.update({"tor_proxy_enabled": w.get_active()}))
    group_sec.add(row_tor)

    page.add(group_sec)
    return page
