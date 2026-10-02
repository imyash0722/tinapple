package config

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Manifest mirrors the structure from tinapple-config-generator
type Manifest struct {
	Version         int                      `yaml:"version"`
	Hostname        string                   `yaml:"hostname"`
	KernelProfile   string                   `yaml:"kernel_profile"`
	SessionMode     string                   `yaml:"session_mode"`
	HardwareProfile string                   `yaml:"hardware_profile"`
	CachyosRepos    bool                     `yaml:"cachyos_repos"`
	EaseOfUseMode   bool                     `yaml:"ease_of_use_mode"`
	Filesystem      string                   `yaml:"filesystem"`
	Bootloader      string                   `yaml:"bootloader"`
	Profiles        []string                 `yaml:"profiles"`
	Services        map[string]ServiceConfig `yaml:"services"`
	Hardware        HardwareConfig           `yaml:"hardware"`
	Network         NetworkConfig            `yaml:"network"`
}

type ServiceConfig struct {
	Enabled   bool              `yaml:"enabled"`
	Port      int               `yaml:"port,omitempty"`
	User      string            `yaml:"user,omitempty"`
	DeviceID  string            `yaml:"device_id,omitempty"`
	AuthKey   string            `yaml:"auth_key,omitempty"`
	Overrides map[string]string `yaml:"overrides,omitempty"`
	Extra     map[string]any    `yaml:",inline"`
}

type HardwareConfig struct {
	Battery        BatteryConfig `yaml:"battery"`
	PowerProfile   string        `yaml:"power_profile"`
	ThermalProfile string        `yaml:"thermal_profile"`
	LidPolicy      string        `yaml:"lid_policy"`
	UPSMonitor     bool          `yaml:"ups_monitor"`
}

type BatteryConfig struct {
	ChargeLimit       int    `yaml:"charge_limit"`
	ChargeLimitMin    int    `yaml:"charge_limit_min"`
	CriticalAction    string `yaml:"critical_action"`
	CriticalThreshold int    `yaml:"critical_threshold"`
}

type NetworkConfig struct {
	Interface      string                `yaml:"interface"`
	DHCP           bool                  `yaml:"dhcp"`
	StaticFallback *StaticFallbackConfig `yaml:"static_fallback,omitempty"`
}

type StaticFallbackConfig struct {
	Address string   `yaml:"address"`
	Gateway string   `yaml:"gateway"`
	DNS     []string `yaml:"dns"`
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
		return fmt.Errorf("invalid version %d", m.Version)
	}
	if m.Hostname == "" {
		return fmt.Errorf("hostname cannot be empty")
	}
	
	validKernels := map[string]bool{"lts": true, "hardened": true, "current": true}
	if !validKernels[m.KernelProfile] {
		return fmt.Errorf("invalid kernel_profile: %s", m.KernelProfile)
	}
	
	validSessions := map[string]bool{"headless": true, "interactive": true, "kiosk": true}
	if !validSessions[m.SessionMode] {
		return fmt.Errorf("invalid session_mode: %s", m.SessionMode)
	}
	
	validHardware := map[string]bool{"auto": true, "desktop": true, "laptop": true}
	if !validHardware[m.HardwareProfile] {
		return fmt.Errorf("invalid hardware_profile: %s", m.HardwareProfile)
	}
	
	validFS := map[string]bool{"ext4": true, "xfs": true, "btrfs": true}
	if !validFS[m.Filesystem] {
		return fmt.Errorf("invalid filesystem: %s", m.Filesystem)
	}
	
	validBootloaders := map[string]bool{"auto": true, "grub": true, "limine": true}
	if !validBootloaders[m.Bootloader] {
		return fmt.Errorf("invalid bootloader: %s", m.Bootloader)
	}
	
	// Validate battery config
	bat := m.Hardware.Battery
	if bat.ChargeLimit < 50 || bat.ChargeLimit > 100 {
		return fmt.Errorf("battery.charge_limit must be 50-100")
	}
	if bat.ChargeLimitMin < 1 || bat.ChargeLimitMin > bat.ChargeLimit {
		return fmt.Errorf("battery.charge_limit_min must be 1-%d", bat.ChargeLimit)
	}
	
	validActions := map[string]bool{"hibernate": true, "poweroff": true, "suspend": true, "hybrid-sleep": true}
	if !validActions[bat.CriticalAction] {
		return fmt.Errorf("invalid critical_action: %s", bat.CriticalAction)
	}
	
	validProfiles := map[string]bool{"balanced": true, "performance": true, "power-saver": true, "custom": true}
	if !validProfiles[m.Hardware.PowerProfile] {
		return fmt.Errorf("invalid power_profile: %s", m.Hardware.PowerProfile)
	}
	
	validThermal := map[string]bool{"balanced": true, "performance": true, "quiet": true, "server": true}
	if !validThermal[m.Hardware.ThermalProfile] {
		return fmt.Errorf("invalid thermal_profile: %s", m.Hardware.ThermalProfile)
	}
	
	validLid := map[string]bool{"ignore": true, "clamshell": true}
	if !validLid[m.Hardware.LidPolicy] {
		return fmt.Errorf("invalid lid_policy: %s", m.Hardware.LidPolicy)
	}
	
	if m.Network.Interface == "" {
		return fmt.Errorf("network.interface cannot be empty")
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