package services

import (
	"bufio"
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

type TailscaleStatus struct {
	Installed    bool     `json:"installed"`
	Running      bool     `json:"running"`
	BackendState string   `json:"backendState"` // "NeedsLogin", "Running", "Stopped", "Starting", "NoState"
	AuthURL      string   `json:"authUrl,omitempty"`
	TailscaleIPs []string `json:"tailscaleIPs,omitempty"`
	DNSName      string   `json:"dnsName,omitempty"`
	HostName     string   `json:"hostName,omitempty"`
	Tailnet      string   `json:"tailnet,omitempty"`
	Online       bool     `json:"online"`
	Version      string   `json:"version,omitempty"`
}

type rawTailscaleStatus struct {
	Version      string   `json:"Version"`
	BackendState string   `json:"BackendState"`
	AuthURL      string   `json:"AuthURL"`
	TailscaleIPs []string `json:"TailscaleIPs"`
	Self         struct {
		HostName string `json:"HostName"`
		DNSName  string `json:"DNSName"`
		Online   bool   `json:"Online"`
	} `json:"Self"`
	CurrentTailnet *struct {
		Name string `json:"Name"`
	} `json:"CurrentTailnet"`
	Health []string `json:"Health"`
}

type TailscaleManager struct {
	mu sync.RWMutex
}

func NewTailscaleManager() *TailscaleManager {
	return &TailscaleManager{}
}

func (m *TailscaleManager) findTailscaleBin() string {
	candidates := []string{
		"/usr/bin/tailscale",
		"/usr/local/bin/tailscale",
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}
	if p, err := exec.LookPath("tailscale"); err == nil {
		return p
	}
	return "tailscale"
}

func (m *TailscaleManager) GetStatus(ctx context.Context) (*TailscaleStatus, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	bin := m.findTailscaleBin()
	status := &TailscaleStatus{
		Installed: false,
		Running:   false,
	}

	if _, err := exec.LookPath(bin); err != nil && bin == "tailscale" {
		return status, nil
	}
	status.Installed = true

	// Check if tailscaled.service is active
	checkCmd := exec.CommandContext(ctx, "systemctl", "is-active", "tailscaled.service")
	out, _ := checkCmd.Output()
	status.Running = strings.TrimSpace(string(out)) == "active"

	// Query tailscale status --json
	cmd := exec.CommandContext(ctx, bin, "status", "--json")
	jsonOut, err := cmd.Output()
	if err != nil {
		return status, nil
	}

	var raw rawTailscaleStatus
	if err := json.Unmarshal(jsonOut, &raw); err != nil {
		return status, nil
	}

	status.Version = raw.Version
	status.BackendState = raw.BackendState
	status.AuthURL = raw.AuthURL
	status.TailscaleIPs = raw.TailscaleIPs
	status.HostName = raw.Self.HostName
	status.DNSName = strings.TrimSuffix(raw.Self.DNSName, ".")
	status.Online = raw.Self.Online
	if raw.CurrentTailnet != nil {
		status.Tailnet = raw.CurrentTailnet.Name
	}

	// If NeedsLogin or Stopped and AuthURL is empty, trigger up to extract AuthURL
	if (status.BackendState == "NeedsLogin" || status.BackendState == "Stopped") && status.AuthURL == "" {
		cmd := exec.Command(bin, "up", "--reset")
		stdout, err := cmd.StdoutPipe()
		if err == nil {
			cmd.Stderr = cmd.Stdout
			if err := cmd.Start(); err == nil {
				urlChan := make(chan string, 1)
				go func() {
					scanner := bufio.NewScanner(stdout)
					for scanner.Scan() {
						line := strings.TrimSpace(scanner.Text())
						if strings.HasPrefix(line, "https://login.tailscale.com/a/") {
							urlChan <- line
							return
						}
					}
				}()

				select {
				case url := <-urlChan:
					status.AuthURL = url
				case <-time.After(2 * time.Second):
				}
				_ = cmd.Process.Kill()
			}
		}
	}

	return status, nil
}

func (m *TailscaleManager) Login(ctx context.Context, authKey string) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	bin := m.findTailscaleBin()

	// Ensure tailscaled is started
	_ = exec.CommandContext(ctx, "systemctl", "start", "tailscaled.service").Run()

	args := []string{"up", "--reset"}
	if authKey != "" {
		args = append(args, "--authkey="+strings.TrimSpace(authKey))
		cmd := exec.CommandContext(ctx, bin, args...)
		_ = cmd.Run()
		return "", nil
	}

	cmd := exec.Command(bin, args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return "", err
	}
	cmd.Stderr = cmd.Stdout

	if err := cmd.Start(); err != nil {
		return "", err
	}

	urlChan := make(chan string, 1)
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if strings.HasPrefix(line, "https://login.tailscale.com/a/") {
				urlChan <- line
				return
			}
		}
	}()

	var foundUrl string
	select {
	case url := <-urlChan:
		foundUrl = url
	case <-time.After(3 * time.Second):
	}
	_ = cmd.Process.Kill()

	if foundUrl == "" {
		if statusOut, err := exec.Command(bin, "status", "--json").Output(); err == nil {
			var raw rawTailscaleStatus
			if json.Unmarshal(statusOut, &raw) == nil && raw.AuthURL != "" {
				foundUrl = raw.AuthURL
			}
		}
	}

	return foundUrl, nil
}

func (m *TailscaleManager) Logout(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	bin := m.findTailscaleBin()
	return exec.CommandContext(ctx, bin, "logout").Run()
}

func (m *TailscaleManager) Down(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	bin := m.findTailscaleBin()
	return exec.CommandContext(ctx, bin, "down").Run()
}

func (m *TailscaleManager) Up(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	bin := m.findTailscaleBin()
	return exec.CommandContext(ctx, bin, "up", "--timeout=5s").Run()
}
