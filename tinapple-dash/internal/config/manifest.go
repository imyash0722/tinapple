package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

// Manifest mirrors the structure from tinapple-config-generator
type Manifest struct {
	Version         int                      `yaml:"version" json:"version"`
	Hostname        string                   `yaml:"hostname" json:"hostname"`
	KernelProfile   string                   `yaml:"kernel_profile" json:"kernel_profile"`
	SessionMode     string                   `yaml:"session_mode" json:"session_mode"`
	HardwareProfile string                   `yaml:"hardware_profile" json:"hardware_profile"`
	CachyosRepos    bool                     `yaml:"cachyos_repos" json:"cachyos_repos"`
	EaseOfUseMode   bool                     `yaml:"ease_of_use_mode" json:"ease_of_use_mode"`
	Filesystem      string                   `yaml:"filesystem" json:"filesystem"`
	Bootloader      string                   `yaml:"bootloader" json:"bootloader"`
	Profiles        []string                 `yaml:"profiles" json:"profiles"`
	Services        map[string]ServiceConfig `yaml:"services" json:"services"`
	Hardware        HardwareConfig           `yaml:"hardware" json:"hardware"`
	Network         NetworkConfig            `yaml:"network" json:"network"`
}

type ServiceConfig struct {
	Enabled   bool              `yaml:"enabled" json:"enabled"`
	Port      int               `yaml:"port,omitempty" json:"port,omitempty"`
	User      string            `yaml:"user,omitempty" json:"user,omitempty"`
	DeviceID  string            `yaml:"device_id,omitempty" json:"device_id,omitempty"`
	AuthKey   string            `yaml:"auth_key,omitempty" json:"auth_key,omitempty"`
	Overrides map[string]string `yaml:"overrides,omitempty" json:"overrides,omitempty"`
	Extra     map[string]any    `yaml:",inline" json:"extra,omitempty"`
}

type HardwareConfig struct {
	Battery        BatteryConfig `yaml:"battery" json:"battery"`
	PowerProfile   string        `yaml:"power_profile" json:"power_profile"`
	ThermalProfile string        `yaml:"thermal_profile" json:"thermal_profile"`
	LidPolicy      string        `yaml:"lid_policy" json:"lid_policy"`
	UPSMonitor     bool          `yaml:"ups_monitor" json:"ups_monitor"`
}

type BatteryConfig struct {
	ChargeLimit       int    `yaml:"charge_limit" json:"charge_limit"`
	ChargeLimitMin    int    `yaml:"charge_limit_min" json:"charge_limit_min"`
	CriticalAction    string `yaml:"critical_action" json:"critical_action"`
	CriticalThreshold int    `yaml:"critical_threshold" json:"critical_threshold"`
}

type NetworkConfig struct {
	Interface      string                `yaml:"interface" json:"interface"`
	DHCP           bool                  `yaml:"dhcp" json:"dhcp"`
	StaticFallback *StaticFallbackConfig `yaml:"static_fallback,omitempty" json:"static_fallback,omitempty"`
}

type StaticFallbackConfig struct {
	Address string   `yaml:"address" json:"address"`
	Gateway string   `yaml:"gateway" json:"gateway"`
	DNS     []string `yaml:"dns" json:"dns"`
}

func DefaultManifest() *Manifest {
	return &Manifest{
		Version:         1,
		Hostname:        "tinapple-server",
		KernelProfile:   "lts",
		SessionMode:     "headless",
		HardwareProfile: "auto",
		CachyosRepos:    true,
		EaseOfUseMode:   false,
		Filesystem:      "ext4",
		Bootloader:      "auto",
		Profiles: []string{
			"base",
			"media",
			"downloads",
		},
		Services: map[string]ServiceConfig{
			"jellyfin": {
				Enabled: true,
				Port:    8096,
				Overrides: map[string]string{
					"JELLYFIN_PublishedServerUrl": "https://jellyfin.mytailnet.ts.net",
				},
			},
			"qbittorrent": {
				Enabled: true,
				Port:    8080,
				User:    "media",
			},
			"syncthing": {
				Enabled:  true,
				Port:     8384,
				DeviceID: "ABCDEF-123456",
			},
			"tailscale": {
				Enabled: true,
			},
			"dash": {
				Enabled: true,
				Port:    8088,
			},
			"minecraft-server": {
				Enabled: true,
				Port:    25565,
				User:    "tinapple",
			},
			"playit": {
				Enabled: true,
			},
		},
		Hardware: HardwareConfig{
			Battery: BatteryConfig{
				ChargeLimit:       80,
				ChargeLimitMin:    40,
				CriticalAction:    "hibernate",
				CriticalThreshold: 5,
			},
			PowerProfile:   "balanced",
			ThermalProfile: "server",
			LidPolicy:      "ignore",
			UPSMonitor:     true,
		},
		Network: NetworkConfig{
			Interface: "eth0",
			DHCP:      true,
			StaticFallback: &StaticFallbackConfig{
				Address: "192.168.1.100/24",
				Gateway: "192.168.1.1",
				DNS:     []string{"1.1.1.1", "9.9.9.9"},
			},
		},
	}
}

func LoadManifest(path string) (*Manifest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read manifest: %w", err)
	}
	
	var m Manifest
	if err := yaml.Unmarshal(data, &m); err != nil {
		return nil, fmt.Errorf("failed to parse manifest: %w", err)
	}
	
	// Apply default ports for services
	for name, svc := range m.Services {
		if svc.Port == 0 {
			if defPort, ok := defaultPorts[name]; ok {
				svc.Port = defPort
				m.Services[name] = svc
			}
		}
	}
	
	return &m, nil
}

func SaveManifest(path string, m *Manifest) error {
	data, err := yaml.Marshal(m)
	if err != nil {
		return fmt.Errorf("failed to serialize manifest: %w", err)
	}
	
	// Ensure directory exists
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return fmt.Errorf("failed to create manifest directory: %w", err)
	}
	
	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("failed to write manifest: %w", err)
	}
	return nil
}

func Validate(m *Manifest) error {
	if m.Version <= 0 {
		m.Version = 1
	}
	if m.Hostname == "" {
		m.Hostname = "tinapple-server"
	}
	
	// Strip human friendly annotations (e.g. "lts (recommended)" -> "lts")
	if strings.Contains(m.KernelProfile, "lts") {
		m.KernelProfile = "lts"
	} else if strings.Contains(m.KernelProfile, "hardened") {
		m.KernelProfile = "hardened"
	} else if strings.Contains(m.KernelProfile, "current") || strings.Contains(m.KernelProfile, "linux") {
		m.KernelProfile = "current"
	} else {
		m.KernelProfile = "lts"
	}

	validSessions := map[string]bool{"headless": true, "interactive": true, "kiosk": true}
	if !validSessions[m.SessionMode] {
		m.SessionMode = "headless"
	}
	
	validHardware := map[string]bool{"auto": true, "desktop": true, "laptop": true}
	if !validHardware[m.HardwareProfile] {
		m.HardwareProfile = "laptop"
	}
	
	validFS := map[string]bool{"ext4": true, "xfs": true, "btrfs": true}
	if !validFS[m.Filesystem] {
		m.Filesystem = "btrfs"
	}
	
	if strings.Contains(m.Bootloader, "grub") {
		m.Bootloader = "grub"
	} else if strings.Contains(m.Bootloader, "limine") {
		m.Bootloader = "limine"
	} else {
		m.Bootloader = "grub"
	}

	// Sanitize Profiles: replace bspwm/chadwm with niri
	cleanProfiles := make([]string, 0, len(m.Profiles))
	hasNiri := false
	for _, p := range m.Profiles {
		pClean := strings.TrimSpace(p)
		if pClean == "bspwm" || pClean == "chadwm" || pClean == "dwl" {
			pClean = "niri"
		}
		if pClean == "niri" {
			if !hasNiri {
				cleanProfiles = append(cleanProfiles, pClean)
				hasNiri = true
			}
		} else if pClean != "" {
			cleanProfiles = append(cleanProfiles, pClean)
		}
	}
	if len(cleanProfiles) == 0 {
		cleanProfiles = []string{"base", "niri", "media", "downloads", "backups", "network", "gaming"}
	}
	m.Profiles = cleanProfiles
	
	// Validate & sanitize battery config
	if m.Hardware.Battery.ChargeLimit < 50 || m.Hardware.Battery.ChargeLimit > 100 {
		m.Hardware.Battery.ChargeLimit = 80
	}
	if m.Hardware.Battery.ChargeLimitMin < 1 || m.Hardware.Battery.ChargeLimitMin > m.Hardware.Battery.ChargeLimit {
		m.Hardware.Battery.ChargeLimitMin = 40
	}
	
	validActions := map[string]bool{"hibernate": true, "poweroff": true, "suspend": true, "hybrid-sleep": true}
	if !validActions[m.Hardware.Battery.CriticalAction] {
		m.Hardware.Battery.CriticalAction = "hibernate"
	}
	if m.Hardware.Battery.CriticalThreshold <= 0 || m.Hardware.Battery.CriticalThreshold > 20 {
		m.Hardware.Battery.CriticalThreshold = 5
	}
	
	validProfiles := map[string]bool{"balanced": true, "performance": true, "power-saver": true, "custom": true}
	if !validProfiles[m.Hardware.PowerProfile] {
		m.Hardware.PowerProfile = "balanced"
	}
	
	validThermal := map[string]bool{"balanced": true, "performance": true, "quiet": true, "server": true}
	if !validThermal[m.Hardware.ThermalProfile] {
		m.Hardware.ThermalProfile = "server"
	}
	
	validLid := map[string]bool{"ignore": true, "clamshell": true}
	if !validLid[m.Hardware.LidPolicy] {
		m.Hardware.LidPolicy = "ignore"
	}
	
	if m.Network.Interface == "" {
		m.Network.Interface = "wlan0"
	}
	
	return nil
}

var defaultPorts = map[string]int{
	"jellyfin":     8096,
	"qbittorrent":  8080,
	"syncthing":    8384,
	"dash":         8088,
	"plex":         32400,
	"sonarr":       8989,
	"radarr":       7878,
	"prowlarr":     9696,
	"bazarr":       6767,
	"transmission": 9091,
	"prometheus":   9090,
	"grafana":      3000,
	"vaultwarden":  8000,
}