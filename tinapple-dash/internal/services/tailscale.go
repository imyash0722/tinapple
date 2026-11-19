package services

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net"
	"os"
	"os/exec"
	"regexp"
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

// InvalidateRoleCache clears the cached whois roles so permissions changes apply immediately.
func (m *TailscaleManager) InvalidateRoleCache() {
	m.mu.Lock()
	m.roleCache = make(map[string]RoleCacheItem)
	m.mu.Unlock()
}

// CheckClientRole determines whether the given client IP is the system owner/admin or a guest/shared peer.
// Localhost and LAN IPs (home network) are considered owner access.
// Tailscale IPs are dynamically inspected via tailscale whois to check user identity and sharee status.
// Configured roles in rolesMgr (such as admin or owner) are honored for all Tailscale nodes.
func (m *TailscaleManager) CheckClientRole(ctx context.Context, rolesMgr *RolesManager, rawIP string) (isOwner bool, loginUser string) {
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
					ownerEmail = "imyash0722@gmail.com"
				}

				userStr := loginName
				if userStr == "" {
					userStr = whois.Node.Hostinfo.Hostname
				}

				// Check roles manager config for role assignment (admin, owner, viewer)
				role := "viewer"
				if rolesMgr != nil {
					role = rolesMgr.GetUserRole(loginName, ownerEmail)
				}

				// Owner/Admin criteria:
				// 1. Role is explicitly "owner" or "admin" in rolesMgr
				// 2. OR matches owner email (imyash0722@gmail.com, yatinrajesh77@gmail.com) and not a sharee
				owner := (role == "owner" || role == "admin") || (!isSharee && (strings.EqualFold(loginName, ownerEmail) || strings.HasPrefix(strings.ToLower(loginName), "imyash0722@") || strings.HasPrefix(strings.ToLower(loginName), "yatinrajesh77@")))

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
	ShareeNode   bool     `json:"ShareeNode"`
}

type tsWhoisResult struct {
	UserProfile struct {
		ID            int64  `json:"ID"`
		LoginName     string `json:"LoginName"`
		DisplayName   string `json:"DisplayName"`
		ProfilePicURL string `json:"ProfilePicURL"`
	} `json:"UserProfile"`
}

var (
	peerWhoisCache   = make(map[string]tsStatusUserItem)
	peerWhoisCacheMu sync.RWMutex
)

func lookupPeerWhois(ctx context.Context, bin string, ip string) *tsStatusUserItem {
	if ip == "" {
		return nil
	}

	peerWhoisCacheMu.RLock()
	if cached, ok := peerWhoisCache[ip]; ok && cached.LoginName != "" {
		peerWhoisCacheMu.RUnlock()
		return &cached
	}
	peerWhoisCacheMu.RUnlock()

	cmdCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	out, err := exec.CommandContext(cmdCtx, bin, "whois", "--json", ip).Output()
	if err != nil {
		return nil
	}

	var res tsWhoisResult
	if err := json.Unmarshal(out, &res); err != nil || res.UserProfile.LoginName == "" {
		return nil
	}

	item := tsStatusUserItem{
		ID:            res.UserProfile.ID,
		LoginName:     res.UserProfile.LoginName,
		DisplayName:   res.UserProfile.DisplayName,
		ProfilePicURL: res.UserProfile.ProfilePicURL,
	}

	peerWhoisCacheMu.Lock()
	peerWhoisCache[ip] = item
	peerWhoisCacheMu.Unlock()

	return &item
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
	if full.User == nil {
		full.User = make(map[string]tsStatusUserItem)
	}

	// 0. Discover external shared peers (e.g. imyashlinux@gmail.com) via whois
	for _, peer := range full.Peer {
		if peer.UserID == 0 {
			continue
		}
		userKey := fmt.Sprintf("%d", peer.UserID)
		if _, ok := full.User[userKey]; !ok {
			peerIP := ""
			if len(peer.TailscaleIPs) > 0 {
				peerIP = peer.TailscaleIPs[0]
			}
			if whois := lookupPeerWhois(ctx, bin, peerIP); whois != nil {
				full.User[userKey] = *whois
			}
		}
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
						} else if whois := lookupPeerWhois(ctx, bin, cleanIP); whois != nil {
							currentSession.LoginName = whois.LoginName
							currentSession.DisplayName = whois.DisplayName
							currentSession.Avatar = whois.ProfilePicURL
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

	seenLogins := make(map[string]bool)
	tailscaleUsers := make([]TailscaleUser, 0)
	for _, u := range full.User {
		cleanLogin := strings.TrimSpace(strings.ToLower(u.LoginName))
		if cleanLogin != "" {
			seenLogins[cleanLogin] = true
		}
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

	// 4. Also incorporate any users explicitly saved in roles config but offline
	cfg := rolesMgr.GetConfig()
	for login, role := range cfg.Roles {
		cleanLogin := strings.TrimSpace(strings.ToLower(login))
		if cleanLogin == "" || seenLogins[cleanLogin] {
			continue
		}
		seenLogins[cleanLogin] = true
		isOwner := (role == "owner")
		tailscaleUsers = append(tailscaleUsers, TailscaleUser{
			UserID:          0,
			LoginName:       login,
			DisplayName:     login,
			Avatar:          "",
			Role:            role,
			IsOwner:         isOwner,
			AllowedServices: rolesMgr.GetUserAllowedServices(login, role),
			Devices:         []DeviceInfo{},
		})
	}
	for _, adminLogin := range cfg.AdminAccounts {
		cleanLogin := strings.TrimSpace(strings.ToLower(adminLogin))
		if cleanLogin == "" || seenLogins[cleanLogin] {
			continue
		}
		seenLogins[cleanLogin] = true
		tailscaleUsers = append(tailscaleUsers, TailscaleUser{
			UserID:          0,
			LoginName:       adminLogin,
			DisplayName:     adminLogin,
			Avatar:          "",
			Role:            "admin",
			IsOwner:         false,
			AllowedServices: GetAllServiceIDs(),
			Devices:         []DeviceInfo{},
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

	cfg = rolesMgr.GetConfig()

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

type DetailedTailscalePeer struct {
	ID             string   `json:"id"`
	HostName       string   `json:"hostName"`
	DNSName        string   `json:"dnsName"`
	OS             string   `json:"os"`
	UserID         int64    `json:"userId"`
	TailscaleIPs   []string `json:"tailscaleIPs"`
	Online         bool     `json:"online"`
	ShareeNode     bool     `json:"shareeNode"`
	ExitNode       bool     `json:"exitNode"`
	ExitNodeOption bool     `json:"exitNodeOption"`
	Relay          string   `json:"relay,omitempty"`
	RxBytes        int64    `json:"rxBytes"`
	TxBytes        int64    `json:"txBytes"`
	LastSeen       string   `json:"lastSeen,omitempty"`
	Active         bool     `json:"active"`
	UserLogin      string   `json:"userLogin,omitempty"`
	UserName       string   `json:"userName,omitempty"`
	IsSelf         bool     `json:"isSelf"`
}

type DetailedTailscaleStatus struct {
	TailscaleStatus
	Self                DetailedTailscalePeer   `json:"self"`
	Peers               []DetailedTailscalePeer `json:"peers"`
	ExitNode            string                  `json:"exitNode"`
	ExitNodeAllowLAN    bool                    `json:"exitNodeAllowLan"`
	AdvertiseExitNode   bool                    `json:"advertiseExitNode"`
	ExitNodeApproved    bool                    `json:"exitNodeApproved"`
	AlwaysOnExitNode    bool                    `json:"alwaysOnExitNode"`
	SSH                 bool                    `json:"ssh"`
	ShieldsUp           bool                    `json:"shieldsUp"`
	AcceptRoutes        bool                    `json:"acceptRoutes"`
	PreferredDERP       int                     `json:"preferredDerp"`
	PreferredDERPRegion string                  `json:"preferredDerpRegion,omitempty"`
	HealthWarnings      []string                `json:"healthWarnings"`
}

type TailscaleNetcheckResult struct {
	Now               string             `json:"now"`
	UDP               bool               `json:"udp"`
	IPv4              bool               `json:"ipv4"`
	IPv6              bool               `json:"ipv6"`
	PreferredDERP     int                `json:"preferredDerp"`
	PreferredDERPName string             `json:"preferredDerpName,omitempty"`
	CaptivePortal     bool               `json:"captivePortal"`
	GlobalV4          string             `json:"globalV4,omitempty"`
	GlobalV6          string             `json:"globalV6,omitempty"`
	RegionLatency     map[string]float64 `json:"regionLatency"` // in ms
}

type TailscalePrefsReq struct {
	ExitNode          *string `json:"exitNode,omitempty"`
	ExitNodeAllowLAN  *bool   `json:"exitNodeAllowLan,omitempty"`
	AdvertiseExitNode *bool   `json:"advertiseExitNode,omitempty"`
	AlwaysOnExitNode  *bool   `json:"alwaysOnExitNode,omitempty"`
	SSH               *bool   `json:"ssh,omitempty"`
	ShieldsUp         *bool   `json:"shieldsUp,omitempty"`
	AcceptRoutes      *bool   `json:"acceptRoutes,omitempty"`
}

const tailscalePrefsFile = "/var/lib/tinapple/tailscale_prefs.json"

type persistentTailscalePrefs struct {
	AlwaysOnExitNode bool `json:"always_on_exit_node"`
}

func readPersistentPrefs() persistentTailscalePrefs {
	data, err := os.ReadFile(tailscalePrefsFile)
	if err != nil {
		return persistentTailscalePrefs{AlwaysOnExitNode: true}
	}
	var p persistentTailscalePrefs
	if err := json.Unmarshal(data, &p); err != nil {
		return persistentTailscalePrefs{AlwaysOnExitNode: true}
	}
	return p
}

func savePersistentPrefs(p persistentTailscalePrefs) error {
	_ = os.MkdirAll("/var/lib/tinapple", 0755)
	data, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(tailscalePrefsFile, data, 0644)
}

type TailscalePingResult struct {
	Target  string  `json:"target"`
	Success bool    `json:"success"`
	Latency string  `json:"latency"`
	Ms      float64 `json:"ms"`
	Output  string  `json:"output"`
}

var derpRegions = map[int]string{
	1:  "New York City (US)",
	2:  "San Francisco (US)",
	3:  "Singapore (SG)",
	4:  "Frankfurt (DE)",
	5:  "Sydney (AU)",
	6:  "Bangalore (IN)",
	7:  "Tokyo (JP)",
	8:  "London (UK)",
	9:  "Dallas (US)",
	10: "Seattle (US)",
	11: "Sao Paulo (BR)",
	12: "Paris (FR)",
	13: "Toronto (CA)",
	14: "Warsaw (PL)",
	15: "Nairobi (KE)",
	16: "Johannesburg (ZA)",
	17: "Dubai (AE)",
	18: "Tel Aviv (IL)",
	19: "Madrid (ES)",
	20: "Mumbai (IN)",
	21: "Chicago (US)",
	22: "Amsterdam (NL)",
	23: "Hong Kong (HK)",
	24: "Miami (US)",
	25: "Los Angeles (US)",
	26: "Denver (US)",
	27: "Zurich (CH)",
	28: "Osaka (JP)",
}

func GetDERPRegionName(id int) string {
	if name, ok := derpRegions[id]; ok {
		return name
	}
	return fmt.Sprintf("Region %d", id)
}

func (m *TailscaleManager) GetDetailedStatus(ctx context.Context) (*DetailedTailscaleStatus, error) {
	bin := m.findTailscaleBin()

	cmdCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	cmd := exec.CommandContext(cmdCtx, bin, "status", "--json")
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	type rawDetailedStatus struct {
		Version      string   `json:"Version"`
		BackendState string   `json:"BackendState"`
		AuthURL      string   `json:"AuthURL"`
		TailscaleIPs []string `json:"TailscaleIPs"`
		Self         struct {
			ID             string   `json:"ID"`
			HostName       string   `json:"HostName"`
			DNSName        string   `json:"DNSName"`
			OS             string   `json:"OS"`
			UserID         int64    `json:"UserID"`
			TailscaleIPs   []string `json:"TailscaleIPs"`
			AllowedIPs     []string `json:"AllowedIPs"`
			Online         bool     `json:"Online"`
			ExitNode       bool     `json:"ExitNode"`
			ExitNodeOption bool     `json:"ExitNodeOption"`
			Relay          string   `json:"Relay"`
			RxBytes        int64    `json:"RxBytes"`
			TxBytes        int64    `json:"TxBytes"`
		} `json:"Self"`
		Peer map[string]struct {
			ID             string   `json:"ID"`
			HostName       string   `json:"HostName"`
			DNSName        string   `json:"DNSName"`
			OS             string   `json:"OS"`
			UserID         int64    `json:"UserID"`
			TailscaleIPs   []string `json:"TailscaleIPs"`
			Online         bool     `json:"Online"`
			ShareeNode     bool     `json:"ShareeNode"`
			ExitNode       bool     `json:"ExitNode"`
			ExitNodeOption bool     `json:"ExitNodeOption"`
			Relay          string   `json:"Relay"`
			RxBytes        int64    `json:"RxBytes"`
			TxBytes        int64    `json:"TxBytes"`
			LastSeen       string   `json:"LastSeen"`
			Active         bool     `json:"Active"`
		} `json:"Peer"`
		User           map[string]tsStatusUserItem `json:"User"`
		CurrentTailnet *struct {
			Name string `json:"Name"`
		} `json:"CurrentTailnet"`
		Health []string `json:"Health"`
	}

	var raw rawDetailedStatus
	if err := json.Unmarshal(out, &raw); err != nil {
		return nil, err
	}

	res := &DetailedTailscaleStatus{
		TailscaleStatus: TailscaleStatus{
			Installed:    true,
			Running:      raw.BackendState == "Running",
			BackendState: raw.BackendState,
			AuthURL:      raw.AuthURL,
			TailscaleIPs: raw.TailscaleIPs,
			DNSName:      strings.TrimSuffix(raw.Self.DNSName, "."),
			HostName:     raw.Self.HostName,
			Online:       raw.Self.Online,
			Version:      raw.Version,
		},
		HealthWarnings: raw.Health,
		Peers:          make([]DetailedTailscalePeer, 0),
	}
	if raw.CurrentTailnet != nil {
		res.Tailnet = raw.CurrentTailnet.Name
	}

	res.Self = DetailedTailscalePeer{
		ID:             raw.Self.ID,
		HostName:       raw.Self.HostName,
		DNSName:        strings.TrimSuffix(raw.Self.DNSName, "."),
		OS:             raw.Self.OS,
		UserID:         raw.Self.UserID,
		TailscaleIPs:   raw.Self.TailscaleIPs,
		Online:         raw.Self.Online,
		ExitNode:       raw.Self.ExitNode,
		ExitNodeOption: raw.Self.ExitNodeOption,
		Relay:          raw.Self.Relay,
		RxBytes:        raw.Self.RxBytes,
		TxBytes:        raw.Self.TxBytes,
		IsSelf:         true,
	}
	if u, ok := raw.User[fmt.Sprintf("%d", raw.Self.UserID)]; ok {
		res.Self.UserLogin = u.LoginName
		res.Self.UserName = u.DisplayName
	}

	for _, p := range raw.Peer {
		peer := DetailedTailscalePeer{
			ID:             p.ID,
			HostName:       p.HostName,
			DNSName:        strings.TrimSuffix(p.DNSName, "."),
			OS:             p.OS,
			UserID:         p.UserID,
			TailscaleIPs:   p.TailscaleIPs,
			Online:         p.Online,
			ShareeNode:     p.ShareeNode,
			ExitNode:       p.ExitNode,
			ExitNodeOption: p.ExitNodeOption,
			Relay:          p.Relay,
			RxBytes:        p.RxBytes,
			TxBytes:        p.TxBytes,
			LastSeen:       p.LastSeen,
			Active:         p.Active,
			IsSelf:         false,
		}
		if u, ok := raw.User[fmt.Sprintf("%d", p.UserID)]; ok {
			peer.UserLogin = u.LoginName
			peer.UserName = u.DisplayName
		}
		res.Peers = append(res.Peers, peer)
	}

	// Read preferences via tailscale debug prefs
	prefsCmd := exec.CommandContext(cmdCtx, bin, "debug", "prefs")
	if prefsOut, err := prefsCmd.Output(); err == nil {
		type rawPrefs struct {
			ExitNodeIP             string   `json:"ExitNodeIP"`
			ExitNodeAllowLANAccess bool     `json:"ExitNodeAllowLANAccess"`
			RunSSH                 bool     `json:"RunSSH"`
			ShieldsUp              bool     `json:"ShieldsUp"`
			RouteAll               bool     `json:"RouteAll"`
			AdvertiseRoutes        []string `json:"AdvertiseRoutes"`
		}
		var p rawPrefs
		if json.Unmarshal(prefsOut, &p) == nil {
			res.ExitNode = p.ExitNodeIP
			res.ExitNodeAllowLAN = p.ExitNodeAllowLANAccess
			res.SSH = p.RunSSH
			res.ShieldsUp = p.ShieldsUp
			res.AcceptRoutes = p.RouteAll
			for _, r := range p.AdvertiseRoutes {
				if r == "0.0.0.0/0" || r == "::/0" {
					res.AdvertiseExitNode = true
					break
				}
			}
		}
	}

	pPrefs := readPersistentPrefs()
	res.AlwaysOnExitNode = pPrefs.AlwaysOnExitNode
	if res.AdvertiseExitNode {
		for _, ip := range raw.Self.AllowedIPs {
			if ip == "0.0.0.0/0" || ip == "::/0" {
				res.ExitNodeApproved = true
				break
			}
		}
		if raw.Self.ExitNodeOption {
			res.ExitNodeApproved = true
		}
	}

	return res, nil
}

var (
	netcheckCacheMu sync.RWMutex
	cachedNetcheck  *TailscaleNetcheckResult
	cachedNetcheckAt time.Time
)

func (m *TailscaleManager) Netcheck(ctx context.Context, force bool) (*TailscaleNetcheckResult, error) {
	netcheckCacheMu.RLock()
	if !force && cachedNetcheck != nil && time.Since(cachedNetcheckAt) < 15*time.Second {
		cpy := *cachedNetcheck
		netcheckCacheMu.RUnlock()
		return &cpy, nil
	}
	netcheckCacheMu.RUnlock()

	bin := m.findTailscaleBin()
	cmdCtx, cancel := context.WithTimeout(ctx, 12*time.Second)
	defer cancel()

	cmd := exec.CommandContext(cmdCtx, bin, "netcheck", "--format", "json")
	out, err := cmd.CombinedOutput()
	if err != nil && len(out) == 0 {
		return nil, fmt.Errorf("tailscale netcheck failed: %v", err)
	}

	// Extract JSON block (skip leading warning/log lines)
	strOut := string(out)
	braceIdx := strings.Index(strOut, "{")
	if braceIdx == -1 {
		return nil, fmt.Errorf("invalid netcheck json output: %s", strOut)
	}
	jsonStr := strOut[braceIdx:]

	type rawNetcheck struct {
		Now           string            `json:"Now"`
		UDP           bool              `json:"UDP"`
		IPv4          bool              `json:"IPv4"`
		IPv6          bool              `json:"IPv6"`
		PreferredDERP int               `json:"PreferredDERP"`
		CaptivePortal bool              `json:"CaptivePortal"`
		GlobalV4      string            `json:"GlobalV4"`
		GlobalV6      string            `json:"GlobalV6"`
		RegionLatency map[string]int64  `json:"RegionLatency"`
	}

	var raw rawNetcheck
	if err := json.Unmarshal([]byte(jsonStr), &raw); err != nil {
		return nil, fmt.Errorf("failed to parse netcheck json: %v", err)
	}

	latencies := make(map[string]float64)
	for reg, ns := range raw.RegionLatency {
		latencies[reg] = float64(ns) / 1000000.0 // convert to milliseconds
	}

	report := &TailscaleNetcheckResult{
		Now:               raw.Now,
		UDP:               raw.UDP,
		IPv4:              raw.IPv4,
		IPv6:              raw.IPv6,
		PreferredDERP:     raw.PreferredDERP,
		PreferredDERPName: GetDERPRegionName(raw.PreferredDERP),
		CaptivePortal:     raw.CaptivePortal,
		GlobalV4:          raw.GlobalV4,
		GlobalV6:          raw.GlobalV6,
		RegionLatency:     latencies,
	}

	netcheckCacheMu.Lock()
	cachedNetcheck = report
	cachedNetcheckAt = time.Now()
	netcheckCacheMu.Unlock()

	return report, nil
}

func (m *TailscaleManager) SetPrefs(ctx context.Context, prefs TailscalePrefsReq) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	bin := m.findTailscaleBin()
	var args []string
	args = append(args, "set")

	if prefs.AlwaysOnExitNode != nil {
		p := readPersistentPrefs()
		p.AlwaysOnExitNode = *prefs.AlwaysOnExitNode
		_ = savePersistentPrefs(p)
		if *prefs.AlwaysOnExitNode {
			adv := true
			prefs.AdvertiseExitNode = &adv
		}
	} else if prefs.AdvertiseExitNode != nil && !*prefs.AdvertiseExitNode {
		p := readPersistentPrefs()
		p.AlwaysOnExitNode = false
		_ = savePersistentPrefs(p)
	}

	if prefs.ExitNode != nil {
		args = append(args, fmt.Sprintf("--exit-node=%s", *prefs.ExitNode))
	}
	if prefs.ExitNodeAllowLAN != nil {
		args = append(args, fmt.Sprintf("--exit-node-allow-lan-access=%t", *prefs.ExitNodeAllowLAN))
	}
	if prefs.AdvertiseExitNode != nil {
		args = append(args, fmt.Sprintf("--advertise-exit-node=%t", *prefs.AdvertiseExitNode))
	}
	if prefs.SSH != nil {
		args = append(args, fmt.Sprintf("--ssh=%t", *prefs.SSH))
	}
	if prefs.ShieldsUp != nil {
		args = append(args, fmt.Sprintf("--shields-up=%t", *prefs.ShieldsUp))
	}
	if prefs.AcceptRoutes != nil {
		args = append(args, fmt.Sprintf("--accept-routes=%t", *prefs.AcceptRoutes))
	}

	if len(args) == 1 {
		return nil
	}

	cmd := exec.CommandContext(ctx, bin, args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to apply tailscale settings: %s (%v)", strings.TrimSpace(string(out)), err)
	}
	return nil
}

var pingMsRegex = regexp.MustCompile(`in\s+([0-9.]+)(ms|µs|s)`)

func (m *TailscaleManager) PingPeer(ctx context.Context, target string) (*TailscalePingResult, error) {
	bin := m.findTailscaleBin()
	target = strings.TrimSpace(target)
	if target == "" {
		return nil, fmt.Errorf("empty ping target")
	}

	cmdCtx, cancel := context.WithTimeout(ctx, 4*time.Second)
	defer cancel()

	cmd := exec.CommandContext(cmdCtx, bin, "ping", "--timeout=3s", "-c", "2", target)
	out, err := cmd.CombinedOutput()
	strOut := string(out)

	res := &TailscalePingResult{
		Target: target,
		Output: strings.TrimSpace(strOut),
	}

	if err != nil && !strings.Contains(strOut, "pong from") {
		res.Success = false
		res.Latency = "unreachable"
		return res, nil
	}

	res.Success = true
	match := pingMsRegex.FindStringSubmatch(strOut)
	if len(match) >= 3 {
		res.Latency = match[1] + match[2]
		var val float64
		_, _ = fmt.Sscanf(match[1], "%f", &val)
		if match[2] == "s" {
			res.Ms = val * 1000
		} else if match[2] == "µs" {
			res.Ms = val / 1000
		} else {
			res.Ms = val
		}
	} else {
		res.Latency = "connected"
	}

	return res, nil
}



