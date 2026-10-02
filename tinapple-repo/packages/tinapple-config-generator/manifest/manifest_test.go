package manifest

import (
	"os"
	"path/filepath"
	"testing"
)

const sampleManifestYAML = `
version: 1
hostname: tinapple-server
kernel_profile: lts
session_mode: headless
hardware_profile: auto
cachyos_repos: true
ease_of_use_mode: false
filesystem: ext4
bootloader: auto
profiles:
  - base
  - media
  - downloads
services:
  jellyfin:
    enabled: true
    overrides:
      JELLYFIN_PublishedServerUrl: "https://jellyfin.mytailnet.ts.net"
  qbittorrent:
    enabled: true
    user: media
  syncthing:
    enabled: true
    device_id: "ABCDEF-123456"
  tailscale:
    enabled: true
    auth_key: "tskey-auth-sample"
hardware:
  battery:
    charge_limit: 80
    charge_limit_min: 40
    critical_action: hibernate
    critical_threshold: 5
  power_profile: balanced
  thermal_profile: server
  lid_policy: ignore
  ups_monitor: true
network:
  interface: eth0
  dhcp: true
  static_fallback:
    address: 192.168.1.100/24
    gateway: 192.168.1.1
    dns: [1.1.1.1, 9.9.9.9]
`

func TestParseSampleManifest(t *testing.T) {
	m, err := ParseManifest([]byte(sampleManifestYAML))
	if err != nil {
		t.Fatalf("Failed to parse sample manifest: %v", err)
	}

	if m.Hostname != "tinapple-server" {
		t.Errorf("expected hostname tinapple-server, got %s", m.Hostname)
	}
	if m.KernelProfile != "lts" {
		t.Errorf("expected kernel_profile lts, got %s", m.KernelProfile)
	}
	if !m.Services["jellyfin"].Enabled {
		t.Errorf("expected jellyfin to be enabled")
	}
	// Default port auto-populated
	if m.Services["jellyfin"].Port != 8096 {
		t.Errorf("expected jellyfin port 8096, got %d", m.Services["jellyfin"].Port)
	}
	if m.Services["qbittorrent"].Port != 8080 {
		t.Errorf("expected qbittorrent port 8080, got %d", m.Services["qbittorrent"].Port)
	}

	if err := Validate(m); err != nil {
		t.Fatalf("Validation failed on valid manifest: %v", err)
	}
}

func TestValidationErrors(t *testing.T) {
	badManifest := DefaultManifest()
	badManifest.Hostname = "-invalid-hostname-"
	badManifest.KernelProfile = "invalid-kernel"
	badManifest.SessionMode = "invalid-session"
	badManifest.Hardware.Battery.ChargeLimit = 150
	badManifest.Network.StaticFallback.Address = "invalid-cidr"

	err := Validate(badManifest)
	if err == nil {
		t.Fatalf("Expected validation error, got nil")
	}

	ve, ok := err.(*ValidationError)
	if !ok {
		t.Fatalf("Expected *ValidationError, got %T", err)
	}

	if len(ve.Errors) < 4 {
		t.Errorf("Expected at least 4 errors, got %d: %v", len(ve.Errors), ve.Errors)
	}
}

func TestSaveAndLoadManifest(t *testing.T) {
	tmpDir := t.TempDir()
	path := filepath.Join(tmpDir, "manifest.yaml")

	m := DefaultManifest()
	if err := SaveManifest(path, m); err != nil {
		t.Fatalf("Failed to save manifest: %v", err)
	}

	loaded, err := LoadManifest(path)
	if err != nil {
		t.Fatalf("Failed to load manifest: %v", err)
	}

	if loaded.Hostname != m.Hostname {
		t.Errorf("Hostname mismatch: got %s, want %s", loaded.Hostname, m.Hostname)
	}
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("File does not exist: %v", err)
	}
}
