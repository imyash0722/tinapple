package manifest

// Manifest represents the top-level configuration schema for tinapple OS (/etc/tinapple/manifest.yaml).
type Manifest struct {
	Version         int                      `yaml:"version"`
	Hostname        string                   `yaml:"hostname"`
	KernelProfile   string                   `yaml:"kernel_profile"`   // lts | hardened | current
	SessionMode     string                   `yaml:"session_mode"`     // headless | interactive | kiosk
	HardwareProfile string                   `yaml:"hardware_profile"` // auto | desktop | laptop
	CachyosRepos    bool                     `yaml:"cachyos_repos"`
	EaseOfUseMode   bool                     `yaml:"ease_of_use_mode"`
	Filesystem      string                   `yaml:"filesystem"` // ext4 | xfs | btrfs
	Bootloader      string                   `yaml:"bootloader"` // auto | grub | limine
	Profiles        []string                 `yaml:"profiles"`
	Services        map[string]ServiceConfig `yaml:"services"`
	Hardware        HardwareConfig           `yaml:"hardware"`
	Network         NetworkConfig            `yaml:"network"`
}

// ServiceConfig defines configuration for an individual homelab service.
type ServiceConfig struct {
	Enabled   bool              `yaml:"enabled"`
	Port      int               `yaml:"port,omitempty"`
	User      string            `yaml:"user,omitempty"`
	DeviceID  string            `yaml:"device_id,omitempty"`
	AuthKey   string            `yaml:"auth_key,omitempty"`
	Overrides map[string]string `yaml:"overrides,omitempty"`
	Extra     map[string]any    `yaml:",inline"`
}

// HardwareConfig defines hardware abstraction parameters.
type HardwareConfig struct {
	Battery        BatteryConfig `yaml:"battery"`
	PowerProfile   string        `yaml:"power_profile"`   // balanced | performance | power-saver | custom
	ThermalProfile string        `yaml:"thermal_profile"` // balanced | performance | quiet | server
	LidPolicy      string        `yaml:"lid_policy"`      // ignore | clamshell
	UPSMonitor     bool          `yaml:"ups_monitor"`
}

// BatteryConfig defines battery threshold and critical behavior.
type BatteryConfig struct {
	ChargeLimit       int    `yaml:"charge_limit"`       // e.g. 80 (%)
	ChargeLimitMin    int    `yaml:"charge_limit_min"`   // e.g. 40 (%)
	CriticalAction    string `yaml:"critical_action"`    // hibernate | poweroff | suspend | hybrid-sleep
	CriticalThreshold int    `yaml:"critical_threshold"` // e.g. 5 (%)
}

// NetworkConfig defines primary network interface configuration.
type NetworkConfig struct {
	Interface      string                `yaml:"interface"`
	DHCP           bool                  `yaml:"dhcp"`
	StaticFallback *StaticFallbackConfig `yaml:"static_fallback,omitempty"`
}

// StaticFallbackConfig defines fallback static addressing if DHCP fails.
type StaticFallbackConfig struct {
	Address string   `yaml:"address"` // CIDR, e.g. 192.168.1.100/24
	Gateway string   `yaml:"gateway"` // e.g. 192.168.1.1
	DNS     []string `yaml:"dns"`     // e.g. [1.1.1.1, 9.9.9.9]
}

// DefaultManifest returns a manifest initialized with Appendix A defaults.
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
