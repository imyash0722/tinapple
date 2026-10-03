package settings

import (
	"github.com/charmbracelet/lipgloss"
)

type SettingType int

const (
	StringType SettingType = iota
	BoolType
	IntType
	PathType
	PasswordType
	SelectType
	MultiSelectType
	ColorType
)

type SettingItem struct {
	Key         string
	Label       string
	Description string
	Type        SettingType
	Value       interface{}
	Default     interface{}
	Options     []string
	Category    string
}

type SettingsSection struct {
	Name        string
	Icon        string
	Color       lipgloss.Color
	Description string
	Items       []SettingItem
}

func GetSettingsSections() []SettingsSection {
	return []SettingsSection{
		{
			Name:        "System",
			Icon:        "⚙️",
			Color:       lipgloss.Color("#7aa2f7"),
			Description: "Core system settings and OS parameters",
			Items: []SettingItem{
				{Key: "hostname", Label: "Hostname", Type: StringType, Value: "tinapple", Default: "tinapple", Description: "System network hostname"},
				{Key: "timezone", Label: "Timezone", Type: SelectType, Value: "UTC", Options: []string{"UTC", "America/New_York", "Europe/London", "Asia/Tokyo", "Asia/Kolkata"}, Default: "UTC", Description: "System timezone"},
				{Key: "locale", Label: "Locale", Type: SelectType, Value: "en_US.UTF-8", Options: []string{"en_US.UTF-8", "de_DE.UTF-8", "fr_FR.UTF-8", "ja_JP.UTF-8"}, Default: "en_US.UTF-8", Description: "Default system locale"},
				{Key: "keymap", Label: "Keymap", Type: SelectType, Value: "us", Options: []string{"us", "de", "fr", "jp", "uk"}, Default: "us", Description: "Console keyboard layout"},
				{Key: "kernel", Label: "Kernel Profile", Type: SelectType, Value: "lts", Options: []string{"lts", "hardened", "current", "cachyos"}, Default: "lts", Description: "Active kernel profile"},
				{Key: "bootloader", Label: "Bootloader", Type: SelectType, Value: "grub", Options: []string{"grub", "limine"}, Default: "grub", Description: "System bootloader"},
				{Key: "filesystem", Label: "Filesystem", Type: SelectType, Value: "ext4", Options: []string{"ext4", "xfs", "btrfs"}, Default: "ext4", Description: "Root filesystem format"},
			},
		},
		{
			Name:        "Network",
			Icon:        "🌐",
			Color:       lipgloss.Color("#1abc9c"),
			Description: "Network interface configuration, DNS and VPNs",
			Items: []SettingItem{
				{Key: "interface", Label: "Interface", Type: SelectType, Value: "auto", Options: []string{"auto", "eth0", "enp0s3", "wlan0"}, Default: "auto", Description: "Primary network interface"},
				{Key: "dhcp", Label: "DHCP", Type: BoolType, Value: true, Default: true, Description: "Automatically obtain IP address"},
				{Key: "static_ip", Label: "Static IP", Type: StringType, Value: "192.168.1.100/24", Default: "", Description: "Static IP address if DHCP disabled"},
				{Key: "gateway", Label: "Gateway", Type: StringType, Value: "192.168.1.1", Default: "", Description: "Default network gateway"},
				{Key: "dns", Label: "DNS Servers", Type: SelectType, Value: "1.1.1.1", Options: []string{"1.1.1.1", "9.9.9.9", "8.8.8.8"}, Default: "1.1.1.1", Description: "Primary upstream DNS resolver"},
				{Key: "wireguard", Label: "WireGuard", Type: BoolType, Value: false, Default: false, Description: "Enable WireGuard peer connection"},
				{Key: "tailscale", Label: "Tailscale", Type: BoolType, Value: true, Default: true, Description: "Enable Tailscale zero-config mesh VPN"},
			},
		},
		{
			Name:        "chadwm",
			Icon:        "🪟",
			Color:       lipgloss.Color("#2ecc71"),
			Description: "chadwm tiling window manager and ricing customization",
			Items: []SettingItem{
				{Key: "terminal", Label: "Default Terminal", Type: SelectType, Value: "foot", Options: []string{"foot", "alacritty", "xterm"}, Default: "foot", Description: "Default terminal emulator for chadwm"},
				{Key: "gaps", Label: "Window Gaps", Type: IntType, Value: 10, Default: 10, Description: "Window gaps in pixels"},
				{Key: "border_width", Label: "Border Width", Type: IntType, Value: 2, Default: 2, Description: "Window border thickness in pixels"},
				{Key: "border_color_focused", Label: "Focused Border Color", Type: ColorType, Value: "#2ecc71", Default: "#2ecc71", Description: "Active window border accent"},
				{Key: "border_color_unfocused", Label: "Unfocused Border Color", Type: ColorType, Value: "#2c3e50", Default: "#2c3e50", Description: "Inactive window border color"},
				{Key: "smart_gaps", Label: "Smart Gaps", Type: BoolType, Value: true, Default: true, Description: "Disable gaps when only single window is open"},
				{Key: "smart_borders", Label: "Smart Borders", Type: BoolType, Value: true, Default: true, Description: "Disable borders when single window is open"},
				{Key: "bar_position", Label: "Bar Position", Type: SelectType, Value: "top", Options: []string{"top", "bottom"}, Default: "top", Description: "Status bar screen position"},
				{Key: "bar_height", Label: "Bar Height", Type: IntType, Value: 28, Default: 28, Description: "Status bar height in pixels"},
				{Key: "font", Label: "Font Family", Type: StringType, Value: "JetBrainsMono Nerd Font", Default: "JetBrainsMono Nerd Font", Description: "System UI and terminal font"},
				{Key: "mod_key", Label: "Mod Key", Type: SelectType, Value: "Mod4 (Super)", Options: []string{"Mod4 (Super)", "Mod1 (Alt)"}, Default: "Mod4 (Super)", Description: "Primary window manager modifier key"},
			},
		},
		{
			Name:        "Services",
			Icon:        "🔧",
			Color:       lipgloss.Color("#bb9af7"),
			Description: "Homelab core background services and daemons",
			Items: []SettingItem{
				{Key: "nginx", Label: "Tinapple Nginx Proxy", Type: BoolType, Value: true, Default: true, Description: "High-performance reverse proxy on :80/:443"},
				{Key: "jellyfin", Label: "Jellyfin Media Server", Type: BoolType, Value: false, Default: false, Description: "Local media streaming server on :8096"},
				{Key: "qbittorrent", Label: "qBittorrent NoX", Type: BoolType, Value: false, Default: false, Description: "Automated torrent download manager on :8080"},
				{Key: "syncthing", Label: "Syncthing", Type: BoolType, Value: false, Default: false, Description: "Continuous peer-to-peer file sync on :8384"},
				{Key: "prometheus", Label: "Prometheus Metrics", Type: BoolType, Value: false, Default: false, Description: "Time-series monitoring metrics collector on :9090"},
				{Key: "grafana", Label: "Grafana Dashboards", Type: BoolType, Value: false, Default: false, Description: "Visual metrics analysis dashboards on :3000"},
				{Key: "tinapple_dash", Label: "Tinapple Dashboard", Type: BoolType, Value: true, Default: true, Description: "Web administration portal on :8088"},
			},
		},
		{
			Name:        "Security",
			Icon:        "🔒",
			Color:       lipgloss.Color("#f7768e"),
			Description: "SSH hardening, firewall and intrusion protection",
			Items: []SettingItem{
				{Key: "ssh_port", Label: "SSH Port", Type: IntType, Value: 22, Default: 22, Description: "OpenSSH daemon listening port"},
				{Key: "ssh_keys_only", Label: "SSH Keys Only", Type: BoolType, Value: true, Default: true, Description: "Disable password authentication for SSH"},
				{Key: "ufw", Label: "UFW Firewall", Type: BoolType, Value: true, Default: true, Description: "Enable simplified packet firewall"},
				{Key: "fail2ban", Label: "Fail2Ban Protection", Type: BoolType, Value: true, Default: true, Description: "Automated IP banning on repeated auth failure"},
				{Key: "fail2ban_bantime", Label: "Ban Time (seconds)", Type: IntType, Value: 3600, Default: 3600, Description: "Duration to ban offending IP addresses"},
			},
		},
		{
			Name:        "Remote Access",
			Icon:        "🖥️",
			Color:       lipgloss.Color("#e0af68"),
			Description: "Remote desktop access via xrdp (RDP) & TigerVNC for chadwm",
			Items: []SettingItem{
				{Key: "rdp_enabled", Label: "Enable RDP (xrdp)", Type: BoolType, Value: true, Default: true, Description: "Enable Windows/Mac RDP access on :3389"},
				{Key: "rdp_port", Label: "RDP Port", Type: IntType, Value: 3389, Default: 3389, Description: "xrdp listening port"},
				{Key: "vnc_enabled", Label: "Enable VNC (TigerVNC)", Type: BoolType, Value: true, Default: true, Description: "Enable VNC remote framebuffer server on :5900"},
				{Key: "vnc_port", Label: "VNC Base Port", Type: IntType, Value: 5900, Default: 5900, Description: "TigerVNC server base port"},
				{Key: "ssh_tunnel_only", Label: "Tailscale/Tunnel Only", Type: BoolType, Value: true, Default: true, Description: "Restrict remote desktop listening to Tailscale/localhost"},
			},
		},
	}
}
