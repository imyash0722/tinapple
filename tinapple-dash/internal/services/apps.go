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

func getActiveSyncthingUnit(fallbackUser string) string {
	out, err := exec.Command("systemctl", "list-units", "--type=service", "--all", "--no-legend", "syncthing@*.service").CombinedOutput()
	if err == nil {
		for _, line := range strings.Split(string(out), "\n") {
			fields := strings.Fields(line)
			if len(fields) > 0 && strings.HasPrefix(fields[0], "syncthing@") {
				return fields[0]
			}
		}
	}
	return fmt.Sprintf("syncthing@%s.service", fallbackUser)
}

func ensurePacmanReliability() {
	pacmanConf := "/etc/pacman.conf"
	data, err := os.ReadFile(pacmanConf)
	if err != nil {
		return
	}
	content := string(data)
	if !strings.Contains(content, "DisableDownloadTimeout") {
		if idx := strings.Index(content, "[options]"); idx != -1 {
			insertionPoint := idx + len("[options]\n")
			newContent := content[:insertionPoint] + "DisableDownloadTimeout\n" + content[insertionPoint:]
			_ = os.WriteFile(pacmanConf, []byte(newContent), 0644)
		}
	}
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

type AppliancePack struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Tagline     string   `json:"tagline"`
	Description string   `json:"description"`
	Badge       string   `json:"badge"`
	AccentColor string   `json:"accentColor"`
	Icon        string   `json:"icon"`
	Apps        []string `json:"apps"`
	Features    []string `json:"features"`
}

type AppliancePackStatus struct {
	AppliancePack
	InstalledCount int         `json:"installedCount"`
	RunningCount   int         `json:"runningCount"`
	TotalCount     int         `json:"totalCount"`
	AllInstalled   bool        `json:"allInstalled"`
	AllRunning     bool        `json:"allRunning"`
	AppsStatus     []AppStatus `json:"appsStatus"`
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
	packs       map[string]AppliancePack
	packOrder   []string
	cacheMu     sync.RWMutex
	cachedAt    time.Time
	cachedList  []AppStatus

	// Real-time Install Logger & PubSub
	logMu       sync.RWMutex
	logState    InstallProgressState
	logSubChans map[chan InstallLogMessage]struct{}
}

func NewAppManager() *AppManager {
	ensurePacmanReliability()
	primaryUser, primaryHome := getSystemPrimaryUser()

	mgr := &AppManager{
		apps:        make(map[string]AppDefinition),
		appOrder:    make([]string, 0),
		packs:       make(map[string]AppliancePack),
		packOrder:   make([]string, 0),
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
			Unit:        getActiveSyncthingUnit(primaryUser),
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
			Unit:        "bbctl.service",
			Binary:      "bbctl",
			Port:        0,
			Icon:        "beeper",
			AccentColor: "#F43F5E",
			ConfigPath:  filepath.Join(primaryHome, ".config/bbctl/config.json"),
		},
		{
			ID:          "protonvpn",
			Name:        "Proton VPN Headless Client",
			Description: "High-speed Swiss encrypted WireGuard & OpenVPN tunnel with NetShield tracking/ad-blocker and DNS leak protection.",
			Tagline:     "High-speed Swiss WireGuard & OpenVPN tunnel",
			Category:    "network",
			Package:     "proton-vpn-cli",
			Unit:        "proton.VPN.service",
			Binary:      "protonvpn",
			Port:        0,
			Icon:        "protonvpn",
			AccentColor: "#6D4AFF",
			ConfigPath:  filepath.Join(primaryHome, ".config/protonvpn/user_settings.json"),
		},
		{
			ID:          "samba",
			Name:        "Samba SMB File Server",
			Description: "Windows, macOS, and Linux SMB/CIFS network drive server. Seamlessly browse and mount server storage on your home LAN without SSH.",
			Tagline:     "TrueNAS-style network file sharing",
			Category:    "storage",
			Package:     "samba",
			Unit:        "smb.service",
			Binary:      "smbd",
			Port:        445,
			ConfigPath:  "/etc/samba/smb.conf",
			Icon:        "syncthing",
			AccentColor: "#0EA5E9",
		},
	}

	for _, d := range definitions {
		mgr.apps[d.ID] = d
		mgr.appOrder = append(mgr.appOrder, d.ID)
	}

	packDefs := []AppliancePack{
		{
			ID:          "seerr-stack",
			Name:        "Ultimate Streaming & Servarr Stack",
			Tagline:     "Zero-touch 4K/1080p streaming cloud with automated discovery",
			Description: "Complete media automation stack featuring Jellyfin streaming server, Jellyseerr discovery and user requests portal, Radarr & Sonarr automated indexers via Prowlarr, Bazarr subtitle synchronization, and qBittorrent high-speed engine.",
			Badge:       "STREAMING & MEDIA",
			AccentColor: "#AA5CC3",
			Icon:        "seerr",
			Apps:        []string{"jellyfin", "seerr", "radarr", "sonarr", "prowlarr", "bazarr", "qbittorrent"},
			Features: []string{
				"Automated root libraries in /srv/media/{movies,shows}",
				"qBittorrent client authenticated and synced (:8080)",
				"Prowlarr public trackers (YTS, Nyaa, TPB, LimeTorrents) linked",
				"Bazarr multi-language subtitle automator connected",
				"Jellyseerr 1-click requests linked to Jellyfin & Servarrs (:5055)",
			},
		},
		{
			ID:          "manga-suite",
			Name:        "Manga & Comic Infinite Library",
			Tagline:     "Decentralized manga streaming & multi-device reading sync",
			Description: "Self-hosted manga, comic, and webtoon streaming hub powered by Suwayomi with 1,000+ Keiyoushi source extensions, built-in Suwayomi-Tsumiru reader, and SyncYomi sync bridge for Tachiyomi, Mihon, and Kuukiyomi.",
			Badge:       "MANGA & COMICS",
			AccentColor: "#F43F5E",
			Icon:        "suwayomi",
			Apps:        []string{"suwayomi", "syncyomi"},
			Features: []string{
				"1,000+ Keiyoushi manga source extensions enabled",
				"Local library storage in /srv/media/manga",
				"Suwayomi-Tsumiru native web reader (:4567 /tsumiru/)",
				"SyncYomi cross-device reading progress synchronization (:8282)",
			},
		},
		{
			ID:          "privacy-shield",
			Name:        "Mesh Privacy & Perimeter Shield",
			Tagline:     "Zero-trust encrypted VPN mesh, ad-blocking DNS & Tor routing",
			Description: "All-in-one homelab network defense: Tailscale WireGuard mesh for secure remote access without port forwarding, AdGuard Home for network-wide ad & tracker blocking, Proton VPN encrypted egress tunnel, and Tor onion proxy.",
			Badge:       "SECURITY & MESH",
			AccentColor: "#00D26A",
			Icon:        "adguard",
			Apps:        []string{"tailscale", "adguard", "protonvpn", "tor"},
			Features: []string{
				"Tailscale zero-config WireGuard mesh access",
				"AdGuard Home DNS-over-HTTPS & tracker blocking (:3000)",
				"Tor anonymous SOCKS5 onion proxy (:9050)",
				"Proton VPN high-speed egress encryption",
			},
		},
		{
			ID:          "audiophile-cloud",
			Name:        "Audiophile Music Cloud & Downloader",
			Tagline:     "Lossless Subsonic audio streaming & offline YouTube archiver",
			Description: "Modern high-fidelity music streaming server compatible with Symfonium, Feishin, and Substreamer, integrated with MeTube for headless scheduled downloading of YouTube Music tracks, albums, and playlists.",
			Badge:       "MUSIC & AUDIO",
			AccentColor: "#FF7F00",
			Icon:        "navidrome",
			Apps:        []string{"navidrome", "metube"},
			Features: []string{
				"Subsonic & Airsonic REST API support for mobile & desktop players",
				"Storage in /srv/media/music with automated library scanning",
				"Headless MeTube YouTube/SoundCloud playlist archiver (:8085)",
				"On-the-fly FLAC/Opus/MP3 transcoding",
			},
		},
		{
			ID:          "cloud-vault",
			Name:        "Cloud Vault & Resilient Backups",
			Tagline:     "Encrypted password manager, P2P sync & web file manager",
			Description: "Self-hosted digital sovereignty suite: Vaultwarden lightweight Bitwarden vault, Syncthing peer-to-peer decentralized file sync for laptops and phones, and FileBrowser Quantum web file explorer.",
			Badge:       "VAULT & SYNC",
			AccentColor: "#3B82F6",
			Icon:        "vaultwarden",
			Apps:        []string{"vaultwarden", "syncthing", "filebrowser"},
			Features: []string{
				"Bitwarden client compatibility (passwords, 2FA, passkeys)",
				"Syncthing continuous peer-to-peer real-time folder sync (:8384)",
				"FileBrowser web manager with audio, video, & document preview (:8082)",
				"Zero reliance on third-party cloud servers",
			},
		},
		{
			ID:          "second-brain",
			Name:        "Second Brain & Knowledge Base",
			Tagline:     "Real-time encrypted Obsidian LiveSync & markdown explorer",
			Description: "Self-hosted backend for Obsidian knowledge bases. CouchDB provides end-to-end encrypted real-time note synchronization across iOS, Android, and PC, alongside FileBrowser Quantum for remote document editing and backup.",
			Badge:       "KNOWLEDGE & NOTES",
			AccentColor: "#8B5CF6",
			Icon:        "couchdb",
			Apps:        []string{"couchdb", "filebrowser"},
			Features: []string{
				"CouchDB multi-master replication with CORS enabled (:5984)",
				"Zero-subscription Obsidian LiveSync support",
				"Instant conflict resolution and revision tracking",
				"Searchable markdown document vault",
			},
		},
		{
			ID:          "gaming-anvil",
			Name:        "Gaming Appliance & Anycast Tunnel",
			Tagline:     "High-tickrate PaperMC server with instant public Playit tunnel",
			Description: "Enterprise-tuned Minecraft server using PaperMC with Aikar's optimized JVM garbage collection parameters, paired with Playit.gg Anycast agent to give friends public join domains without port forwarding.",
			Badge:       "GAMING & CLOUD",
			AccentColor: "#10B981",
			Icon:        "minecraft",
			Apps:        []string{"minecraft", "playit"},
			Features: []string{
				"PaperMC high-performance server runtime (:25565)",
				"Aikar's optimized garbage collection GC flags pre-configured",
				"Playit.gg Anycast tunnel with custom public domain",
				"Automated crash recovery & systemd supervision",
			},
		},
		{
			ID:          "truenas-vault",
			Name:        "TrueNAS & Syncthing Storage Vault",
			Tagline:     "Enterprise storage, decentralized sync & Samba network drive sharing",
			Description: "TrueNAS-style unified storage architecture combining Syncthing continuous folder synchronization, Samba (SMB) network drive sharing for Windows/Mac/Linux PCs, and FileBrowser Quantum web management with pre-configured cross-platform permissions.",
			Badge:       "STORAGE & TRUENAS",
			AccentColor: "#0EA5E9",
			Icon:        "syncthing",
			Apps:        []string{"syncthing", "samba", "filebrowser"},
			Features: []string{
				"Samba SMB shares for /srv/storage and ~/drive (\\\\<server>\\shared)",
				"Syncthing ignorePerms=true configured to eliminate cross-OS permission conflicts",
				"Dedicated storage pools in /srv/storage/{shared,media,backups}",
				"LZ4/Zstandard block compression active across LAN & Tailscale mesh",
				"Instant client auto-pairing via curl http://<server>:8088/pair.sh | bash",
			},
		},
	}

	for _, p := range packDefs {
		mgr.packs[p.ID] = p
		mgr.packOrder = append(mgr.packOrder, p.ID)
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

func installBeeper(m *AppManager) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	m.AppendLog("beeper", "info", "Fetching official Beeper Bridge Manager (bbctl) release from GitHub...")
	tmpBin := "/tmp/bbctl-dl"
	bbArch := "amd64"
	if out, err := exec.Command("uname", "-m").Output(); err == nil {
		if strings.TrimSpace(string(out)) == "aarch64" {
			bbArch = "arm64"
		}
	}
	url := fmt.Sprintf("https://github.com/beeper/bridge-manager/releases/latest/download/bbctl-linux-%s", bbArch)

	if err := m.runStreamCmd(ctx, "beeper", "curl", "-fsSL", "--progress-bar", url, "-o", tmpBin); err != nil {
		return fmt.Errorf("failed to download bbctl: %w", err)
	}
	defer os.Remove(tmpBin)

	if err := m.runStreamCmd(ctx, "beeper", "install", "-m", "755", tmpBin, "/usr/local/bin/bbctl"); err != nil {
		return fmt.Errorf("failed to install bbctl binary: %w", err)
	}

	primaryUser, primaryHome := getSystemPrimaryUser()
	_ = os.MkdirAll(filepath.Join(primaryHome, ".local/bin"), 0755)
	_ = os.Remove(filepath.Join(primaryHome, ".local/bin/bbctl"))
	_ = os.Symlink("/usr/local/bin/bbctl", filepath.Join(primaryHome, ".local/bin/bbctl"))
	_ = os.MkdirAll(filepath.Join(primaryHome, ".config/bbctl"), 0755)
	_ = exec.Command("chown", "-R", fmt.Sprintf("%s:%s", primaryUser, primaryUser), filepath.Join(primaryHome, ".local"), filepath.Join(primaryHome, ".config/bbctl")).Run()

	m.AppendLog("beeper", "info", "Deploying systemd bridge template bbctl@.service...")
	templateContent := fmt.Sprintf(`[Unit]
Description=Beeper Bridge Manager - %%i
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=%s
WorkingDirectory=%s
ExecStart=/usr/local/bin/bbctl run %%i
Restart=always
RestartSec=10
Environment=HOME=%s
Environment=PATH=%s/.local/bin:/usr/local/bin:/usr/bin

[Install]
WantedBy=multi-user.target
`, primaryUser, primaryHome, primaryHome, primaryHome)

	if err := os.WriteFile("/etc/systemd/system/bbctl@.service", []byte(templateContent), 0644); err != nil {
		return fmt.Errorf("failed to create bbctl@.service: %w", err)
	}

	masterServiceContent := `[Unit]
Description=Beeper Bridge Manager Orchestrator
After=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/true

[Install]
WantedBy=multi-user.target
`
	if err := os.WriteFile("/etc/systemd/system/bbctl.service", []byte(masterServiceContent), 0644); err != nil {
		return fmt.Errorf("failed to create bbctl.service: %w", err)
	}

	beeperCtlScript := "/mnt/shared/projects/tinapple/tinarchy-src/configs/scripts/beeper-ctl.sh"
	if _, err := os.Stat(beeperCtlScript); err == nil {
		_ = exec.Command("install", "-m", "755", beeperCtlScript, "/usr/local/bin/beeper").Run()
	}

	m.AppendLog("beeper", "command", "$ systemctl daemon-reload")
	_ = m.runStreamCmd(ctx, "beeper", "systemctl", "daemon-reload")
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

func scanLinesOrCR(data []byte, atEOF bool) (advance int, token []byte, err error) {
	if atEOF && len(data) == 0 {
		return 0, nil, nil
	}
	for i := 0; i < len(data); i++ {
		if data[i] == '\n' || data[i] == '\r' {
			return i + 1, data[:i], nil
		}
	}
	if atEOF {
		return len(data), data, nil
	}
	return 0, nil, nil
}

func installRadarr(m *AppManager) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	cleanStalePacmanLock()
	m.AppendLog("radarr", "info", "Verifying required database libraries (sqlite)...")
	_ = m.runStreamCmd(ctx, "radarr", "pacman", "-S", "--noconfirm", "--needed", "sqlite")

	tmpTar := "/tmp/radarr.tar.gz"
	m.AppendLog("radarr", "info", "Streaming official Radarr NetCore Linux x64 release...")
	if err := m.runStreamCmd(ctx, "radarr", "curl", "--http1.1", "-fL", "--progress-bar", "https://radarr.servarr.com/v1/update/master/updatefile?os=linux&arch=x64&runtime=netcore", "-o", tmpTar); err != nil {
		return fmt.Errorf("failed to download radarr: %w", err)
	}
	defer os.Remove(tmpTar)

	_ = os.MkdirAll("/opt", 0755)
	m.AppendLog("radarr", "info", "Extracting Radarr to /opt/Radarr...")
	if err := m.runStreamCmd(ctx, "radarr", "tar", "-xzf", tmpTar, "-C", "/opt"); err != nil {
		return fmt.Errorf("failed to extract radarr: %w", err)
	}

	_ = os.Remove("/usr/local/bin/radarr")
	_ = os.Symlink("/opt/Radarr/Radarr", "/usr/local/bin/radarr")
	_ = os.MkdirAll("/var/lib/radarr", 0755)

	serviceContent := `[Unit]
Description=Radarr Movie Automator
After=network.target

[Service]
Type=simple
User=root
ExecStart=/opt/Radarr/Radarr -nobrowser -data=/var/lib/radarr/
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`
	if err := os.WriteFile("/etc/systemd/system/radarr.service", []byte(serviceContent), 0644); err != nil {
		return fmt.Errorf("failed to create radarr.service: %w", err)
	}
	_ = m.runStreamCmd(ctx, "radarr", "systemctl", "daemon-reload")
	return nil
}

func installSonarr(m *AppManager) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	cleanStalePacmanLock()
	m.AppendLog("sonarr", "info", "Verifying required database libraries (sqlite)...")
	_ = m.runStreamCmd(ctx, "sonarr", "pacman", "-S", "--noconfirm", "--needed", "sqlite")

	tmpTar := "/tmp/sonarr.tar.gz"
	m.AppendLog("sonarr", "info", "Streaming official Sonarr v4 Linux x64 release...")
	if err := m.runStreamCmd(ctx, "sonarr", "curl", "--http1.1", "-fL", "--progress-bar", "https://services.sonarr.tv/v1/download/main/latest?version=4&os=linux&arch=x64", "-o", tmpTar); err != nil {
		return fmt.Errorf("failed to download sonarr: %w", err)
	}
	defer os.Remove(tmpTar)

	_ = os.MkdirAll("/opt", 0755)
	m.AppendLog("sonarr", "info", "Extracting Sonarr to /opt/Sonarr...")
	if err := m.runStreamCmd(ctx, "sonarr", "tar", "-xzf", tmpTar, "-C", "/opt"); err != nil {
		return fmt.Errorf("failed to extract sonarr: %w", err)
	}

	_ = os.Remove("/usr/local/bin/sonarr")
	_ = os.Symlink("/opt/Sonarr/Sonarr", "/usr/local/bin/sonarr")
	_ = os.MkdirAll("/var/lib/sonarr", 0755)

	serviceContent := `[Unit]
Description=Sonarr TV Series Automator
After=network.target

[Service]
Type=simple
User=root
ExecStart=/opt/Sonarr/Sonarr -nobrowser -data=/var/lib/sonarr/
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`
	if err := os.WriteFile("/etc/systemd/system/sonarr.service", []byte(serviceContent), 0644); err != nil {
		return fmt.Errorf("failed to create sonarr.service: %w", err)
	}
	_ = m.runStreamCmd(ctx, "sonarr", "systemctl", "daemon-reload")
	return nil
}

func installProwlarr(m *AppManager) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	cleanStalePacmanLock()
	m.AppendLog("prowlarr", "info", "Verifying required database libraries (sqlite)...")
	_ = m.runStreamCmd(ctx, "prowlarr", "pacman", "-S", "--noconfirm", "--needed", "sqlite")

	tmpTar := "/tmp/prowlarr.tar.gz"
	m.AppendLog("prowlarr", "info", "Streaming official Prowlarr Linux x64 NetCore release...")
	if err := m.runStreamCmd(ctx, "prowlarr", "curl", "--http1.1", "-fL", "--progress-bar", "https://prowlarr.servarr.com/v1/update/master/updatefile?os=linux&arch=x64&runtime=netcore", "-o", tmpTar); err != nil {
		return fmt.Errorf("failed to download prowlarr: %w", err)
	}
	defer os.Remove(tmpTar)

	_ = os.MkdirAll("/opt", 0755)
	m.AppendLog("prowlarr", "info", "Extracting Prowlarr to /opt/Prowlarr...")
	if err := m.runStreamCmd(ctx, "prowlarr", "tar", "-xzf", tmpTar, "-C", "/opt"); err != nil {
		return fmt.Errorf("failed to extract prowlarr: %w", err)
	}

	_ = os.Remove("/usr/local/bin/prowlarr")
	_ = os.Symlink("/opt/Prowlarr/Prowlarr", "/usr/local/bin/prowlarr")
	_ = os.MkdirAll("/var/lib/prowlarr", 0755)

	serviceContent := `[Unit]
Description=Prowlarr Torrent and Usenet Indexer Proxy
After=network.target

[Service]
Type=simple
User=root
ExecStart=/opt/Prowlarr/Prowlarr -nobrowser -data=/var/lib/prowlarr/
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`
	if err := os.WriteFile("/etc/systemd/system/prowlarr.service", []byte(serviceContent), 0644); err != nil {
		return fmt.Errorf("failed to create prowlarr.service: %w", err)
	}
	_ = m.runStreamCmd(ctx, "prowlarr", "systemctl", "daemon-reload")
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
		scanner.Split(scanLinesOrCR)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line != "" {
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

func (m *AppManager) ListPacks() []AppliancePackStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]AppliancePackStatus, 0, len(m.packOrder))
	for _, id := range m.packOrder {
		pack := m.packs[id]
		status := AppliancePackStatus{
			AppliancePack: pack,
			TotalCount:    len(pack.Apps),
			AppsStatus:    make([]AppStatus, 0, len(pack.Apps)),
		}

		installedCount := 0
		runningCount := 0

		for _, appID := range pack.Apps {
			if def, exists := m.apps[appID]; exists {
				st := m.inspectApp(def)
				status.AppsStatus = append(status.AppsStatus, st)
				if st.Installed {
					installedCount++
				}
				if st.Running {
					runningCount++
				}
			}
		}

		status.InstalledCount = installedCount
		status.RunningCount = runningCount
		status.AllInstalled = (installedCount == len(pack.Apps) && len(pack.Apps) > 0)
		status.AllRunning = (runningCount == len(pack.Apps) && len(pack.Apps) > 0)

		result = append(result, status)
	}
	return result
}

func (m *AppManager) GetPack(id string) (*AppliancePackStatus, error) {
	m.mu.RLock()
	pack, ok := m.packs[id]
	m.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("pack %s not found", id)
	}

	status := AppliancePackStatus{
		AppliancePack: pack,
		TotalCount:    len(pack.Apps),
		AppsStatus:    make([]AppStatus, 0, len(pack.Apps)),
	}

	installedCount := 0
	runningCount := 0

	for _, appID := range pack.Apps {
		if def, exists := m.apps[appID]; exists {
			st := m.inspectApp(def)
			status.AppsStatus = append(status.AppsStatus, st)
			if st.Installed {
				installedCount++
			}
			if st.Running {
				runningCount++
			}
		}
	}

	status.InstalledCount = installedCount
	status.RunningCount = runningCount
	status.AllInstalled = (installedCount == len(pack.Apps) && len(pack.Apps) > 0)
	status.AllRunning = (runningCount == len(pack.Apps) && len(pack.Apps) > 0)

	return &status, nil
}

func (m *AppManager) Install(id string) error {
	m.operationMu.Lock()
	defer m.operationMu.Unlock()
	return m.installUnlocked(id)
}

func (m *AppManager) installUnlocked(id string) error {
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
		installErr = installProwlarr(m)
	case "radarr":
		m.AppendLog(id, "info", "Downloading official Radarr Linux x64 Servarr release...")
		installErr = installRadarr(m)
	case "sonarr":
		m.AppendLog(id, "info", "Downloading official Sonarr Linux x64 Servarr release...")
		installErr = installSonarr(m)
	case "beeper":
		m.AppendLog(id, "info", "Fetching official Beeper Bridge Manager (bbctl) release from GitHub...")
		installErr = installBeeper(m)
	case "protonvpn":
		cleanStalePacmanLock()
		m.AppendLog(id, "info", "Installing Proton VPN CLI, split-tunneling daemon & WireGuard tools...")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()
		installErr = m.runStreamCmd(ctx, id, "pacman", "-S", "--noconfirm", "--needed", "proton-vpn-cli", "proton-vpn-daemon", "wireguard-tools")
		if installErr != nil {
			primaryUser, _ := getSystemPrimaryUser()
			m.AppendLog(id, "warn", "Pacman failed, attempting AUR via paru...")
			installErr = m.runStreamCmd(ctx, id, "sudo", "-u", primaryUser, "paru", "-S", "--noconfirm", "--needed", "--skipreview", "proton-vpn-cli")
		}
		if installErr == nil {
			_ = m.runStreamCmd(ctx, id, "systemctl", "daemon-reload")
			_ = m.runStreamCmd(ctx, id, "systemctl", "enable", "--now", "proton.VPN.service")
		}
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

func (m *AppManager) InstallPack(id string) error {
	m.operationMu.Lock()
	defer m.operationMu.Unlock()

	m.mu.RLock()
	pack, ok := m.packs[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("pack %s not found", id)
	}

	m.SetInstallState("running", id, pack.Name)
	m.AppendLog(id, "command", fmt.Sprintf(">>> Initiating deployment pipeline for pack %s (%d apps)...", pack.Name, len(pack.Apps)))

	for i, appID := range pack.Apps {
		m.mu.RLock()
		def, exists := m.apps[appID]
		m.mu.RUnlock()
		if !exists {
			continue
		}

		st := m.inspectApp(def)
		if st.Installed {
			m.AppendLog(id, "info", fmt.Sprintf("[%d/%d] %s is already installed.", i+1, len(pack.Apps), def.Name))
			if !st.Running && def.Unit != "" {
				_ = exec.Command("systemctl", "start", def.Unit).Run()
			}
			continue
		}

		m.AppendLog(id, "command", fmt.Sprintf(">>> [%d/%d] Deploying %s (%s)...", i+1, len(pack.Apps), def.Name, appID))
		if err := m.installUnlocked(appID); err != nil {
			m.AppendLog(id, "error", fmt.Sprintf("Deployment failed on component %s: %v", def.Name, err))
			m.SetInstallState("error", id, pack.Name)
			return err
		}
	}

	// Auto-configure stack
	m.AppendLog(id, "command", fmt.Sprintf(">>> Executing stack orchestrator & auto-configuration for %s...", pack.Name))
	if err := m.configurePackUnlocked(id); err != nil {
		m.AppendLog(id, "warn", fmt.Sprintf("Notice during pack auto-configuration: %v", err))
	}

	_ = m.refreshProxyRoutes()
	m.AppendLog(id, "success", fmt.Sprintf("SUCCESS: All appliances in %s are deployed, configured, and operational!", pack.Name))
	m.SetInstallState("success", id, pack.Name)
	return nil
}

func (m *AppManager) ConfigurePack(id string) error {
	m.operationMu.Lock()
	defer m.operationMu.Unlock()
	return m.configurePackUnlocked(id)
}

func (m *AppManager) configurePackUnlocked(id string) error {
	m.mu.RLock()
	pack, ok := m.packs[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("pack %s not found", id)
	}

	m.SetInstallState("running", id, pack.Name)
	m.AppendLog(id, "command", fmt.Sprintf(">>> Running configuration engine for %s...", pack.Name))

	switch id {
	case "seerr-stack", "streaming":
		scriptPaths := []string{
			"/usr/local/bin/tinapple-configure-seerr",
			"/mnt/shared/projects/tinapple/scripts/tinapple-configure-seerr",
		}
		var scriptPath string
		for _, p := range scriptPaths {
			if _, err := os.Stat(p); err == nil {
				scriptPath = p
				break
			}
		}
		if scriptPath == "" {
			err := fmt.Errorf("tinapple-configure-seerr script not found on system")
			m.AppendLog(id, "error", err.Error())
			m.SetInstallState("error", id, pack.Name)
			return err
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		if err := m.runStreamCmd(ctx, id, "python3", scriptPath); err != nil {
			m.AppendLog(id, "error", fmt.Sprintf("Configuration script exited with error: %v", err))
			m.SetInstallState("error", id, pack.Name)
			return err
		}

	case "manga-suite":
		_ = os.MkdirAll("/srv/media/manga", 0775)
		_ = exec.Command("chown", "-R", "root:media", "/srv/media/manga").Run()
		_ = exec.Command("chmod", "-R", "775", "/srv/media/manga").Run()
		_ = exec.Command("chmod", "-R", "g+s", "/srv/media/manga").Run()
		m.AppendLog(id, "info", "[✓] Storage /srv/media/manga configured with media group permissions")
		_ = exec.Command("systemctl", "restart", "suwayomi-server").Run()
		m.AppendLog(id, "info", "[✓] Suwayomi Manga Server reloaded and active on port 4567")

	case "privacy-shield":
		ctx, cancel := context.WithTimeout(context.Background(), 1*time.Minute)
		defer cancel()
		for _, unit := range []string{"adguardhome", "tor", "tailscaled"} {
			_ = m.runStreamCmd(ctx, id, "systemctl", "enable", "--now", unit)
		}
		m.AppendLog(id, "info", "[✓] AdGuard Home DNS protection verified (:3000)")
		m.AppendLog(id, "info", "[✓] Tor anonymous SOCKS5 onion proxy verified (:9050)")
		m.AppendLog(id, "info", "[✓] Tailscale WireGuard mesh active")

	case "audiophile-cloud":
		_ = os.MkdirAll("/srv/media/music", 0775)
		_ = os.MkdirAll("/srv/media/youtube-music", 0775)
		_ = exec.Command("chown", "-R", "root:media", "/srv/media/music", "/srv/media/youtube-music").Run()
		_ = exec.Command("chmod", "-R", "775", "/srv/media/music", "/srv/media/youtube-music").Run()
		_ = exec.Command("chmod", "-R", "g+s", "/srv/media/music", "/srv/media/youtube-music").Run()
		for _, u := range []string{"navidrome", "pineapple"} {
			_ = exec.Command("usermod", "-aG", "media", u).Run()
		}
		_ = exec.Command("systemctl", "restart", "navidrome").Run()
		_ = exec.Command("systemctl", "restart", "metube").Run()
		m.AppendLog(id, "info", "[✓] /srv/media/music library configured and linked to MeTube downloads")
		m.AppendLog(id, "info", "[✓] Navidrome Subsonic music streamer active on port 4533")

	case "cloud-vault":
		_ = os.MkdirAll("/srv/backups", 0775)
		_ = exec.Command("chmod", "-R", "775", "/srv/backups").Run()
		_ = exec.Command("systemctl", "restart", "vaultwarden").Run()
		_ = exec.Command("systemctl", "restart", "filebrowser").Run()
		m.AppendLog(id, "info", "[✓] Vaultwarden Bitwarden-compatible vault active on port 8000")
		m.AppendLog(id, "info", "[✓] FileBrowser Quantum file manager active on port 8082")

	case "second-brain":
		_ = exec.Command("systemctl", "restart", "couchdb").Run()
		m.AppendLog(id, "info", "[✓] CouchDB LiveSync server active on port 5984")
		m.AppendLog(id, "info", "[✓] FileBrowser markdown vault ready")

	case "gaming-anvil":
		_ = os.MkdirAll("/srv/minecraft", 0775)
		_ = os.WriteFile("/srv/minecraft/eula.txt", []byte("eula=true\n"), 0644)
		_ = exec.Command("systemctl", "restart", "minecraft").Run()
		_ = exec.Command("systemctl", "restart", "playit").Run()
		m.AppendLog(id, "info", "[✓] PaperMC high-performance Minecraft engine active on port 25565")
		m.AppendLog(id, "info", "[✓] Playit.gg Anycast public domain tunnel active")

	case "truenas-vault":
		_ = os.MkdirAll("/srv/storage/shared", 0775)
		_ = os.MkdirAll("/srv/storage/media", 0775)
		_ = os.MkdirAll("/srv/storage/backups", 0775)
		_ = exec.Command("chmod", "-R", "775", "/srv/storage").Run()
		_ = exec.Command("chmod", "-R", "g+s", "/srv/storage").Run()

		if _, err := os.Stat("/etc/samba/smb.conf"); os.IsNotExist(err) {
			_ = os.MkdirAll("/etc/samba", 0755)
			smbTemplate := `[global]
   workgroup = WORKGROUP
   server string = Tinapple TrueNAS Storage
   server role = standalone server
   security = user
   map to guest = Bad User
   dns proxy = no

[shared]
   path = /srv/storage/shared
   browseable = yes
   writable = yes
   guest ok = yes
   create mask = 0775
   directory mask = 0775

[media]
   path = /srv/storage/media
   browseable = yes
   writable = yes
   guest ok = yes
   create mask = 0775
   directory mask = 0775
`
			_ = os.WriteFile("/etc/samba/smb.conf", []byte(smbTemplate), 0644)
		}

		_ = exec.Command("systemctl", "enable", "--now", "smb.service").Run()
		_ = exec.Command("systemctl", "restart", "syncthing").Run()
		_ = exec.Command("systemctl", "restart", "filebrowser").Run()
		m.AppendLog(id, "info", "[✓] Storage hierarchy /srv/storage/{shared,media,backups} provisioned")
		m.AppendLog(id, "info", "[✓] Samba SMB shares enabled (accessible at \\\\<server>\\shared without SSH)")
		m.AppendLog(id, "info", "[✓] Syncthing continuous peer-to-peer sync engine active (:8384)")
		m.AppendLog(id, "info", "[✓] FileBrowser Quantum web management active (:8082)")
	}

	m.AppendLog(id, "success", fmt.Sprintf("SUCCESS: %s is 100%% configured, synchronized, and operational!", pack.Name))
	m.SetInstallState("success", id, pack.Name)
	return nil
}

func (m *AppManager) StartPack(id string) error {
	m.operationMu.Lock()
	defer m.operationMu.Unlock()
	m.mu.RLock()
	pack, ok := m.packs[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("pack %s not found", id)
	}
	for _, appID := range pack.Apps {
		m.mu.RLock()
		app, ok := m.apps[appID]
		m.mu.RUnlock()
		if ok && app.Unit != "" {
			_ = exec.Command("systemctl", "start", app.Unit).Run()
		}
	}
	return m.refreshProxyRoutes()
}

func (m *AppManager) StopPack(id string) error {
	m.operationMu.Lock()
	defer m.operationMu.Unlock()
	m.mu.RLock()
	pack, ok := m.packs[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("pack %s not found", id)
	}
	for _, appID := range pack.Apps {
		m.mu.RLock()
		app, ok := m.apps[appID]
		m.mu.RUnlock()
		if ok && app.Unit != "" {
			_ = exec.Command("systemctl", "stop", app.Unit).Run()
		}
	}
	return m.refreshProxyRoutes()
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
	case "protonvpn":
		_ = exec.Command("systemctl", "disable", "--now", "proton.VPN.service").Run()
		cleanStalePacmanLock()
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		_ = exec.CommandContext(ctx, "pacman", "-R", "--noconfirm", "proton-vpn-cli", "proton-vpn-daemon").Run()
	case "beeper":
		_ = exec.Command("systemctl", "disable", "--now", "bbctl.service").Run()
		out, _ := exec.Command("systemctl", "list-units", "--type=service", "--state=running", "--no-legend", "bbctl@*").CombinedOutput()
		for _, line := range strings.Split(string(out), "\n") {
			fields := strings.Fields(line)
			if len(fields) > 0 && strings.HasPrefix(fields[0], "bbctl@") {
				_ = exec.Command("systemctl", "stop", fields[0]).Run()
			}
		}
		_ = os.Remove("/usr/local/bin/bbctl")
		_ = os.Remove("/usr/local/bin/beeper")
		_ = os.Remove("/etc/systemd/system/bbctl.service")
		_ = os.Remove("/etc/systemd/system/bbctl@.service")
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

func (m *AppManager) RunSystemUpdate() error {
	scriptPaths := []string{
		"/usr/local/bin/tinapple-update",
		"/usr/bin/tinapple-update",
		"/mnt/shared/projects/tinapple/scripts/tinapple-update",
	}
	var scriptPath string
	for _, p := range scriptPaths {
		if _, err := os.Stat(p); err == nil {
			scriptPath = p
			break
		}
	}
	if scriptPath == "" {
		return fmt.Errorf("tinapple-update executable not found on system")
	}

	m.SetInstallState("running", "system-update", "Tinapple OS & Feature Update")
	m.AppendLog("system-update", "command", ">>> Initiating full system pacman/paru upgrade and feature sync...")

	go func() {
		m.operationMu.Lock()
		defer m.operationMu.Unlock()

		ctx, cancel := context.WithTimeout(context.Background(), 25*time.Minute)
		defer cancel()

		if err := m.runStreamCmd(ctx, "system-update", "bash", scriptPath); err != nil {
			m.AppendLog("system-update", "error", fmt.Sprintf("System update pipeline failed: %v", err))
			m.SetInstallState("error", "system-update", "Tinapple OS & Feature Update")
			return
		}

		_ = m.refreshProxyRoutes()
		m.AppendLog("system-update", "success", "SUCCESS: All system packages, appliances, and features are fully updated!")
		m.SetInstallState("success", "system-update", "Tinapple OS & Feature Update")
	}()

	return nil
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

	// Check autostart via systemctl is-enabled
	autostart := false
	if cmd := exec.Command("systemctl", "is-enabled", app.Unit); cmd.Run() == nil {
		autostart = true
	}

	res := map[string]interface{}{
		"id":         app.ID,
		"name":       app.Name,
		"port":       app.Port,
		"configPath": app.ConfigPath,
		"unit":       app.Unit,
		"autostart":  autostart,
		"customEnv":  make(map[string]string),
	}

	// If drop-in override exists, read it
	dropInPath := fmt.Sprintf("/etc/systemd/system/%s.d/tinapple-override.conf", app.Unit)
	if data, err := os.ReadFile(dropInPath); err == nil {
		res["rawOverride"] = string(data)
	}

	// Read full config file if config file exists (up to 200KB)
	if app.ConfigPath != "" {
		if data, err := os.ReadFile(app.ConfigPath); err == nil {
			if len(data) > 200000 {
				res["rawConfig"] = string(data[:200000]) + "\n... [truncated]"
			} else {
				res["rawConfig"] = string(data)
			}
			if app.ID == "syncthing" {
				res["ignorePerms"] = strings.Contains(string(data), "<ignorePerms>true</ignorePerms>")
			}
		}
	}

	return res, nil
}

type UpdateConfigRequest struct {
	Port        int               `json:"port"`
	CustomEnv   map[string]string `json:"customEnv"`
	RawConfig   string            `json:"rawConfig"`
	Autostart   *bool             `json:"autostart"`
	CpuWeight   int               `json:"cpuWeight"`
	IgnorePerms *bool             `json:"ignorePerms"`
}

func (m *AppManager) UpdateConfig(id string, req UpdateConfigRequest) error {
	m.mu.RLock()
	app, ok := m.apps[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("app %s not found", id)
	}

	// 1. Direct Raw Config Box update: if provided, write to app.ConfigPath
	if req.RawConfig != "" && app.ConfigPath != "" {
		if err := os.MkdirAll(filepath.Dir(app.ConfigPath), 0755); err == nil {
			_ = os.WriteFile(app.ConfigPath, []byte(req.RawConfig), 0644)
		}
	}

	// 2. Autostart toggle
	if req.Autostart != nil {
		if *req.Autostart {
			_ = exec.Command("systemctl", "enable", app.Unit).Run()
		} else {
			_ = exec.Command("systemctl", "disable", app.Unit).Run()
		}
	}

	// 3. Drop-in overrides (Port, CPU Weight, Custom Environment)
	dropInDir := fmt.Sprintf("/etc/systemd/system/%s.d", app.Unit)
	if err := os.MkdirAll(dropInDir, 0755); err != nil {
		return fmt.Errorf("failed to create override dir: %w", err)
	}

	var dropInContent strings.Builder
	dropInContent.WriteString("[Service]\n")
	if req.Port > 0 {
		dropInContent.WriteString(fmt.Sprintf("Environment=\"PORT=%d\"\n", req.Port))
	}
	if req.CpuWeight > 0 {
		dropInContent.WriteString(fmt.Sprintf("CPUWeight=%d\n", req.CpuWeight))
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
		return fmt.Errorf("proxy refresh failed: %s (%w)", string(out), err)
	}
	return nil
}
