package api

import (
	"fmt"
	"net/http"
	"os"
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
	telemetry      *telemetry.Collector
	wsUpgrader     websocket.Upgrader
	wsClients      map[*websocket.Conn]bool
}

func NewHandler(cfg *config.Manifest, svcMgr *services.SystemdManager, tel *telemetry.Collector) *Handler {
	return &Handler{
		cfg:        cfg,
		svcMgr:     svcMgr,
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
		v1.GET("/system/telemetry", h.TelemetrySnapshot)
		v1.GET("/system/telemetry/stream", h.TelemetryStream)

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

		// WebSocket
		v1.GET("/ws", h.WebSocketHandler)
	}
}

// SystemInfo returns basic system information
func (h *Handler) SystemInfo(c *gin.Context) {
	info := map[string]interface{}{
		"hostname":   h.cfg.Hostname,
		"kernel":     h.cfg.KernelProfile,
		"session":    h.cfg.SessionMode,
		"hardware":   h.cfg.HardwareProfile,
		"filesystem": h.cfg.Filesystem,
		"bootloader": h.cfg.Bootloader,
		"uptime":     getUptime(),
	}
	c.JSON(http.StatusOK, info)
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

// ListServices returns all services from manifest
func (h *Handler) ListServices(c *gin.Context) {
	services := make([]map[string]interface{}, 0)
	for name, svc := range h.cfg.Services {
		status, _ := h.svcMgr.GetStatus(name)
		services = append(services, map[string]interface{}{
			"name":    name,
			"enabled": svc.Enabled,
			"port":    svc.Port,
			"status":  status,
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
	c.JSON(http.StatusOK, gin.H{
		"hardware_profile": h.cfg.HardwareProfile,
		"is_laptop":        h.cfg.HardwareProfile == "laptop",
	})
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
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
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