package services

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

func getSystemPrimaryUser() (string, string) {
	if u, err := user.LookupId("1000"); err == nil && u.Username != "" {
		return u.Username, u.HomeDir
	}
	if entries, err := os.ReadDir("/home"); err == nil {
		for _, e := range entries {
			if e.IsDir() && e.Name() != "lost+found" {
				return e.Name(), filepath.Join("/home", e.Name())
			}
		}
	}
	if _, err := user.Lookup("pineapple"); err == nil {
		return "pineapple", "/home/pineapple"
	}
	return "tinapple", "/home/tinapple"
}

type AppDefinition struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Description  string `json:"description"`
	Tagline      string `json:"tagline"`
	Category     string `json:"category"`
	Package      string `json:"package"`
	Unit         string `json:"unit"`
	Binary       string `json:"binary"`
	Port         int    `json:"port"`
	Icon         string `json:"icon"`
	AccentColor  string `json:"accentColor"`
	ConfigPath   string `json:"configPath"`
	WebURL       string `json:"webUrl,omitempty"`
	ClientAppURL string `json:"clientAppUrl,omitempty"`
}

type AppStatus struct {
	AppDefinition
	Installed   bool              `json:"installed"`
	Running     bool              `json:"running"`
	Status      string            `json:"status"` // "running", "stopped", "not_installed", "failed"
	LoadState   string            `json:"loadState"`
	ActiveState string            `json:"activeState"`
	SubState    string            `json:"subState"`
	Enabled     bool              `json:"enabled"`
	Config      map[string]string `json:"config,omitempty"`
}

type InstallLogMessage struct {
	Timestamp string `json:"timestamp"`
	Level     string `json:"level"` // "info", "command", "warn", "error", "success"
	AppID     string `json:"appId"`
	Message   string `json:"message"`
}

type InstallProgressState struct {
	Status    string              `json:"status"` // "idle", "running", "success", "error"
	ActiveApp string              `json:"activeApp"`
	AppName   string              `json:"appName,omitempty"`
	Logs      []InstallLogMessage `json:"logs"`
}

type AppManager struct {
	mu          sync.RWMutex
	operationMu sync.Mutex
	apps        map[string]AppDefinition
	appOrder    []string
	cacheMu     sync.RWMutex
	cachedAt    time.Time
	cachedList  []AppStatus

	// Real-time Install Logger & PubSub
	logMu       sync.RWMutex
	logState    InstallProgressState
	logSubChans map[chan InstallLogMessage]struct{}
}

func NewAppManager() *AppManager {
	primaryUser, primaryHome := getSystemPrimaryUser()

	mgr := &AppManager{
		apps:        make(map[string]AppDefinition),
		appOrder:    make([]string, 0),
		logSubChans: make(map[chan InstallLogMessage]struct{}),
		logState: InstallProgressState{
			Status: "idle",
			Logs:   make([]InstallLogMessage, 0),
		},
	}

	definitions := []AppDefinition{
		{
			ID:          "jellyfin",
			Name:        "Jellyfin Media Server",
			Description: "Free Software media system for streaming movies, series, music, and live TV with hardware transcoding.",
			Tagline:     "Self-hosted privacy-first streaming server",
			Category:    "media",
			Package:     "jellyfin-server",
			Unit:        "jellyfin.service",
			Binary:      "jellyfin",
			Port:        8096,
			Icon:        "jellyfin",
			AccentColor: "#AA5CC3",
			ConfigPath:  "/etc/jellyfin/system.xml",
		},
		{
			ID:          "qbittorrent",
			Name:        "qBittorrent Headless",
			Description: "Feature-rich BitTorrent client running headless with clean Web UI, automated categories, and RSS.",
			Tagline:     "High-performance torrent engine with WebUI",
			Category:    "downloads",
			Package:     "qbittorrent-nox",
			Unit:        "qbittorrent-nox.service",
			Binary:      "qbittorrent-nox",
			Port:        8080,
			Icon:        "qbittorrent",
			AccentColor: "#3A75C4",
			ConfigPath:  "/home/media/.config/qBittorrent/qBittorrent.conf",
		},
		{
			ID:          "metube",
			Name:        "MeTube YouTube Downloader",
			Description: "Headless Web GUI for downloading YouTube videos and playlists with automated Kodi/Jellyfin NFO metadata and poster streaming integration.",
			Tagline:     "Headless YouTube downloader & media streaming engine",
			Category:    "downloads",
			Package:     "metube",
			Unit:        "metube.service",
			Binary:      "metube",
			Port:        8085,
			Icon:        "youtube",
			AccentColor: "#FF0000",
			ConfigPath:  "/etc/tinapple/metube.env",
			WebURL:      "http://{host}:8085",
		},
		{
			ID:           "suwayomi",
			Name:         "Suwayomi Manga Server & Tsumiru",
			Description:  "Self-hosted manga streaming and offline sync server with Keiyoushi source extensions, built-in WebUI, and full support for the modern Suwayomi-Tsumiru client app.",
			Tagline:      "Suwayomi Web + Suwayomi-Tsumiru Native Client",
			Category:     "media",
			Package:      "suwayomi-server-bin",
			Unit:         "suwayomi-server.service",
			Binary:       "suwayomi-server",
			Port:         4567,
			Icon:         "suwayomi",
			AccentColor:  "#F43F5E",
			ConfigPath:   filepath.Join(primaryHome, ".local/share/Tachidesk/server.conf"),
			WebURL:       "http://{host}:4567",
			ClientAppURL: "/tsumiru/",
		},
		{
			ID:          "navidrome",
			Name:        "Navidrome Music Server",
			Description: "Lightweight, fast, and modern music server and streamer with full Subsonic API compatibility.",
			Tagline:     "Modern Subsonic-compatible audio streamer",
			Category:    "media",
			Package:     "navidrome",
			Unit:        "navidrome.service",
			Binary:      "navidrome",
			Port:        4533,
			Icon:        "navidrome",
			AccentColor: "#0086D6",
			ConfigPath:  "/etc/navidrome/navidrome.toml",
		},
		{
			ID:          "tailscale",
			Name:        "Tailscale Mesh VPN",
			Description: "Zero-config WireGuard mesh network connecting your homelab devices securely from anywhere without port forwarding.",
			Tagline:     "Encrypted WireGuard peer network & subnet router",
			Category:    "network",
			Package:     "tailscale",
			Unit:        "tailscaled.service",
			Binary:      "tailscaled",
			Port:        0,
			Icon:        "tailscale",
			AccentColor: "#4C72B0",
			ConfigPath:  "/var/lib/tailscale/tailscaled.state",
		},
		{
			ID:          "syncthing",
			Name:        "Syncthing Decentralized Sync",
			Description: "Continuous peer-to-peer decentralized file synchronization protecting your photos, documents, and backups.",
			Tagline:     "Continuous peer-to-peer folder replication",
			Category:    "backups",
			Package:     "syncthing",
			Unit:        fmt.Sprintf("syncthing@%s.service", primaryUser),
			Binary:      "syncthing",
			Port:        8384,
			Icon:        "syncthing",
			AccentColor: "#148FD2",
			ConfigPath:  filepath.Join(primaryHome, ".local/state/syncthing/config.xml"),
		},
		{
			ID:          "adguard",
			Name:        "AdGuard Home DNS",
			Description: "Network-wide ad-blocking and privacy protection DNS server with DNS-over-HTTPS and parental controls.",
			Tagline:     "Network-wide tracking & ad blocker",
			Category:    "network",
			Package:     "adguardhome",
			Unit:        "adguardhome.service",
			Binary:      "adguardhome",
			Port:        3000,
			Icon:        "adguard",
			AccentColor: "#68BC71",
			ConfigPath:  "/etc/adguardhome/AdGuardHome.yaml",
		},
		{
			ID:          "vaultwarden",
			Name:        "Vaultwarden Password Vault",
			Description: "Lightweight Bitwarden-compatible API server written in Rust for managing secure logins, keys, and 2FA secrets.",
			Tagline:     "Self-hosted end-to-end encrypted password vault",
			Category:    "security",
			Package:     "vaultwarden",
			Unit:        "vaultwarden.service",
			Binary:      "vaultwarden",
			Port:        8000,
			Icon:        "vaultwarden",
			AccentColor: "#175DDC",
			ConfigPath:  "/etc/vaultwarden.env",
		},
		{
			ID:          "minecraft",
			Name:        "Minecraft Gaming Appliance",
			Description: "High-tickrate PaperMC server with Aikar GC memory optimization, Anycast domain tunnel, and Crafty 4 support.",
			Tagline:     "PaperMC server & Playit.gg Anycast domain tunnel",
			Category:    "gaming",
			Package:     "jre17-openjdk-headless",
			Unit:        "minecraft-server.service",
			Binary:      "minecraft-server",
			Port:        25565,
			Icon:        "minecraft",
			AccentColor: "#34D399",
			ConfigPath:  "/srv/minecraft/server.properties",
		},
		{
			ID:          "docker",
			Name:        "Docker Container Engine",
			Description: "Enterprise container runtime engine and Compose orchestrator for running third-party homelab services.",
			Tagline:     "OCI container runtime & compose engine",
			Category:    "system",
			Package:     "docker",
			Unit:        "docker.service",
			Binary:      "dockerd",
			Port:        0,
			Icon:        "docker",
			AccentColor: "#2496ED",
			ConfigPath:  "/etc/docker/daemon.json",
		},
		{
			ID:          "tor",
			Name:        "Tor Onion Router",
			Description: "Decentralized privacy routing daemon with SOCKS5 proxy and onion hidden services.",
			Tagline:     "Anonymity proxy network daemon",
			Category:    "security",
			Package:     "tor",
			Unit:        "tor.service",
			Binary:      "tor",
			Port:        9050,
			Icon:        "tor",
			AccentColor: "#7D4698",
			ConfigPath:  "/etc/tor/torrc",
		},
		{
			ID:          "niri",
			Name:        "Niri Wayland Desktop",
			Description: "Scrollable tiling Wayland compositor with Waybar status integration and hardware acceleration.",
			Tagline:     "Modern scrollable tiling Wayland session",
			Category:    "desktop",
			Package:     "niri",
			Unit:        "tinapple-session.service",
			Binary:      "niri",
			Port:        0,
			Icon:        "niri",
			AccentColor: "#268BD2",
			ConfigPath:  filepath.Join(primaryHome, ".config/niri/config.kdl"),
		},
		{
			ID:          "filebrowser",
			Name:        "FileBrowser Quantum",
			Description: "Modern web file manager with integrated document viewing, media streaming, and upload management.",
			Tagline:     "Web-based file manager and cloud portal",
			Category:    "storage",
			Package:     "filebrowser",
			Unit:        "filebrowser.service",
			Binary:      "filebrowser",
			Port:        8081,
			Icon:        "filebrowser",
			AccentColor: "#10B981",
			ConfigPath:  "/etc/filebrowser/config.json",
		},
		{
			ID:          "couchdb",
			Name:        "Obsidian LiveSync CouchDB",
			Description: "End-to-end encrypted synchronization database backend for Obsidian markdown vaults.",
			Tagline:     "E2EE sync backend for Obsidian notes",
			Category:    "storage",
			Package:     "couchdb",
			Unit:        "couchdb.service",
			Binary:      "couchdb",
			Port:        5984,
			Icon:        "couchdb",
			AccentColor: "#E03C31",
			ConfigPath:  "/opt/couchdb/etc/local.ini",
		},
		{
			ID:          "radarr",
			Name:        "Radarr Movie Automator",
			Description: "Automated movie collection manager, quality profiler, and BitTorrent/Usenet download orchestrator.",
			Tagline:     "Automated movie manager & grabber",
			Category:    "automation",
			Package:     "radarr-bin",
			Unit:        "radarr.service",
			Binary:      "radarr",
			Port:        7878,
			Icon:        "radarr",
			AccentColor: "#FFC230",
			ConfigPath:  "/var/lib/radarr/config.xml",
		},
		{
			ID:          "sonarr",
			Name:        "Sonarr TV Series Automator",
			Description: "Automated TV show collection manager, episode tracker, and download orchestrator.",
			Tagline:     "Smart PVR for TV series & anime",
			Category:    "automation",
			Package:     "sonarr-bin",
			Unit:        "sonarr.service",
			Binary:      "sonarr",
			Port:        8989,
			Icon:        "sonarr",
			AccentColor: "#00C4FF",
			ConfigPath:  "/var/lib/sonarr/config.xml",
		},
		{
			ID:          "prowlarr",
			Name:        "Prowlarr Indexer Proxy",
			Description: "Unified torrent indexer and Usenet tracker proxy integrating seamlessly with Radarr and Sonarr.",
			Tagline:     "Torrent indexer & tracker sync engine",
			Category:    "automation",
			Package:     "prowlarr-bin",
			Unit:        "prowlarr.service",
			Binary:      "prowlarr",
			Port:        9696,
			Icon:        "prowlarr",
			AccentColor: "#F59E0B",
			ConfigPath:  "/var/lib/prowlarr/config.xml",
		},
		{
			ID:          "bazarr",
			Name:        "Bazarr Subtitle Manager",
			Description: "Companion subtitle fetcher for Sonarr and Radarr across dozens of multi-language subtitle providers.",
			Tagline:     "Automated multilingual subtitle manager",
			Category:    "automation",
			Package:     "bazarr",
			Unit:        "bazarr.service",
			Binary:      "bazarr",
			Port:        6767,
			Icon:        "bazarr",
			AccentColor: "#8B5CF6",
			ConfigPath:  "/var/lib/bazarr/config/config.yaml",
		},
		{
			ID:          "seerr",
			Name:        "Seerr Media Request & Discovery",
			Description: "Clean media request and discovery portal for Jellyfin with integrated user management.",
			Tagline:     "Media request & discovery platform for Jellyfin",
			Category:    "media",
			Package:     "seerr",
			Unit:        "seerr.service",
			Binary:      "seerr",
			Port:        5055,
			Icon:        "seerr",
			AccentColor: "#6366F1",
			ConfigPath:  "/var/lib/seerr/settings.json",
		},
		{
			ID:          "jdownloader",
			Name:        "JDownloader 2 Headless",
			Description: "Headless direct-download manager supporting 1000+ hosters, cloud storage, and MyJDownloader cloud control.",
			Tagline:     "Universal download manager via MyJDownloader",
			Category:    "downloads",
			Package:     "jdownloader2",
			Unit:        "jdownloader.service",
			Binary:      "jdownloader",
			Port:        0,
			Icon:        "jdownloader",
			AccentColor: "#2563EB",
			ConfigPath:  "/var/lib/jdownloader/cfg/org.jdownloader.api.myjdownloader.MyJDownloaderSettings.json",
			WebURL:      "https://my.jdownloader.org",
		},
		{
			ID:          "syncyomi",
			Name:        "SyncYomi Manga Sync",
			Description: "Progress synchronization bridge between Tachiyomi, Mihon, and Suwayomi server.",
			Tagline:     "Tachiyomi, Mihon & Suwayomi reading progress sync",
			Category:    "media",
			Package:     "syncyomi",
			Unit:        "syncyomi.service",
			Binary:      "syncyomi",
			Port:        8282,
			Icon:        "syncyomi",
			AccentColor: "#EC4899",
			ConfigPath:  "/etc/syncyomi/config.yaml",
		},
		{
			ID:          "playit",
			Name:        "Playit.gg Anycast Tunnel",
			Description: "Global Anycast mesh tunnel providing public domains for Minecraft and homelab services without port forwarding.",
			Tagline:     "Anycast public tunnel for Minecraft & servers",
			Category:    "network",
			Package:     "playit",
			Unit:        "playit.service",
			Binary:      "playit",
			Port:        0,
			Icon:        "playit",
			AccentColor: "#10B981",
			ConfigPath:  "/etc/playit/playit.toml",
		},
		{
			ID:          "beeper",
			Name:        "Beeper Matrix Chat Bridges",
			Description: "Self-hosted Matrix chat bridges connecting WhatsApp, Telegram, Signal, Discord, and iMessage.",
			Tagline:     "Self-hosted multi-network Matrix chat bridges",
			Category:    "network",
			Package:     "bbctl",
			Unit:        fmt.Sprintf("bbctl@%s.service", primaryUser),
			Binary:      "bbctl",
			Port:        0,
			Icon:        "beeper",
			AccentColor: "#F43F5E",
			ConfigPath:  filepath.Join(primaryHome, ".config/beeper/config.yaml"),
		},
	}

	for _, d := range definitions {
		mgr.apps[d.ID] = d
		mgr.appOrder = append(mgr.appOrder, d.ID)
	}
	return mgr
}

func getAllInstalledPackages() map[string]bool {
	pkgs := make(map[string]bool)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "pacman", "-Q")
	out, err := cmd.Output()
	if err == nil {
		scanner := bufio.NewScanner(bytes.NewReader(out))
		for scanner.Scan() {
			fields := strings.Fields(scanner.Text())
			if len(fields) > 0 {
				pkgs[fields[0]] = true
			}
		}
	}
	return pkgs
}

func (m *AppManager) ListApps() []AppStatus {
	m.cacheMu.RLock()
	if time.Since(m.cachedAt) < 4*time.Second && len(m.cachedList) > 0 {
		out := make([]AppStatus, len(m.cachedList))
		copy(out, m.cachedList)
		m.cacheMu.RUnlock()
		return out
	}
	m.cacheMu.RUnlock()

	m.cacheMu.Lock()
	defer m.cacheMu.Unlock()

	if time.Since(m.cachedAt) < 4*time.Second && len(m.cachedList) > 0 {
		out := make([]AppStatus, len(m.cachedList))
		copy(out, m.cachedList)
		return out
	}

	m.mu.RLock()
	apps := make([]AppDefinition, len(m.appOrder))
	for i, id := range m.appOrder {
		apps[i] = m.apps[id]
	}
	m.mu.RUnlock()

	installedPkgs := getAllInstalledPackages()

	statuses := make([]AppStatus, len(apps))
	var wg sync.WaitGroup
	for i, app := range apps {
		wg.Add(1)
		go func(idx int, a AppDefinition) {
			defer wg.Done()
			statuses[idx] = m.inspectAppFast(a, installedPkgs)
		}(i, app)
	}
	wg.Wait()

	m.cachedList = statuses
	m.cachedAt = time.Now()

	out := make([]AppStatus, len(statuses))
	copy(out, statuses)
	return out
}

func (m *AppManager) GetApp(id string) (*AppStatus, error) {
	m.mu.RLock()
	app, ok := m.apps[id]
	m.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("app %s not found", id)
	}
	st := m.inspectApp(app)
	return &st, nil
}

func (m *AppManager) inspectAppFast(app AppDefinition, installedPkgs map[string]bool) AppStatus {
	status := AppStatus{
		AppDefinition: app,
		Installed:     false,
		Running:       false,
		Status:        "not_installed",
		LoadState:     "not-found",
		ActiveState:   "inactive",
		SubState:      "dead",
		Enabled:       false,
		Config:        make(map[string]string),
	}

	binaryFound := false
	if filepath.IsAbs(app.Binary) {
		if _, err := os.Stat(app.Binary); err == nil {
			binaryFound = true
		}
	} else if app.Binary != "" {
		for _, cp := range []string{
			"/usr/local/bin/" + app.Binary,
			"/usr/bin/" + app.Binary,
			"/opt/" + app.Binary + "/bin/" + app.Binary,
		} {
			if _, err := os.Stat(cp); err == nil {
				binaryFound = true
				break
			}
		}
	}

	isPkgInstalled := false
	if app.Package != "" && installedPkgs != nil {
		isPkgInstalled = installedPkgs[app.Package]
	}

	if !binaryFound && !isPkgInstalled && app.ID != "minecraft" && app.ID != "niri" && app.ID != "playit" {
		status.Installed = false
		status.Status = "not_installed"
		status.Config["port"] = strconv.Itoa(app.Port)
		return status
	}

	props := getSystemdProperties(app.Unit)
	loadState := props["LoadState"]
	activeState := props["ActiveState"]
	subState := props["SubState"]
	unitFileState := props["UnitFileState"]

	if loadState != "" {
		status.LoadState = loadState
	}
	if activeState != "" {
		status.ActiveState = activeState
	}
	if subState != "" {
		status.SubState = subState
	}
	if unitFileState == "enabled" {
		status.Enabled = true
	}

	if binaryFound || isPkgInstalled || loadState == "loaded" {
		status.Installed = true
	}

	if !status.Installed {
		status.Status = "not_installed"
		status.Running = false
	} else {
		switch activeState {
		case "active":
			status.Status = "running"
			status.Running = true
		case "failed":
			status.Status = "failed"
			status.Running = false
		case "activating":
			status.Status = "starting"
			status.Running = false
		default:
			status.Status = "stopped"
			status.Running = false
		}
	}

	status.Config["port"] = strconv.Itoa(app.Port)
	if app.ConfigPath != "" {
		status.Config["configPath"] = app.ConfigPath
		if _, err := os.Stat(app.ConfigPath); err == nil {
			status.Config["configFileExists"] = "true"
		} else {
			status.Config["configFileExists"] = "false"
		}
	}

	return status
}

func (m *AppManager) inspectApp(app AppDefinition) AppStatus {
	status := AppStatus{
		AppDefinition: app,
		Installed:     false,
		Running:       false,
		Status:        "not_installed",
		LoadState:     "not-found",
		ActiveState:   "inactive",
		SubState:      "dead",
		Enabled:       false,
		Config:        make(map[string]string),
	}

	// 1. Check binary presence on disk
	binaryFound := false
	if filepath.IsAbs(app.Binary) {
		if _, err := os.Stat(app.Binary); err == nil {
			binaryFound = true
		}
	} else {
		if _, err := exec.LookPath(app.Binary); err == nil {
			binaryFound = true
		} else {
			commonPaths := []string{
				"/usr/bin/" + app.Binary,
				"/usr/local/bin/" + app.Binary,
				"/opt/" + app.Binary + "/bin/" + app.Binary,
			}
			for _, cp := range commonPaths {
				if _, err := os.Stat(cp); err == nil {
					binaryFound = true
					break
				}
			}
		}
	}

	// 2. Query systemd unit properties
	props := getSystemdProperties(app.Unit)
	loadState := props["LoadState"]
	activeState := props["ActiveState"]
	subState := props["SubState"]
	unitFileState := props["UnitFileState"]

	if loadState != "" {
		status.LoadState = loadState
	}
	if activeState != "" {
		status.ActiveState = activeState
	}
	if subState != "" {
		status.SubState = subState
	}
	if unitFileState == "enabled" {
		status.Enabled = true
	}

	// Determine installed state
	isUnitLoaded := loadState == "loaded"
	if binaryFound || isUnitLoaded {
		status.Installed = true
	} else if app.Package != "" {
		// As extra verification, check pacman DB
		if checkPacmanInstalled(app.Package) {
			status.Installed = true
		}
	}

	// Determine running and overall status
	if !status.Installed {
		status.Status = "not_installed"
		status.Running = false
	} else {
		switch activeState {
		case "active":
			status.Status = "running"
			status.Running = true
		case "failed":
			status.Status = "failed"
			status.Running = false
		case "activating":
			status.Status = "starting"
			status.Running = false
		default:
			status.Status = "stopped"
			status.Running = false
		}
	}

	// Populate config info
	status.Config["port"] = strconv.Itoa(app.Port)
	if app.ConfigPath != "" {
		status.Config["configPath"] = app.ConfigPath
		if _, err := os.Stat(app.ConfigPath); err == nil {
			status.Config["configFileExists"] = "true"
		} else {
			status.Config["configFileExists"] = "false"
		}
	}

	return status
}

func getSystemdProperties(unit string) map[string]string {
	props := make(map[string]string)
	if unit == "" {
		return props
	}
	ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)
	defer cancel()

	cmd := exec.CommandContext(ctx, "systemctl", "show", unit, "--property=LoadState,ActiveState,SubState,UnitFileState")
	out, err := cmd.Output()
	if err != nil {
		return props
	}

	scanner := bufio.NewScanner(bytes.NewReader(out))
	for scanner.Scan() {
		line := scanner.Text()
		if idx := strings.Index(line, "="); idx > 0 {
			props[line[:idx]] = line[idx+1:]
		}
	}
	return props
}

func checkPacmanInstalled(pkg string) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if exec.CommandContext(ctx, "pacman", "-Q", pkg).Run() == nil {
		return true
	}
	if strings.HasSuffix(pkg, "-bin") {
		base := strings.TrimSuffix(pkg, "-bin")
		return exec.CommandContext(ctx, "pacman", "-Q", base).Run() == nil
	}
	return false
}

func cleanStalePacmanLock() {
	if _, err := os.Stat("/var/lib/pacman/db.lck"); err == nil {
		if exec.Command("pgrep", "pacman").Run() != nil {
			_ = os.Remove("/var/lib/pacman/db.lck")
		}
	}
}

func installPlayit() error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "curl", "-fsSL", "https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-linux-amd64", "-o", "/usr/local/bin/playit")
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to download playit binary: %s (%w)", string(out), err)
	}
	_ = os.Chmod("/usr/local/bin/playit", 0755)

	_ = os.MkdirAll("/etc/playit", 0755)
	serviceContent := `[Unit]
Description=Playit.gg Anycast Tunnel Daemon
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/playit --secret-path /etc/playit/playit.toml
Restart=always
RestartSec=5
WorkingDirectory=/etc/playit

[Install]
WantedBy=multi-user.target
`
	if err := os.WriteFile("/etc/systemd/system/playit.service", []byte(serviceContent), 0644); err != nil {
		return fmt.Errorf("failed to create playit.service: %w", err)
	}
	return nil
}

func installFilebrowser() error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Minute)
	defer cancel()

	tmpTar := "/tmp/filebrowser.tar.gz"
	cmd := exec.CommandContext(ctx, "curl", "-fsSL", "https://github.com/filebrowser/filebrowser/releases/latest/download/linux-amd64-filebrowser.tar.gz", "-o", tmpTar)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to download filebrowser: %s (%w)", string(out), err)
	}
	defer os.Remove(tmpTar)

	cmdExtract := exec.CommandContext(ctx, "tar", "-xzf", tmpTar, "-C", "/usr/local/bin", "filebrowser")
	if out, err := cmdExtract.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to extract filebrowser: %s (%w)", string(out), err)
	}
	_ = os.Chmod("/usr/local/bin/filebrowser", 0755)

	_ = os.MkdirAll("/etc/filebrowser", 0755)
	_ = os.MkdirAll("/srv/media", 0775)

	serviceContent := `[Unit]
Description=FileBrowser Quantum Web File Manager
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/filebrowser -r /srv/media -p 8081 -a 0.0.0.0 -d /etc/filebrowser/filebrowser.db
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
`
	if err := os.WriteFile("/etc/systemd/system/filebrowser.service", []byte(serviceContent), 0644); err != nil {
		return fmt.Errorf("failed to create filebrowser.service: %w", err)
	}
	return nil
}

func installMinecraftServer() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	cleanStalePacmanLock()
	_ = exec.CommandContext(ctx, "pacman", "-S", "--noconfirm", "--needed", "jre17-openjdk-headless").Run()

	_ = os.MkdirAll("/srv/minecraft", 0755)
	_ = os.WriteFile("/srv/minecraft/eula.txt", []byte("eula=true\n"), 0644)

	if _, err := os.Stat("/srv/minecraft/server.jar"); os.IsNotExist(err) {
		cmdDl := exec.CommandContext(ctx, "curl", "-fsSL", "-o", "/srv/minecraft/server.jar", "https://api.purpurmc.org/v2/purpur/1.20.4/latest/download")
		if out, err := cmdDl.CombinedOutput(); err != nil {
			return fmt.Errorf("failed to download Minecraft server jar: %s (%w)", string(out), err)
		}
	}

	launcherScript := `#!/usr/bin/env bash
cd /srv/minecraft
exec java -Xms1G -Xmx2G -jar /srv/minecraft/server.jar nogui
`
	_ = os.WriteFile("/usr/local/bin/minecraft-server", []byte(launcherScript), 0755)

	serviceContent := `[Unit]
Description=PaperMC Minecraft Appliance Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/minecraft
ExecStart=/usr/local/bin/minecraft-server
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
`
	if err := os.WriteFile("/etc/systemd/system/minecraft-server.service", []byte(serviceContent), 0644); err != nil {
		return fmt.Errorf("failed to create minecraft-server.service: %w", err)
	}
	return nil
}

func installRadarr() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	cleanStalePacmanLock()
	_ = exec.CommandContext(ctx, "pacman", "-S", "--noconfirm", "--needed", "sqlite").Run()

	tmpTar := "/tmp/radarr.tar.gz"
	cmd := exec.CommandContext(ctx, "curl", "--http1.1", "-fsSL", "https://radarr.servarr.com/v1/update/master/updatefile?os=linux&arch=x64&runtime=netcore", "-o", tmpTar)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to download radarr: %s (%w)", string(out), err)
	}
	defer os.Remove(tmpTar)

	_ = os.MkdirAll("/opt", 0755)
	cmdExtract := exec.CommandContext(ctx, "tar", "-xzf", tmpTar, "-C", "/opt")
	if out, err := cmdExtract.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to extract radarr: %s (%w)", string(out), err)
	}

	_ = os.Remove("/usr/local/bin/radarr")
	_ = os.Symlink("/opt/Radarr/Radarr", "/usr/local/bin/radarr")
	_ = os.MkdirAll("/var/lib/radarr", 0755)

	serviceContent := `[Unit]
Description=Radarr Movie Automator
After=network.target

[Service]
Type=simple
ExecStart=/opt/Radarr/Radarr -nobrowser -data=/var/lib/radarr/
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`
	if err := os.WriteFile("/etc/systemd/system/radarr.service", []byte(serviceContent), 0644); err != nil {
		return fmt.Errorf("failed to create radarr.service: %w", err)
	}
	return nil
}

func installSonarr() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	cleanStalePacmanLock()
	_ = exec.CommandContext(ctx, "pacman", "-S", "--noconfirm", "--needed", "sqlite").Run()

	tmpTar := "/tmp/sonarr.tar.gz"
	cmd := exec.CommandContext(ctx, "curl", "--http1.1", "-fsSL", "https://services.sonarr.tv/v1/download/main/latest?version=4&os=linux&arch=x64", "-o", tmpTar)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to download sonarr: %s (%w)", string(out), err)
	}
	defer os.Remove(tmpTar)

	_ = os.MkdirAll("/opt", 0755)
	cmdExtract := exec.CommandContext(ctx, "tar", "-xzf", tmpTar, "-C", "/opt")
	if out, err := cmdExtract.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to extract sonarr: %s (%w)", string(out), err)
	}

	_ = os.Remove("/usr/local/bin/sonarr")
	_ = os.Symlink("/opt/Sonarr/Sonarr", "/usr/local/bin/sonarr")
	_ = os.MkdirAll("/var/lib/sonarr", 0755)

	serviceContent := `[Unit]
Description=Sonarr TV Series Automator
After=network.target

[Service]
Type=simple
ExecStart=/opt/Sonarr/Sonarr -nobrowser -data=/var/lib/sonarr/
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`
	if err := os.WriteFile("/etc/systemd/system/sonarr.service", []byte(serviceContent), 0644); err != nil {
		return fmt.Errorf("failed to create sonarr.service: %w", err)
	}
	return nil
}

func installProwlarr() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	cleanStalePacmanLock()
	_ = exec.CommandContext(ctx, "pacman", "-S", "--noconfirm", "--needed", "sqlite").Run()

	tmpTar := "/tmp/prowlarr.tar.gz"
	cmd := exec.CommandContext(ctx, "curl", "--http1.1", "-fsSL", "https://prowlarr.servarr.com/v1/update/master/updatefile?os=linux&arch=x64&runtime=netcore", "-o", tmpTar)
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to download prowlarr: %s (%w)", string(out), err)
	}
	defer os.Remove(tmpTar)

	_ = os.MkdirAll("/opt", 0755)
	cmdExtract := exec.CommandContext(ctx, "tar", "-xzf", tmpTar, "-C", "/opt")
	if out, err := cmdExtract.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to extract prowlarr: %s (%w)", string(out), err)
	}

	_ = os.Remove("/usr/local/bin/prowlarr")
	_ = os.Symlink("/opt/Prowlarr/Prowlarr", "/usr/local/bin/prowlarr")
	_ = os.MkdirAll("/var/lib/prowlarr", 0755)

	serviceContent := `[Unit]
Description=Prowlarr Torrent and Usenet Indexer Proxy
After=network.target

[Service]
Type=simple
ExecStart=/opt/Prowlarr/Prowlarr -nobrowser -data=/var/lib/prowlarr/
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`
	if err := os.WriteFile("/etc/systemd/system/prowlarr.service", []byte(serviceContent), 0644); err != nil {
		return fmt.Errorf("failed to create prowlarr.service: %w", err)
	}
	return nil
}

func installMetube() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	cleanStalePacmanLock()
	cmdDeps := exec.CommandContext(ctx, "pacman", "-S", "--noconfirm", "--needed",
		"python", "python-aiohttp", "python-socketio", "python-watchfiles", "yt-dlp", "ffmpeg", "aria2")
	_ = cmdDeps.Run()

	_ = os.MkdirAll("/srv/media/youtube", 0775)
	_ = os.MkdirAll("/srv/media/youtube-music", 0775)
	_ = os.MkdirAll("/var/lib/metube", 0755)
	_ = os.MkdirAll("/etc/tinapple", 0755)

	serviceContent := `[Unit]
Description=MeTube Headless YouTube Downloader
After=network.target

[Service]
Type=simple
EnvironmentFile=-/etc/tinapple/metube.env
ExecStart=/usr/local/bin/metube
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
`
	if err := os.WriteFile("/etc/systemd/system/metube.service", []byte(serviceContent), 0644); err != nil {
		return fmt.Errorf("failed to create metube.service: %w", err)
	}
	return nil
}

func (m *AppManager) AppendLog(appID, level, msg string) {
	entry := InstallLogMessage{
		Timestamp: time.Now().Format("15:04:05"),
		Level:     level,
		AppID:     appID,
		Message:   msg,
	}

	m.logMu.Lock()
	if len(m.logState.Logs) >= 1000 {
		m.logState.Logs = m.logState.Logs[1:]
	}
	m.logState.Logs = append(m.logState.Logs, entry)
	for ch := range m.logSubChans {
		select {
		case ch <- entry:
		default:
		}
	}
	m.logMu.Unlock()
}

func (m *AppManager) SetInstallState(status, appID, appName string) {
	m.logMu.Lock()
	m.logState.Status = status
	m.logState.ActiveApp = appID
	m.logState.AppName = appName
	m.logMu.Unlock()
}

func (m *AppManager) GetInstallProgress() InstallProgressState {
	m.logMu.RLock()
	defer m.logMu.RUnlock()
	logsCopy := make([]InstallLogMessage, len(m.logState.Logs))
	copy(logsCopy, m.logState.Logs)
	return InstallProgressState{
		Status:    m.logState.Status,
		ActiveApp: m.logState.ActiveApp,
		AppName:   m.logState.AppName,
		Logs:      logsCopy,
	}
}

func (m *AppManager) ClearInstallLogs() {
	m.logMu.Lock()
	m.logState.Logs = make([]InstallLogMessage, 0)
	if m.logState.Status != "running" {
		m.logState.Status = "idle"
		m.logState.ActiveApp = ""
		m.logState.AppName = ""
	}
	m.logMu.Unlock()
}

func (m *AppManager) SubscribeInstallLogs() (chan InstallLogMessage, func()) {
	ch := make(chan InstallLogMessage, 100)
	m.logMu.Lock()
	m.logSubChans[ch] = struct{}{}
	m.logMu.Unlock()

	unsubscribe := func() {
		m.logMu.Lock()
		delete(m.logSubChans, ch)
		close(ch)
		m.logMu.Unlock()
	}
	return ch, unsubscribe
}

func (m *AppManager) runStreamCmd(ctx context.Context, appID string, name string, args ...string) error {
	cmd := exec.CommandContext(ctx, name, args...)
	cmdStr := fmt.Sprintf("$ %s %s", name, strings.Join(args, " "))
	m.AppendLog(appID, "command", cmdStr)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		m.AppendLog(appID, "error", fmt.Sprintf("Failed to spawn process: %v", err))
		return err
	}

	var wg sync.WaitGroup
	scanPipe := func(r io.Reader, lvl string) {
		defer wg.Done()
		scanner := bufio.NewScanner(r)
		for scanner.Scan() {
			line := scanner.Text()
			if strings.TrimSpace(line) != "" {
				m.AppendLog(appID, lvl, line)
			}
		}
	}

	wg.Add(2)
	go scanPipe(stdout, "info")
	go scanPipe(stderr, "warn")
	wg.Wait()

	if err := cmd.Wait(); err != nil {
		return err
	}
	return nil
}

func (m *AppManager) Install(id string) error {
	m.operationMu.Lock()
	defer m.operationMu.Unlock()
	m.mu.RLock()
	app, ok := m.apps[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("app %s not found", id)
	}

	m.SetInstallState("running", id, app.Name)
	m.AppendLog(id, "command", fmt.Sprintf(">>> Initiating deployment pipeline for %s (%s)...", app.Name, id))

	var installErr error
	switch id {
	case "playit":
		m.AppendLog(id, "info", "Fetching latest Playit Anycast binary from GitHub releases...")
		installErr = installPlayit()
	case "filebrowser":
		m.AppendLog(id, "info", "Downloading official FileBrowser Quantum binary release...")
		installErr = installFilebrowser()
	case "metube":
		m.AppendLog(id, "info", "Installing MeTube Python requirements (yt-dlp, ffmpeg, aiohttp)...")
		installErr = installMetube()
	case "minecraft":
		m.AppendLog(id, "info", "Deploying PaperMC / PurpurMC appliance server runtime...")
		installErr = installMinecraftServer()
	case "prowlarr":
		m.AppendLog(id, "info", "Downloading Prowlarr Linux x64 Servarr tarball...")
		installErr = installProwlarr()
	case "radarr":
		m.AppendLog(id, "info", "Downloading official Radarr Linux x64 Servarr release...")
		installErr = installRadarr()
	case "sonarr":
		m.AppendLog(id, "info", "Downloading official Sonarr Linux x64 Servarr release...")
		installErr = installSonarr()
	case "jdownloader":
		cleanStalePacmanLock()
		m.AppendLog(id, "info", "Pre-installing Java runtime and fonts for JDownloader2...")
		ctxPre, cancelPre := context.WithTimeout(context.Background(), 5*time.Minute)
		_ = m.runStreamCmd(ctxPre, id, "pacman", "-S", "--noconfirm", "--needed", "jre-openjdk", "noto-fonts", "libxtst")
		cancelPre()
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		installErr = m.runStreamCmd(ctx, id, "pacman", "-S", "--noconfirm", "--needed", app.Package)
		if installErr == nil {
			_ = os.MkdirAll("/opt/JDownloader/cfg", 0755)
			cfgFile := "/opt/JDownloader/cfg/org.jdownloader.api.myjdownloader.MyJDownloaderSettings.json"
			if _, err := os.Stat(cfgFile); os.IsNotExist(err) {
				_ = os.WriteFile(cfgFile, []byte("{\n  \"email\": \"user@example.com\",\n  \"password\": \"changeme\"\n}\n"), 0644)
				_ = exec.Command("chown", "-R", "jdownloader:jdownloader", "/opt/JDownloader").Run()
			}
		}
	default:
		if app.Package != "" {
			cleanStalePacmanLock()
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
			defer cancel()

			// 1. Try pacman first with live streaming logs
			installErr = m.runStreamCmd(ctx, id, "pacman", "-S", "--noconfirm", "--needed", app.Package)
			if installErr != nil {
				primaryUser, _ := getSystemPrimaryUser()
				m.AppendLog(id, "warn", fmt.Sprintf("Pacman failed, attempting AUR via paru as %s...", primaryUser))
				paruErr := m.runStreamCmd(ctx, id, "sudo", "-u", primaryUser, "paru", "-S", "--noconfirm", "--needed", "--skipreview", app.Package)
				if paruErr != nil {
					fallbackPkg := app.Package + "-bin"
					if strings.HasSuffix(app.Package, "-bin") {
						fallbackPkg = strings.TrimSuffix(app.Package, "-bin")
					}
					m.AppendLog(id, "warn", fmt.Sprintf("Retrying with AUR package %s...", fallbackPkg))
					installErr = m.runStreamCmd(ctx, id, "sudo", "-u", primaryUser, "paru", "-S", "--noconfirm", "--needed", "--skipreview", fallbackPkg)
				} else {
					installErr = nil
				}
			}
		}
	}
	if installErr != nil {
		m.AppendLog(id, "error", fmt.Sprintf("FAILED: Deployment failed for %s: %v", app.Name, installErr))
		m.SetInstallState("error", id, app.Name)
		return installErr
	}

	// Reload systemd daemon
	m.AppendLog(id, "command", "$ systemctl daemon-reload")
	_ = exec.Command("systemctl", "daemon-reload").Run()

	// If unit exists, enable and start it
	if app.Unit != "" {
		m.AppendLog(id, "command", fmt.Sprintf("$ systemctl enable --now %s", app.Unit))
		if out, err := exec.Command("systemctl", "enable", "--now", app.Unit).CombinedOutput(); err != nil {
			m.AppendLog(id, "warn", fmt.Sprintf("systemctl notice: %s (%v)", string(out), err))
		}
	}

	_ = m.refreshProxyRoutes()
	m.AppendLog(id, "success", fmt.Sprintf("SUCCESS: %s is active and ready on port %d!", app.Name, app.Port))
	m.SetInstallState("success", id, app.Name)
	return nil
}

func (m *AppManager) Uninstall(id string) error {
	m.operationMu.Lock()
	defer m.operationMu.Unlock()
	m.mu.RLock()
	app, ok := m.apps[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("app %s not found", id)
	}

	// Stop and disable service
	if app.Unit != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if out, err := exec.CommandContext(ctx, "systemctl", "disable", "--now", app.Unit).CombinedOutput(); err != nil {
			fmt.Fprintf(os.Stderr, "[apps] Warning: disable --now %s: %s (%v)\n", app.Unit, string(out), err)
		}
	}

	// Custom cleanup
	switch id {
	case "playit":
		_ = os.Remove("/usr/local/bin/playit")
		_ = os.Remove("/etc/systemd/system/playit.service")
	case "filebrowser":
		_ = os.Remove("/usr/local/bin/filebrowser")
		_ = os.Remove("/etc/systemd/system/filebrowser.service")
	case "minecraft":
		_ = os.Remove("/usr/local/bin/minecraft-server")
		_ = os.Remove("/etc/systemd/system/minecraft-server.service")
	case "prowlarr":
		_ = os.RemoveAll("/opt/Prowlarr")
		_ = os.Remove("/usr/local/bin/prowlarr")
		_ = os.Remove("/etc/systemd/system/prowlarr.service")
	case "radarr":
		_ = os.RemoveAll("/opt/Radarr")
		_ = os.Remove("/usr/local/bin/radarr")
		_ = os.Remove("/etc/systemd/system/radarr.service")
	case "sonarr":
		_ = os.RemoveAll("/opt/Sonarr")
		_ = os.Remove("/usr/local/bin/sonarr")
		_ = os.Remove("/etc/systemd/system/sonarr.service")
	case "metube":
		_ = os.Remove("/etc/systemd/system/metube.service")
	default:
		if app.Package != "" {
			cleanStalePacmanLock()
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
			defer cancel()
			cmd := exec.CommandContext(ctx, "pacman", "-R", "--noconfirm", app.Package)
			out, err := cmd.CombinedOutput()
			if err != nil {
				return fmt.Errorf("pacman uninstall failed for %s: %s (%w)", app.Package, string(out), err)
			}
		}
	}

	_ = exec.Command("systemctl", "daemon-reload").Run()
	return m.refreshProxyRoutes()
}

func (m *AppManager) Start(id string) error {
	m.operationMu.Lock()
	defer m.operationMu.Unlock()
	m.mu.RLock()
	app, ok := m.apps[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("app %s not found", id)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "systemctl", "start", app.Unit)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("start failed: %s (%w)", string(out), err)
	}
	return m.refreshProxyRoutes()
}

func (m *AppManager) Stop(id string) error {
	m.operationMu.Lock()
	defer m.operationMu.Unlock()
	m.mu.RLock()
	app, ok := m.apps[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("app %s not found", id)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "systemctl", "stop", app.Unit)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("stop failed: %s (%w)", string(out), err)
	}
	return m.refreshProxyRoutes()
}

func (m *AppManager) Restart(id string) error {
	m.operationMu.Lock()
	defer m.operationMu.Unlock()
	m.mu.RLock()
	app, ok := m.apps[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("app %s not found", id)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "systemctl", "restart", app.Unit)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("restart failed: %s (%w)", string(out), err)
	}
	return m.refreshProxyRoutes()
}

func (m *AppManager) GetConfig(id string) (map[string]interface{}, error) {
	m.mu.RLock()
	app, ok := m.apps[id]
	m.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("app %s not found", id)
	}

	res := map[string]interface{}{
		"id":         app.ID,
		"name":       app.Name,
		"port":       app.Port,
		"configPath": app.ConfigPath,
		"customEnv":  make(map[string]string),
	}

	// If drop-in override exists, read it
	dropInPath := fmt.Sprintf("/etc/systemd/system/%s.d/tinapple-override.conf", app.Unit)
	if data, err := os.ReadFile(dropInPath); err == nil {
		res["rawOverride"] = string(data)
	}

	// Read small config snippet if config file exists
	if app.ConfigPath != "" {
		if data, err := os.ReadFile(app.ConfigPath); err == nil {
			if len(data) > 10000 {
				res["rawConfig"] = string(data[:10000]) + "\n... [truncated]"
			} else {
				res["rawConfig"] = string(data)
			}
		}
	}

	return res, nil
}

type UpdateConfigRequest struct {
	Port      int               `json:"port"`
	CustomEnv map[string]string `json:"customEnv"`
}

func (m *AppManager) UpdateConfig(id string, req UpdateConfigRequest) error {
	m.mu.RLock()
	app, ok := m.apps[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("app %s not found", id)
	}

	dropInDir := fmt.Sprintf("/etc/systemd/system/%s.d", app.Unit)
	if err := os.MkdirAll(dropInDir, 0755); err != nil {
		return fmt.Errorf("failed to create override dir: %w", err)
	}

	var dropInContent strings.Builder
	dropInContent.WriteString("[Service]\n")
	if req.Port > 0 {
		dropInContent.WriteString(fmt.Sprintf("Environment=\"PORT=%d\"\n", req.Port))
	}
	for k, v := range req.CustomEnv {
		dropInContent.WriteString(fmt.Sprintf("Environment=\"%s=%s\"\n", k, v))
	}

	dropInFile := filepath.Join(dropInDir, "tinapple-override.conf")
	if err := os.WriteFile(dropInFile, []byte(dropInContent.String()), 0644); err != nil {
		return fmt.Errorf("failed to write override file: %w", err)
	}

	// Reload systemd daemon
	_ = exec.Command("systemctl", "daemon-reload").Run()

	// If running, restart unit to apply
	st := m.inspectApp(app)
	if st.Running {
		_ = m.Restart(id)
	}

	return nil
}

// Rebuild from the complete catalog, bypassing the UI status cache. The generator
// serializes configuration publication and restores the old config on failure.
func (m *AppManager) refreshProxyRoutes() error {
	m.cacheMu.Lock()
	m.cachedAt = time.Time{}
	m.cacheMu.Unlock()
	m.mu.RLock()
	catalog := make([]AppDefinition, 0, len(m.appOrder))
	for _, id := range m.appOrder {
		catalog = append(catalog, m.apps[id])
	}
	m.mu.RUnlock()
	data, err := json.Marshal(catalog)
	if err != nil {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "tinapple-config-generator", "nginx-sync", "--catalog-stdin")
	cmd.Stdin = bytes.NewReader(data)
	out, err := cmd.CombinedOutput()
	if err != nil {
		fmt.Fprintf(os.Stderr, "[apps] Warning: proxy refresh failed: %s (%v)\n", string(out), err)
	}
	return nil
}
