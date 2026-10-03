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
	chadwm := st.Repo.Find("chadwm")
	if chadwm == nil {
		t.Errorf("Expected to find 'chadwm' in catalog")
	} else if chadwm.Category != "System" {
		t.Errorf("Expected chadwm category 'System', got '%s'", chadwm.Category)
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
