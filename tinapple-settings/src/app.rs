use crate::model::TinappleConfig;
use crate::theme::*;
use egui::{
    vec2, Align, Button, Color32, CornerRadius, Layout, Panel, RichText, ScrollArea, Stroke,
    TextEdit, Ui,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SettingsTab {
    Tuning,
    Thermal,
    Firewall,
    Tailnet,
    DualWifi,
    TrueNas,
    Services,
    Desktop,
    About,
}

impl SettingsTab {
    pub fn title(&self) -> &'static str {
        match self {
            SettingsTab::Tuning => "Tuning & RPS",
            SettingsTab::Thermal => "Thermal & Power",
            SettingsTab::Firewall => "Firewall & Drop",
            SettingsTab::Tailnet => "Tailnet & LAN",
            SettingsTab::DualWifi => "Dual-WiFi AP",
            SettingsTab::TrueNas => "TrueNAS & Backup",
            SettingsTab::Services => "Services",
            SettingsTab::Desktop => "DWL & Apps",
            SettingsTab::About => "About Appliance",
        }
    }

    pub fn icon(&self) -> &'static str {
        match self {
            SettingsTab::Tuning => "󱐋",
            SettingsTab::Thermal => "󰈀",
            SettingsTab::Firewall => "",
            SettingsTab::Tailnet => "󰖩",
            SettingsTab::DualWifi => "󰒋",
            SettingsTab::TrueNas => "󰋊",
            SettingsTab::Services => "⚙",
            SettingsTab::Desktop => "",
            SettingsTab::About => "󰣇",
        }
    }

    pub fn all() -> &'static [SettingsTab] {
        &[
            SettingsTab::Tuning,
            SettingsTab::Thermal,
            SettingsTab::Firewall,
            SettingsTab::Tailnet,
            SettingsTab::DualWifi,
            SettingsTab::TrueNas,
            SettingsTab::Services,
            SettingsTab::Desktop,
            SettingsTab::About,
        ]
    }
}

pub struct SettingsApp {
    pub config: TinappleConfig,
    pub current_tab: SettingsTab,
    pub status_message: Option<(String, bool)>, // (message, is_success)
    pub log_output: Vec<String>,
}

impl Default for SettingsApp {
    fn default() -> Self {
        Self {
            config: TinappleConfig::load(),
            current_tab: SettingsTab::Tuning,
            status_message: None,
            log_output: Vec::new(),
        }
    }
}

impl eframe::App for SettingsApp {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        let ctx = ui.ctx().clone();
        apply_tinapple_theme(&ctx);

        // Top Header Panel
        Panel::top("settings_header")
            .frame(egui::Frame::new().fill(COLOR_BG_PANEL).inner_margin(egui::Margin::symmetric(24, 14)))
            .show(ui, |ui| {
                ui.horizontal(|ui| {
                    ui.label(RichText::new("󰣇 TINAPPLE CONTROL CENTER").size(17.0).color(COLOR_ACCENT).strong());
                    ui.label(RichText::new("·").color(COLOR_BORDER));
                    ui.label(RichText::new("Appliance & Desktop Settings").size(13.0).color(COLOR_TEXT_MUTED));

                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        let apply_btn = Button::new(RichText::new("✓ Apply & Save").color(COLOR_TEXT_DARK).strong().size(13.0))
                            .fill(COLOR_PRIMARY);
                        if ui.add(apply_btn).clicked() {
                            let logs = self.config.apply();
                            self.status_message = Some(("Settings successfully applied & saved!".to_string(), true));
                            self.log_output = logs;
                        }

                        let reset_btn = Button::new(RichText::new("↺ Reload").color(COLOR_TEXT_MAIN).size(13.0))
                            .fill(COLOR_BG_FLOAT);
                        if ui.add(reset_btn).clicked() {
                            self.config = TinappleConfig::load();
                            self.status_message = Some(("Settings reloaded from disk".to_string(), true));
                        }
                    });
                });
            });

        // Left Sidebar Navigation
        Panel::left("settings_sidebar")
            .default_size(220.0)
            .min_size(200.0)
            .frame(egui::Frame::new().fill(COLOR_BG_PANEL).inner_margin(egui::Margin::symmetric(14, 16)))
            .show(ui, |ui| {
                ui.label(RichText::new("SECTIONS").size(11.0).color(COLOR_TEXT_MUTED).strong());
                ui.add_space(8.0);

                for tab in SettingsTab::all() {
                    let is_active = self.current_tab == *tab;
                    let text = RichText::new(format!("{}  {}", tab.icon(), tab.title()))
                        .size(13.0)
                        .color(if is_active { COLOR_TEXT_DARK } else { COLOR_TEXT_MAIN })
                        .strong();

                    let btn = Button::new(text)
                        .fill(if is_active { COLOR_ACCENT } else { Color32::TRANSPARENT })
                        .corner_radius(CornerRadius::same(6))
                        .min_size(vec2(190.0, 32.0));

                    if ui.add(btn).clicked() {
                        self.current_tab = *tab;
                    }
                    ui.add_space(2.0);
                }

                ui.add_space(20.0);
                ui.separator();
                ui.add_space(10.0);

                ui.label(RichText::new("DWL WAYLAND APPS").size(11.0).color(COLOR_TEXT_MUTED).strong());
                ui.label(RichText::new("• Terminal: foot").size(12.0).color(COLOR_ACCENT));
                ui.label(RichText::new("• Browser: firefox").size(12.0).color(COLOR_PRIMARY));
                ui.label(RichText::new("• Settings: Rust egui").size(12.0).color(COLOR_TEXT_MAIN));
                ui.label(RichText::new("• Installer: Rust egui").size(12.0).color(COLOR_TEXT_MAIN));
            });

        // Main Content Area
        egui::CentralPanel::default()
            .frame(egui::Frame::new().fill(COLOR_BG_FLOAT).inner_margin(egui::Margin::symmetric(24, 20)))
            .show(ui, |ui| {
                if let Some((ref msg, is_success)) = self.status_message {
                    let color = if is_success { COLOR_PRIMARY } else { Color32::from_rgb(239, 68, 68) };
                    ui.horizontal(|ui| {
                        ui.label(RichText::new(msg).color(color).size(13.0).strong());
                    });
                    ui.add_space(8.0);
                }

                ScrollArea::vertical().auto_shrink([false; 2]).show(ui, |ui| {
                    match self.current_tab {
                        SettingsTab::Tuning => self.render_tuning(ui),
                        SettingsTab::Thermal => self.render_thermal(ui),
                        SettingsTab::Firewall => self.render_firewall(ui),
                        SettingsTab::Tailnet => self.render_tailnet(ui),
                        SettingsTab::DualWifi => self.render_dualwifi(ui),
                        SettingsTab::TrueNas => self.render_truenas(ui),
                        SettingsTab::Services => self.render_services(ui),
                        SettingsTab::Desktop => self.render_desktop(ui),
                        SettingsTab::About => self.render_about(ui),
                    }

                    if !self.log_output.is_empty() {
                        ui.add_space(16.0);
                        ui.label(RichText::new("ACTIVATION LOGS").size(12.0).color(COLOR_ACCENT).strong());
                        egui::Frame::new()
                            .fill(COLOR_BG_PANEL)
                            .stroke(Stroke::new(1.0, COLOR_BORDER))
                            .corner_radius(CornerRadius::same(6))
                            .inner_margin(egui::Margin::same(12))
                            .show(ui, |ui| {
                                for line in &self.log_output {
                                    ui.label(RichText::new(line).color(COLOR_TEXT_MUTED).size(11.0).monospace());
                                }
                            });
                    }
                });
            });
    }
}

impl SettingsApp {
    fn render_tuning(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Network & Kernel Tuning").size(18.0).color(COLOR_ACCENT).strong());
        ui.label(RichText::new("Multicore packet steering, active queue management, and memory optimization.").color(COLOR_TEXT_MUTED).size(13.0));
        ui.add_space(16.0);

        render_card(ui, "Multicore Receive Packet Steering (RPS/RFS)", |ui| {
            ui.checkbox(&mut self.config.tuning.rps_rfs_enabled, RichText::new("Enable RPS / RFS Packet Steering").color(COLOR_TEXT_MAIN));
            ui.label(RichText::new("Distributes incoming network interrupts and packet processing across all CPU cores to eliminate bottlenecking core 0 under gigabit load.").color(COLOR_TEXT_MUTED).size(12.0));
        });
        ui.add_space(10.0);

        render_card(ui, "Active Queue Management (CAKE AQM)", |ui| {
            ui.checkbox(&mut self.config.tuning.cake_aqm_enabled, RichText::new("Enable CAKE diffserv4 AQM").color(COLOR_TEXT_MAIN));
            ui.label(RichText::new("Replaces default pfifo_fast qdisc with CAKE diffserv4 to prevent bufferbloat and keep interactive latency ultra-low under heavy traffic.").color(COLOR_TEXT_MUTED).size(12.0));
        });
        ui.add_space(10.0);

        render_card(ui, "TCP Congestion Control (BBR)", |ui| {
            ui.checkbox(&mut self.config.tuning.tcp_bbr_enabled, RichText::new("Enable TCP BBR and Window Scaling").color(COLOR_TEXT_MAIN));
            ui.label(RichText::new("Uses Google's model-based BBR algorithm and 16MB socket window buffers for maximum throughput across high-latency mesh connections.").color(COLOR_TEXT_MUTED).size(12.0));
        });
        ui.add_space(10.0);

        render_card(ui, "Adaptive Memory & ZRAM Profile", |ui| {
            ui.checkbox(&mut self.config.tuning.zram_profile_enabled, RichText::new("High-Efficiency ZRAM Memory Profile").color(COLOR_TEXT_MAIN));
            ui.horizontal(|ui| {
                ui.label(RichText::new("Swappiness:").color(COLOR_TEXT_MAIN));
                ui.add(egui::Slider::new(&mut self.config.tuning.zram_swappiness, 0..=200));
            });
            ui.label(RichText::new("Aggressive zstd ZRAM swappiness keeps volatile application data compressed in RAM with zero disk swap wear.").color(COLOR_TEXT_MUTED).size(12.0));
        });
    }

    fn render_thermal(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Thermal & Power Management").size(18.0).color(COLOR_ACCENT).strong());
        ui.label(RichText::new("Closed-loop PID thermal control, CPU frequency governor, and 24/7 server power saving.").color(COLOR_TEXT_MUTED).size(13.0));
        ui.add_space(16.0);

        render_card(ui, "Closed-Loop PID Thermal Governor", |ui| {
            ui.checkbox(&mut self.config.thermal.pid_governor_enabled, RichText::new("Enable PID Thermal Governor").color(COLOR_TEXT_MAIN));
            ui.horizontal(|ui| {
                ui.label(RichText::new("Target Core Temperature (°C):").color(COLOR_TEXT_MAIN));
                ui.add(egui::Slider::new(&mut self.config.thermal.target_temp, 45..=85));
            });
            ui.label(RichText::new("Dynamically scales CPU frequencies and manages 4 thermal tiers (Safe, Warm, Throttle, Critical) to maintain whisper-quiet, safe operation.").color(COLOR_TEXT_MUTED).size(12.0));
        });
        ui.add_space(10.0);

        render_card(ui, "CPU Frequency Scaling Governor", |ui| {
            ui.horizontal(|ui| {
                ui.radio_value(&mut self.config.thermal.cpu_governor, "powersave".to_string(), "powersave (Cool / 24/7 Server)");
                ui.radio_value(&mut self.config.thermal.cpu_governor, "schedutil".to_string(), "schedutil (Dynamic)");
                ui.radio_value(&mut self.config.thermal.cpu_governor, "performance".to_string(), "performance (Locked Max)");
            });
        });
        ui.add_space(10.0);

        render_card(ui, "Display DPMS Sleep & ACPI Lid Handling", |ui| {
            ui.horizontal(|ui| {
                ui.label(RichText::new("0-Watt Screen Sleep Inactivity (Minutes):").color(COLOR_TEXT_MAIN));
                ui.add(egui::Slider::new(&mut self.config.thermal.screen_sleep_minutes, 1..=30));
            });
            ui.checkbox(&mut self.config.thermal.ignore_lid_switch, RichText::new("Ignore Laptop Lid Switch (Continuous 24/7 Server)").color(COLOR_TEXT_MAIN));
            ui.label(RichText::new("Prevents laptop from entering sleep mode when the lid is closed, allowing headless 24/7 background operation.").color(COLOR_TEXT_MUTED).size(12.0));
        });
    }

    fn render_firewall(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Firewall & Packet Dropping Policy").size(18.0).color(COLOR_ACCENT).strong());
        ui.label(RichText::new("In-kernel UFW filtering, stealth silent packet drop, and local network isolation.").color(COLOR_TEXT_MUTED).size(13.0));
        ui.add_space(16.0);

        render_card(ui, "Uncomplicated Firewall (UFW) Core Policy", |ui| {
            ui.checkbox(&mut self.config.firewall.ufw_enabled, RichText::new("Enable UFW Firewall").color(COLOR_TEXT_MAIN));
            ui.checkbox(&mut self.config.firewall.drop_blocked_packets, RichText::new("DROP Packets Sent to Blocked/Closed Ports (Stealth Mode)").color(COLOR_TEXT_MAIN));
            ui.label(RichText::new("Silently drops unsolicited packets instead of replying with TCP RST or ICMP port unreachable, blinding automated scanners.").color(COLOR_TEXT_MUTED).size(12.0));
            ui.add_space(6.0);
            ui.checkbox(&mut self.config.firewall.unblock_local_lan, RichText::new("Completely Unblock Local Home Network (RFC1918)").color(COLOR_TEXT_MAIN));
            ui.label(RichText::new("When checked, permits full unrestricted access to private 192.168.0.0/16, 10.0.0.0/8, and 172.16.0.0/12 subnets. When unchecked, strict zero-trust filtering applies.").color(COLOR_TEXT_MUTED).size(12.0));
        });
        ui.add_space(10.0);

        render_card(ui, "Service Port Rules", |ui| {
            ui.horizontal(|ui| {
                ui.checkbox(&mut self.config.firewall.open_ssh, "SSH (:22)");
                ui.checkbox(&mut self.config.firewall.open_http, "HTTP (:80)");
                ui.checkbox(&mut self.config.firewall.open_https, "HTTPS (:443)");
                ui.checkbox(&mut self.config.firewall.open_control_center, "Tinarchy (:8085)");
            });
            ui.horizontal(|ui| {
                ui.checkbox(&mut self.config.firewall.open_jellyfin, "Jellyfin (:8096)");
                ui.checkbox(&mut self.config.firewall.open_samba, "Samba (:445)");
                ui.checkbox(&mut self.config.firewall.open_nfs, "NFS (:2049)");
                ui.checkbox(&mut self.config.firewall.open_tailscale_wireguard, "WireGuard (:41641)");
            });
        });
    }

    fn render_tailnet(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Tailnet & LAN Guardian").size(18.0).color(COLOR_ACCENT).strong());
        ui.label(RichText::new("Encrypted WireGuard mesh peer networking and hardware-accelerated local network filtering.").color(COLOR_TEXT_MUTED).size(13.0));
        ui.add_space(16.0);

        render_card(ui, "Tailscale Mesh Integration", |ui| {
            ui.checkbox(&mut self.config.tailnet.tailscale_enabled, RichText::new("Enable Tailscale Daemon").color(COLOR_TEXT_MAIN));
            ui.checkbox(&mut self.config.tailnet.ssh_enabled, RichText::new("Enable Tailscale SSH Management (--ssh)").color(COLOR_TEXT_MAIN));
        });
        ui.add_space(10.0);

        render_card(ui, "Tailnet LAN Guardian (Zero-Trust Local Verification)", |ui| {
            ui.checkbox(&mut self.config.tailnet.lan_guardian_enabled, RichText::new("Enable Tailnet LAN Guardian Daemon").color(COLOR_TEXT_MAIN));
            ui.label(RichText::new("Listens directly to /run/tailscale/tailscaled.sock. When an authenticated peer communicates over the physical LAN, its local IP is resolved, added to the kernel tailnet-peers ipset, and dynamically unblocked in UFW with zero latency.").color(COLOR_TEXT_MUTED).size(12.0));
        });
    }

    fn render_dualwifi(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Dual-WiFi Hotspot AP Router").size(18.0).color(COLOR_ACCENT).strong());
        ui.label(RichText::new("Internal Wi-Fi connects upstream; external USB Wi-Fi dongle broadcasts an isolated Access Point.").color(COLOR_TEXT_MUTED).size(13.0));
        ui.add_space(16.0);

        render_card(ui, "Dual-Interface Wireless Hotspot Architecture", |ui| {
            ui.checkbox(&mut self.config.dualwifi.enabled, RichText::new("Enable Dual-WiFi Hotspot AP Router").color(COLOR_TEXT_MAIN));
            ui.label(RichText::new("Spawns hostapd and dnsmasq on secondary Wi-Fi adapter while primary adapter connects upstream.").color(COLOR_TEXT_MUTED).size(12.0));
            ui.add_space(8.0);

            ui.horizontal(|ui| {
                ui.label(RichText::new("Primary Upstream Interface:").color(COLOR_TEXT_MAIN));
                ui.add(TextEdit::singleline(&mut self.config.dualwifi.primary_interface).desired_width(120.0));
                ui.label(RichText::new("Secondary AP Dongle:").color(COLOR_TEXT_MAIN));
                ui.add(TextEdit::singleline(&mut self.config.dualwifi.secondary_interface).desired_width(120.0));
            });
            ui.horizontal(|ui| {
                ui.label(RichText::new("Broadcast SSID:").color(COLOR_TEXT_MAIN));
                ui.add(TextEdit::singleline(&mut self.config.dualwifi.hotspot_ssid).desired_width(160.0));
                ui.label(RichText::new("Passphrase:").color(COLOR_TEXT_MAIN));
                ui.add(TextEdit::singleline(&mut self.config.dualwifi.hotspot_passphrase).desired_width(160.0));
            });
            ui.checkbox(&mut self.config.dualwifi.nat_masquerade, RichText::new("Enable IPv4 Forwarding & NAT Masquerading").color(COLOR_TEXT_MAIN));
        });
    }

    fn render_truenas(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("TrueNAS Storage & Syncthing Archiving Engine").size(18.0).color(COLOR_ACCENT).strong());
        ui.label(RichText::new("Central NAS storage archive with automated multi-version snapshots of all Syncthing device sync folders.").color(COLOR_TEXT_MUTED).size(13.0));
        ui.add_space(16.0);

        render_card(ui, "TrueNAS Central Archive & Storage Pool", |ui| {
            ui.checkbox(&mut self.config.truenas.enabled, RichText::new("Enable TrueNAS Storage & Archiving Service").color(COLOR_TEXT_MAIN));
            ui.horizontal(|ui| {
                ui.label(RichText::new("Archive Storage Pool Path:").color(COLOR_TEXT_MAIN));
                ui.add(TextEdit::singleline(&mut self.config.truenas.archive_path).desired_width(260.0));
            });
            ui.label(RichText::new("Central persistent archive mount point for all backup datasets and networked shares.").color(COLOR_TEXT_MUTED).size(12.0));
        });
        ui.add_space(10.0);

        render_card(ui, "Syncthing to TrueNAS Automated Multi-Version Backup", |ui| {
            ui.checkbox(&mut self.config.truenas.syncthing_backup_enabled, RichText::new("Auto-Backup Syncthing Folders into TrueNAS Archive").color(COLOR_TEXT_MAIN));
            ui.label(RichText::new("While Syncthing synchronizes active folders across phones and laptops, TrueNAS takes scheduled hardlinked snapshots to guarantee extensive data recovery against accidental file deletions, ransomware, or corruption.").color(COLOR_TEXT_MUTED).size(12.0));
            ui.add_space(6.0);
            ui.horizontal(|ui| {
                ui.label(RichText::new("Snapshot Retention Period (Days):").color(COLOR_TEXT_MAIN));
                ui.add(egui::Slider::new(&mut self.config.truenas.snapshot_retention_days, 1..=365));
            });
        });
        ui.add_space(10.0);

        render_card(ui, "Network File Sharing (Samba & NFS)", |ui| {
            ui.checkbox(&mut self.config.truenas.samba_share_enabled, RichText::new("Enable Samba (SMB) Share for Windows / Mac / Linux").color(COLOR_TEXT_MAIN));
            ui.checkbox(&mut self.config.truenas.nfs_share_enabled, RichText::new("Enable High-Performance NFS v4 Network Share").color(COLOR_TEXT_MAIN));
            ui.checkbox(&mut self.config.truenas.bitrot_scrub_enabled, RichText::new("Enable Background Integrity Scrubbing (Bitrot Protection)").color(COLOR_TEXT_MAIN));
        });
    }

    fn render_services(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Appliance Services & Store").size(18.0).color(COLOR_ACCENT).strong());
        ui.label(RichText::new("Self-hosted media, server telemetry dashboard, and background daemons.").color(COLOR_TEXT_MUTED).size(13.0));
        ui.add_space(16.0);

        render_card(ui, "Core Gateway & Telemetry", |ui| {
            ui.checkbox(&mut self.config.services.nginx_enabled, RichText::new("Nginx Unified Reverse Proxy (:80, :443)").color(COLOR_TEXT_MAIN));
            ui.checkbox(&mut self.config.services.tinarchy_dash_enabled, RichText::new("Tinarchy / Pinedash Server Dashboard (:8085)").color(COLOR_TEXT_MAIN));
        });
        ui.add_space(10.0);

        render_card(ui, "Storage, Backup & Media Pipeline", |ui| {
            ui.checkbox(&mut self.config.services.truenas_enabled, RichText::new("TrueNAS Storage & Archiving Appliance").color(COLOR_TEXT_MAIN));
            ui.checkbox(&mut self.config.services.syncthing_enabled, RichText::new("Syncthing Multi-Device Folder Sync (:8384)").color(COLOR_TEXT_MAIN));
            ui.checkbox(&mut self.config.services.jellyfin_enabled, RichText::new("Jellyfin Media Server (:8096)").color(COLOR_TEXT_MAIN));
            ui.checkbox(&mut self.config.services.arr_suite_enabled, RichText::new("Automated *Arr Media Suite (Seerr, Sonarr, Radarr)").color(COLOR_TEXT_MAIN));
            ui.checkbox(&mut self.config.services.suwayomi_enabled, RichText::new("Suwayomi Manga Server (:4567)").color(COLOR_TEXT_MAIN));
            ui.checkbox(&mut self.config.services.qbittorrent_enabled, RichText::new("qBittorrent Multicore Client (:8080)").color(COLOR_TEXT_MAIN));
            ui.checkbox(&mut self.config.services.vaultwarden_enabled, RichText::new("Vaultwarden Password Vault (:8001)").color(COLOR_TEXT_MAIN));
            ui.checkbox(&mut self.config.services.tor_enabled, RichText::new("Tor SOCKS5 Privacy Proxy (:9050)").color(COLOR_TEXT_MAIN));
        });
    }

    fn render_desktop(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("DWL Wayland Compositor & Approved Applications").size(18.0).color(COLOR_ACCENT).strong());
        ui.label(RichText::new("dwm for Wayland (wlroots) compositor with Ironbar drop-down capsule and approved apps.").color(COLOR_TEXT_MUTED).size(13.0));
        ui.add_space(16.0);

        render_card(ui, "Approved Server Applications", |ui| {
            ui.label(RichText::new("1. foot - Fast, lightweight terminal emulator (Super+Return)").color(COLOR_ACCENT));
            ui.label(RichText::new("2. firefox - Full web browser for local web consoles & admin (Super+w)").color(COLOR_PRIMARY));
            ui.label(RichText::new("3. tinapple-settings - Native Rust Control Center & Appliance Manager (Super+s)").color(COLOR_TEXT_MAIN));
            ui.label(RichText::new("4. tinapple-gui-installer - Native Rust 14-stage system installer (Super+i)").color(COLOR_TEXT_MAIN));
        });
        ui.add_space(10.0);

        render_card(ui, "Window Manager Appearance", |ui| {
            ui.horizontal(|ui| {
                ui.label(RichText::new("Window Gaps (px):").color(COLOR_TEXT_MAIN));
                ui.add(egui::Slider::new(&mut self.config.dwl.window_gaps, 0..=32));
            });
            ui.horizontal(|ui| {
                ui.label(RichText::new("Border Width (px):").color(COLOR_TEXT_MAIN));
                ui.add(egui::Slider::new(&mut self.config.dwl.border_width, 1..=8));
            });
        });
    }

    fn render_about(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("About Tinapple OS Appliance").size(18.0).color(COLOR_ACCENT).strong());
        ui.label(RichText::new("System telemetry and appliance release details.").color(COLOR_TEXT_MUTED).size(13.0));
        ui.add_space(16.0);

        render_card(ui, "Appliance Status", |ui| {
            ui.label(RichText::new("Distribution: Tinapple OS (Minimal DWL Wayland Appliance)").color(COLOR_TEXT_MAIN));
            ui.label(RichText::new(format!("Hostname: {}", self.config.system.hostname)).color(COLOR_TEXT_MUTED));
            ui.label(RichText::new("Theme: Obsidian & Glowing Orange").color(COLOR_PRIMARY));
            ui.label(RichText::new("Status: Online & Ready").color(COLOR_ACCENT));
        });
    }
}

fn render_card<R>(ui: &mut Ui, title: &str, add_contents: impl FnOnce(&mut Ui) -> R) -> R {
    egui::Frame::new()
        .fill(COLOR_BG_PANEL)
        .stroke(Stroke::new(1.0, COLOR_BORDER))
        .corner_radius(CornerRadius::same(8))
        .inner_margin(egui::Margin::same(14))
        .show(ui, |ui| {
            ui.label(RichText::new(title).size(13.0).color(COLOR_ACCENT).strong());
            ui.add_space(6.0);
            add_contents(ui)
        })
        .inner
}
