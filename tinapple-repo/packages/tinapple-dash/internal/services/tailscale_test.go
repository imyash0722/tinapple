package services

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestCheckClientRole(t *testing.T) {
	mgr := NewTailscaleManager()
	ctx := context.Background()

	// 1. Loopback
	isOwner, user := mgr.CheckClientRole(ctx, nil, "127.0.0.1")
	if !isOwner || user != "localhost" {
		t.Errorf("expected 127.0.0.1 to be owner, got %v (%s)", isOwner, user)
	}

	isOwner, user = mgr.CheckClientRole(ctx, nil, "::1")
	if !isOwner || user != "localhost" {
		t.Errorf("expected ::1 to be owner, got %v (%s)", isOwner, user)
	}

	// 2. Private LAN
	isOwner, user = mgr.CheckClientRole(ctx, nil, "192.168.1.109")
	if !isOwner || user != "lan-owner" {
		t.Errorf("expected 192.168.1.109 to be owner, got %v (%s)", isOwner, user)
	}

	isOwner, user = mgr.CheckClientRole(ctx, nil, "10.0.5.20")
	if !isOwner || user != "lan-owner" {
		t.Errorf("expected 10.0.5.20 to be owner, got %v (%s)", isOwner, user)
	}

	// 3. Tailscale mocked check
	dir := t.TempDir()
	tailscaleScript := `#!/bin/sh
for arg in "$@"; do
  if [ "$arg" = "100.103.108.21" ]; then
    echo '{"Node":{"Hostinfo":{"ShareeNode":false,"Hostname":"tinux"}},"UserProfile":{"LoginName":"yatinrajesh77@gmail.com"}}'
    exit 0
  elif [ "$arg" = "100.67.155.4" ]; then
    echo '{"Node":{"Hostinfo":{"ShareeNode":true,"Hostname":"friend-phone"}},"UserProfile":{"LoginName":"thirukumaran3057@gmail.com"}}'
    exit 0
  fi
done
exit 1
`
	scriptPath := filepath.Join(dir, "tailscale")
	if err := os.WriteFile(scriptPath, []byte(tailscaleScript), 0755); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", dir+":"+os.Getenv("PATH"))

	// Owner Tailscale IP
	isOwner, user = mgr.CheckClientRole(ctx, nil, "100.103.108.21")
	if !isOwner || user != "yatinrajesh77@gmail.com" {
		t.Errorf("expected 100.103.108.21 to be owner, got %v (%s)", isOwner, user)
	}

	// Friend Tailscale IP
	isOwner, user = mgr.CheckClientRole(ctx, nil, "100.67.155.4")
	if isOwner {
		t.Errorf("expected 100.67.155.4 to NOT be owner, got %v (%s)", isOwner, user)
	}

	// 4. External public IP
	isOwner, user = mgr.CheckClientRole(ctx, nil, "8.8.8.8")
	if isOwner {
		t.Errorf("expected 8.8.8.8 to NOT be owner, got %v (%s)", isOwner, user)
	}
}
