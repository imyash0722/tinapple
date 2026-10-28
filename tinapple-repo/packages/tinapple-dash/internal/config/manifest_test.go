package config

import (
	"path/filepath"
	"testing"
)

func TestProxyDomainsSurviveManifestEdits(t *testing.T) {
	path := filepath.Join(t.TempDir(), "manifest.yaml")
	m := DefaultManifest()
	m.Network.ProxyDomains = []string{"appliance.local", "example.ts.net"}
	if err := SaveManifest(path, m); err != nil {
		t.Fatal(err)
	}
	saved, err := LoadManifest(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(saved.Network.ProxyDomains) != 2 || saved.Network.ProxyDomains[1] != "example.ts.net" {
		t.Fatal("routing domains lost during manifest save")
	}
}
