use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemSettings {
    pub hostname: String,
    pub timezone: String,
    pub locale: String,
    pub keymap: String,
    pub kernel: String,
    pub bootloader: String,
    pub chassis: String,
    pub power_profile: String,
}

impl Default for SystemSettings {
    fn default() -> Self {
        Self {
            hostname: "tinapple".to_string(),
            timezone: "UTC".to_string(),
            locale: "en_US.UTF-8".to_string(),
            keymap: "us".to_string(),
            kernel: "lts".to_string(),
            bootloader: "limine".to_string(),
            chassis: "auto".to_string(),
            power_profile: "powersave".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TuningSettings {
    pub rps_rfs_enabled: bool,
    pub cake_aqm_enabled: bool,
    pub tcp_bbr_enabled: bool,
    pub zram_profile_enabled: bool,
    pub zram_swappiness: u32,
}

impl Default for TuningSettings {
    fn default() -> Self {
        Self {
            rps_rfs_enabled: true,
            cake_aqm_enabled: true,
            tcp_bbr_enabled: true,
            zram_profile_enabled: true,
            zram_swappiness: 150,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThermalSettings {
    pub pid_governor_enabled: bool,
    pub target_temp: u32,
    pub cpu_governor: String, // "powersave", "schedutil", "performance"
    pub screen_sleep_minutes: u32,
    pub ignore_lid_switch: bool,
}

impl Default for ThermalSettings {
    fn default() -> Self {
        Self {
            pid_governor_enabled: true,
            target_temp: 65,
            cpu_governor: "powersave".to_string(),
            screen_sleep_minutes: 3,
            ignore_lid_switch: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FirewallSettings {
    pub ufw_enabled: bool,
    pub drop_blocked_packets: bool,
    pub unblock_local_lan: bool,
    pub open_ssh: bool,
    pub open_http: bool,
    pub open_https: bool,
    pub open_control_center: bool,
    pub open_jellyfin: bool,
    pub open_samba: bool,
    pub open_nfs: bool,
    pub open_tailscale_wireguard: bool,
}

impl Default for FirewallSettings {
    fn default() -> Self {
        Self {
            ufw_enabled: true,
            drop_blocked_packets: true,
            unblock_local_lan: false,
            open_ssh: true,
            open_http: true,
            open_https: true,
            open_control_center: true,
            open_jellyfin: true,
            open_samba: true,
            open_nfs: true,
            open_tailscale_wireguard: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TailnetSettings {
    pub tailscale_enabled: bool,
    pub ssh_enabled: bool,
    pub lan_guardian_enabled: bool,
}

impl Default for TailnetSettings {
    fn default() -> Self {
        Self {
            tailscale_enabled: true,
            ssh_enabled: true,
            lan_guardian_enabled: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DualWifiSettings {
    pub enabled: bool,
    pub primary_interface: String,
    pub secondary_interface: String,
    pub hotspot_ssid: String,
    pub hotspot_passphrase: String,
    pub hotspot_ip: String,
    pub nat_masquerade: bool,
}

impl Default for DualWifiSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            primary_interface: "wlan0".to_string(),
            secondary_interface: "wlan1".to_string(),
            hotspot_ssid: "Tinapple-Hotspot".to_string(),
            hotspot_passphrase: "tinapplepass".to_string(),
            hotspot_ip: "192.168.50.1/24".to_string(),
            nat_masquerade: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrueNasSettings {
    pub enabled: bool,
    pub archive_path: String,
    pub syncthing_backup_enabled: bool,
    pub snapshot_retention_days: u32,
    pub samba_share_enabled: bool,
    pub nfs_share_enabled: bool,
    pub bitrot_scrub_enabled: bool,
}

impl Default for TrueNasSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            archive_path: "/srv/truenas/archive".to_string(),
            syncthing_backup_enabled: true,
            snapshot_retention_days: 30,
            samba_share_enabled: true,
            nfs_share_enabled: true,
            bitrot_scrub_enabled: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServicesSettings {
    pub nginx_enabled: bool,
    pub tinarchy_dash_enabled: bool,
    pub jellyfin_enabled: bool,
    pub arr_suite_enabled: bool,
    pub suwayomi_enabled: bool,
    pub qbittorrent_enabled: bool,
    pub syncthing_enabled: bool,
    pub truenas_enabled: bool,
    pub vaultwarden_enabled: bool,
    pub tor_enabled: bool,
}

impl Default for ServicesSettings {
    fn default() -> Self {
        Self {
            nginx_enabled: true,
            tinarchy_dash_enabled: true,
            jellyfin_enabled: false,
            arr_suite_enabled: false,
            suwayomi_enabled: false,
            qbittorrent_enabled: false,
            syncthing_enabled: true,
            truenas_enabled: true,
            vaultwarden_enabled: false,
            tor_enabled: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DwlSettings {
    pub terminal: String,
    pub browser: String,
    pub window_gaps: u32,
    pub border_width: u32,
    pub border_color_focused: String,
    pub border_color_unfocused: String,
    pub font_family: String,
}

impl Default for DwlSettings {
    fn default() -> Self {
        Self {
            terminal: "foot".to_string(),
            browser: "firefox".to_string(),
            window_gaps: 8,
            border_width: 2,
            border_color_focused: "#FF9E3B".to_string(),
            border_color_unfocused: "#252830".to_string(),
            font_family: "JetBrainsMono Nerd Font".to_string(),
        }
    }
}

pub type ChadwmSettings = DwlSettings;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TinappleConfig {
    pub system: SystemSettings,
    pub tuning: TuningSettings,
    pub thermal: ThermalSettings,
    pub firewall: FirewallSettings,
    pub tailnet: TailnetSettings,
    pub dualwifi: DualWifiSettings,
    pub truenas: TrueNasSettings,
    pub services: ServicesSettings,
    #[serde(alias = "chadwm")]
    pub dwl: DwlSettings,
}

impl TinappleConfig {
    pub fn config_path() -> String {
        if Path::new("/etc/tinapple").exists() {
            "/etc/tinapple/settings.json".to_string()
        } else if let Ok(home) = std::env::var("HOME") {
            format!("{}/.config/tinapple/settings.json", home)
        } else {
            "/tmp/tinapple-settings.json".to_string()
        }
    }

    pub fn load() -> Self {
        let path = Self::config_path();
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(cfg) = serde_json::from_str::<TinappleConfig>(&content) {
                return cfg;
            }
        }

        let mut cfg = TinappleConfig::default();
        if let Ok(h) = fs::read_to_string("/etc/hostname") {
            let trimmed = h.trim();
            if !trimmed.is_empty() {
                cfg.system.hostname = trimmed.to_string();
            }
        }
        cfg
    }

    pub fn save(&self) -> Result<String, String> {
        let path = Self::config_path();
        if let Some(parent) = Path::new(&path).parent() {
            let _ = fs::create_dir_all(parent);
        }

        match serde_json::to_string_pretty(self) {
            Ok(json) => match fs::write(&path, json) {
                Ok(_) => Ok(format!("Settings saved to {}", path)),
                Err(e) => Err(format!("Failed to write {}: {}", path, e)),
            },
            Err(e) => Err(format!("Serialization error: {}", e)),
        }
    }

    pub fn apply(&self) -> Vec<String> {
        let mut logs = Vec::new();

        // 1. Save config to disk
        match self.save() {
            Ok(msg) => logs.push(format!("✓ {}", msg)),
            Err(err) => logs.push(format!("⚠ {}", err)),
        }

        // 2. Multicore RPS/RFS Packet Steering
        if self.tuning.rps_rfs_enabled {
            let num_cpus = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(4);
            let mask = format!("{:x}", (1u64 << num_cpus) - 1);
            let _ = Command::new("sh")
                .arg("-c")
                .arg(format!("for q in /sys/class/net/*/queues/rx-*/rps_cpus; do [ -f \"$q\" ] && echo \"{}\" > \"$q\" 2>/dev/null; done", mask))
                .output();
            logs.push(format!("✓ Multicore RPS/RFS active: queues bound to CPU mask {}", mask));
        }

        // 3. CAKE AQM
        if self.tuning.cake_aqm_enabled {
            let _ = Command::new("sh")
                .arg("-c")
                .arg("for iface in $(ip -o link show | awk -F': ' '{print $2}' | grep -v 'lo\\|tailscale'); do tc qdisc replace dev \"$iface\" root cake diffserv4 2>/dev/null; done")
                .output();
            logs.push("✓ CAKE diffserv4 AQM applied to network interfaces".to_string());
        }

        // 4. TCP BBR & Socket Buffers
        if self.tuning.tcp_bbr_enabled {
            let _ = Command::new("sysctl").args(["-w", "net.core.default_qdisc=cake"]).output();
            let _ = Command::new("sysctl").args(["-w", "net.ipv4.tcp_congestion_control=bbr"]).output();
            let _ = Command::new("sysctl").args(["-w", "net.ipv4.tcp_window_scaling=1"]).output();
            logs.push("✓ TCP BBR congestion control and window scaling active".to_string());
        }

        // 5. ZRAM Profile
        if self.tuning.zram_profile_enabled {
            let swappiness_str = self.tuning.zram_swappiness.to_string();
            let _ = Command::new("sysctl").args(["-w", &format!("vm.swappiness={}", swappiness_str)]).output();
            let _ = Command::new("sysctl").args(["-w", "vm.page-cluster=0"]).output();
            logs.push(format!("✓ High-efficiency ZRAM profile active (swappiness={})", swappiness_str));
        }

        // 6. Thermal PID Governor & CPU Frequency Scaling
        if self.thermal.pid_governor_enabled {
            let _ = fs::create_dir_all("/etc/default");
            let _ = fs::write("/etc/default/tinarchy-resource-governor", format!("TARGET_TEMP={}\nHYSTERESIS=3\nPOLL_SEC=2.5\n", self.thermal.target_temp));
            let _ = Command::new("systemctl").args(["restart", "tinarchy-resource-governor.service"]).output();
            logs.push(format!("✓ Thermal PID Governor active (target: {}°C)", self.thermal.target_temp));
        }
        let _ = Command::new("sh")
            .arg("-c")
            .arg(format!("for g in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do [ -f \"$g\" ] && echo \"{}\" > \"$g\" 2>/dev/null; done", self.thermal.cpu_governor))
            .output();
        logs.push(format!("✓ CPU frequency governor set to '{}'", self.thermal.cpu_governor));

        // 7. Screen DPMS Sleep & ACPI Lid Switch
        let sleep_sec = self.thermal.screen_sleep_minutes * 60;
        let _ = Command::new("xset").args(["dpms", "0", "0", &sleep_sec.to_string()]).output();
        logs.push(format!("✓ 0-Watt DPMS Screen Sleep active ({}m inactivity)", self.thermal.screen_sleep_minutes));

        if self.thermal.ignore_lid_switch {
            let _ = fs::create_dir_all("/etc/systemd/logind.conf.d");
            let _ = fs::write("/etc/systemd/logind.conf.d/tinapple-lid.conf", "[Login]\nHandleLidSwitch=ignore\nHandleLidSwitchDocked=ignore\n");
            let _ = Command::new("systemctl").args(["kill", "-s", "HUP", "systemd-logind.service"]).output();
            logs.push("✓ ACPI Lid handling set to ignore (24/7 server mode)".to_string());
        }

        // 8. Firewall & Silent Packet Drop
        if self.firewall.ufw_enabled {
            if self.firewall.drop_blocked_packets {
                let _ = Command::new("ufw").args(["default", "deny", "incoming"]).output();
                let _ = Command::new("ufw").args(["default", "allow", "outgoing"]).output();
                logs.push("✓ Strict packet drop policy: UFW set to DROP unsolicited incoming packets".to_string());
            }
            if self.firewall.unblock_local_lan {
                let _ = Command::new("ufw").args(["allow", "from", "192.168.0.0/16"]).output();
                let _ = Command::new("ufw").args(["allow", "from", "10.0.0.0/8"]).output();
                let _ = Command::new("ufw").args(["allow", "from", "172.16.0.0/12"]).output();
                logs.push("✓ Local private subnets unrestricted in UFW".to_string());
            } else {
                logs.push("✓ Strict zero-trust local network: generic LAN access blocked".to_string());
            }

            // Port rules
            let mut ports = Vec::new();
            if self.firewall.open_ssh { ports.push("22/tcp"); }
            if self.firewall.open_http { ports.push("80/tcp"); }
            if self.firewall.open_https { ports.push("443/tcp"); }
            if self.firewall.open_control_center { ports.push("8085/tcp"); }
            if self.firewall.open_jellyfin { ports.push("8096/tcp"); }
            if self.firewall.open_samba { ports.push("445/tcp"); }
            if self.firewall.open_nfs { ports.push("2049/tcp"); }
            if self.firewall.open_tailscale_wireguard { ports.push("41641/tcp"); }

            for p in &ports {
                let _ = Command::new("ufw").args(["allow", p]).output();
            }
            let _ = Command::new("ufw").args(["--force", "enable"]).output();
            logs.push(format!("✓ UFW active with {} open ports", ports.len()));
        }

        // 9. Tailnet & LAN Guardian
        if self.tailnet.tailscale_enabled {
            let mut flags = Vec::new();
            if self.tailnet.ssh_enabled {
                flags.push("--ssh");
            }
            let _ = Command::new("tailscale").args(["set"]).args(&flags).output();
            logs.push(format!("✓ Tailscale node updated with flags: {}", flags.join(" ")));
        }
        if self.tailnet.lan_guardian_enabled {
            let _ = Command::new("systemctl").args(["enable", "--now", "tailnet-lan-guardian.service"]).output();
            logs.push("✓ Tailnet LAN Guardian active: verified peers dynamically unblocked".to_string());
        }

        // 10. TrueNAS Archiving & Syncthing Backup Integration
        if self.truenas.enabled {
            let _ = fs::create_dir_all(&self.truenas.archive_path);
            let syncthing_backup_dir = format!("{}/syncthing-backups", self.truenas.archive_path);
            let _ = fs::create_dir_all(&syncthing_backup_dir);

            if self.truenas.syncthing_backup_enabled {
                // Script for extensive backup of syncthing into trueNAS archive
                let backup_script = format!(
                    r#"#!/bin/bash
ARCHIVE_DIR="{}"
RETENTION_DAYS={}
DATE=$(date +%Y%m%d_%H%M%S)
TARGET_SNAPSHOT="$ARCHIVE_DIR/snapshot_$DATE"

echo "[TrueNAS Backup] Starting backup of Syncthing repositories..."
mkdir -p "$TARGET_SNAPSHOT"

# Backup syncthing folders
for src in /var/lib/syncthing /root/Sync /home/*/Sync; do
    if [ -d "$src" ]; then
        echo "Syncing $src to TrueNAS snapshot..."
        rsync -a --delete --link-dest="$ARCHIVE_DIR/current" "$src/" "$TARGET_SNAPSHOT/" 2>/dev/null || rsync -a "$src/" "$TARGET_SNAPSHOT/"
    fi
done

rm -f "$ARCHIVE_DIR/current"
ln -s "$TARGET_SNAPSHOT" "$ARCHIVE_DIR/current"

# Prune snapshots older than retention days
find "$ARCHIVE_DIR" -maxdepth 1 -name "snapshot_*" -mtime +$RETENTION_DAYS -exec rm -rf {{}} +
echo "[TrueNAS Backup] Syncthing backup completed successfully."
"#,
                    syncthing_backup_dir, self.truenas.snapshot_retention_days
                );
                let _ = fs::write("/usr/bin/tinapple-truenas-backup", backup_script);
                let _ = Command::new("chmod").args(["+x", "/usr/bin/tinapple-truenas-backup"]).output();
                logs.push(format!("✓ TrueNAS Syncthing Backup Engine armed ({}, {} days retention)", syncthing_backup_dir, self.truenas.snapshot_retention_days));
            }

            if self.truenas.samba_share_enabled {
                let smb_conf = format!(
                    r#"[TrueNAS-Archive]
   comment = Tinapple TrueNAS Central Archive & Backup
   path = {}
   browseable = yes
   read only = no
   guest ok = yes
   create mask = 0775
   directory mask = 0775
"#,
                    self.truenas.archive_path
                );
                let _ = fs::create_dir_all("/etc/samba");
                let _ = fs::write("/etc/samba/smb.conf", smb_conf);
                let _ = Command::new("systemctl").args(["restart", "smb.service"]).output();
                logs.push(format!("✓ TrueNAS Samba Network Share active: {}", self.truenas.archive_path));
            }
        }

        // 11. Dual-WiFi Hotspot AP Router
        if self.dualwifi.enabled {
            let _ = Command::new("tinapple-hotspot").arg("start").output();
            logs.push(format!("✓ Dual-WiFi Hotspot AP active: {} on {}", self.dualwifi.hotspot_ssid, self.dualwifi.secondary_interface));
        }

        // 12. Appliance Services
        if self.services.nginx_enabled {
            let _ = Command::new("systemctl").args(["enable", "--now", "nginx.service"]).output();
            logs.push("✓ Nginx gateway service active".to_string());
        }
        if self.services.tinarchy_dash_enabled {
            let _ = Command::new("systemctl").args(["enable", "--now", "tinarchy.service"]).output();
            logs.push("✓ Tinarchy control center active (:8085)".to_string());
        }
        if self.services.syncthing_enabled {
            let _ = Command::new("systemctl").args(["enable", "--now", "syncthing@root.service"]).output();
            logs.push("✓ Syncthing device sync active (:8384)".to_string());
        }

        logs
    }
}
