package services

import (
	"bufio"
	"context"
	"encoding/json"
	"net"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

type WhoisNode struct {
	ID       int64  `json:"ID"`
	Name     string `json:"Name"`
	Hostinfo struct {
		ShareeNode bool   `json:"ShareeNode"`
		Hostname   string `json:"Hostname"`
	} `json:"Hostinfo"`
}

type WhoisUserProfile struct {
	ID          int64  `json:"ID"`
	LoginName   string `json:"LoginName"`
	DisplayName string `json:"DisplayName"`
}

type WhoisResult struct {
	Node        WhoisNode        `json:"Node"`
	UserProfile WhoisUserProfile `json:"UserProfile"`
}

type RoleCacheItem struct {
	IsOwner   bool
	LoginUser string
	CachedAt  time.Time
}

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
	mu        sync.RWMutex
	roleCache map[string]RoleCacheItem
}

func NewTailscaleManager() *TailscaleManager {
	return &TailscaleManager{
		roleCache: make(map[string]RoleCacheItem),
	}
}

func (m *TailscaleManager) findTailscaleBin() string {
	if p, err := exec.LookPath("tailscale"); err == nil {
		return p
	}
	candidates := []string{
		"/usr/bin/tailscale",
		"/usr/local/bin/tailscale",
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c
		}
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

var (
	tailscaleIPv4Net = parseCIDR("100.64.0.0/10")
	tailscaleIPv6Net = parseCIDR("fd7a:115c:a1e0::/48")
	lan10            = parseCIDR("10.0.0.0/8")
	lan172          = parseCIDR("172.16.0.0/12")
	lan192          = parseCIDR("192.168.0.0/16")
)

func parseCIDR(s string) *net.IPNet {
	_, netw, err := net.ParseCIDR(s)
	if err != nil {
		return nil
	}
	return netw
}

func isTailscaleIP(ip net.IP) bool {
	if tailscaleIPv4Net != nil && tailscaleIPv4Net.Contains(ip) {
		return true
	}
	if tailscaleIPv6Net != nil && tailscaleIPv6Net.Contains(ip) {
		return true
	}
	return false
}

func isPrivateLAN(ip net.IP) bool {
	return (lan10 != nil && lan10.Contains(ip)) ||
		(lan172 != nil && lan172.Contains(ip)) ||
		(lan192 != nil && lan192.Contains(ip))
}

// CheckClientRole determines whether the given client IP is the system owner or a guest/shared peer.
// Localhost and LAN IPs (home network) are considered owner access.
// Tailscale IPs are dynamically inspected via tailscale whois to check user identity and sharee status.
func (m *TailscaleManager) CheckClientRole(ctx context.Context, rawIP string) (isOwner bool, loginUser string) {
	host := strings.TrimSpace(rawIP)
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	host = strings.Trim(host, "[]")

	if host == "" {
		return false, ""
	}

	ip := net.ParseIP(host)
	if ip == nil {
		return false, ""
	}

	// 1. Loopback is always owner
	if ip.IsLoopback() || host == "127.0.0.1" || host == "::1" {
		return true, "localhost"
	}

	// 2. Private LAN networks (Home Wi-Fi/Ethernet)
	isTs := isTailscaleIP(ip)
	if !isTs && isPrivateLAN(ip) {
		return true, "lan-owner"
	}

	// 3. Tailscale Mesh node
	if isTs {
		m.mu.RLock()
		if m.roleCache != nil {
			if item, ok := m.roleCache[host]; ok {
				if time.Since(item.CachedAt) < 2*time.Minute {
					m.mu.RUnlock()
					return item.IsOwner, item.LoginUser
				}
			}
		}
		m.mu.RUnlock()

		bin := m.findTailscaleBin()
		cmdCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		defer cancel()

		cmd := exec.CommandContext(cmdCtx, bin, "whois", "--json", host)
		out, err := cmd.Output()
		if err == nil && len(out) > 0 {
			var whois WhoisResult
			if json.Unmarshal(out, &whois) == nil {
				loginName := whois.UserProfile.LoginName
				isSharee := whois.Node.Hostinfo.ShareeNode

				ownerEmail := os.Getenv("TINAPPLE_OWNER_EMAIL")
				if ownerEmail == "" {
					ownerEmail = "yatinrajesh77@gmail.com"
				}

				// Owner criteria: not a shared node, and matches owner email or account prefix
				owner := !isSharee && (strings.EqualFold(loginName, ownerEmail) || strings.HasPrefix(strings.ToLower(loginName), "yatinrajesh77@"))
				userStr := loginName
				if userStr == "" {
					userStr = whois.Node.Hostinfo.Hostname
				}

				m.mu.Lock()
				if m.roleCache == nil {
					m.roleCache = make(map[string]RoleCacheItem)
				}
				m.roleCache[host] = RoleCacheItem{
					IsOwner:   owner,
					LoginUser: userStr,
					CachedAt:  time.Now(),
				}
				m.mu.Unlock()

				return owner, userStr
			}
		}

		m.mu.Lock()
		if m.roleCache == nil {
			m.roleCache = make(map[string]RoleCacheItem)
		}
		m.roleCache[host] = RoleCacheItem{
			IsOwner:   false,
			LoginUser: "tailscale-guest",
			CachedAt:  time.Now(),
		}
		m.mu.Unlock()
		return false, "tailscale-guest"
	}

	return false, "external"
}

