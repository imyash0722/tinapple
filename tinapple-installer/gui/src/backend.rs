use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::thread;

#[derive(Debug, Clone)]
pub struct DiskDevice {
    pub name: String,
    pub path: String,
    pub size: String,
    pub model: String,
}

impl DiskDevice {
    pub fn display_label(&self) -> String {
        if self.model.is_empty() {
            format!("{} ({})", self.path, self.size)
        } else {
            format!("{} ({}, {})", self.path, self.size, self.model)
        }
    }
}

pub fn probe_disks() -> Vec<DiskDevice> {
    let mut disks = Vec::new();
    if let Ok(output) = Command::new("lsblk")
        .args(["-dno", "NAME,SIZE,MODEL,TYPE"])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            let fields: Vec<&str> = line.split_whitespace().collect();
            if fields.len() >= 3 && fields.last() == Some(&"disk") {
                let name = fields[0];
                if name.starts_with("zram") || name.starts_with("loop") || name.starts_with("sr") {
                    continue;
                }
                let size = fields[1].to_string();
                let model = if fields.len() > 3 {
                    fields[2..fields.len() - 1].join(" ")
                } else {
                    String::new()
                };
                disks.push(DiskDevice {
                    name: name.to_string(),
                    path: format!("/dev/{}", name),
                    size,
                    model,
                });
            }
        }
    }

    if disks.is_empty() {
        disks.push(DiskDevice {
            name: "vda".to_string(),
            path: "/dev/vda".to_string(),
            size: "25G".to_string(),
            model: "Virtual Disk".to_string(),
        });
    }

    disks
}

pub fn is_uefi() -> bool {
    Path::new("/sys/firmware/efi").exists()
}

pub fn test_network() -> (bool, String) {
    if let Ok(output) = Command::new("ping")
        .args(["-c", "1", "-W", "2", "1.1.1.1"])
        .output()
    {
        if output.status.success() {
            return (true, "Connected (Internet OK)".to_string());
        }
    }
    (false, "Offline or No Gateway".to_string())
}

#[derive(Debug, Clone)]
pub struct Stage {
    pub id: &'static str,
    pub desc: &'static str,
}

pub const INSTALL_STAGES: &[Stage] = &[
    Stage { id: "preflight", desc: "Verifying system prerequisites & architecture..." },
    Stage { id: "partition", desc: "Creating GPT partition table and partition layout..." },
    Stage { id: "filesystem", desc: "Formatting root, swap, and EFI partitions..." },
    Stage { id: "mount", desc: "Mounting target root and EFI system partition..." },
    Stage { id: "mirrors", desc: "Selecting fastest package mirrors..." },
    Stage { id: "pacstrap", desc: "Bootstrapping core packages, kernel, and firmware..." },
    Stage { id: "cachyos-repo", desc: "Configuring optimized CachyOS v3/v4 repository layer..." },
    Stage { id: "configure", desc: "Configuring hostname, users, sudo, and manifest..." },
    Stage { id: "bootloader-install", desc: "Installing and configuring system bootloader..." },
    Stage { id: "deploy", desc: "Deploying systemd presets, configs, and services..." },
    Stage { id: "network", desc: "Configuring networkd and NetworkManager resolvers..." },
    Stage { id: "drivers", desc: "Detecting hardware devices and installing driver stack..." },
];

pub enum InstallEvent {
    StageStart { stage_index: usize, stage_id: String },
    StageOutput(String),
    StageCompleted(String),
    StageFailed { stage_id: String, error: String },
    Finished(bool),
}

pub fn find_runner_path() -> String {
    if let Ok(p) = std::env::var("TINAPPLE_RUN_STAGE") {
        if Path::new(&p).exists() {
            return p;
        }
    }
    for candidate in [
        "/usr/lib/tinapple-installer/backend/run-stage.sh",
        "backend/run-stage.sh",
        "../backend/run-stage.sh",
        "tinapple-installer/backend/run-stage.sh",
        "/mnt/shared/projects/tinapple/tinapple-installer/backend/run-stage.sh",
    ] {
        if Path::new(candidate).exists() {
            if let Ok(abs) = std::fs::canonicalize(candidate) {
                return abs.to_string_lossy().to_string();
            }
        }
    }
    "/usr/lib/tinapple-installer/backend/run-stage.sh".to_string()
}

pub fn spawn_installer_thread(
    env_vars: HashMap<String, String>,
) -> Receiver<InstallEvent> {
    let (tx, rx): (Sender<InstallEvent>, Receiver<InstallEvent>) = channel();
    let runner_path = find_runner_path();

    thread::spawn(move || {
        let stages = INSTALL_STAGES;
        let mut overall_success = true;

        for (i, stage) in stages.iter().enumerate() {
            let _ = tx.send(InstallEvent::StageStart {
                stage_index: i,
                stage_id: stage.id.to_string(),
            });

            let mut cmd = Command::new(&runner_path);
            cmd.arg(stage.id);

            // Pass all answers and system configuration as environment variables
            for (k, v) in &env_vars {
                cmd.env(k, v);
            }

            cmd.stdout(Stdio::piped());
            cmd.stderr(Stdio::piped());

            match cmd.spawn() {
                Ok(mut child) => {
                    let stdout = child.stdout.take().expect("Failed to open stdout");
                    let stderr = child.stderr.take().expect("Failed to open stderr");

                    let tx_out = tx.clone();
                    let stdout_handle = thread::spawn(move || {
                        let reader = BufReader::new(stdout);
                        for line in reader.lines().map_while(Result::ok) {
                            let _ = tx_out.send(InstallEvent::StageOutput(line));
                        }
                    });

                    let tx_err = tx.clone();
                    let stderr_handle = thread::spawn(move || {
                        let reader = BufReader::new(stderr);
                        for line in reader.lines().map_while(Result::ok) {
                            let _ = tx_err.send(InstallEvent::StageOutput(format!("[STDERR] {}", line)));
                        }
                    });

                    let _ = stdout_handle.join();
                    let _ = stderr_handle.join();

                    let status = child.wait();
                    match status {
                        Ok(st) if st.success() => {
                            let _ = tx.send(InstallEvent::StageCompleted(stage.id.to_string()));
                        }
                        Ok(st) => {
                            overall_success = false;
                            let _ = tx.send(InstallEvent::StageFailed {
                                stage_id: stage.id.to_string(),
                                error: format!("Stage {} exited with code {:?}", stage.id, st.code()),
                            });
                            break;
                        }
                        Err(e) => {
                            overall_success = false;
                            let _ = tx.send(InstallEvent::StageFailed {
                                stage_id: stage.id.to_string(),
                                error: format!("Failed to run stage {}: {}", stage.id, e),
                            });
                            break;
                        }
                    }
                }
                Err(e) => {
                    overall_success = false;
                    let _ = tx.send(InstallEvent::StageFailed {
                        stage_id: stage.id.to_string(),
                        error: format!("Failed to spawn runner for {}: {}", stage.id, e),
                    });
                    break;
                }
            }
        }

        let _ = tx.send(InstallEvent::Finished(overall_success));
    });

    rx
}
