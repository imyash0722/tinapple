mod app;
mod backend;
mod theme;

use app::InstallerApp;
use eframe::egui;

fn print_help() {
    println!(
        r#" Tinapple OS Graphical Installer (Rust / DWL Wayland)
Usage: tinapple-gui-installer [options]

Options:
  -d, --dry-run          Simulate installation without touching physical drives
      --skip-pacstrap    Skip package bootstrap stage (rapid testing mode)
      --disk <dev>       Preselect target disk (e.g. /dev/nvme0n1, /dev/sda, /dev/vda)
  -h, --help             Show this help message
"#
    );
}

fn main() -> eframe::Result<()> {
    let mut dry_run = std::env::var("TINAPPLE_DRYRUN").map(|v| v == "1").unwrap_or(false);
    let mut skip_pacstrap = std::env::var("TINAPPLE_SKIP_PACSTRAP").map(|v| v == "1").unwrap_or(false);
    let mut preselected_disk = std::env::var("TINAPPLE_DISK").ok();

    let args: Vec<String> = std::env::args().collect();
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "-h" | "--help" => {
                print_help();
                return Ok(());
            }
            "-d" | "--dry-run" => {
                dry_run = true;
            }
            "--skip-pacstrap" => {
                skip_pacstrap = true;
            }
            "--disk" if i + 1 < args.len() => {
                i += 1;
                preselected_disk = Some(args[i].clone());
            }
            _ => {}
        }
        i += 1;
    }

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1040.0, 720.0])
            .with_min_inner_size([800.0, 600.0])
            .with_title("Tinapple OS Installer")
            .with_decorations(true),
        ..Default::default()
    };

    eframe::run_native(
        "Tinapple OS Installer",
        options,
        Box::new(move |_cc| {
            Ok(Box::new(InstallerApp::new(
                dry_run,
                skip_pacstrap,
                preselected_disk,
            )))
        }),
    )
}
