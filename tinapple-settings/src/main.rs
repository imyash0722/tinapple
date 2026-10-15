mod app;
mod model;
mod theme;

use app::{SettingsApp, SettingsTab};
use eframe::egui;

fn print_help() {
    println!(
        r#"󰣇 Tinapple OS Control Center & Settings
Usage: tinapple-settings [options]

Options:
  -t, --tab <name>    Open directly to tab: tuning, thermal, firewall, tailnet, dualwifi, truenas, services, desktop, about
  -a, --apply         Apply saved/default settings directly and exit (non-interactive)
  -h, --help          Show this help message
"#
    );
}

fn main() -> eframe::Result<()> {
    let mut initial_tab = SettingsTab::Tuning;
    let mut apply_and_exit = false;

    let args: Vec<String> = std::env::args().collect();
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "-h" | "--help" => {
                print_help();
                return Ok(());
            }
            "-a" | "--apply" => {
                apply_and_exit = true;
            }
            "-t" | "--tab" if i + 1 < args.len() => {
                i += 1;
                match args[i].to_lowercase().as_str() {
                    "tuning" | "rps" | "rfs" => initial_tab = SettingsTab::Tuning,
                    "thermal" | "temp" | "power" => initial_tab = SettingsTab::Thermal,
                    "firewall" | "ufw" | "sec" => initial_tab = SettingsTab::Firewall,
                    "tailnet" | "tailscale" | "vpn" => initial_tab = SettingsTab::Tailnet,
                    "dualwifi" | "wifi" | "ap" | "hotspot" => initial_tab = SettingsTab::DualWifi,
                    "truenas" | "nas" | "backup" => initial_tab = SettingsTab::TrueNas,
                    "srv" | "services" => initial_tab = SettingsTab::Services,
                    "desktop" | "dwl" | "chadwm" | "apps" => initial_tab = SettingsTab::Desktop,
                    "about" | "info" => initial_tab = SettingsTab::About,
                    _ => {}
                }
            }
            _ => {}
        }
        i += 1;
    }

    if apply_and_exit {
        let config = model::TinappleConfig::load();
        let logs = config.apply();
        for log in logs {
            println!("{}", log);
        }
        return Ok(());
    }

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1000.0, 700.0])
            .with_min_inner_size([800.0, 560.0])
            .with_title("Tinapple OS Settings")
            .with_decorations(true),
        ..Default::default()
    };

    eframe::run_native(
        "Tinapple OS Settings",
        options,
        Box::new(move |_cc| {
            let mut app = SettingsApp::default();
            app.current_tab = initial_tab;
            Ok(Box::new(app))
        }),
    )
}
