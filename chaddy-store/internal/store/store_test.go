package store

import (
	"testing"
)

func TestStoreCatalogSearchAndFind(t *testing.T) {
	st := New(nil)

	if len(st.Repo.Apps) == 0 {
		t.Fatalf("Expected non-empty default app catalog")
	}

	// Test find
	niri := st.Repo.Find("niri")
	if niri == nil {
		t.Errorf("Expected to find 'niri' in catalog")
	} else if niri.Category != "System" {
		t.Errorf("Expected niri category 'System', got '%s'", niri.Category)
	}

	// Test search
	vpnResults := st.Search("vpn")
	if len(vpnResults) == 0 {
		t.Errorf("Expected search 'vpn' to yield results")
	}

	foundTailscale := false
	for _, app := range vpnResults {
		if app.ID == "tailscale" {
			foundTailscale = true
			break
		}
	}
	if !foundTailscale {
		t.Errorf("Expected 'tailscale' in VPN search results")
	}

	// Test category search
	mediaResults := st.Search("Media")
	if len(mediaResults) == 0 {
		t.Errorf("Expected search 'Media' to find media apps")
	}
}
