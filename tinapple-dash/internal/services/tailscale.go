package services

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
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

type tsStatusUserItem struct {
	ID            int64  `json:"ID"`
	LoginName     string `json:"LoginName"`
	DisplayName   string `json:"DisplayName"`
	ProfilePicURL string `json:"ProfilePicURL"`
}

type tsStatusPeerItem struct {
	ID           string   `json:"ID"`
	HostName     string   `json:"HostName"`
	DNSName      string   `json:"DNSName"`
	OS           string   `json:"OS"`
	UserID       int64    `json:"UserID"`
	TailscaleIPs []string `json:"TailscaleIPs"`
	Online       bool     `json:"Online"`
}

type fullTailscaleStatus struct {
	Self struct {
		ID           string   `json:"ID"`
		HostName     string   `json:"HostName"`
		DNSName      string   `json:"DNSName"`
		OS           string   `json:"OS"`
		UserID       int64    `json:"UserID"`
		TailscaleIPs []string `json:"TailscaleIPs"`
		Online       bool     `json:"Online"`
	} `json:"Self"`
	User map[string]tsStatusUserItem `json:"User"`
	Peer map[string]tsStatusPeerItem `json:"Peer"`
}

func (m *TailscaleManager) GetUserManagementData(ctx context.Context, rolesMgr *RolesManager, rawIP string) (*UserManagementPayload, error) {
	bin := m.findTailscaleBin()
	cmdCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	cmd := exec.CommandContext(cmdCtx, bin, "status", "--json")
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	var full fullTailscaleStatus
	if err := json.Unmarshal(out, &full); err != nil {
		return nil, err
	}

	// 1. Identify Host Owner
	hostOwnerUserID := full.Self.UserID
	var hostOwnerLogin string
	if ownerUser, ok := full.User[fmt.Sprintf("%d", hostOwnerUserID)]; ok {
		hostOwnerLogin = ownerUser.LoginName
	}
	if hostOwnerLogin == "" {
		hostOwnerLogin = os.Getenv("TINAPPLE_OWNER_EMAIL")
	}

	// 2. Identify Current Client
	cleanIP := strings.TrimSpace(rawIP)
	if h, _, err := net.SplitHostPort(cleanIP); err == nil {
		cleanIP = h
	}
	cleanIP = strings.Trim(cleanIP, "[]")
	parsedIP := net.ParseIP(cleanIP)

	currentSession := CurrentUserSession{
		DeviceIP:    cleanIP,
		Role:        "viewer",
		IsOwner:     false,
		IsTailscale: false,
	}

	isLoopback := parsedIP != nil && (parsedIP.IsLoopback() || cleanIP == "127.0.0.1" || cleanIP == "::1")
	isLan := parsedIP != nil && !isTailscaleIP(parsedIP) && isPrivateLAN(parsedIP)

	if isLoopback || isLan {
		currentSession.IsOwner = true
		currentSession.Role = "owner"
		currentSession.LoginName = hostOwnerLogin
		currentSession.DisplayName = "Node Host Owner"
		currentSession.AllowedServices = GetAllServiceIDs()
	} else if parsedIP != nil && isTailscaleIP(parsedIP) {
		currentSession.IsTailscale = true
		// Search in Self or Peers
		foundUser := false
		for _, ipStr := range full.Self.TailscaleIPs {
			if ipStr == cleanIP {
				currentSession.UserID = full.Self.UserID
				currentSession.DeviceName = full.Self.HostName
				if u, ok := full.User[fmt.Sprintf("%d", full.Self.UserID)]; ok {
					currentSession.LoginName = u.LoginName
					currentSession.DisplayName = u.DisplayName
					currentSession.Avatar = u.ProfilePicURL
				}
				foundUser = true
				break
			}
		}

		if !foundUser {
			for _, peer := range full.Peer {
				for _, ipStr := range peer.TailscaleIPs {
					if ipStr == cleanIP {
						currentSession.UserID = peer.UserID
						currentSession.DeviceName = peer.HostName
						if u, ok := full.User[fmt.Sprintf("%d", peer.UserID)]; ok {
							currentSession.LoginName = u.LoginName
							currentSession.DisplayName = u.DisplayName
							currentSession.Avatar = u.ProfilePicURL
						}
						foundUser = true
						break
					}
				}
				if foundUser {
					break
				}
			}
		}

		role := rolesMgr.GetUserRole(currentSession.LoginName, hostOwnerLogin)
		currentSession.Role = role
		currentSession.IsOwner = (role == "owner")
		currentSession.AllowedServices = rolesMgr.GetUserAllowedServices(currentSession.LoginName, role)
	}

	// 3. Build User List & Aggregate Peer Devices
	userDevicesMap := make(map[int64][]DeviceInfo)

	// Add self device
	selfIP := ""
	if len(full.Self.TailscaleIPs) > 0 {
		selfIP = full.Self.TailscaleIPs[0]
	}
	userDevicesMap[full.Self.UserID] = append(userDevicesMap[full.Self.UserID], DeviceInfo{
		Name:   full.Self.HostName,
		IP:     selfIP,
		OS:     full.Self.OS,
		Online: full.Self.Online,
	})

	// Add peer devices
	for _, peer := range full.Peer {
		peerIP := ""
		if len(peer.TailscaleIPs) > 0 {
			peerIP = peer.TailscaleIPs[0]
		}
		userDevicesMap[peer.UserID] = append(userDevicesMap[peer.UserID], DeviceInfo{
			Name:   peer.HostName,
			IP:     peerIP,
			OS:     peer.OS,
			Online: peer.Online,
		})
	}

	tailscaleUsers := make([]TailscaleUser, 0)
	for _, u := range full.User {
		role := rolesMgr.GetUserRole(u.LoginName, hostOwnerLogin)
		isOwner := (role == "owner") || (u.ID == hostOwnerUserID)
		if isOwner {
			role = "owner"
		}

		devices := userDevicesMap[u.ID]
		if devices == nil {
			devices = []DeviceInfo{}
		}

		tailscaleUsers = append(tailscaleUsers, TailscaleUser{
			UserID:          u.ID,
			LoginName:       u.LoginName,
			DisplayName:     u.DisplayName,
			Avatar:          u.ProfilePicURL,
			Role:            role,
			IsOwner:         isOwner,
			AllowedServices: rolesMgr.GetUserAllowedServices(u.LoginName, role),
			Devices:         devices,
		})
	}

	// Sort: Owner first, then Admins, then Viewers
	rolesOrder := map[string]int{"owner": 0, "admin": 1, "viewer": 2}
	for i := 0; i < len(tailscaleUsers)-1; i++ {
		for j := i + 1; j < len(tailscaleUsers); j++ {
			if rolesOrder[tailscaleUsers[i].Role] > rolesOrder[tailscaleUsers[j].Role] {
				tailscaleUsers[i], tailscaleUsers[j] = tailscaleUsers[j], tailscaleUsers[i]
			}
		}
	}

	cfg := rolesMgr.GetConfig()

	payload := &UserManagementPayload{
		CurrentUser:          currentSession,
		TailscaleUsers:       tailscaleUsers,
		RolesConfig:          cfg,
		CanManageRoles:       currentSession.IsOwner,
		CanManageSiteAccess:  currentSession.IsOwner || currentSession.Role == "admin",
		AvailableServices:    DefaultApplianceServices,
		HideTorExitForGuests: cfg.HideTorExitForGuests,
	}

	return payload, nil
}


