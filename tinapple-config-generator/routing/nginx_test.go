package routing

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestRoutesAndAliases(t *testing.T) {
	data, err := Render(Defaults, []string{"appliance.local", "example.ts.net"})
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"listen 80 default_server", "proxy_pass http://127.0.0.1:8088;", "location ^~ /files/", "location ^~ /vault/", "location ^~ /suwayomi/", "proxy_buffering off;", "proxy_set_header Upgrade $http_upgrade", "server_name jellyfin.appliance.local;", "server_name jellyfin.example.ts.net;"} {
		if !strings.Contains(string(data), want) {
			t.Errorf("missing %q", want)
		}
	}
	reversed := append([]App(nil), Defaults...)
	for i, j := 0, len(reversed)-1; i < j; i, j = i+1, j-1 {
		reversed[i], reversed[j] = reversed[j], reversed[i]
	}
	other, _ := Render(reversed, []string{"appliance.local", "example.ts.net"})
	if !bytes.Equal(data, other) {
		t.Fatal("generation is nondeterministic")
	}
	empty, _ := Render(nil, nil)
	if strings.Contains(string(empty), "location ^~") || !strings.Contains(string(empty), ":8088;") {
		t.Fatal("empty catalog must retain only hub")
	}
}
func TestRejectConfigInjection(t *testing.T) {
	for _, domain := range []string{"bad;server{}", "*.local", "a..b", "-a.local", "a\nb"} {
		if _, err := Render(Defaults, []string{domain}); err == nil {
			t.Errorf("accepted %q", domain)
		}
	}
	app := Defaults[0]
	app.Port = 65536
	if _, err := Render([]App{app}, nil); err == nil {
		t.Fatal("invalid port accepted")
	}
	app = Defaults[0]
	app.Unit = "--bad.service"
	if err := ValidateApp(app); err == nil {
		t.Fatal("option injection accepted")
	}
	if _, err := Render([]App{Defaults[0], Defaults[0]}, nil); err == nil {
		t.Fatal("duplicate accepted")
	}
}
func TestApplyRestoresLastGoodConfiguration(t *testing.T) {
	path := filepath.Join(t.TempDir(), "services.conf")
	if err := AtomicWrite(path, []byte("old"), 0644); err != nil {
		t.Fatal(err)
	}
	reloaded := false
	err := Apply(path, []byte("invalid"), func() error { return errors.New("nginx -t failed") }, func() error { reloaded = true; return nil })
	got, _ := os.ReadFile(path)
	if err == nil || reloaded || string(got) != "old" {
		t.Fatal("validation failure replaced live config")
	}
	err = Apply(path, []byte("new"), func() error { return nil }, func() error { return errors.New("reload failed") })
	got, _ = os.ReadFile(path)
	if err == nil || string(got) != "old" {
		t.Fatal("reload failure lost prior config")
	}
	if err = Apply(path, []byte("new"), func() error { return nil }, func() error { return nil }); err != nil {
		t.Fatal(err)
	}
}
