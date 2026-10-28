package services

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

type RolesConfig struct {
	AdminAccounts        []string            `json:"admin_accounts"`
	Roles                map[string]string   `json:"roles"` // login_name -> "admin" | "viewer"
	DefaultRole          string              `json:"default_role"`
	UserPermissions      map[string][]string `json:"user_permissions"` // login_name -> []service_id
	DefaultPermissions   []string            `json:"default_permissions"`
	HideTorExitForGuests bool                `json:"hide_tor_exit_for_guests"`
}

type AvailableService struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Icon        string `json:"icon"`
	Description string `json:"description"`
}

type DeviceInfo struct {
	Name   string `json:"name"`
	IP     string `json:"ip"`
	OS     string `json:"os"`
	Online bool   `json:"online"`
}

type TailscaleUser struct {
	UserID          int64        `json:"user_id"`
	LoginName       string       `json:"login_name"`
	DisplayName     string       `json:"display_name"`
	Avatar          string       `json:"avatar"`
	Role            string       `json:"role"` // "owner", "admin", "viewer"
	IsOwner         bool         `json:"is_owner"`
	AllowedServices []string     `json:"allowed_services"`
	Devices         []DeviceInfo `json:"devices"`
}

type CurrentUserSession struct {
	UserID          int64    `json:"user_id,omitempty"`
	LoginName       string   `json:"login_name"`
	DisplayName     string   `json:"display_name"`
	Avatar          string   `json:"avatar,omitempty"`
	DeviceName      string   `json:"device_name,omitempty"`
	DeviceIP        string   `json:"device_ip"`
	Role            string   `json:"role"` // "owner", "admin", "viewer"
	IsOwner         bool     `json:"is_owner"`
	IsTailscale     bool     `json:"is_tailscale"`
	AllowedServices []string `json:"allowed_services"`
}

type UserManagementPayload struct {
	CurrentUser          CurrentUserSession `json:"current_user"`
	TailscaleUsers       []TailscaleUser    `json:"tailscale_users"`
	RolesConfig          RolesConfig        `json:"roles_config"`
	CanManageRoles       bool               `json:"can_manage_roles"`
	CanManageSiteAccess  bool               `json:"can_manage_site_access"`
	AvailableServices    []AvailableService `json:"available_services"`
	HideTorExitForGuests bool               `json:"hide_tor_exit_for_guests"`
}

var DefaultApplianceServices = []AvailableService{
	{ID: "jellyfin", Name: "Jellyfin Media", Icon: "🎬", Description: "Hardware-accelerated movie, TV, and media streaming"},
	{ID: "suwayomi", Name: "Suwayomi Manga", Icon: "📖", Description: "Self-hosted Tachiyomi manga and comic reader"},
	{ID: "qbittorrent", Name: "qBittorrent", Icon: "📥", Description: "High-throughput BitTorrent download client"},
	{ID: "filebrowser", Name: "FileBrowser", Icon: "📁", Description: "Web file manager and multi-drive storage vault"},
	{ID: "syncthing", Name: "Syncthing Sync", Icon: "🔄", Description: "Continuous continuous peer-to-peer file synchronization"},
	{ID: "navidrome", Name: "Navidrome Music", Icon: "🎵", Description: "Lightweight Subsonic-compatible music streaming"},
	{ID: "adguard", Name: "AdGuard Home", Icon: "🛡️", Description: "Network-wide DNS ad-blocking and privacy filtering"},
	{ID: "vaultwarden", Name: "Vaultwarden", Icon: "🔐", Description: "Bitwarden-compatible private password manager"},
	{ID: "radarr", Name: "Radarr Movies", Icon: "🎥", Description: "Automated movie library management and acquisition"},
	{ID: "sonarr", Name: "Sonarr TV", Icon: "📺", Description: "Automated TV show and episodic series manager"},
	{ID: "prowlarr", Name: "Prowlarr Indexer", Icon: "🔍", Description: "Centralized torrent indexer and tracker manager"},
	{ID: "seerr", Name: "Jellyseerr", Icon: "🍿", Description: "User media request management and auto-approval"},
	{ID: "metube", Name: "MeTube Downloader", Icon: "📹", Description: "Web GUI for yt-dlp video downloading"},
	{ID: "tor", Name: "Tor Privacy Proxy", Icon: "🧅", Description: "Tor SOCKS5 onion routing and exit proxy"},
	{ID: "cockpit", Name: "Cockpit Console", Icon: "⚙️", Description: "RedHat Cockpit system performance and terminal admin"},
	{ID: "truenas", Name: "TrueNAS Vault", Icon: "🗄️", Description: "ZFS dataset and TrueNAS Syncthing storage bridge"},
}

func GetAllServiceIDs() []string {
	ids := make([]string, len(DefaultApplianceServices))
	for i, s := range DefaultApplianceServices {
		ids[i] = s.ID
	}
	return ids
}

type RolesManager struct {
	mu       sync.RWMutex
	filePath string
	config   RolesConfig
}

func NewRolesManager() *RolesManager {
	filePath := "/etc/tinapple/roles.json"
	// Check if directory exists or can be created, otherwise use local fallback
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		filePath = "./data/roles.json"
		_ = os.MkdirAll("./data", 0755)
	}

	rm := &RolesManager{
		filePath: filePath,
		config: RolesConfig{
			AdminAccounts:        []string{},
			Roles:                make(map[string]string),
			DefaultRole:          "viewer",
			UserPermissions:      make(map[string][]string),
			DefaultPermissions:   GetAllServiceIDs(),
			HideTorExitForGuests: true,
		},
	}

	rm.load()
	return rm
}

func (rm *RolesManager) load() {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	data, err := os.ReadFile(rm.filePath)
	if err != nil {
		return
	}

	var loaded RolesConfig
	if err := json.Unmarshal(data, &loaded); err != nil {
		return
	}

	if loaded.AdminAccounts == nil {
		loaded.AdminAccounts = []string{}
	}
	if loaded.Roles == nil {
		loaded.Roles = make(map[string]string)
	}
	if loaded.DefaultRole == "" {
		loaded.DefaultRole = "viewer"
	}
	if loaded.UserPermissions == nil {
		loaded.UserPermissions = make(map[string][]string)
	}
	if len(loaded.DefaultPermissions) == 0 {
		loaded.DefaultPermissions = GetAllServiceIDs()
	}

	rm.config = loaded
}

func (rm *RolesManager) GetConfig() RolesConfig {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	// Return a copy
	res := rm.config
	res.AdminAccounts = append([]string{}, rm.config.AdminAccounts...)
	res.DefaultPermissions = append([]string{}, rm.config.DefaultPermissions...)

	res.Roles = make(map[string]string)
	for k, v := range rm.config.Roles {
		res.Roles[k] = v
	}

	res.UserPermissions = make(map[string][]string)
	for k, v := range rm.config.UserPermissions {
		res.UserPermissions[k] = append([]string{}, v...)
	}

	return res
}

func (rm *RolesManager) SaveConfig(cfg RolesConfig) error {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}

	dir := filepath.Dir(rm.filePath)
	_ = os.MkdirAll(dir, 0755)

	if err := os.WriteFile(rm.filePath, data, 0644); err != nil {
		return err
	}

	rm.config = cfg
	return nil
}

func (rm *RolesManager) GetUserRole(loginName string, hostOwnerLogin string) string {
	cleanLogin := strings.TrimSpace(strings.ToLower(loginName))
	cleanOwner := strings.TrimSpace(strings.ToLower(hostOwnerLogin))

	if cleanLogin != "" && cleanOwner != "" && cleanLogin == cleanOwner {
		return "owner"
	}

	rm.mu.RLock()
	defer rm.mu.RUnlock()

	if role, ok := rm.config.Roles[cleanLogin]; ok && role != "" {
		return role
	}

	for _, admin := range rm.config.AdminAccounts {
		if strings.EqualFold(admin, cleanLogin) {
			return "admin"
		}
	}

	if rm.config.DefaultRole != "" {
		return rm.config.DefaultRole
	}

	return "viewer"
}

func (rm *RolesManager) GetUserAllowedServices(loginName string, role string) []string {
	if role == "owner" || role == "admin" {
		return GetAllServiceIDs()
	}

	rm.mu.RLock()
	defer rm.mu.RUnlock()

	cleanLogin := strings.TrimSpace(strings.ToLower(loginName))
	if perms, ok := rm.config.UserPermissions[cleanLogin]; ok && len(perms) > 0 {
		return perms
	}

	if len(rm.config.DefaultPermissions) > 0 {
		return rm.config.DefaultPermissions
	}

	return GetAllServiceIDs()
}

func (rm *RolesManager) UpdateUserRole(targetUser string, newRole string, hostOwnerLogin string) error {
	cleanTarget := strings.TrimSpace(strings.ToLower(targetUser))
	cleanOwner := strings.TrimSpace(strings.ToLower(hostOwnerLogin))

	if newRole != "admin" && newRole != "viewer" {
		return fmt.Errorf("invalid role: must be 'admin' or 'viewer'")
	}

	if cleanTarget == cleanOwner {
		return fmt.Errorf("cannot modify the host Owner role")
	}

	cfg := rm.GetConfig()

	// Update roles map
	cfg.Roles[cleanTarget] = newRole

	// Sync admin accounts list
	newAdmins := make([]string, 0)
	for _, a := range cfg.AdminAccounts {
		if !strings.EqualFold(a, cleanTarget) {
			newAdmins = append(newAdmins, a)
		}
	}
	if newRole == "admin" {
		newAdmins = append(newAdmins, cleanTarget)
	}
	cfg.AdminAccounts = newAdmins

	return rm.SaveConfig(cfg)
}

func (rm *RolesManager) UpdateUserPermissions(targetUser string, allowedServices []string, hostOwnerLogin string) ([]string, error) {
	cleanTarget := strings.TrimSpace(strings.ToLower(targetUser))
	cleanOwner := strings.TrimSpace(strings.ToLower(hostOwnerLogin))

	if cleanTarget == cleanOwner {
		return nil, fmt.Errorf("cannot modify service permissions for the host Owner")
	}

	allIds := GetAllServiceIDs()
	validSet := make(map[string]bool)
	for _, id := range allIds {
		validSet[id] = true
	}

	sanitized := make([]string, 0)
	for _, svc := range allowedServices {
		svc = strings.TrimSpace(strings.ToLower(svc))
		if validSet[svc] {
			sanitized = append(sanitized, svc)
		}
	}

	cfg := rm.GetConfig()
	cfg.UserPermissions[cleanTarget] = sanitized

	if err := rm.SaveConfig(cfg); err != nil {
		return nil, err
	}

	return sanitized, nil
}

func (rm *RolesManager) UpdateGuestTorExitPolicy(hide bool) bool {
	cfg := rm.GetConfig()
	cfg.HideTorExitForGuests = hide
	_ = rm.SaveConfig(cfg)
	return hide
}
