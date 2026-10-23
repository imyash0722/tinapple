package services

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestAppLifecycleRefreshesProxy(t *testing.T) {
	dir := t.TempDir()
	logfile := filepath.Join(dir, "commands")
	t.Setenv("PATH", dir+":"+os.Getenv("PATH"))
	t.Setenv("COMMAND_LOG", logfile)
	for _, name := range []string{"pacman", "systemctl", "tinapple-config-generator"} {
		script := "#!/bin/sh\necho \"$(basename \"$0\") $*\" >> \"$COMMAND_LOG\"\n"
		if name == "tinapple-config-generator" {
			script += "cat > \"$COMMAND_LOG.catalog\"\n[ \"${FAIL_PROXY:-}\" != 1 ]\n"
		}
		if err := os.WriteFile(filepath.Join(dir, name), []byte(script), 0755); err != nil {
			t.Fatal(err)
		}
	}
	m := NewAppManager()
	m.cachedAt = time.Now()
	for _, op := range []func(string) error{m.Install, m.Stop, m.Start, m.Restart, m.Uninstall} {
		if err := op("jellyfin"); err != nil {
			t.Fatal(err)
		}
	}
	data, _ := os.ReadFile(logfile)
	if strings.Count(string(data), "nginx-sync --catalog-stdin") != 5 {
		t.Fatalf("missing lifecycle refresh: %s", data)
	}
	if strings.Contains(string(data), "pacman -Sy ") {
		t.Fatal("unsafe partial upgrade")
	}
	if !m.cachedAt.IsZero() {
		t.Fatal("UI cache not invalidated")
	}
	data, _ = os.ReadFile(logfile + ".catalog")
	if !strings.Contains(string(data), `"id":"jellyfin"`) {
		t.Fatal("missing app metadata")
	}
	t.Setenv("FAIL_PROXY", "1")
	if err := m.Start("jellyfin"); err == nil || !strings.Contains(err.Error(), "proxy refresh failed") {
		t.Fatal("proxy error hidden")
	}
}
