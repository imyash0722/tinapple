use crate::backend::{
    is_uefi, probe_disks, spawn_installer_thread, test_network, DiskDevice, InstallEvent,
    INSTALL_STAGES,
};
use crate::theme::*;
use egui::{
    vec2, Align, Button, Color32, CornerRadius, Layout, Panel, ProgressBar, RichText, ScrollArea, Stroke,
    TextEdit, Ui,
};
use std::collections::{HashMap, HashSet};
use std::process::Command;
use std::sync::mpsc::Receiver;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Step {
    Keyboard = 0,
    Network = 1,
    Bootloader = 2,
    DiskLayout = 3,
    Filesystem = 4,
    Encryption = 5,
    UserAccount = 6,
    Hardware = 7,
    Kernel = 8,
    Services = 9,
    Drivers = 10,
    Confirmation = 11,
    Installing = 12,
    Completed = 13,
}

impl Step {
    pub fn title(&self) -> &'static str {
        match self {
            Step::Keyboard => "Keyboard Layout",
            Step::Network => "Network Configuration",
            Step::Bootloader => "Bootloader",
            Step::DiskLayout => "Disk Partitioning",
            Step::Filesystem => "Root Filesystem",
            Step::Encryption => "Disk Encryption (LUKS2)",
            Step::UserAccount => "User & Hostname",
            Step::Hardware => "Hardware Profile",
            Step::Kernel => "Linux Kernel",
            Step::Services => "Service Profiles",
            Step::Drivers => "Hardware Drivers",
            Step::Confirmation => "Review & Confirm",
            Step::Installing => "Installing System",
            Step::Completed => "Installation Complete",
        }
    }

    pub fn icon(&self) -> &'static str {
        match self {
            Step::Keyboard => "",
            Step::Network => "",
            Step::Bootloader => "",
            Step::DiskLayout => "",
            Step::Filesystem => "",
            Step::Encryption => "",
            Step::UserAccount => "",
            Step::Hardware => "",
            Step::Kernel => "",
            Step::Services => "",
            Step::Drivers => "",
            Step::Confirmation => "",
            Step::Installing => "",
            Step::Completed => "",
        }
    }

    pub fn all() -> &'static [Step] {
        &[
            Step::Keyboard,
            Step::Network,
            Step::Bootloader,
            Step::DiskLayout,
            Step::Filesystem,
            Step::Encryption,
            Step::UserAccount,
            Step::Hardware,
            Step::Kernel,
            Step::Services,
            Step::Drivers,
            Step::Confirmation,
            Step::Installing,
            Step::Completed,
        ]
    }
}

pub struct InstallerApp {
    pub step: Step,
    pub dry_run: bool,
    pub skip_pacstrap: bool,

    // Step 1: Keyboard
    pub keymap: String,
    pub keymap_test_text: String,

    // Step 2: Network
    pub net_status: String,
    pub net_is_online: bool,

    // Step 3: Bootloader
    pub bootloader: String,
    pub is_uefi_system: bool,

    // Step 4: Disks
    pub available_disks: Vec<DiskDevice>,
    pub selected_disk_idx: usize,
    pub disk_strategy: String, // "auto" or "custom"

    // Step 5: Filesystem
    pub filesystem: String, // "ext4", "btrfs", "xfs"

    // Step 6: LUKS2
    pub enable_luks: bool,
    pub luks_passphrase: String,
    pub luks_confirm: String,
    pub show_passphrase: bool,

    // Step 7: User
    pub hostname: String,
    pub username: String,
    pub user_pass: String,
    pub user_pass_confirm: String,
    pub root_pass: String,
    pub same_root_pass: bool,
    pub enable_sudo: bool,

    // Step 8: Hardware
    pub chassis: String, // "auto", "desktop", "laptop"
    pub power_profile: String,

    // Step 9: Kernel
    pub kernel: String, // "lts", "hardened", "current"

    // Step 10: Services
    pub selected_profiles: HashSet<String>,

    // Step 11: Drivers
    pub enable_proprietary: bool,
    pub cpu_vendor: String,
    pub gpu_vendor: String,

    // Step 12 & 13: Installation Runner
    pub install_receiver: Option<Receiver<InstallEvent>>,
    pub install_logs: Vec<String>,
    pub current_stage_idx: usize,
    pub current_stage_id: String,
    pub is_installing: bool,
    pub install_finished: bool,
    pub install_success: bool,
    pub error_msg: Option<String>,
    pub auto_scroll_logs: bool,
}

impl InstallerApp {
    pub fn new(dry_run: bool, skip_pacstrap: bool, preselected_disk: Option<String>) -> Self {
        let is_uefi_system = is_uefi();
        let disks = probe_disks();

        let mut selected_idx = 0;
        if let Some(target) = preselected_disk {
            if let Some(pos) = disks.iter().position(|d| d.path == target || d.name == target) {
                selected_idx = pos;
            }
        }

        let mut selected_profiles = HashSet::new();
        selected_profiles.insert("base".to_string());
        selected_profiles.insert("desktop".to_string());
        selected_profiles.insert("media".to_string());
        selected_profiles.insert("downloads".to_string());

        let (net_online, net_status) = test_network();

        Self {
            step: Step::Keyboard,
            dry_run,
            skip_pacstrap,

            keymap: "us".to_string(),
            keymap_test_text: String::new(),

            net_status,
            net_is_online: net_online,

            bootloader: if is_uefi_system { "limine".to_string() } else { "grub".to_string() },
            is_uefi_system,

            available_disks: disks,
            selected_disk_idx: selected_idx,
            disk_strategy: "auto".to_string(),

            filesystem: "ext4".to_string(),

            enable_luks: false,
            luks_passphrase: String::new(),
            luks_confirm: String::new(),
            show_passphrase: false,

            hostname: "tinapple".to_string(),
            username: "tinapple".to_string(),
            user_pass: "tinapple".to_string(),
            user_pass_confirm: "tinapple".to_string(),
            root_pass: "tinapple".to_string(),
            same_root_pass: true,
            enable_sudo: true,

            chassis: "auto".to_string(),
            power_profile: "balanced".to_string(),

            kernel: "lts".to_string(),

            selected_profiles,

            enable_proprietary: false,
            cpu_vendor: "Auto-detected".to_string(),
            gpu_vendor: "Auto-detected".to_string(),

            install_receiver: None,
            install_logs: Vec::new(),
            current_stage_idx: 0,
            current_stage_id: "preflight".to_string(),
            is_installing: false,
            install_finished: false,
            install_success: false,
            error_msg: None,
            auto_scroll_logs: true,
        }
    }

    fn build_env_map(&self) -> HashMap<String, String> {
        let mut map = HashMap::new();

        if let Some(disk) = self.available_disks.get(self.selected_disk_idx) {
            map.insert("TINAPPLE_DISK".to_string(), disk.path.clone());
        } else {
            map.insert("TINAPPLE_DISK".to_string(), "/dev/vda".to_string());
        }

        map.insert("TINAPPLE_DISK_STRATEGY".to_string(), self.disk_strategy.clone());
        map.insert("TINAPPLE_FS".to_string(), self.filesystem.clone());
        map.insert("TINAPPLE_BOOTLOADER".to_string(), self.bootloader.clone());
        map.insert("TINAPPLE_FIRMWARE".to_string(), if self.is_uefi_system { "uefi".to_string() } else { "bios".to_string() });
        map.insert("TINAPPLE_LUKS".to_string(), if self.enable_luks { "yes".to_string() } else { "no".to_string() });
        if self.enable_luks {
            map.insert("TINAPPLE_LUKS_PASSWORD".to_string(), self.luks_passphrase.clone());
        }

        map.insert("TINAPPLE_HOSTNAME".to_string(), self.hostname.clone());
        map.insert("TINAPPLE_USERNAME".to_string(), self.username.clone());
        map.insert("TINAPPLE_USER_PASSWORD".to_string(), self.user_pass.clone());
        let root_p = if self.same_root_pass { &self.user_pass } else { &self.root_pass };
        map.insert("TINAPPLE_ROOT_PASSWORD".to_string(), root_p.clone());

        map.insert("TINAPPLE_KERNEL_PROFILE".to_string(), self.kernel.clone());
        map.insert("TINAPPLE_CHASSIS".to_string(), self.chassis.clone());

        let prof_list: Vec<String> = self.selected_profiles.iter().cloned().collect();
        map.insert("TINAPPLE_PROFILES".to_string(), prof_list.join(","));

        map.insert(
            "TINAPPLE_ENABLE_PROPRIETARY".to_string(),
            if self.enable_proprietary { "1".to_string() } else { "0".to_string() },
        );

        if self.dry_run {
            map.insert("TINAPPLE_DRYRUN".to_string(), "1".to_string());
        }
        if self.skip_pacstrap {
            map.insert("TINAPPLE_SKIP_PACSTRAP".to_string(), "1".to_string());
        }

        map
    }

    pub fn start_installation(&mut self) {
        self.step = Step::Installing;
        self.is_installing = true;
        self.install_finished = false;
        self.install_success = false;
        self.install_logs.clear();
        self.install_logs.push("[tinapple-gui] Starting installation transaction...".to_string());

        let env_map = self.build_env_map();
        let rx = spawn_installer_thread(env_map);
        self.install_receiver = Some(rx);
    }
}

impl eframe::App for InstallerApp {
    fn ui(&mut self, ui: &mut egui::Ui, _frame: &mut eframe::Frame) {
        let ctx = ui.ctx().clone();
        apply_tinapple_theme(&ctx);

        // Process installation background messages if running
        if let Some(ref rx) = self.install_receiver {
            while let Ok(event) = rx.try_recv() {
                match event {
                    InstallEvent::StageStart { stage_index, stage_id } => {
                        self.current_stage_idx = stage_index;
                        self.current_stage_id = stage_id.clone();
                        self.install_logs.push(format!("\n▶ [STEP {}/{}] Starting stage: {}", stage_index + 1, INSTALL_STAGES.len(), stage_id));
                    }
                    InstallEvent::StageOutput(line) => {
                        self.install_logs.push(line);
                    }
                    InstallEvent::StageCompleted(stage_id) => {
                        self.install_logs.push(format!("✓ [STEP DONE] Completed stage: {}", stage_id));
                    }
                    InstallEvent::StageFailed { stage_id, error } => {
                        self.install_logs.push(format!("✗ [ERROR] Stage {} failed: {}", stage_id, error));
                        self.error_msg = Some(error);
                    }
                    InstallEvent::Finished(success) => {
                        self.is_installing = false;
                        self.install_finished = true;
                        self.install_success = success;
                        if success {
                            self.step = Step::Completed;
                            self.install_logs.push("\n★ [SUCCESS] Tinapple OS installed successfully!".to_string());
                        } else {
                            self.install_logs.push("\n⚠ [FAILED] Installation stopped due to an error.".to_string());
                        }
                    }
                }
            }
            if self.is_installing {
                ctx.request_repaint();
            }
        }

        // Top Navigation & Branding Header
        Panel::top("header_panel")
            .frame(egui::Frame::new().fill(COLOR_BG_PANEL).inner_margin(egui::Margin::symmetric(20, 12)))
            .show(ui, |ui| {
                ui.horizontal(|ui| {
                    ui.label(RichText::new("󰣇 TINAPPLE APPLIANCE OS").size(17.0).color(COLOR_ACCENT).strong());
                    ui.label(RichText::new("·").color(COLOR_TEXT_MUTED));
                    ui.label(RichText::new("Niri & Waybar Live Installer v0.1.0").size(13.0).color(COLOR_TEXT_MUTED));

                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        if self.dry_run {
                            ui.label(RichText::new("  SIMULATION MODE  ").color(Color32::BLACK).background_color(COLOR_ACCENT).strong());
                        }
                        let set_btn = Button::new(RichText::new(" Settings").strong()).fill(COLOR_BG_FLOAT);
                        if ui.add(set_btn).clicked() {
                            let _ = Command::new("tinapple-settings").spawn();
                        }
                        let web_btn = Button::new(RichText::new("󰖟 Browser").strong()).fill(COLOR_BG_FLOAT);
                        if ui.add(web_btn).clicked() {
                            let _ = Command::new("firefox").spawn();
                        }
                        let term_btn = Button::new(RichText::new("󰌌 Terminal").strong()).fill(COLOR_BG_FLOAT);
                        if ui.add(term_btn).clicked() {
                            let _ = Command::new("tinapple-terminal").spawn();
                        }
                    });
                });
            });

        // Bottom Action Bar
        Panel::bottom("footer_panel")
            .frame(egui::Frame::new().fill(COLOR_BG_PANEL).inner_margin(egui::Margin::symmetric(24, 14)))
            .show(ui, |ui| {
                ui.horizontal(|ui| {
                    let can_go_back = (self.step as usize) > 0 && self.step != Step::Installing && self.step != Step::Completed;
                    if ui.add_enabled(can_go_back, Button::new("◀ Back")).clicked() {
                        let prev_idx = (self.step as usize).saturating_sub(1);
                        self.step = Step::all()[prev_idx];
                    }

                    ui.label(RichText::new(format!("Step {} of {}", (self.step as usize) + 1, Step::all().len() - 1)).color(COLOR_TEXT_MUTED));

                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        match self.step {
                            Step::Confirmation => {
                                let btn = Button::new(RichText::new("⚡ Install Tinapple OS Now").color(COLOR_TEXT_DARK).strong().size(14.0))
                                    .fill(COLOR_ACCENT);
                                if ui.add(btn).clicked() {
                                    self.start_installation();
                                }
                            }
                            Step::Installing => {
                                ui.spinner();
                                ui.label(RichText::new("Installing system...").color(COLOR_ACCENT).strong());
                            }
                            Step::Completed => {
                                let btn = Button::new(RichText::new("Reboot System").color(COLOR_TEXT_DARK).strong())
                                    .fill(COLOR_PRIMARY);
                                if ui.add(btn).clicked() {
                                    let _ = Command::new("reboot").spawn();
                                }
                                if ui.button("Open Terminal").clicked() {
                                    let _ = Command::new("tinapple-terminal")
                                        .spawn()
                                        .or_else(|_| Command::new("foot").spawn());
                                }
                            }
                            _ => {
                                let btn = Button::new(RichText::new("Next Step ▶").color(COLOR_TEXT_DARK).strong())
                                    .fill(COLOR_PRIMARY);
                                if ui.add(btn).clicked() {
                                    let next_idx = (self.step as usize) + 1;
                                    if next_idx < Step::all().len() {
                                        self.step = Step::all()[next_idx];
                                    }
                                }
                            }
                        }
                    });
                });
            });

        // Left Step Timeline Sidebar
        Panel::left("steps_sidebar")
            .default_size(240.0)
            .min_size(220.0)
            .frame(egui::Frame::new().fill(COLOR_BG).inner_margin(egui::Margin::symmetric(14, 16)))
            .show(ui, |ui| {
                ui.label(RichText::new("INSTALLATION FLOW").size(11.0).color(COLOR_TEXT_MUTED).strong());
                ui.add_space(10.0);

                for step in Step::all() {
                    let is_active = *step == self.step;
                    let is_done = (*step as usize) < (self.step as usize);

                    let (text_color, bg_color, stroke) = if is_active {
                        (COLOR_TEXT_DARK, COLOR_ACCENT, Stroke::new(1.0, COLOR_ACCENT))
                    } else if is_done {
                        (COLOR_TEXT_MAIN, COLOR_BG_FLOAT, Stroke::new(1.0, COLOR_SUCCESS))
                    } else {
                        (COLOR_TEXT_MUTED, Color32::TRANSPARENT, Stroke::NONE)
                    };

                    let icon = if is_done { "" } else { step.icon() };
                    let label_text = format!("{}  {}", icon, step.title());

                    let btn = Button::new(RichText::new(label_text).size(13.0).color(text_color).strong())
                        .fill(bg_color)
                        .stroke(stroke)
                        .corner_radius(CornerRadius::same(6))
                        .min_size(vec2(ui.available_width(), 32.0));

                    if ui.add(btn).clicked() {
                        if self.step != Step::Installing && self.step != Step::Completed {
                            self.step = *step;
                        }
                    }
                    ui.add_space(4.0);
                }
            });

        // Main Content Area
        egui::CentralPanel::default()
            .frame(egui::Frame::new().fill(COLOR_BG_FLOAT).inner_margin(egui::Margin::symmetric(32, 24)))
            .show(ui, |ui| {
                ui.heading(RichText::new(format!("{}  {}", self.step.icon(), self.step.title())).size(22.0).color(COLOR_TEXT_MAIN));
                ui.add_space(4.0);
                ui.separator();
                ui.add_space(12.0);

                ScrollArea::vertical().show(ui, |ui| {
                    match self.step {
                        Step::Keyboard => self.render_keyboard_step(ui),
                        Step::Network => self.render_network_step(ui),
                        Step::Bootloader => self.render_bootloader_step(ui),
                        Step::DiskLayout => self.render_disk_step(ui),
                        Step::Filesystem => self.render_filesystem_step(ui),
                        Step::Encryption => self.render_encryption_step(ui),
                        Step::UserAccount => self.render_user_step(ui),
                        Step::Hardware => self.render_hardware_step(ui),
                        Step::Kernel => self.render_kernel_step(ui),
                        Step::Services => self.render_services_step(ui),
                        Step::Drivers => self.render_drivers_step(ui),
                        Step::Confirmation => self.render_confirmation_step(ui),
                        Step::Installing => self.render_installing_step(ui),
                        Step::Completed => self.render_completed_step(ui),
                    }
                });
            });
    }
}

impl InstallerApp {
    fn render_keyboard_step(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Choose your primary keyboard layout and verify typing behavior:").size(14.0).color(COLOR_TEXT_MUTED));
        ui.add_space(12.0);

        egui::Frame::new()
            .fill(COLOR_BG_PANEL)
            .stroke(Stroke::new(1.0, COLOR_BORDER))
            .corner_radius(CornerRadius::same(8))
            .inner_margin(egui::Margin::same(16))
            .show(ui, |ui| {
                ui.label(RichText::new("  Console Keymap Presets").size(15.0).strong().color(COLOR_TEXT_MAIN));
                ui.add_space(8.0);

                let keymaps = [
                    ("us", "US (QWERTY Standard)"),
                    ("uk", "UK English"),
                    ("de", "German (QWERTZ)"),
                    ("fr", "French (AZERTY)"),
                    ("es", "Spanish"),
                    ("it", "Italian"),
                    ("jp", "Japanese"),
                    ("pl", "Polish"),
                    ("br", "Portuguese (Brazil)"),
                    ("ch", "Swiss German"),
                    ("ru", "Russian"),
                ];

                ui.horizontal_wrapped(|ui| {
                    for (km, label) in keymaps {
                        let selected = self.keymap == km;
                        let text_color = if selected { Color32::from_rgb(0x10, 0x14, 0x1e) } else { COLOR_TEXT_MAIN };
                        let bg = if selected { COLOR_ACCENT } else { COLOR_BG_FLOAT };
                        let btn = Button::new(RichText::new(format!("  {}  ", label)).size(13.0).color(text_color).strong())
                            .fill(bg)
                            .corner_radius(CornerRadius::same(6))
                            .stroke(if selected { Stroke::NONE } else { Stroke::new(1.0, COLOR_BORDER) });
                        if ui.add(btn).clicked() {
                            self.keymap = km.to_string();
                            let _ = Command::new("loadkeys").arg(km).spawn();
                        }
                    }
                });
            });

        ui.add_space(16.0);

        egui::Frame::new()
            .fill(COLOR_BG_PANEL)
            .stroke(Stroke::new(1.0, COLOR_BORDER))
            .corner_radius(CornerRadius::same(8))
            .inner_margin(egui::Margin::same(16))
            .show(ui, |ui| {
                ui.label(RichText::new("⌨  Interactive Key Test Console").size(15.0).strong().color(COLOR_TEXT_MAIN));
                ui.add_space(6.0);
                ui.label(RichText::new("Type in this field to test special characters (@ # $ { } | ~ / `):").size(12.0).color(COLOR_TEXT_MUTED));
                ui.add_space(8.0);
                ui.add(
                    TextEdit::singleline(&mut self.keymap_test_text)
                        .hint_text("Press keys here to verify your keymap...")
                        .desired_width(ui.available_width() - 20.0)
                        .font(egui::TextStyle::Monospace)
                );
            });
    }

    fn render_network_step(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Check and verify network connectivity for downloading packages:").size(14.0).color(COLOR_TEXT_MUTED));
        ui.add_space(12.0);

        let (badge_color, status_icon, status_text) = if self.net_is_online {
            (COLOR_SUCCESS, "", "Connected to Internet (Online)")
        } else {
            (COLOR_DANGER, "", "Offline or No Gateway Detected")
        };

        egui::Frame::new()
            .fill(COLOR_BG_PANEL)
            .stroke(Stroke::new(1.0, COLOR_BORDER))
            .corner_radius(CornerRadius::same(8))
            .inner_margin(egui::Margin::same(16))
            .show(ui, |ui| {
                ui.horizontal(|ui| {
                    ui.label(RichText::new(format!("{}  {}", status_icon, status_text)).size(16.0).color(badge_color).strong());
                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        let btn = Button::new(RichText::new("  Re-test Connection").strong()).fill(COLOR_PRIMARY);
                        if ui.add(btn).clicked() {
                            let (online, status) = test_network();
                            self.net_is_online = online;
                            self.net_status = status;
                        }
                    });
                });

                ui.add_space(10.0);
                ui.separator();
                ui.add_space(10.0);

                ui.label(RichText::new("Connection details:").size(13.0).color(COLOR_TEXT_MUTED));
                ui.label(RichText::new(&self.net_status).monospace().size(13.0).color(COLOR_TEXT_MAIN));
            });

        ui.add_space(16.0);

        egui::Frame::new()
            .fill(COLOR_BG_PANEL)
            .stroke(Stroke::new(1.0, COLOR_BORDER))
            .corner_radius(CornerRadius::same(8))
            .inner_margin(egui::Margin::same(16))
            .show(ui, |ui| {
                ui.label(RichText::new("󰖩  Wi-Fi & Manual Configuration").size(15.0).strong().color(COLOR_TEXT_MAIN));
                ui.add_space(6.0);
                ui.label(RichText::new("If you need to connect to Wi-Fi, open a terminal with Super + Return, then run:").color(COLOR_TEXT_MUTED));
                ui.add_space(6.0);
                ui.label(RichText::new("    iwctl station wlan0 scan && iwctl station wlan0 get-networks && iwctl station wlan0 connect <SSID>").monospace().color(COLOR_ACCENT));
            });
    }

    fn render_bootloader_step(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Select the bootloader that will launch Tinapple OS on power on:").size(14.0).color(COLOR_TEXT_MUTED));
        ui.add_space(12.0);

        let uefi_badge = if self.is_uefi_system {
            RichText::new("    UEFI Firmware Detected (Modern Boot)  ").color(Color32::BLACK).background_color(COLOR_SUCCESS).strong()
        } else {
            RichText::new("    Legacy BIOS / CSM Detected  ").color(Color32::BLACK).background_color(COLOR_ACCENT).strong()
        };
        ui.label(uefi_badge);
        ui.add_space(16.0);

        // Limine Card
        let is_limine = self.bootloader == "limine";
        egui::Frame::new()
            .fill(if is_limine { COLOR_BG_HIGHLIGHT } else { COLOR_BG_PANEL })
            .stroke(Stroke::new(if is_limine { 2.0 } else { 1.0 }, if is_limine { COLOR_ACCENT } else { COLOR_BORDER }))
            .corner_radius(CornerRadius::same(8))
            .inner_margin(egui::Margin::same(16))
            .show(ui, |ui| {
                ui.radio_value(&mut self.bootloader, "limine".to_string(), RichText::new("Limine Bootloader (Recommended)").size(15.0).strong().color(COLOR_TEXT_MAIN));
                ui.add_space(4.0);
                ui.label(RichText::new("Fastest boot times, modern protocol, automatically updates boot configs on kernel installation, supports modern high-resolution splash screens.").color(COLOR_TEXT_MUTED));
            });

        ui.add_space(12.0);

        // GRUB Card
        let is_grub = self.bootloader == "grub";
        egui::Frame::new()
            .fill(if is_grub { COLOR_BG_HIGHLIGHT } else { COLOR_BG_PANEL })
            .stroke(Stroke::new(if is_grub { 2.0 } else { 1.0 }, if is_grub { COLOR_ACCENT } else { COLOR_BORDER }))
            .corner_radius(CornerRadius::same(8))
            .inner_margin(egui::Margin::same(16))
            .show(ui, |ui| {
                ui.radio_value(&mut self.bootloader, "grub".to_string(), RichText::new("GRUB (GNU Grand Unified Bootloader)").size(15.0).strong().color(COLOR_TEXT_MAIN));
                ui.add_space(4.0);
                ui.label(RichText::new("Traditional Linux standard bootloader with extensive filesystem support and rescue prompt.").color(COLOR_TEXT_MUTED));
            });
    }

    fn render_disk_step(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Select the target disk drive for the Tinapple OS appliance installation:").size(14.0).color(COLOR_TEXT_MUTED));
        ui.add_space(12.0);

        egui::Frame::new()
            .fill(COLOR_BG_PANEL)
            .stroke(Stroke::new(1.0, COLOR_BORDER))
            .corner_radius(CornerRadius::same(8))
            .inner_margin(egui::Margin::same(16))
            .show(ui, |ui| {
                ui.label(RichText::new("  Detected Storage Drives").size(15.0).strong().color(COLOR_TEXT_MAIN));
                ui.add_space(10.0);

                if self.available_disks.is_empty() {
                    ui.label(RichText::new("⚠ No disks discovered. Please check hypervisor or disk controller.").color(COLOR_DANGER));
                } else {
                    for (idx, disk) in self.available_disks.iter().enumerate() {
                        let is_sel = self.selected_disk_idx == idx;
                        let text_color = if is_sel { Color32::from_rgb(0x10, 0x14, 0x1e) } else { COLOR_TEXT_MAIN };
                        let bg = if is_sel { COLOR_ACCENT } else { COLOR_BG_FLOAT };
                        let label = format!("  {} ({}) — {}", disk.path, disk.size, disk.model);
                        let btn = Button::new(RichText::new(label).size(14.0).color(text_color).strong())
                            .fill(bg)
                            .corner_radius(CornerRadius::same(6))
                            .stroke(if is_sel { Stroke::NONE } else { Stroke::new(1.0, COLOR_BORDER) })
                            .min_size(vec2(ui.available_width(), 38.0));
                        if ui.add(btn).clicked() {
                            self.selected_disk_idx = idx;
                        }
                        ui.add_space(6.0);
                    }
                }
            });

        ui.add_space(16.0);

        egui::Frame::new()
            .fill(COLOR_BG_PANEL)
            .stroke(Stroke::new(1.0, COLOR_BORDER))
            .corner_radius(CornerRadius::same(8))
            .inner_margin(egui::Margin::same(16))
            .show(ui, |ui| {
                ui.label(RichText::new("  Partitioning Strategy").size(15.0).strong().color(COLOR_TEXT_MAIN));
                ui.add_space(8.0);
                ui.radio_value(&mut self.disk_strategy, "auto".to_string(), RichText::new("Automatic Whole-Disk Partitioning (Recommended)").strong().color(COLOR_TEXT_MAIN));
                ui.label(RichText::new("    Creates 1 GB EFI System Partition, 4 GB Swap, and formats the remainder for Root.").size(12.0).color(COLOR_TEXT_MUTED));
                ui.add_space(6.0);
                ui.radio_value(&mut self.disk_strategy, "custom".to_string(), RichText::new("Manual Partitioning / Preserve Existing Partitions").strong().color(COLOR_TEXT_MAIN));
                ui.label(RichText::new("    Keep existing partitions and format designated root.").size(12.0).color(COLOR_TEXT_MUTED));
            });
    }

    fn render_filesystem_step(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Select the filesystem for the primary root operating system partition:").size(14.0).color(COLOR_TEXT_MUTED));
        ui.add_space(12.0);

        let filesystems = [
            ("btrfs", "Btrfs (Copy-on-Write, Recommended)", "Subvolumes (@, @home, @snapshots, @var_log), instant snapshots, transparent zstd compression."),
            ("ext4", "Ext4 (Classic Standard)", "Rock-solid reliability, proven production filesystem with standard journaling and wide recovery tool support."),
            ("xfs", "XFS (High Performance)", "Scalable 64-bit journaling filesystem optimized for high concurrency, large media files, and databases."),
        ];

        for (fs_id, title, desc) in filesystems {
            let is_sel = self.filesystem == fs_id;
            egui::Frame::new()
                .fill(if is_sel { COLOR_BG_HIGHLIGHT } else { COLOR_BG_PANEL })
                .stroke(Stroke::new(if is_sel { 2.0 } else { 1.0 }, if is_sel { COLOR_ACCENT } else { COLOR_BORDER }))
                .corner_radius(CornerRadius::same(8))
                .inner_margin(egui::Margin::same(14))
                .show(ui, |ui| {
                    ui.radio_value(&mut self.filesystem, fs_id.to_string(), RichText::new(title).size(15.0).strong().color(COLOR_TEXT_MAIN));
                    ui.add_space(4.0);
                    ui.label(RichText::new(desc).size(12.0).color(COLOR_TEXT_MUTED));
                });
            ui.add_space(10.0);
        }
    }

    fn render_encryption_step(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Configure Full-Disk Encryption using Linux Unified Key Setup (LUKS2):").size(14.0).color(COLOR_TEXT_MUTED));
        ui.add_space(12.0);

        egui::Frame::new()
            .fill(COLOR_BG_PANEL)
            .stroke(Stroke::new(1.0, COLOR_BORDER))
            .corner_radius(CornerRadius::same(8))
            .inner_margin(egui::Margin::same(16))
            .show(ui, |ui| {
                ui.checkbox(&mut self.enable_luks, RichText::new("  Enable LUKS2 Full Disk Encryption").size(16.0).strong().color(COLOR_TEXT_MAIN));
                ui.add_space(6.0);
                ui.label(RichText::new("Protects all local data, configuration, and logs at rest using AES-XTS-PLAIN64 encryption.").size(12.0).color(COLOR_TEXT_MUTED));

                if self.enable_luks {
                    ui.add_space(14.0);
                    ui.separator();
                    ui.add_space(14.0);

                    ui.label(RichText::new("Encryption Passphrase:").strong().color(COLOR_TEXT_MAIN));
                    ui.add(TextEdit::singleline(&mut self.luks_passphrase).password(!self.show_passphrase).desired_width(ui.available_width() - 40.0));
                    ui.add_space(10.0);

                    ui.label(RichText::new("Confirm Passphrase:").strong().color(COLOR_TEXT_MAIN));
                    ui.add(TextEdit::singleline(&mut self.luks_confirm).password(!self.show_passphrase).desired_width(ui.available_width() - 40.0));
                    ui.add_space(10.0);

                    ui.checkbox(&mut self.show_passphrase, RichText::new("Show passphrase in plaintext").color(COLOR_TEXT_MUTED));

                    if !self.luks_passphrase.is_empty() && self.luks_passphrase != self.luks_confirm {
                        ui.add_space(6.0);
                        ui.label(RichText::new("⚠ Warning: Passphrases do not match!").color(COLOR_DANGER).strong());
                    }
                }
            });
    }

    fn render_user_step(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Configure appliance hostname and administrative user account:").size(14.0).color(COLOR_TEXT_MUTED));
        ui.add_space(12.0);

        egui::Frame::new()
            .fill(COLOR_BG_PANEL)
            .stroke(Stroke::new(1.0, COLOR_BORDER))
            .corner_radius(CornerRadius::same(8))
            .inner_margin(egui::Margin::same(16))
            .show(ui, |ui| {
                let col_w = (ui.available_width() - 30.0) / 2.0;
                ui.columns(2, |columns| {
                    columns[0].label(RichText::new("System Hostname:").strong().color(COLOR_TEXT_MAIN));
                    columns[0].add(TextEdit::singleline(&mut self.hostname).desired_width(col_w));
                    columns[0].add_space(12.0);

                    columns[0].label(RichText::new("Admin Username:").strong().color(COLOR_TEXT_MAIN));
                    columns[0].add(TextEdit::singleline(&mut self.username).desired_width(col_w));

                    columns[1].label(RichText::new("User Password:").strong().color(COLOR_TEXT_MAIN));
                    columns[1].add(TextEdit::singleline(&mut self.user_pass).password(true).desired_width(col_w));
                    columns[1].add_space(12.0);

                    columns[1].label(RichText::new("Confirm Password:").strong().color(COLOR_TEXT_MAIN));
                    columns[1].add(TextEdit::singleline(&mut self.user_pass_confirm).password(true).desired_width(col_w));
                });

                ui.add_space(16.0);
                ui.separator();
                ui.add_space(12.0);

                ui.checkbox(&mut self.enable_sudo, RichText::new("Grant administrative (sudo) privileges to this user").strong().color(COLOR_TEXT_MAIN));
                ui.checkbox(&mut self.same_root_pass, RichText::new("Use the same password for the system root account").strong().color(COLOR_TEXT_MAIN));

                if !self.same_root_pass {
                    ui.add_space(8.0);
                    ui.label(RichText::new("Root Account Password:").strong().color(COLOR_TEXT_MAIN));
                    ui.add(TextEdit::singleline(&mut self.root_pass).password(true).desired_width(300.0));
                }
            });
    }

    fn render_hardware_step(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Select chassis profile and CPU power governance:").size(14.0).color(COLOR_TEXT_MUTED));
        ui.add_space(12.0);

        let chassis_opts = [
            ("auto", "  Auto-detect Chassis", "Inspects DMI/SMBIOS to automatically tune kernel parameters."),
            ("server", "󰒋  Dedicated Server / Appliance", "Headless optimizations, no sleep states, high network buffer limits."),
            ("desktop", "  Desktop Workstation", "Standard performance governor, responsive audio/video latency."),
            ("laptop", "  Laptop / Mobile", "Power-profiles-daemon, battery life optimizations, lid switch handling."),
            ("vm", "󰍹  Virtual Machine", "VirtIO balloon drivers, guest agents, hypervisor clock sync."),
        ];

        egui::Frame::new()
            .fill(COLOR_BG_PANEL)
            .stroke(Stroke::new(1.0, COLOR_BORDER))
            .corner_radius(CornerRadius::same(8))
            .inner_margin(egui::Margin::same(16))
            .show(ui, |ui| {
                ui.label(RichText::new("Chassis Profile").size(15.0).strong().color(COLOR_TEXT_MAIN));
                ui.add_space(8.0);
                for (val, label, desc) in chassis_opts {
                    ui.radio_value(&mut self.chassis, val.to_string(), RichText::new(label).strong().color(COLOR_TEXT_MAIN));
                    ui.label(RichText::new(format!("      {}", desc)).size(12.0).color(COLOR_TEXT_MUTED));
                    ui.add_space(4.0);
                }
            });
    }

    fn render_kernel_step(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Choose Linux Kernel version tailored for your workload:").size(14.0).color(COLOR_TEXT_MUTED));
        ui.add_space(12.0);

        let kernels = [
            ("lts", "Linux LTS (Recommended)", "Long-Term Support kernel with verified enterprise stability and maximum uptime."),
            ("current", "Linux (Standard Current)", "Latest upstream vanilla Linux kernel with newest hardware drivers."),
            ("hardened", "Linux Hardened", "Security-focused kernel patches with extensive memory mitigation features."),
            ("zen", "Linux Zen", "Tuned for interactive desktop responsiveness and low latency scheduler."),
        ];

        for (k_id, label, desc) in kernels {
            let is_sel = self.kernel == k_id;
            egui::Frame::new()
                .fill(if is_sel { COLOR_BG_HIGHLIGHT } else { COLOR_BG_PANEL })
                .stroke(Stroke::new(if is_sel { 2.0 } else { 1.0 }, if is_sel { COLOR_ACCENT } else { COLOR_BORDER }))
                .corner_radius(CornerRadius::same(8))
                .inner_margin(egui::Margin::same(14))
                .show(ui, |ui| {
                    ui.radio_value(&mut self.kernel, k_id.to_string(), RichText::new(label).size(15.0).strong().color(COLOR_TEXT_MAIN));
                    ui.add_space(4.0);
                    ui.label(RichText::new(desc).size(12.0).color(COLOR_TEXT_MUTED));
                });
            ui.add_space(10.0);
        }
    }

    fn render_services_step(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Toggle appliance service stacks and desktop components:").size(14.0).color(COLOR_TEXT_MUTED));
        ui.add_space(12.0);

        let profiles = [
            ("base", "󰣇 Base Core", "Essential CLI, zsh, vim, openssh, NetworkManager, sudo, pacman tools (Default)."),
            ("desktop", " Niri Wayland Station", "Modern scrolling Wayland compositor, Waybar V3.1a, Matugen dynamic colors, fuzzel, foot."),
            ("media", "󰕼 Media Server", "Jellyfin media server, hardware transcoding, DLNA media hub."),
            ("downloads", " Download Automation", "qBittorrent-nox daemon, Transmission CLI, automated torrent webui."),
            ("backups", "󰆓 Automated Backups", "Restic, BorgBackup, Syncthing synchronization, rclone cloud storage."),
            ("network", "󰖩 Homelab Networking", "Tailscale mesh VPN, WireGuard tools, Unbound caching DNS resolver."),
            ("infrastructure", "󰄛 Observability & Monitoring", "Prometheus metrics, Grafana dashboards, node-exporter."),
            ("databases", " Database Suite", "PostgreSQL, MariaDB, Valkey/Redis cache, InfluxDB time-series."),
        ];

        egui::Frame::new()
            .fill(COLOR_BG_PANEL)
            .stroke(Stroke::new(1.0, COLOR_BORDER))
            .corner_radius(CornerRadius::same(8))
            .inner_margin(egui::Margin::same(16))
            .show(ui, |ui| {
                ui.columns(2, |columns| {
                    for (i, (id, title, desc)) in profiles.iter().enumerate() {
                        let col = i % 2;
                        let mut is_checked = self.selected_profiles.contains(*id);
                        if columns[col].checkbox(&mut is_checked, RichText::new(*title).size(14.0).strong().color(COLOR_TEXT_MAIN)).changed() {
                            if is_checked {
                                self.selected_profiles.insert(id.to_string());
                            } else {
                                self.selected_profiles.remove(*id);
                            }
                        }
                        columns[col].label(RichText::new(format!("    {}", desc)).size(11.0).color(COLOR_TEXT_MUTED));
                        columns[col].add_space(8.0);
                    }
                });
            });
    }

    fn render_drivers_step(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Hardware driver discovery and firmware setup:").size(14.0).color(COLOR_TEXT_MUTED));
        ui.add_space(12.0);

        egui::Frame::new()
            .fill(COLOR_BG_PANEL)
            .stroke(Stroke::new(1.0, COLOR_BORDER))
            .corner_radius(CornerRadius::same(8))
            .inner_margin(egui::Margin::same(16))
            .show(ui, |ui| {
                ui.label(RichText::new("  CPU Microcode Detection:").size(14.0).strong().color(COLOR_SUCCESS));
                ui.label(RichText::new("    Intel and AMD processor microcode packages will be automatically deployed.").color(COLOR_TEXT_MUTED));
                ui.add_space(10.0);

                ui.label(RichText::new("  Open-Source Graphics Stack:").size(14.0).strong().color(COLOR_SUCCESS));
                ui.label(RichText::new("    Mesa DRI/Vulkan, libva, and kernel DRM drivers (amdgpu, intel, nouveau, virtio).").color(COLOR_TEXT_MUTED));
                ui.add_space(14.0);
                ui.separator();
                ui.add_space(14.0);

                ui.checkbox(&mut self.enable_proprietary, RichText::new("Install proprietary vendor drivers (e.g. Nvidia proprietary DKMS, Realtek Wi-Fi)").strong().color(COLOR_TEXT_MAIN));
            });
    }

    fn render_confirmation_step(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("Review the installation configuration before committing changes to disk:").size(14.0).color(COLOR_TEXT_MUTED));
        ui.add_space(12.0);

        let disk_label = self.available_disks.get(self.selected_disk_idx).map(|d| d.display_label()).unwrap_or_else(|| "Unknown".to_string());

        egui::Frame::new()
            .fill(COLOR_BG_PANEL)
            .stroke(Stroke::new(1.0, COLOR_BORDER))
            .corner_radius(CornerRadius::same(8))
            .inner_margin(egui::Margin::same(16))
            .show(ui, |ui| {
                ui.label(RichText::new("  Configuration Summary").size(16.0).strong().color(COLOR_ACCENT));
                ui.add_space(10.0);

                egui::Grid::new("summary_grid").striped(true).spacing(vec2(24.0, 10.0)).show(ui, |ui| {
                    ui.label(RichText::new("Target Disk:").strong());
                    ui.label(RichText::new(disk_label).color(COLOR_ACCENT).strong());
                    ui.end_row();

                    ui.label(RichText::new("Filesystem:").strong());
                    ui.label(RichText::new(&self.filesystem).strong());
                    ui.end_row();

                    ui.label(RichText::new("Bootloader:").strong());
                    ui.label(RichText::new(&self.bootloader).strong());
                    ui.end_row();

                    ui.label(RichText::new("LUKS2 Encryption:").strong());
                    ui.label(if self.enable_luks { "Enabled (AES-XTS-PLAIN64)" } else { "Disabled" });
                    ui.end_row();

                    ui.label(RichText::new("Hostname / User:").strong());
                    ui.label(format!("{} / {}", self.hostname, self.username));
                    ui.end_row();

                    ui.label(RichText::new("Kernel Profile:").strong());
                    ui.label(RichText::new(&self.kernel).strong());
                    ui.end_row();

                    ui.label(RichText::new("Service Profiles:").strong());
                    let prof_vec: Vec<String> = self.selected_profiles.iter().cloned().collect();
                    ui.label(prof_vec.join(", "));
                    ui.end_row();
                });
            });

        ui.add_space(16.0);
        if !self.dry_run {
            egui::Frame::new()
                .fill(Color32::from_rgba_premultiplied(255, 71, 87, 25))
                .stroke(Stroke::new(1.5, COLOR_DANGER))
                .corner_radius(CornerRadius::same(8))
                .inner_margin(egui::Margin::same(14))
                .show(ui, |ui| {
                    ui.label(RichText::new("  WARNING: Commencing installation will irreversibly format the target disk and overwrite all data!").color(COLOR_DANGER).strong().size(13.0));
                });
        }
    }

    fn render_installing_step(&mut self, ui: &mut Ui) {
        let total = INSTALL_STAGES.len();
        let current = self.current_stage_idx + 1;
        let progress = (self.current_stage_idx as f32) / (total as f32);

        ui.horizontal(|ui| {
            ui.label(RichText::new(format!("Stage {}/{} — {}", current, total, self.current_stage_id)).size(16.0).strong().color(COLOR_ACCENT));
        });
        ui.add_space(6.0);

        if let Some(st) = INSTALL_STAGES.get(self.current_stage_idx) {
            ui.label(RichText::new(st.desc).color(COLOR_TEXT_MUTED));
        }

        ui.add_space(8.0);
        ui.add(ProgressBar::new(progress).desired_width(ui.available_width()).show_percentage());

        ui.add_space(14.0);
        ui.horizontal(|ui| {
            ui.label(RichText::new("Installation Output Log:").size(13.0).strong());
            ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                ui.checkbox(&mut self.auto_scroll_logs, "Auto-scroll");
            });
        });
        ui.add_space(4.0);

        egui::Frame::new().fill(Color32::from_rgb(0x08, 0x0a, 0x0d)).stroke(Stroke::new(1.0, COLOR_BORDER)).corner_radius(CornerRadius::same(4)).show(ui, |ui| {
            ScrollArea::vertical().stick_to_bottom(self.auto_scroll_logs).max_height(350.0).show(ui, |ui| {
                ui.add_space(6.0);
                for line in &self.install_logs {
                    let color = if line.contains("ERROR") || line.contains("[STDERR]") {
                        COLOR_DANGER
                    } else if line.contains("✓") || line.contains("[OK]") {
                        COLOR_SUCCESS
                    } else if line.contains("▶") {
                        COLOR_ACCENT
                    } else {
                        COLOR_TEXT_MAIN
                    };
                    ui.label(RichText::new(line).monospace().size(12.0).color(color));
                }
                ui.add_space(6.0);
            });
        });
    }

    fn render_completed_step(&mut self, ui: &mut Ui) {
        ui.label(RichText::new("  Installation Finished Successfully!").size(24.0).strong().color(COLOR_SUCCESS));
        ui.add_space(10.0);
        ui.label("Tinapple OS has been installed to disk with all selected profiles, drivers, and services.");
        ui.add_space(16.0);

        ui.label("You can now reboot your machine to boot directly into Tinapple OS, or open a terminal inside the live session to inspect the installed system.");
    }
}
