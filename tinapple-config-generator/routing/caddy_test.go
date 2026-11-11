package routing

import (
	"strings"
	"testing"
)

func TestRenderCaddy(t *testing.T) {
	data, err := RenderCaddy(Defaults, []string{"appliance.local"})
	if err != nil {
		t.Fatal(err)
	}
	content := string(data)
	for _, want := range []string{
		"handle_path /jellyfin/*",
		"reverse_proxy localhost:8096",
		"handle_path /suwayomi/*",
		"reverse_proxy localhost:4567",
		"handle_path /files/*",
		"reverse_proxy localhost:8081",
		"http://jellyfin.appliance.local",
	} {
		if !strings.Contains(content, want) {
			t.Errorf("RenderCaddy output missing %q", want)
		}
	}
}
