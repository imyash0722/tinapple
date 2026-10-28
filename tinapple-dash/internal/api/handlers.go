package api

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"strings"
	"sync"
	"time"

	"tinapple-dash/internal/config"
	"tinapple-dash/internal/services"
	"tinapple-dash/internal/telemetry"
	"tinapple-dash/internal/terminal"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type Handler struct {
	cfg            *config.Manifest
	svcMgr         *services.SystemdManager
	appMgr         *services.AppManager
	playitMgr      *services.PlayitManager
	tailscaleMgr   *services.TailscaleManager
	telemetry      *telemetry.Collector
	wsUpgrader     websocket.Upgrader
	wsClients      map[*websocket.Conn]bool
}

func NewHandler(cfg *config.Manifest, svcMgr *services.SystemdManager, tel *telemetry.Collector) *Handler {
	return &Handler{
		cfg:          cfg,
		svcMgr:       svcMgr,
		appMgr:       services.NewAppManager(),
		playitMgr:    services.NewPlayitManager(),
		tailscaleMgr: services.NewTailscaleManager(),
		telemetry:    tel,
		wsClients:    make(map[*websocket.Conn]bool),
		wsUpgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func (h *Handler) getClientIP(c *gin.Context) string {
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 && strings.TrimSpace(parts[0]) != "" {
			return strings.TrimSpace(parts[0])
		}
	}
	if xrip := c.GetHeader("X-Real-IP"); xrip != "" {
		return strings.TrimSpace(xrip)
	}
	return c.ClientIP()
}

func (h *Handler) getClientRole(c *gin.Context) (bool, string) {
	clientIP := h.getClientIP(c)
	return h.tailscaleMgr.CheckClientRole(c.Request.Context(), clientIP)
}

func (h *Handler) UserRole(c *gin.Context) {
	isOwner, user := h.getClientRole(c)
	c.JSON(http.StatusOK, gin.H{
		"isAdmin":    isOwner,
		"clientIp":   h.getClientIP(c),
		"clientUser": user,
	})
}

func isRestrictedService(name string) bool {
	n := strings.ToLower(strings.TrimSpace(name))
	return n == "suwayomi" || n == "suwayomi-server" || n == "suwayomi-server.service"
}

func SetupRoutes(r *gin.Engine, cfg *config.Manifest, svcMgr *services.SystemdManager, tel *telemetry.Collector) {
	h := NewHandler(cfg, svcMgr, tel)

	// API v1 group
	v1 := r.Group("/api/v1")
	{
		// Role & Identity
		v1.GET("/user/role", h.UserRole)
		v1.GET("/auth/role", h.UserRole)

		// System info
		v1.GET("/system/info", h.SystemInfo)
		v1.GET("/system/disks", h.SystemDisks)
		v1.GET("/system/telemetry", h.TelemetrySnapshot)
		v1.GET("/system/telemetry/stream", h.TelemetryStream)
		v1.POST("/system/reboot", h.SystemReboot)
		v1.POST("/system/timesync", h.SystemTimesync)
		v1.POST("/system/autostart", h.SystemAutostart)
		v1.POST("/system/manifest", h.UpdateManifest)
		v1.POST("/system/install", h.RunInstall)
		v1.GET("/system/install/status", h.InstallStatus)
		v1.POST("/system/update", h.RunSystemUpdate)

		// Apps (Comprehensive Application & Config Management)
		v1.GET("/apps", h.ListApps)
		v1.GET("/apps/install/progress", h.GetInstallProgress)
		v1.GET("/apps/install/stream", h.InstallProgressStream)
		v1.POST("/apps/install/clear", h.ClearInstallLogs)
		v1.GET("/apps/:name", h.GetApp)
		v1.POST("/apps/:name/install", h.InstallApp)
		v1.POST("/apps/:name/uninstall", h.UninstallApp)
		v1.POST("/apps/:name/start", h.StartApp)
		v1.POST("/apps/:name/stop", h.StopApp)
		v1.POST("/apps/:name/restart", h.RestartApp)
		v1.GET("/apps/:name/config", h.GetAppConfig)
		v1.POST("/apps/:name/config", h.UpdateAppConfig)

		// Appliance Packs & Stacks
		v1.GET("/packs", h.ListPacks)
		v1.GET("/packs/:name", h.GetPack)
		v1.POST("/packs/:name/install", h.InstallPack)
		v1.POST("/packs/:name/configure", h.ConfigurePack)
		v1.POST("/packs/:name/start", h.StartPack)
		v1.POST("/packs/:name/stop", h.StopPack)

		// Services
		v1.GET("/services", h.ListServices)
		v1.GET("/services/:name", h.GetService)
		v1.POST("/services/:name/start", h.StartService)
		v1.POST("/services/:name/stop", h.StopService)
		v1.POST("/services/:name/restart", h.RestartService)
		v1.POST("/services/:name/enable", h.EnableService)
		v1.POST("/services/:name/disable", h.DisableService)
		v1.GET("/services/:name/logs", h.ServiceLogs)

		// Hardware
		v1.GET("/hardware/info", h.HardwareInfo)
		v1.GET("/hardware/battery", h.BatteryInfo)
		v1.POST("/hardware/battery/charge-limit", h.SetChargeLimit)
		v1.GET("/hardware/thermal", h.ThermalInfo)
		v1.POST("/hardware/thermal/profile", h.SetThermalProfile)
		v1.GET("/hardware/power-profile", h.PowerProfileInfo)
		v1.POST("/hardware/power-profile", h.SetPowerProfile)

		// Session management
		v1.GET("/session", h.GetSession)
		v1.POST("/session", h.SetSession)

		// Configuration
		v1.GET("/config", h.GetConfig)
		v1.POST("/config", h.UpdateConfig)

		// Playit.gg Minecraft & Homelab Anycast Tunnel
		v1.GET("/playit/status", h.GetPlayitStatus)
		v1.POST("/playit/claim", h.GeneratePlayitClaim)
		v1.POST("/playit/secret", h.SetPlayitSecret)
		v1.POST("/playit/start", h.StartPlayit)
		v1.POST("/playit/stop", h.StopPlayit)
		v1.POST("/playit/reset", h.ResetPlayit)

		// Tailscale Mesh VPN
		v1.GET("/tailscale/status", h.GetTailscaleStatus)
		v1.POST("/tailscale/login", h.LoginTailscale)
		v1.POST("/tailscale/logout", h.LogoutTailscale)
		v1.POST("/tailscale/up", h.UpTailscale)
		v1.POST("/tailscale/down", h.DownTailscale)

		// Tor Anonymity & Privacy Exit
		v1.GET("/system/tor-exit", h.GetTorStatus)
		v1.POST("/system/tor-exit", h.ToggleTorStatus)

		// Wallpapers (Tinarchy style with video loops and custom upload)
		v1.GET("/wallpapers", h.ListWallpapers)
		v1.POST("/wallpapers/upload", h.UploadWallpaper)
		v1.POST("/wallpapers/select", h.SelectWallpaper)

		// Server Operations & Network Toolkit
		v1.GET("/tools/open-ports", h.GetOpenPorts)
		v1.GET("/tools/ports", h.GetOpenPorts)
		v1.POST("/tools/run", h.RunMaintenanceTool)
		v1.POST("/tools/maintenance", h.RunMaintenanceTool)
		v1.GET("/tools/failed-units", h.GetFailedUnits)
		v1.GET("/tools/dmesg", h.GetKernelLogs)
		v1.GET("/tools/kernel-logs", h.GetKernelLogs)

		// Interactive Web Terminal (PTY WebSocket)
		v1.GET("/terminal/ws", h.TerminalWebSocket)

		// WebSocket
		v1.GET("/ws", h.WebSocketHandler)
	}

	// Universal Client Pairing Endpoint (Tinarchy style)
	r.GET("/pair.sh", h.ServePairScript)
	r.GET("/pair", h.ServePairScript)

	// Native Widget Fallbacks & Direct Proxy
	r.GET("/api/widgets/qbittorrent", h.WidgetQBittorrent)
	r.GET("/api/widgets/jdownloader", h.WidgetJDownloader)
	r.POST("/api/widgets/jdownloader/add", h.WidgetJDownloader)
	r.GET("/api/widgets/manga", h.WidgetManga)
	r.GET("/api/v1/manga/:id/thumbnail", h.ProxyMangaThumbnail)
	r.HEAD("/api/v1/manga/:id/thumbnail", h.ProxyMangaThumbnail)
	r.GET("/api/widgets/manga/thumbnail/:id", h.ProxyMangaThumbnail)
	r.GET("/api/beeper/status", h.BeeperStatus)
	r.GET("/api/system/tor-exit", h.GetTorStatus)
	r.POST("/api/system/tor-exit", h.ToggleTorStatus)

	// Wallpaper APIs (compatible with v1 and legacy Tinarchy paths)
	r.GET("/api/wallpapers", h.ListWallpapers)
	r.POST("/api/wallpapers/upload", h.UploadWallpaper)
	r.POST("/api/wallpaper/upload", h.UploadWallpaper)
	r.POST("/api/wallpapers/select", h.SelectWallpaper)
	r.POST("/api/wallpaper/select", h.SelectWallpaper)
	r.GET("/api/pywal", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"colors": gin.H{
				"primary":   "#38bdf8",
				"secondary": "#3b82f6",
			},
		})
	})
}

// SystemInfo returns basic system information
func (h *Handler) SystemInfo(c *gin.Context) {
	// In Arch Linux live boot environment, /run/archiso is present.
	// The system is in live installer mode ONLY when /run/archiso exists
	// and no installation marker is found. In all other environments (installed system or local host), installed is true.
	installed := true
	if _, err := os.Stat("/run/archiso"); err == nil {
		installed = false
	}
	if _, err := os.Stat("/etc/tinapple-installed"); err == nil {
		installed = true
	} else if _, err := os.Stat("/var/lib/tinapple/installed"); err == nil {
		installed = true
	}

	firmware := "bios"
	if _, err := os.Stat("/sys/firmware/efi"); err == nil {
		firmware = "uefi"
	}

	var uptimeSec int
	if data, err := os.ReadFile("/proc/uptime"); err == nil {
		var u float64
		fmt.Sscanf(string(data), "%f", &u)
		uptimeSec = int(u)
	}

	isOwner, clientUser := h.getClientRole(c)

	info := map[string]interface{}{
		"hostname":       h.cfg.Hostname,
		"kernel":         h.cfg.KernelProfile,
		"session":        h.cfg.SessionMode,
		"hardware":       h.cfg.HardwareProfile,
		"filesystem":     h.cfg.Filesystem,
		"bootloader":     h.cfg.Bootloader,
		"firmware":       firmware,
		"installed":      installed,
		"uptime":         getUptime(),
		"uptime_seconds": uptimeSec,
		"is_admin":       isOwner,
		"client_ip":      h.getClientIP(c),
		"client_user":    clientUser,
	}
	c.JSON(http.StatusOK, info)
}

type LsblkDevice struct {
	Name     string         `json:"name"`
	Path     string         `json:"path"`
	Size     string         `json:"size"`
	Type     string         `json:"type"`
	Model    *string        `json:"model"`
	Vendor   *string        `json:"vendor"`
	Tran     *string        `json:"tran"`
	Ro       bool           `json:"ro"`
	Children []LsblkDevice  `json:"children,omitempty"`
}

type LsblkResult struct {
	Blockdevices []LsblkDevice `json:"blockdevices"`
}

type DiskInfo struct {
	ID          string `json:"id"`
	Size        string `json:"size"`
	Model       string `json:"model"`
	Type        string `json:"type"`
	IsBootMedia bool   `json:"isBootMedia"`
	IsTarget    bool   `json:"isTarget"`
}

// SystemDisks enumerates real storage drives on the host
func (h *Handler) SystemDisks(c *gin.Context) {
	out, err := exec.Command("lsblk", "-J", "-o", "NAME,PATH,SIZE,TYPE,MODEL,VENDOR,TRAN,RO").Output()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to list disks: %v", err)})
		return
	}

	var res LsblkResult
	if err := json.Unmarshal(out, &res); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to parse disk info: %v", err)})
		return
	}

	var disks []DiskInfo
	for _, dev := range res.Blockdevices {
		if dev.Type != "disk" || strings.HasPrefix(dev.Name, "zram") || strings.HasPrefix(dev.Name, "loop") {
			continue
		}

		modelStr := ""
		if dev.Vendor != nil && strings.TrimSpace(*dev.Vendor) != "" {
			modelStr = strings.TrimSpace(*dev.Vendor) + " "
		}
		if dev.Model != nil && strings.TrimSpace(*dev.Model) != "" {
			modelStr += strings.TrimSpace(*dev.Model)
		} else {
			modelStr += "Generic Storage Drive"
		}

		tranStr := ""
		if dev.Tran != nil && *dev.Tran != "" {
			tranStr = strings.ToUpper(*dev.Tran)
			modelStr += fmt.Sprintf(" (%s)", tranStr)
		}

		isBoot := (dev.Tran != nil && *dev.Tran == "usb") || strings.Contains(strings.ToLower(modelStr), "flash")
		isTarget := !isBoot && !dev.Ro

		disks = append(disks, DiskInfo{
			ID:          dev.Path,
			Size:        dev.Size,
			Model:       modelStr,
			Type:        dev.Type,
			IsBootMedia: isBoot,
			IsTarget:    isTarget,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"disks": disks,
	})
}

// RunSystemUpdate initiates a system-wide upgrade and feature synchronization
func (h *Handler) RunSystemUpdate(c *gin.Context) {
	if err := h.appMgr.RunSystemUpdate(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "initiated", "message": "System update pipeline running in background"})
}

// TelemetrySnapshot returns current telemetry data
func (h *Handler) TelemetrySnapshot(c *gin.Context) {
	data := h.telemetry.GetSnapshot()
	c.JSON(http.StatusOK, data)
}

// TelemetryStream provides SSE stream for real-time telemetry
func (h *Handler) TelemetryStream(c *gin.Context) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	clientGone := c.Request.Context().Done()
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-clientGone:
			return
		case <-ticker.C:
			data := h.telemetry.GetSnapshot()
			c.SSEvent("telemetry", data)
			c.Writer.Flush()
		}
	}
}

// ListApps returns all managed applications with real live statuses
func (h *Handler) ListApps(c *gin.Context) {
	isOwner, _ := h.getClientRole(c)
	apps := h.appMgr.ListApps()
	if !isOwner {
		filtered := make([]services.AppStatus, 0, len(apps))
		for _, a := range apps {
			if isRestrictedService(a.ID) {
				continue
			}
			filtered = append(filtered, a)
		}
		apps = filtered
	}
	c.JSON(http.StatusOK, gin.H{"apps": apps})
}

// GetApp returns detailed status for a single application
func (h *Handler) GetApp(c *gin.Context) {
	name := c.Param("name")
	isOwner, _ := h.getClientRole(c)
	if !isOwner && isRestrictedService(name) {
		c.JSON(http.StatusNotFound, gin.H{"error": "app not found"})
		return
	}
	app, err := h.appMgr.GetApp(name)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, app)
}

// GetInstallProgress returns the current store download/install terminal state
func (h *Handler) GetInstallProgress(c *gin.Context) {
	st := h.appMgr.GetInstallProgress()
	c.JSON(http.StatusOK, st)
}

// InstallProgressStream provides an SSE event stream for live store download & provisioning logs
func (h *Handler) InstallProgressStream(c *gin.Context) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	ch, unsubscribe := h.appMgr.SubscribeInstallLogs()
	defer unsubscribe()

	clientGone := c.Request.Context().Done()

	// Initial dump of state
	c.SSEvent("status", h.appMgr.GetInstallProgress())
	c.Writer.Flush()

	heartbeat := time.NewTicker(15 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-clientGone:
			return
		case <-heartbeat.C:
			c.SSEvent("ping", "pong")
			c.Writer.Flush()
		case logMsg, ok := <-ch:
			if !ok {
				return
			}
			c.SSEvent("log", logMsg)
			c.Writer.Flush()
		}
	}
}

// ClearInstallLogs resets the install progress state
func (h *Handler) ClearInstallLogs(c *gin.Context) {
	h.appMgr.ClearInstallLogs()
	c.JSON(http.StatusOK, gin.H{"status": "cleared"})
}

// InstallApp triggers package installation and service setup
func (h *Handler) InstallApp(c *gin.Context) {
	name := c.Param("name")
	isOwner, _ := h.getClientRole(c)
	if !isOwner && isRestrictedService(name) {
		c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
		return
	}
	if err := h.appMgr.Install(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	app, _ := h.appMgr.GetApp(name)
	c.JSON(http.StatusOK, gin.H{"status": "installed", "app": app})
}

// UninstallApp stops the unit and uninstalls the package
func (h *Handler) UninstallApp(c *gin.Context) {
	name := c.Param("name")
	isOwner, _ := h.getClientRole(c)
	if !isOwner && isRestrictedService(name) {
		c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
		return
	}
	if err := h.appMgr.Uninstall(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	app, _ := h.appMgr.GetApp(name)
	c.JSON(http.StatusOK, gin.H{"status": "uninstalled", "app": app})
}

// StartApp starts the app's systemd unit
func (h *Handler) StartApp(c *gin.Context) {
	name := c.Param("name")
	isOwner, _ := h.getClientRole(c)
	if !isOwner && isRestrictedService(name) {
		c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
		return
	}
	if err := h.appMgr.Start(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	app, _ := h.appMgr.GetApp(name)
	c.JSON(http.StatusOK, gin.H{"status": "started", "app": app})
}

// StopApp stops the app's systemd unit
func (h *Handler) StopApp(c *gin.Context) {
	name := c.Param("name")
	isOwner, _ := h.getClientRole(c)
	if !isOwner && isRestrictedService(name) {
		c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
		return
	}
	if err := h.appMgr.Stop(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	app, _ := h.appMgr.GetApp(name)
	c.JSON(http.StatusOK, gin.H{"status": "stopped", "app": app})
}

// RestartApp restarts the app's systemd unit
func (h *Handler) RestartApp(c *gin.Context) {
	name := c.Param("name")
	isOwner, _ := h.getClientRole(c)
	if !isOwner && isRestrictedService(name) {
		c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
		return
	}
	if err := h.appMgr.Restart(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	app, _ := h.appMgr.GetApp(name)
	c.JSON(http.StatusOK, gin.H{"status": "restarted", "app": app})
}

// GetAppConfig retrieves configuration information
func (h *Handler) GetAppConfig(c *gin.Context) {
	name := c.Param("name")
	isOwner, _ := h.getClientRole(c)
	if !isOwner && isRestrictedService(name) {
		c.JSON(http.StatusNotFound, gin.H{"error": "app not found"})
		return
	}
	cfg, err := h.appMgr.GetConfig(name)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, cfg)
}

// UpdateAppConfig saves port and environment overrides
func (h *Handler) UpdateAppConfig(c *gin.Context) {
	name := c.Param("name")
	isOwner, _ := h.getClientRole(c)
	if !isOwner && isRestrictedService(name) {
		c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
		return
	}
	var req services.UpdateConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.appMgr.UpdateConfig(name, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

// ListPacks returns all curated appliance packs with live status
func (h *Handler) ListPacks(c *gin.Context) {
	packs := h.appMgr.ListPacks()
	c.JSON(http.StatusOK, packs)
}

// GetPack returns a specific pack with its live status
func (h *Handler) GetPack(c *gin.Context) {
	name := c.Param("name")
	pack, err := h.appMgr.GetPack(name)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, pack)
}

// InstallPack triggers batch installation of all apps in the pack
func (h *Handler) InstallPack(c *gin.Context) {
	name := c.Param("name")
	if err := h.appMgr.InstallPack(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	pack, _ := h.appMgr.GetPack(name)
	c.JSON(http.StatusOK, gin.H{"status": "installed", "pack": pack})
}

// ConfigurePack executes stack orchestrator & auto-configuration
func (h *Handler) ConfigurePack(c *gin.Context) {
	name := c.Param("name")
	if err := h.appMgr.ConfigurePack(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	pack, _ := h.appMgr.GetPack(name)
	c.JSON(http.StatusOK, gin.H{"status": "configured", "pack": pack})
}

// StartPack starts all apps in the pack
func (h *Handler) StartPack(c *gin.Context) {
	name := c.Param("name")
	if err := h.appMgr.StartPack(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	pack, _ := h.appMgr.GetPack(name)
	c.JSON(http.StatusOK, gin.H{"status": "started", "pack": pack})
}

// StopPack stops all apps in the pack
func (h *Handler) StopPack(c *gin.Context) {
	name := c.Param("name")
	if err := h.appMgr.StopPack(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	pack, _ := h.appMgr.GetPack(name)
	c.JSON(http.StatusOK, gin.H{"status": "stopped", "pack": pack})
}

// ListServices returns all services with real on-disk and live systemd status
func (h *Handler) ListServices(c *gin.Context) {
	isOwner, _ := h.getClientRole(c)
	apps := h.appMgr.ListApps()
	services := make([]map[string]interface{}, 0, len(apps))

	for _, a := range apps {
		if !isOwner && isRestrictedService(a.ID) {
			continue
		}
		services = append(services, map[string]interface{}{
			"id":            a.ID,
			"name":          a.ID,
			"displayName":   a.Name,
			"description":   a.Description,
			"tagline":       a.Tagline,
			"category":      a.Category,
			"enabled":       a.Enabled,
			"installed":     a.Installed,
			"running":       a.Running,
			"port":          a.Port,
			"status":        a.Status,
			"activeState":   a.ActiveState,
			"subState":      a.SubState,
			"loadState":     a.LoadState,
			"unitFileState": a.LoadState,
			"icon":          a.Icon,
			"accentColor":   a.AccentColor,
		})
	}
	c.JSON(http.StatusOK, gin.H{"services": services})
}

// GetService returns detailed service info
func (h *Handler) GetService(c *gin.Context) {
	name := c.Param("name")
	isOwner, _ := h.getClientRole(c)
	if !isOwner && isRestrictedService(name) {
		c.JSON(http.StatusNotFound, gin.H{"error": "service not found"})
		return
	}
	svc, ok := h.cfg.Services[name]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "service not found"})
		return
	}
	status, _ := h.svcMgr.GetStatus(name)
	c.JSON(http.StatusOK, gin.H{
		"name":    name,
		"enabled": svc.Enabled,
		"port":    svc.Port,
		"user":    svc.User,
		"status":  status,
	})
}

// StartService starts a service
func (h *Handler) StartService(c *gin.Context) {
	name := c.Param("name")
	isOwner, _ := h.getClientRole(c)
	if !isOwner && isRestrictedService(name) {
		c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
		return
	}
	if app, err := h.appMgr.GetApp(name); err == nil && app.Unit != "" {
		if err := h.appMgr.Start(name); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "started"})
		return
	}
	if err := h.svcMgr.Start(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "started"})
}

// StopService stops a service
func (h *Handler) StopService(c *gin.Context) {
	name := c.Param("name")
	isOwner, _ := h.getClientRole(c)
	if !isOwner && isRestrictedService(name) {
		c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
		return
	}
	if app, err := h.appMgr.GetApp(name); err == nil && app.Unit != "" {
		if err := h.appMgr.Stop(name); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "stopped"})
		return
	}
	if err := h.svcMgr.Stop(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "stopped"})
}

// RestartService restarts a service
func (h *Handler) RestartService(c *gin.Context) {
	name := c.Param("name")
	isOwner, _ := h.getClientRole(c)
	if !isOwner && isRestrictedService(name) {
		c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
		return
	}
	if app, err := h.appMgr.GetApp(name); err == nil && app.Unit != "" {
		if err := h.appMgr.Restart(name); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "restarted"})
		return
	}
	if err := h.svcMgr.Restart(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "restarted"})
}

// EnableService enables a service
func (h *Handler) EnableService(c *gin.Context) {
	name := c.Param("name")
	isOwner, _ := h.getClientRole(c)
	if !isOwner && isRestrictedService(name) {
		c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
		return
	}
	targetUnit := name
	if app, err := h.appMgr.GetApp(name); err == nil && app.Unit != "" {
		targetUnit = app.Unit
	}
	if err := h.svcMgr.Enable(targetUnit); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "enabled"})
}

// DisableService disables a service
func (h *Handler) DisableService(c *gin.Context) {
	name := c.Param("name")
	isOwner, _ := h.getClientRole(c)
	if !isOwner && isRestrictedService(name) {
		c.JSON(http.StatusForbidden, gin.H{"error": "permission denied"})
		return
	}
	targetUnit := name
	if app, err := h.appMgr.GetApp(name); err == nil && app.Unit != "" {
		targetUnit = app.Unit
	}
	if err := h.svcMgr.Disable(targetUnit); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "disabled"})
}

// ServiceLogs returns recent logs for a service
func (h *Handler) ServiceLogs(c *gin.Context) {
	name := c.Param("name")
	isOwner, _ := h.getClientRole(c)
	if !isOwner && isRestrictedService(name) {
		c.JSON(http.StatusNotFound, gin.H{"error": "service not found"})
		return
	}
	targetUnit := name
	if app, err := h.appMgr.GetApp(name); err == nil && app.Unit != "" {
		targetUnit = app.Unit
	}
	lines := c.DefaultQuery("lines", "100")
	logs, err := h.svcMgr.Logs(targetUnit, lines)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"logs": logs})
}

// HardwareInfo returns hardware detection info
func (h *Handler) HardwareInfo(c *gin.Context) {
	c.JSON(http.StatusOK, detectHardwareInfo(h.cfg.HardwareProfile))
}

// SystemReboot triggers a system reboot
func (h *Handler) SystemReboot(c *gin.Context) {
	go func() {
		time.Sleep(500 * time.Millisecond)
		exec.Command("systemctl", "reboot").Run()
		exec.Command("reboot").Run()
	}()
	c.JSON(http.StatusOK, gin.H{"status": "rebooting", "message": "System is rebooting..."})
}

// SystemTimesync triggers an NTP clock synchronization
func (h *Handler) SystemTimesync(c *gin.Context) {
	exec.Command("timedatectl", "set-ntp", "true").Run()
	exec.Command("chronyc", "-a", "makestep").Run()
	c.JSON(http.StatusOK, gin.H{"status": "synced", "message": "NTP time synchronized."})
}

// SystemAutostart toggles GUI autostart
func (h *Handler) SystemAutostart(c *gin.Context) {
	var req struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err == nil {
		if req.Enabled {
			os.WriteFile("/var/lib/tinapple/autostart", []byte("1"), 0644)
		} else {
			os.Remove("/var/lib/tinapple/autostart")
		}
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// GetTorStatus returns whether Tor service / exit is active
func (h *Handler) GetTorStatus(c *gin.Context) {
	active := exec.Command("systemctl", "is-active", "--quiet", "tor.service").Run() == nil
	status := "stopped"
	if active {
		status = "running"
	}
	c.JSON(http.StatusOK, gin.H{
		"active": active,
		"status": status,
	})
}

// ToggleTorStatus starts or stops tor.service
func (h *Handler) ToggleTorStatus(c *gin.Context) {
	var req struct {
		Active bool `json:"active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var cmd *exec.Cmd
	if req.Active {
		cmd = exec.Command("systemctl", "start", "tor.service")
	} else {
		cmd = exec.Command("systemctl", "stop", "tor.service")
	}
	_ = cmd.Run()

	active := exec.Command("systemctl", "is-active", "--quiet", "tor.service").Run() == nil
	status := "stopped"
	if active {
		status = "running"
	}
	c.JSON(http.StatusOK, gin.H{
		"active": active,
		"status": status,
	})
}

// UpdateManifest updates and persists system manifest settings
func (h *Handler) UpdateManifest(c *gin.Context) {
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if hn, ok := req["hostname"].(string); ok && hn != "" {
		h.cfg.Hostname = hn
	}
	if k, ok := req["kernel"].(string); ok && k != "" {
		h.cfg.KernelProfile = k
	}
	if b, ok := req["bootloader"].(string); ok && b != "" {
		h.cfg.Bootloader = b
	}
	if sess, ok := req["session_mode"].(string); ok && sess != "" {
		h.cfg.SessionMode = sess
	} else if sess, ok := req["session"].(string); ok && sess != "" {
		h.cfg.SessionMode = sess
	}
	if cachy, ok := req["cachyos_repos"].(bool); ok {
		h.cfg.CachyosRepos = cachy
	}
	if ease, ok := req["hardware_tuning"].(bool); ok {
		h.cfg.EaseOfUseMode = ease
	}
	if netMap, ok := req["network"].(map[string]interface{}); ok {
		if iface, ok := netMap["interface"].(string); ok && iface != "" {
			h.cfg.Network.Interface = iface
		}
		if mode, ok := netMap["mode"].(string); ok {
			h.cfg.Network.DHCP = (mode == "dhcp")
		}
		if staticIp, ok := netMap["static_ip"].(string); ok && staticIp != "" {
			if h.cfg.Network.StaticFallback == nil {
				h.cfg.Network.StaticFallback = &config.StaticFallbackConfig{}
			}
			h.cfg.Network.StaticFallback.Address = staticIp
		}
		if gw, ok := netMap["gateway"].(string); ok && gw != "" {
			if h.cfg.Network.StaticFallback == nil {
				h.cfg.Network.StaticFallback = &config.StaticFallbackConfig{}
			}
			h.cfg.Network.StaticFallback.Gateway = gw
		}
		if dns, ok := netMap["dns"].(string); ok && dns != "" {
			if h.cfg.Network.StaticFallback == nil {
				h.cfg.Network.StaticFallback = &config.StaticFallbackConfig{}
			}
			h.cfg.Network.StaticFallback.DNS = []string{dns}
		}
	}
	if thresh, ok := req["thresholds"].(map[string]interface{}); ok {
		if bat, ok := thresh["battery_charge_limit"].(float64); ok && bat > 0 {
			h.cfg.Hardware.Battery.ChargeLimit = int(bat)
		}
	}

	_ = config.Validate(h.cfg)
	_ = config.SaveManifest("/etc/tinapple/manifest.yaml", h.cfg)
	c.JSON(http.StatusOK, gin.H{"status": "ok", "config": h.cfg})
}

type InstallRequest struct {
	Disk           string   `json:"disk"`
	DiskStrategy   string   `json:"disk_strategy"`
	Filesystem     string   `json:"filesystem"`
	Bootloader     string   `json:"bootloader"`
	Hostname       string   `json:"hostname"`
	Username       string   `json:"username"`
	Password       string   `json:"password"`
	RootPassword   string   `json:"root_password"`
	Kernel         string   `json:"kernel"`
	Apps           []string `json:"apps"`
	Luks           bool     `json:"luks"`
	LuksPassphrase string   `json:"luks_passphrase"`
}

type InstallState struct {
	sync.RWMutex
	Running   bool     `json:"running"`
	Progress  int      `json:"progress"`
	Stage     string   `json:"stage"`
	Logs      []string `json:"logs"`
	Completed bool     `json:"completed"`
	Error     string   `json:"error,omitempty"`
}

var globalInstallState = &InstallState{
	Logs: make([]string, 0),
}

func findRunStageScript() string {
	candidates := []string{
		"/usr/lib/tinapple-installer/backend/run-stage.sh",
		"/mnt/shared/projects/tinapple/tinapple-installer/backend/run-stage.sh",
		"backend/run-stage.sh",
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}
	return "/usr/lib/tinapple-installer/backend/run-stage.sh"
}

// RunInstall starts the background installation of Tinapple OS
func (h *Handler) RunInstall(c *gin.Context) {
	var req InstallRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid installation payload: %v", err)})
		return
	}

	if req.Disk == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Target storage disk must be specified"})
		return
	}

	// Safety check: protect live USB media
	if req.Disk == "/dev/sdb" || strings.Contains(req.Disk, "sdb") {
		if mounts, err := os.ReadFile("/proc/mounts"); err == nil && strings.Contains(string(mounts), "sdb") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Safety violation: Target disk is the live USB installer boot media!"})
			return
		}
	}

	globalInstallState.Lock()
	if globalInstallState.Running {
		globalInstallState.Unlock()
		c.JSON(http.StatusConflict, gin.H{"error": "An installation is already running"})
		return
	}

	globalInstallState.Running = true
	globalInstallState.Completed = false
	globalInstallState.Error = ""
	globalInstallState.Progress = 2
	globalInstallState.Stage = "preflight"
	globalInstallState.Logs = []string{
		fmt.Sprintf("[INFO] Tinapple Deployment Engine starting on %s...", req.Disk),
		fmt.Sprintf("[INFO] Target: %s | Filesystem: %s | Bootloader: %s | Kernel: %s", req.Disk, req.Filesystem, req.Bootloader, req.Kernel),
	}
	globalInstallState.Unlock()

	go h.executeInstallation(req)

	c.JSON(http.StatusOK, gin.H{
		"status":  "started",
		"message": fmt.Sprintf("Installation to %s initiated.", req.Disk),
	})
}

// InstallStatus returns the live status and logs of the running installation
func (h *Handler) InstallStatus(c *gin.Context) {
	globalInstallState.RLock()
	defer globalInstallState.RUnlock()

	c.JSON(http.StatusOK, gin.H{
		"running":   globalInstallState.Running,
		"progress":  globalInstallState.Progress,
		"stage":     globalInstallState.Stage,
		"logs":      globalInstallState.Logs,
		"completed": globalInstallState.Completed,
		"error":     globalInstallState.Error,
	})
}

func (h *Handler) executeInstallation(req InstallRequest) {
	appendLog := func(line string) {
		globalInstallState.Lock()
		globalInstallState.Logs = append(globalInstallState.Logs, line)
		globalInstallState.Unlock()
	}

	runner := findRunStageScript()
	if _, err := os.Stat(runner); err != nil {
		globalInstallState.Lock()
		globalInstallState.Running = false
		globalInstallState.Error = fmt.Sprintf("Runner script %s not found", runner)
		globalInstallState.Unlock()
		appendLog(fmt.Sprintf("[ERROR] Installer runner script not found: %s", runner))
		return
	}

	env := os.Environ()
	env = append(env, fmt.Sprintf("TINAPPLE_DISK=%s", req.Disk))
	if req.Filesystem != "" {
		env = append(env, fmt.Sprintf("TINAPPLE_FS=%s", req.Filesystem))
	}
	if req.Bootloader != "" {
		env = append(env, fmt.Sprintf("TINAPPLE_BOOTLOADER=%s", req.Bootloader))
	}
	if req.Hostname != "" {
		env = append(env, fmt.Sprintf("TINAPPLE_HOSTNAME=%s", req.Hostname))
	}
	if req.Username != "" {
		env = append(env, fmt.Sprintf("TINAPPLE_USERNAME=%s", req.Username))
	}
	if req.Password != "" {
		env = append(env, fmt.Sprintf("TINAPPLE_USER_PASSWORD=%s", req.Password))
		env = append(env, fmt.Sprintf("TINAPPLE_ROOT_PASSWORD=%s", req.Password))
	}
	if req.Kernel != "" {
		env = append(env, fmt.Sprintf("TINAPPLE_KERNEL_PROFILE=%s", req.Kernel))
	}
	if len(req.Apps) > 0 {
		env = append(env, fmt.Sprintf("TINAPPLE_PROFILES=%s", strings.Join(req.Apps, ",")))
	}
	if req.Luks {
		env = append(env, "TINAPPLE_LUKS=yes")
		env = append(env, fmt.Sprintf("TINAPPLE_LUKS_PASSPHRASE=%s", req.LuksPassphrase))
	} else {
		env = append(env, "TINAPPLE_LUKS=no")
	}

	stages := []struct {
		id       string
		name     string
		progress int
	}{
		{"preflight", "System Preflight Validation", 8},
		{"bootloader-detect", "Firmware & Bootloader Validation", 15},
		{"partition", "Storage Drive Partitioning", 24},
		{"fs-select", "Filesystem Configuration", 30},
		{"filesystem", "Formatting Root & ESP Volumes", 38},
		{"mount", "Mounting Storage Hierarchy to /mnt", 44},
		{"mirrors", "Ranking Optimized Package Mirrors", 50},
		{"pacstrap", "Bootstrapping Base OS & Kernel Packages", 74},
		{"cachyos-repo", "Configuring Optimized Repositories", 80},
		{"configure", "Configuring Hostname, Users & Systemd", 86},
		{"bootloader-install", "Installing System Bootloader", 92},
		{"deploy", "Deploying Desktop & Configurations", 96},
		{"network", "Configuring Network Services", 98},
		{"drivers", "Hardware Driver Auto-Detection", 100},
	}

	for _, st := range stages {
		globalInstallState.Lock()
		globalInstallState.Stage = st.id
		globalInstallState.Progress = st.progress
		globalInstallState.Unlock()

		appendLog(fmt.Sprintf("[STAGE] Starting: %s (%s)...", st.id, st.name))

		cmd := exec.Command(runner, st.id)
		cmd.Env = env

		stdoutPipe, err := cmd.StdoutPipe()
		if err != nil {
			appendLog(fmt.Sprintf("[ERROR] Failed to pipe output for stage %s: %v", st.id, err))
			continue
		}
		cmd.Stderr = cmd.Stdout

		if err := cmd.Start(); err != nil {
			appendLog(fmt.Sprintf("[FATAL ERROR] Failed to start stage %s: %v", st.id, err))
			globalInstallState.Lock()
			globalInstallState.Running = false
			globalInstallState.Error = fmt.Sprintf("Failed to run %s: %v", st.id, err)
			globalInstallState.Unlock()
			return
		}

		scanner := bufio.NewScanner(stdoutPipe)
		for scanner.Scan() {
			line := scanner.Text()
			appendLog(line)
		}

		if err := cmd.Wait(); err != nil {
			appendLog(fmt.Sprintf("[FATAL ERROR] Stage %s failed with exit code %v", st.id, err))
			globalInstallState.Lock()
			globalInstallState.Running = false
			globalInstallState.Error = fmt.Sprintf("Stage %s failed: %v", st.id, err)
			globalInstallState.Unlock()
			return
		}

		appendLog(fmt.Sprintf("[OK] Completed stage %s successfully.", st.id))
	}

	globalInstallState.Lock()
	globalInstallState.Running = false
	globalInstallState.Completed = true
	globalInstallState.Progress = 100
	globalInstallState.Unlock()

	appendLog("[SUCCESS] Tinapple OS appliance installed successfully! Ready to reboot into installed disk.")
}

func detectHardwareInfo(cfgProfile string) map[string]interface{} {
	cpuModel := "x86_64 Processor"
	var features []string
	threads := runtime.NumCPU()
	cores := threads

	if data, err := os.ReadFile("/proc/cpuinfo"); err == nil {
		lines := strings.Split(string(data), "\n")
		thCount := 0
		for _, line := range lines {
			if strings.HasPrefix(line, "processor") {
				thCount++
			}
			if strings.HasPrefix(line, "model name") && cpuModel == "x86_64 Processor" {
				parts := strings.Split(line, ":")
				if len(parts) > 1 {
					cpuModel = strings.TrimSpace(parts[1])
				}
			}
			if strings.HasPrefix(line, "cpu cores") {
				parts := strings.Split(line, ":")
				if len(parts) > 1 {
					fmt.Sscanf(strings.TrimSpace(parts[1]), "%d", &cores)
				}
			}
			if strings.HasPrefix(line, "flags") && len(features) == 0 {
				parts := strings.Split(line, ":")
				if len(parts) > 1 {
					allFlags := strings.Fields(parts[1])
					interesting := map[string]bool{
						"avx": true, "avx2": true, "avx512f": true, "sse4_2": true,
						"vmx": true, "svm": true, "aes": true, "rdrand": true,
					}
					for _, f := range allFlags {
						if interesting[f] {
							features = append(features, f)
						}
					}
				}
			}
		}
		if thCount > 0 {
			threads = thCount
		}
	}
	if len(features) == 0 {
		features = []string{"x86-64", "sse4_2", "aes"}
	}

	memGb := 8
	if data, err := os.ReadFile("/proc/meminfo"); err == nil {
		for _, line := range strings.Split(string(data), "\n") {
			if strings.HasPrefix(line, "MemTotal:") {
				var kb uint64
				fmt.Sscanf(line, "MemTotal: %d kB", &kb)
				memGb = int((kb + 524288) / 1048576)
				break
			}
		}
	}

	gpuModel := "Standard Integrated Display Controller"
	gpuDriver := "modesetting"
	if out, err := exec.Command("lspci").Output(); err == nil {
		for _, line := range strings.Split(string(out), "\n") {
			lower := strings.ToLower(line)
			if strings.Contains(lower, "vga") || strings.Contains(lower, "3d") || strings.Contains(lower, "display") {
				parts := strings.SplitN(line, ": ", 2)
				if len(parts) > 1 {
					gpuModel = strings.TrimSpace(parts[1])
				}
				if strings.Contains(lower, "intel") {
					gpuDriver = "i915"
				} else if strings.Contains(lower, "amd") || strings.Contains(lower, "ati") {
					gpuDriver = "amdgpu"
				} else if strings.Contains(lower, "nvidia") {
					gpuDriver = "nvidia"
				}
				break
			}
		}
	}

	tpm2Present := false
	if _, err := os.Stat("/dev/tpm0"); err == nil {
		tpm2Present = true
	} else if _, err := os.Stat("/dev/tpmrm0"); err == nil {
		tpm2Present = true
	} else if _, err := os.Stat("/sys/class/tpm/tpm0"); err == nil {
		tpm2Present = true
	}

	firmware := "bios"
	secureBoot := false
	if _, err := os.Stat("/sys/firmware/efi"); err == nil {
		firmware = "uefi"
		if sbData, err := os.ReadFile("/sys/firmware/efi/efivars/SecureBoot-8be4df61-93ca-11d2-aa0d-00e098032b8c"); err == nil && len(sbData) >= 5 {
			if sbData[4] == 1 {
				secureBoot = true
			}
		}
	}

	profile := "Homelab Workstation"
	isLaptop := false
	if _, err := os.Stat("/sys/class/power_supply/BAT0"); err == nil {
		isLaptop = true
	} else if _, err := os.Stat("/sys/class/power_supply/BAT1"); err == nil {
		isLaptop = true
	}
	if isLaptop {
		profile = "Laptop / Mobile Appliance"
	}
	if cfgProfile != "" && cfgProfile != "auto" {
		profile = cfgProfile
	}

	var drives []map[string]interface{}
	out, err := exec.Command("lsblk", "-J", "-o", "NAME,PATH,SIZE,TYPE,MODEL,VENDOR,TRAN,RO").Output()
	if err == nil {
		var res LsblkResult
		if err := json.Unmarshal(out, &res); err == nil {
			for _, dev := range res.Blockdevices {
				if dev.Type != "disk" || strings.HasPrefix(dev.Name, "zram") || strings.HasPrefix(dev.Name, "loop") {
					continue
				}
				model := "Generic Storage"
				if dev.Vendor != nil && *dev.Vendor != "" {
					model = strings.TrimSpace(*dev.Vendor) + " "
				}
				if dev.Model != nil && *dev.Model != "" {
					model += strings.TrimSpace(*dev.Model)
				}
				driveType := "sata"
				if dev.Tran != nil && *dev.Tran != "" {
					driveType = strings.ToLower(*dev.Tran)
				}
				sizeGb := 0
				fmt.Sscanf(dev.Size, "%d", &sizeGb)

				drives = append(drives, map[string]interface{}{
					"name":   dev.Name,
					"sizeGb": sizeGb,
					"size":   dev.Size,
					"type":   driveType,
					"model":  model,
				})
			}
		}
	}

	return map[string]interface{}{
		"hardware_profile":  profile,
		"profile":           profile,
		"is_laptop":         isLaptop,
		"firmware":          firmware,
		"cpu": map[string]interface{}{
			"model":    cpuModel,
			"cores":    cores,
			"threads":  threads,
			"arch":     runtime.GOARCH,
			"features": features,
		},
		"gpu": map[string]interface{}{
			"model":  gpuModel,
			"driver": gpuDriver,
		},
		"memoryGb":          memGb,
		"storageDrives":     drives,
		"tpm2Present":       tpm2Present,
		"secureBootEnabled": secureBoot,
	}
}

// BatteryInfo returns battery status
func (h *Handler) BatteryInfo(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"charge_limit":       h.cfg.Hardware.Battery.ChargeLimit,
		"charge_limit_min":   h.cfg.Hardware.Battery.ChargeLimitMin,
		"critical_action":    h.cfg.Hardware.Battery.CriticalAction,
		"critical_threshold": h.cfg.Hardware.Battery.CriticalThreshold,
		"ups_mode":           true,
	})
}

// SetChargeLimit sets battery charge limit
func (h *Handler) SetChargeLimit(c *gin.Context) {
	var req struct {
		Limit int `json:"limit" binding:"required,min=50,max=100"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// This would call tinapple-battery charge-limit set <limit>
	c.JSON(http.StatusOK, gin.H{"status": "ok", "limit": req.Limit})
}

// ThermalInfo returns thermal status
func (h *Handler) ThermalInfo(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"profile": h.cfg.Hardware.ThermalProfile,
		"vendor":  "detected",
	})
}

// SetThermalProfile sets thermal profile
func (h *Handler) SetThermalProfile(c *gin.Context) {
	var req struct {
		Profile string `json:"profile" binding:"required,oneof=balanced performance quiet server"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "profile": req.Profile})
}

// PowerProfileInfo returns power profile info
func (h *Handler) PowerProfileInfo(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"active": h.cfg.Hardware.PowerProfile,
		"profiles": []string{"balanced", "performance", "power-saver", "custom"},
	})
}

// SetPowerProfile sets power profile
func (h *Handler) SetPowerProfile(c *gin.Context) {
	var req struct {
		Profile string `json:"profile" binding:"required,oneof=balanced performance power-saver custom"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "profile": req.Profile})
}

// GetSession returns current session mode
func (h *Handler) GetSession(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"mode": h.cfg.SessionMode})
}

// SetSession sets session mode
func (h *Handler) SetSession(c *gin.Context) {
	var req struct {
		Mode string `json:"mode" binding:"required,oneof=headless interactive kiosk"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "mode": req.Mode})
}

// GetConfig returns current manifest config
func (h *Handler) GetConfig(c *gin.Context) {
	if cfg, err := config.LoadManifest("/etc/tinapple/manifest.yaml"); err == nil && cfg != nil {
		_ = config.Validate(cfg)
		h.cfg = cfg
	}
	c.JSON(http.StatusOK, h.cfg)
}

// UpdateConfig updates manifest config
func (h *Handler) UpdateConfig(c *gin.Context) {
	var req config.Manifest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Validate and save
	if err := config.Validate(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := config.SaveManifest("/etc/tinapple/manifest.yaml", &req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.cfg = &req
	c.JSON(http.StatusOK, gin.H{"status": "ok", "config": h.cfg})
}

// WebSocketHandler handles WebSocket connections
func (h *Handler) WebSocketHandler(c *gin.Context) {
	conn, err := h.wsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	h.wsClients[conn] = true
	defer func() {
		delete(h.wsClients, conn)
		conn.Close()
	}()

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func getUptime() string {
	data, err := os.ReadFile("/proc/uptime")
	if err != nil {
		return "unknown"
	}
	var uptime float64
	fmt.Sscanf(string(data), "%f", &uptime)
	d := int(uptime / 86400)
	h := int((uptime - float64(d*86400)) / 3600)
	m := int((uptime - float64(d*86400+h*3600)) / 60)
	if d > 0 {
		return fmt.Sprintf("%dd %dh %dm", d, h, m)
	}
	return fmt.Sprintf("%dh %dm", h, m)
}

func (h *Handler) GetPlayitStatus(c *gin.Context) {
	status, err := h.playitMgr.GetStatus(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

func (h *Handler) GeneratePlayitClaim(c *gin.Context) {
	url, code, err := h.playitMgr.GenerateClaim(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"claimUrl": url, "claimCode": code})
}

type SetSecretRequest struct {
	Secret string `json:"secret" binding:"required"`
}

func (h *Handler) SetPlayitSecret(c *gin.Context) {
	var req SetSecretRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "secret is required"})
		return
	}
	if err := h.playitMgr.SetSecret(c.Request.Context(), req.Secret); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Secret applied successfully"})
}

func (h *Handler) StartPlayit(c *gin.Context) {
	if err := h.playitMgr.Start(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Playit started"})
}

func (h *Handler) StopPlayit(c *gin.Context) {
	if err := h.playitMgr.Stop(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Playit stopped"})
}

func (h *Handler) ResetPlayit(c *gin.Context) {
	if err := h.playitMgr.Reset(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Playit reset successfully"})
}

func (h *Handler) WidgetQBittorrent(c *gin.Context) {
	client := http.Client{Timeout: 1 * time.Second}
	for _, port := range []int{8080, 8084} {
		resp, err := client.Get(fmt.Sprintf("http://127.0.0.1:%d/api/v2/transfer/info", port))
		if err == nil && resp.StatusCode == 200 {
			defer resp.Body.Close()
			var data map[string]interface{}
			if err := json.NewDecoder(resp.Body).Decode(&data); err == nil {
				c.JSON(http.StatusOK, gin.H{
					"online":            true,
					"dl_speed":          data["dl_info_speed"],
					"up_speed":          data["up_info_speed"],
					"dht_nodes":         data["dht_nodes"],
					"connection_status": data["connection_status"],
				})
				return
			}
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"online":            false,
		"dl_speed":          0,
		"up_speed":          0,
		"dht_nodes":         0,
		"connection_status": "disconnected",
		"total_torrents":    0,
		"active_torrents":   0,
	})
}

func (h *Handler) WidgetJDownloader(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"online":           false,
		"status":           "idle",
		"active_downloads": 0,
		"download_speed":   0,
	})
}

func (h *Handler) WidgetManga(c *gin.Context) {
	isOwner, _ := h.getClientRole(c)
	if !isOwner {
		c.JSON(http.StatusOK, gin.H{
			"online":     false,
			"totalCount": 0,
			"history":    []interface{}{},
			"updates":    []interface{}{},
			"library":    []interface{}{},
			"mangas":     []interface{}{},
		})
		return
	}

	client := http.Client{Timeout: 5 * time.Second}

	// Suwayomi GraphQL endpoint is at /api/graphql
	// Mangas: ordered by newest added (IN_LIBRARY_AT DESC)
	// History: chapters ordered by newest read (LAST_READ_AT DESC)
	// Updates: unread chapters ordered by newest upload (UPLOAD_DATE DESC)
	query := `{"query":"{ mangas(condition: { inLibrary: true }, order: [{by: IN_LIBRARY_AT, byType: DESC_NULLS_LAST}], first: 60) { totalCount nodes { id title thumbnailUrl unreadCount source { id displayName } } } history: chapters(condition: { isRead: true }, order: [{by: LAST_READ_AT, byType: DESC_NULLS_LAST}], first: 100) { nodes { id name lastReadAt manga { id title thumbnailUrl } } } updates: chapters(condition: { isRead: false }, order: [{by: UPLOAD_DATE, byType: DESC_NULLS_LAST}], first: 100) { nodes { id name uploadDate manga { id title thumbnailUrl } } } }"}`
	req, err := http.NewRequestWithContext(c.Request.Context(), "POST", "http://127.0.0.1:4567/api/graphql", strings.NewReader(query))
	if err == nil {
		req.Header.Set("Content-Type", "application/json")
		if gqlResp, err := client.Do(req); err == nil && gqlResp.StatusCode == http.StatusOK {
			defer gqlResp.Body.Close()
			var gqlData struct {
				Data struct {
					Mangas struct {
						TotalCount int `json:"totalCount"`
						Nodes      []struct {
							ID           int    `json:"id"`
							Title        string `json:"title"`
							ThumbnailUrl string `json:"thumbnailUrl"`
							UnreadCount  int    `json:"unreadCount"`
							Source       struct {
								ID          string `json:"id"`
								DisplayName string `json:"displayName"`
							} `json:"source"`
						} `json:"nodes"`
					} `json:"mangas"`
					History struct {
						Nodes []struct {
							ID         int    `json:"id"`
							Name       string `json:"name"`
							LastReadAt string `json:"lastReadAt"`
							Manga      struct {
								ID           int    `json:"id"`
								Title        string `json:"title"`
								ThumbnailUrl string `json:"thumbnailUrl"`
							} `json:"manga"`
						} `json:"nodes"`
					} `json:"history"`
					Updates struct {
						Nodes []struct {
							ID         int    `json:"id"`
							Name       string `json:"name"`
							UploadDate string `json:"uploadDate"`
							Manga      struct {
								ID           int    `json:"id"`
								Title        string `json:"title"`
								ThumbnailUrl string `json:"thumbnailUrl"`
							} `json:"manga"`
						} `json:"nodes"`
					} `json:"updates"`
				} `json:"data"`
			}
			if json.NewDecoder(gqlResp.Body).Decode(&gqlData) == nil {
				mangaList := make([]map[string]interface{}, 0, len(gqlData.Data.Mangas.Nodes))
				for _, m := range gqlData.Data.Mangas.Nodes {
					thumb := m.ThumbnailUrl
					if thumb == "" {
						thumb = fmt.Sprintf("/api/v1/manga/%d/thumbnail", m.ID)
					}
					mangaList = append(mangaList, map[string]interface{}{
						"id":           m.ID,
						"title":        m.Title,
						"thumbnailUrl": thumb,
						"unreadCount":  m.UnreadCount,
						"source": map[string]string{
							"name": m.Source.DisplayName,
						},
					})
				}

				// Deduplicate history by manga ID so each series appears at most once showing its latest read chapter
				seenHistory := make(map[int]bool)
				historyList := make([]map[string]interface{}, 0, 30)
				for _, hItem := range gqlData.Data.History.Nodes {
					mid := hItem.Manga.ID
					if mid <= 0 || seenHistory[mid] {
						continue
					}
					seenHistory[mid] = true

					thumb := hItem.Manga.ThumbnailUrl
					if thumb == "" {
						thumb = fmt.Sprintf("/api/v1/manga/%d/thumbnail", mid)
					}
					historyList = append(historyList, map[string]interface{}{
						"id":              mid,
						"title":           hItem.Manga.Title,
						"thumbnailUrl":    thumb,
						"lastChapterRead": hItem.Name,
					})
					if len(historyList) >= 30 {
						break
					}
				}

				// Deduplicate updates by manga ID so each series appears at most once showing its newest chapter
				seenUpdates := make(map[int]bool)
				updatesList := make([]map[string]interface{}, 0, 30)
				for _, uItem := range gqlData.Data.Updates.Nodes {
					mid := uItem.Manga.ID
					if mid <= 0 || seenUpdates[mid] {
						continue
					}
					seenUpdates[mid] = true

					thumb := uItem.Manga.ThumbnailUrl
					if thumb == "" {
						thumb = fmt.Sprintf("/api/v1/manga/%d/thumbnail", mid)
					}
					updatesList = append(updatesList, map[string]interface{}{
						"id":            mid,
						"title":         uItem.Manga.Title,
						"thumbnailUrl":  thumb,
						"latestChapter": uItem.Name,
					})
					if len(updatesList) >= 30 {
						break
					}
				}

				c.JSON(http.StatusOK, gin.H{
					"online":     true,
					"totalCount": gqlData.Data.Mangas.TotalCount,
					"mangas":     mangaList,
					"library":    mangaList,
					"history":    historyList,
					"updates":    updatesList,
				})
				return
			}
		}
	}

	// Ping Suwayomi directly to check if online even if empty
	pingResp, err := client.Get("http://127.0.0.1:4567/")
	online := err == nil && pingResp.StatusCode == http.StatusOK
	if pingResp != nil {
		_ = pingResp.Body.Close()
	}

	c.JSON(http.StatusOK, gin.H{
		"online":     online,
		"totalCount": 0,
		"history":    []interface{}{},
		"updates":    []interface{}{},
		"library":    []interface{}{},
		"mangas":     []interface{}{},
	})
}

// ProxyMangaThumbnail proxies thumbnail requests to Suwayomi and sets proper image content-type
func (h *Handler) ProxyMangaThumbnail(c *gin.Context) {
	isOwner, _ := h.getClientRole(c)
	if !isOwner {
		c.Status(http.StatusNotFound)
		return
	}

	id := c.Param("id")
	targetURL := fmt.Sprintf("http://127.0.0.1:4567/api/v1/manga/%s/thumbnail", id)
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequestWithContext(c.Request.Context(), "GET", targetURL, nil)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	if c.Request.URL.RawQuery != "" {
		req.URL.RawQuery = c.Request.URL.RawQuery
	}

	resp, err := client.Do(req)
	if err != nil {
		c.Status(http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.Status(resp.StatusCode)
		return
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil || len(bodyBytes) == 0 {
		c.Status(http.StatusNotFound)
		return
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" || contentType == "text/plain" {
		contentType = http.DetectContentType(bodyBytes)
		if contentType == "text/plain" || contentType == "application/octet-stream" {
			contentType = "image/webp"
		}
	}

	c.Header("Content-Type", contentType)
	c.Header("Cache-Control", "public, max-age=86400")
	c.Data(http.StatusOK, contentType, bodyBytes)
}

func (h *Handler) BeeperStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"online":  false,
		"bridges": []string{},
		"whoami":  "Self-hosted Matrix Bridges",
	})
}

type TailscaleLoginRequest struct {
	AuthKey string `json:"authKey"`
}

func (h *Handler) GetTailscaleStatus(c *gin.Context) {
	status, err := h.tailscaleMgr.GetStatus(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

func (h *Handler) LoginTailscale(c *gin.Context) {
	var req TailscaleLoginRequest
	_ = c.ShouldBindJSON(&req)
	authUrl, err := h.tailscaleMgr.Login(c.Request.Context(), req.AuthKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"authUrl": authUrl})
}

func (h *Handler) LogoutTailscale(c *gin.Context) {
	if err := h.tailscaleMgr.Logout(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Logged out of Tailscale"})
}

func (h *Handler) UpTailscale(c *gin.Context) {
	if err := h.tailscaleMgr.Up(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Tailscale started"})
}

func (h *Handler) DownTailscale(c *gin.Context) {
	if err := h.tailscaleMgr.Down(c.Request.Context()); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Tailscale stopped"})
}

// TerminalWebSocket handles live interactive in-browser PTY sessions
func (h *Handler) TerminalWebSocket(c *gin.Context) {
	isOwner, _ := h.getClientRole(c)
	terminal.HandleTerminalWS(c, isOwner)
}

// ServePairScript generates a dynamic client pairing script for Syncthing
func (h *Handler) ServePairScript(c *gin.Context) {
	deviceId := ""
	homeDir, _ := os.UserHomeDir()
	configPaths := []string{
		fmt.Sprintf("%s/.local/state/syncthing/config.xml", homeDir),
		fmt.Sprintf("%s/.config/syncthing/config.xml", homeDir),
		"/var/lib/syncthing/config.xml",
	}
	for _, p := range configPaths {
		if data, err := os.ReadFile(p); err == nil {
			re := regexp.MustCompile(`<device id="([^"]+)" name="[^"]*" compression=`)
			if m := re.FindStringSubmatch(string(data)); len(m) > 1 {
				deviceId = m[1]
				break
			}
		}
	}

	serverName := h.cfg.Hostname
	if serverName == "" {
		serverName = "Tinapple Server"
	}

	pairScript := fmt.Sprintf(`#!/usr/bin/env bash
# Universal Syncthing Client Auto-Pairing Script for %s
set -e
SERVER_ID="%s"
SERVER_NAME="%s"
FOLDER_ID="shared"
FOLDER_LABEL="Shared"
TARGET_DIR="${HOME}/drive"

echo "╔══════════════════════════════════════════════════════════════════════╗"
printf "║  %%-68s║\n" "🔗 ${SERVER_NAME} — Client Auto-Pairing"
echo "╚══════════════════════════════════════════════════════════════════════╝"

if ! command -v syncthing >/dev/null 2>&1; then
    echo "⚙️  Installing Syncthing..."
    if command -v pacman >/dev/null 2>&1; then
        sudo pacman -S --needed --noconfirm syncthing
    elif command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update && sudo apt-get install -y syncthing
    elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y syncthing
    fi
fi

mkdir -p "$TARGET_DIR"
if command -v systemctl >/dev/null 2>&1; then
    systemctl --user enable --now syncthing 2>/dev/null || true
fi
sleep 2

if [ -n "$SERVER_ID" ]; then
    echo "🔗 Pairing client with ${SERVER_NAME} (${SERVER_ID})..."
    syncthing cli config devices add --device-id "$SERVER_ID" --name "$SERVER_NAME" --auto-accept-folders 2>/dev/null || true
    syncthing cli config folders add --id "$FOLDER_ID" --label "$FOLDER_LABEL" --path "$TARGET_DIR" 2>/dev/null || true
    syncthing cli config folders "$FOLDER_ID" devices add --device-id "$SERVER_ID" 2>/dev/null || true
    echo "✅ Successfully paired with ${SERVER_NAME}! Files in ~/drive will now sync automatically."
else
    echo "⚠️  Server ID not yet initialized. Please open http://%s:8088 to view Syncthing pairing code."
fi
`, serverName, deviceId, serverName, c.Request.Host)

	c.Header("Content-Type", "text/x-shellscript; charset=utf-8")
	c.String(http.StatusOK, pairScript)
}



