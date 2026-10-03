package settings

import (
	"testing"
)

func TestSettingsModelOperations(t *testing.T) {
	m := NewModel(nil)

	if len(m.Sections) == 0 {
		t.Fatalf("Expected non-empty settings sections")
	}

	// Verify all 6 required sections exist
	expectedSecs := map[string]bool{
		"System":        false,
		"Network":       false,
		"chadwm":        false,
		"Services":      false,
		"Security":      false,
		"Remote Access": false,
	}

	for _, sec := range m.Sections {
		expectedSecs[sec.Name] = true
	}

	for name, found := range expectedSecs {
		if !found {
			t.Errorf("Expected section '%s' to be present in settings", name)
		}
	}

	// Test boolean toggle
	m.ActiveSection = 1 // Network
	m.Cursor = 1        // DHCP
	initialDHCP := m.Values["dhcp"].(bool)
	m.handleToggleOrCycle()
	newDHCP := m.Values["dhcp"].(bool)
	if newDHCP == initialDHCP {
		t.Errorf("Expected DHCP toggle to change value, stayed %v", newDHCP)
	}

	// Test Integer Increment
	m.ActiveSection = 2 // chadwm
	m.Cursor = 1        // gaps
	initialGaps := m.Values["gaps"].(int)
	m.handleIncrement(5)
	if m.Values["gaps"].(int) != initialGaps+5 {
		t.Errorf("Expected gaps to increase by 5, got %v", m.Values["gaps"])
	}

	// Test Save Settings
	m.SaveSettings()
	if m.StatusMessage == "" {
		t.Errorf("Expected status message after SaveSettings")
	}
}
