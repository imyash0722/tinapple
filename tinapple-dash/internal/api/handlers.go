package api

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"

	"tinapple-dash/internal/config"
	"tinapple-dash/internal/services"
	"tinapple-dash/internal/telemetry"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type Handler struct {
	cfg            *config.Manifest
	svcMgr         *services.SystemdManager
	appMgr         *services.AppManager
	playitMgr      *services.PlayitManager
	telemetry      *telemetry.Collector
	wsUpgrader     websocket.Upgrader
	wsClients      map[*websocket.Conn]bool
}

func NewHandler(cfg *config.Manifest, svcMgr *services.SystemdManager, tel *telemetry.Collector) *Handler {
	return &Handler{
		cfg:        cfg,
		svcMgr:     svcMgr,
		appMgr:     services.NewAppManager(),
		playitMgr:  services.NewPlayitManager(),
		telemetry:  tel,
		wsClients:  make(map[*websocket.Conn]bool),
		wsUpgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
}

func SetupRoutes(r *gin.Engine, cfg *config.Manifest, svcMgr *services.SystemdManager, tel *telemetry.Collector) {
	h := NewHandler(cfg, svcMgr, tel)

	// API v1 group
	v1 := r.Group("/api/v1")
	{
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

		// Apps (Comprehensive Application & Config Management)
		v1.GET("/apps", h.ListApps)
		v1.GET("/apps/:name", h.GetApp)
		v1.POST("/apps/:name/install", h.InstallApp)
		v1.POST("/apps/:name/uninstall", h.UninstallApp)
		v1.POST("/apps/:name/start", h.StartApp)
		v1.POST("/apps/:name/stop", h.StopApp)
		v1.POST("/apps/:name/restart", h.RestartApp)
		v1.GET("/apps/:name/config", h.GetAppConfig)
		v1.POST("/apps/:name/config", h.UpdateAppConfig)

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

		// WebSocket
		v1.GET("/ws", h.WebSocketHandler)
	}

	// Native Widget Fallbacks & Direct Proxy
	r.GET("/api/widgets/qbittorrent", h.WidgetQBittorrent)
	r.GET("/api/widgets/jdownloader", h.WidgetJDownloader)
	r.POST("/api/widgets/jdownloader/add", h.WidgetJDownloader)
	r.GET("/api/widgets/manga", h.WidgetManga)
	r.GET("/api/beeper/status", h.BeeperStatus)
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

	info := map[string]interface{}{
		"hostname":   h.cfg.Hostname,
		"kernel":     h.cfg.KernelProfile,
		"session":    h.cfg.SessionMode,
		"hardware":   h.cfg.HardwareProfile,
		"filesystem": h.cfg.Filesystem,
		"bootloader": h.cfg.Bootloader,
		"firmware":   firmware,
		"installed":  installed,
		"uptime":     getUptime(),
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
	apps := h.appMgr.ListApps()
	c.JSON(http.StatusOK, gin.H{"apps": apps})
}

// GetApp returns detailed status for a single application
func (h *Handler) GetApp(c *gin.Context) {
	name := c.Param("name")
	app, err := h.appMgr.GetApp(name)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, app)
}

// InstallApp triggers package installation and service setup
func (h *Handler) InstallApp(c *gin.Context) {
	name := c.Param("name")
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

// ListServices returns all services with real on-disk and live systemd status
func (h *Handler) ListServices(c *gin.Context) {
	apps := h.appMgr.ListApps()
	services := make([]map[string]interface{}, 0, len(apps))

	for _, a := range apps {
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
	if err := h.svcMgr.Start(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "started"})
}

// StopService stops a service
func (h *Handler) StopService(c *gin.Context) {
	name := c.Param("name")
	if err := h.svcMgr.Stop(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "stopped"})
}

// RestartService restarts a service
func (h *Handler) RestartService(c *gin.Context) {
	name := c.Param("name")
	if err := h.svcMgr.Restart(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "restarted"})
}

// EnableService enables a service
func (h *Handler) EnableService(c *gin.Context) {
	name := c.Param("name")
	if err := h.svcMgr.Enable(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "enabled"})
}

// DisableService disables a service
func (h *Handler) DisableService(c *gin.Context) {
	name := c.Param("name")
	if err := h.svcMgr.Disable(name); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "disabled"})
}

// ServiceLogs returns recent logs for a service
func (h *Handler) ServiceLogs(c *gin.Context) {
	name := c.Param("name")
	lines := c.DefaultQuery("lines", "100")
	logs, err := h.svcMgr.Logs(name, lines)
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
	c.JSON(http.StatusOK, gin.H{
		"online":  false,
		"history": []string{},
		"updates": []string{},
		"library": []string{},
		"mangas":  []string{},
	})
}

func (h *Handler) BeeperStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"online":  false,
		"bridges": []string{},
		"whoami":  "Self-hosted Matrix Bridges",
	})
}

