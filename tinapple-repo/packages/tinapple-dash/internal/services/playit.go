package services

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

type PlayitStatus struct {
	Installed     bool   `json:"installed"`
	Running       bool   `json:"running"`
	Configured    bool   `json:"configured"`
	ClaimURL      string `json:"claimUrl,omitempty"`
	ClaimCode     string `json:"claimCode,omitempty"`
	PublicAddress string `json:"publicAddress,omitempty"`
	SecretPath    string `json:"secretPath"`
	LastLog       string `json:"lastLog,omitempty"`
}

type PlayitManager struct {
	mu            sync.RWMutex
	secretPath    string
	lastClaimURL  string
	lastClaimCode string
}

func NewPlayitManager() *PlayitManager {
	return &PlayitManager{
		secretPath: "/etc/playit/playit.toml",
	}
}

func (m *PlayitManager) findPlayitBin() string {
	candidates := []string{
		"/usr/local/bin/playit",
		"/usr/bin/playit",
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}
	if p, err := exec.LookPath("playit"); err == nil {
		return p
	}
	return ""
}

func (m *PlayitManager) findPlayitCliBin() string {
	candidates := []string{
		"/usr/local/bin/playit-cli",
		"/usr/bin/playit-cli",
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}
	if p, err := exec.LookPath("playit-cli"); err == nil {
		return p
	}
	return ""
}

func (m *PlayitManager) isConfigured() bool {
	paths := []string{
		m.secretPath,
		"/root/.config/playit_gg/playit.toml",
	}
	for _, p := range paths {
		if fi, err := os.Stat(p); err == nil && fi.Size() > 5 {
			content, err := os.ReadFile(p)
			if err == nil && strings.Contains(string(content), "secret_key") {
				return true
			}
		}
	}
	return false
}

func (m *PlayitManager) isRunning(ctx context.Context) bool {
	ctxTimeout, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctxTimeout, "systemctl", "is-active", "playit")
	out, err := cmd.Output()
	if err == nil && strings.TrimSpace(string(out)) == "active" {
		return true
	}

	// Fallback to checking pgrep playit
	cmd2 := exec.CommandContext(ctxTimeout, "pgrep", "-f", "playit")
	if err := cmd2.Run(); err == nil {
		return true
	}

	return false
}

func (m *PlayitManager) GetStatus(ctx context.Context) (*PlayitStatus, error) {
	m.mu.RLock()
	claimURL := m.lastClaimURL
	claimCode := m.lastClaimCode
	m.mu.RUnlock()

	installed := m.findPlayitBin() != ""
	running := m.isRunning(ctx)
	configured := m.isConfigured()

	status := &PlayitStatus{
		Installed:  installed,
		Running:    running,
		Configured: configured,
		ClaimURL:   claimURL,
		ClaimCode:  claimCode,
		SecretPath: m.secretPath,
	}

	// If running, extract tunnel address from journalctl logs or playit-cli
	if running {
		cmd := exec.CommandContext(ctx, "journalctl", "-u", "playit", "-n", "30", "--no-pager")
		if out, err := cmd.Output(); err == nil {
			status.LastLog = strings.TrimSpace(string(out))
			// Search for playit.gg address: e.g. [a-zA-Z0-9-]+\.playit\.gg(:[0-9]+)? or similar
			re := regexp.MustCompile(`([a-zA-Z0-9_\-\.]+\.(playit\.gg|gl\.joinmc\.link|auto\.playit\.gg)(:[0-9]+)?)`)
			matches := re.FindStringSubmatch(string(out))
			if len(matches) > 1 {
				status.PublicAddress = matches[1]
			}
		}
	}

	return status, nil
}

func (m *PlayitManager) GenerateClaim(ctx context.Context) (string, string, error) {
	cliBin := m.findPlayitCliBin()
	if cliBin == "" {
		return "", "", fmt.Errorf("playit-cli binary not found")
	}

	cmdGen := exec.CommandContext(ctx, cliBin, "claim", "generate")
	outGen, err := cmdGen.Output()
	if err != nil {
		return "", "", fmt.Errorf("failed to generate claim code: %w", err)
	}
	code := strings.TrimSpace(string(outGen))

	cmdURL := exec.CommandContext(ctx, cliBin, "claim", "url", code, "--name", "Tinapple Minecraft")
	outURL, err := cmdURL.Output()
	var claimURL string
	if err == nil && len(outURL) > 0 {
		claimURL = strings.TrimSpace(string(outURL))
	} else {
		claimURL = fmt.Sprintf("https://playit.gg/claim/%s", code)
	}

	m.mu.Lock()
	m.lastClaimCode = code
	m.lastClaimURL = claimURL
	m.mu.Unlock()

	return claimURL, code, nil
}

func (m *PlayitManager) SetSecret(ctx context.Context, secretKey string) error {
	secretKey = strings.TrimSpace(secretKey)
	if secretKey == "" {
		return fmt.Errorf("secret key cannot be empty")
	}

	dir := filepath.Dir(m.secretPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create playit config dir: %w", err)
	}

	content := fmt.Sprintf("secret_key = \"%s\"\n", secretKey)
	if err := os.WriteFile(m.secretPath, []byte(content), 0600); err != nil {
		return fmt.Errorf("failed to write secret to %s: %w", m.secretPath, err)
	}

	// Also mirror to /root/.config/playit_gg/playit.toml in case playit runs without --secret-path
	rootDir := "/root/.config/playit_gg"
	_ = os.MkdirAll(rootDir, 0755)
	_ = os.WriteFile(filepath.Join(rootDir, "playit.toml"), []byte(content), 0600)

	// Restart or start the service
	cmd := exec.CommandContext(ctx, "systemctl", "restart", "playit")
	_ = cmd.Run()

	return nil
}

func (m *PlayitManager) Start(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "systemctl", "start", "playit")
	var errBuf bytes.Buffer
	cmd.Stderr = &errBuf
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to start playit: %s (%w)", strings.TrimSpace(errBuf.String()), err)
	}
	return nil
}

func (m *PlayitManager) Stop(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "systemctl", "stop", "playit")
	_ = cmd.Run()
	return nil
}

func (m *PlayitManager) Reset(ctx context.Context) error {
	_ = m.Stop(ctx)

	// Remove config files
	_ = os.Remove(m.secretPath)
	_ = os.Remove("/root/.config/playit_gg/playit.toml")

	cliBin := m.findPlayitCliBin()
	if cliBin != "" {
		cmd := exec.CommandContext(ctx, cliBin, "reset")
		_ = cmd.Run()
	}

	m.mu.Lock()
	m.lastClaimCode = ""
	m.lastClaimURL = ""
	m.mu.Unlock()

	return nil
}
