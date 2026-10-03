package config

import (
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Store StoreConfig `yaml:"store"`
}

type StoreConfig struct {
	Repositories       []RepoConfig `yaml:"repositories"`
	CacheDir           string       `yaml:"cache_dir"`
	InstallRoot        string       `yaml:"install_root"`
	ConcurrentDownloads int         `yaml:"concurrent_downloads"`
	AutoUpdateCheck    bool         `yaml:"auto_update_check"`
	UpdateIntervalHours int         `yaml:"update_interval_hours"`
}

type RepoConfig struct {
	Name    string `yaml:"name"`
	URL     string `yaml:"url"`
	Enabled bool   `yaml:"enabled"`
}

func DefaultConfig() *Config {
	return &Config{
		Store: StoreConfig{
			Repositories: []RepoConfig{
				{Name: "tinapple-official", URL: "https://repo.tinapple.org/apps", Enabled: true},
				{Name: "aur", URL: "https://aur.archlinux.org", Enabled: true},
			},
			CacheDir:           "/var/cache/chaddy-store",
			InstallRoot:        "/",
			ConcurrentDownloads: 3,
			AutoUpdateCheck:    true,
			UpdateIntervalHours: 6,
		},
	}
}

func Load() *Config {
	cfg := DefaultConfig()

	// Try reading from current directory, /etc/tinapple/chaddy-store.yaml, or ~/.config/chaddy-store/config.yaml
	candidates := []string{
		"config.yaml",
		"/etc/tinapple/chaddy-store.yaml",
		filepath.Join(os.Getenv("HOME"), ".config/chaddy-store/config.yaml"),
		"/mnt/shared/projects/tinapple/chaddy-store/config.yaml",
	}

	for _, path := range candidates {
		if path == "" {
			continue
		}
		data, err := os.ReadFile(path)
		if err == nil {
			_ = yaml.Unmarshal(data, cfg)
			break
		}
	}

	return cfg
}
