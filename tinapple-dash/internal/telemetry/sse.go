package telemetry

import (
	"context"
	"fmt"
	"os"
	"runtime"
	"strings"
	"sync"
	"syscall"
	"time"

	"tinapple-dash/internal/services"
)

type Collector struct {
	svcMgr    *services.SystemdManager
	mu        sync.RWMutex
	lastData  map[string]interface{}
}

func NewCollector(svcMgr *services.SystemdManager, cfg interface{}) *Collector {
	return &Collector{
		svcMgr:   svcMgr,
		lastData: make(map[string]interface{}),
	}
}

func (c *Collector) Start(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Initial collection
	c.collect()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			c.collect()
		}
	}
}

func (c *Collector) collect() {
	c.mu.Lock()
	defer c.mu.Unlock()

	// CPU info
	cpuInfo := getCPUInfo()
	
	// Memory info
	memInfo := getMemInfo()
	
	// Disk info
	diskInfo := getDiskInfo()
	
	// Network info
	netInfo := getNetInfo()
	
	// Thermal info
	thermalInfo := getThermalInfo()
	
	// Service statuses
	svcStatuses := make(map[string]string)
	commonServices := []string{"jellyfin", "qbittorrent", "syncthing", "tailscale", "nginx", "docker"}
	for _, svc := range commonServices {
		if status, err := c.svcMgr.GetStatus(svc); err == nil {
			svcStatuses[svc] = status
		}
	}

	c.lastData = map[string]interface{}{
		"timestamp":   time.Now().Unix(),
		"cpu":         cpuInfo,
		"memory":      memInfo,
		"disk":        diskInfo,
		"network":     netInfo,
		"thermal":     thermalInfo,
		"services":    svcStatuses,
	}
}

func (c *Collector) GetSnapshot() map[string]interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()
	
	// Return a copy
	result := make(map[string]interface{})
	for k, v := range c.lastData {
		result[k] = v
	}
	return result
}

func getCPUInfo() map[string]interface{} {
	// Read /proc/stat for CPU usage
	data, err := os.ReadFile("/proc/stat")
	if err != nil {
		return map[string]interface{}{"usage": 0}
	}
	
	var total, idle uint64
	for _, line := range strings.Split(string(data), "\n") {
		if strings.HasPrefix(line, "cpu ") {
			fields := strings.Fields(line)
			if len(fields) >= 8 {
				for i := 1; i < len(fields); i++ {
					var v uint64
					fmt.Sscanf(fields[i], "%d", &v)
					total += v
					if i == 4 { // idle is 4th field (0-indexed: 3)
						idle = v
					}
				}
			}
			break
		}
	}
	
	usage := 0.0
	if total > 0 {
		usage = float64(total-idle) / float64(total) * 100
	}
	
	return map[string]interface{}{
		"usage_percent": usage,
		"cores":         runtime.NumCPU(),
	}
}

func getMemInfo() map[string]interface{} {
	data, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return map[string]interface{}{"total": 0, "available": 0, "used_percent": 0}
	}
	
	var total, available uint64
	for _, line := range strings.Split(string(data), "\n") {
		if strings.HasPrefix(line, "MemTotal:") {
			fmt.Sscanf(line, "MemTotal: %d kB", &total)
		}
		if strings.HasPrefix(line, "MemAvailable:") {
			fmt.Sscanf(line, "MemAvailable: %d kB", &available)
		}
	}
	
	usedPercent := 0.0
	if total > 0 {
		usedPercent = float64(total-available) / float64(total) * 100
	}
	
	return map[string]interface{}{
		"total_bytes":      total * 1024,
		"available_bytes":  available * 1024,
		"used_percent":     usedPercent,
	}
}

func getDiskInfo() map[string]interface{} {
	// Get root filesystem usage
	var stat syscall.Statfs_t
	if err := syscall.Statfs("/", &stat); err != nil {
		return map[string]interface{}{"total": 0, "free": 0, "used_percent": 0}
	}
	
	total := stat.Blocks * uint64(stat.Bsize)
	free := stat.Bavail * uint64(stat.Bsize)
	used := total - free
	usedPercent := 0.0
	if total > 0 {
		usedPercent = float64(used) / float64(total) * 100
	}
	
	return map[string]interface{}{
		"total_bytes":      total,
		"free_bytes":       free,
		"used_percent":     usedPercent,
	}
}

func getNetInfo() map[string]interface{} {
	// Read /proc/net/dev for network stats
	data, err := os.ReadFile("/proc/net/dev")
	if err != nil {
		return map[string]interface{}{"rx_bytes": 0, "tx_bytes": 0}
	}
	
	var rx, tx uint64
	for _, line := range strings.Split(string(data), "\n") {
		fields := strings.Fields(line)
		if len(fields) >= 10 {
			var r, t uint64
			fmt.Sscanf(fields[1], "%d", &r)
			fmt.Sscanf(fields[9], "%d", &t)
			rx += r
			tx += t
		}
	}
	
	return map[string]interface{}{
		"rx_bytes": rx,
		"tx_bytes": tx,
	}
}

func getThermalInfo() map[string]interface{} {
	// Read thermal zones
	entries, err := os.ReadDir("/sys/class/thermal")
	if err != nil {
		return map[string]interface{}{"zones": 0}
	}
	
	var temps []float64
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), "thermal_zone") {
			tempPath := "/sys/class/thermal/" + e.Name() + "/temp"
			if data, err := os.ReadFile(tempPath); err == nil {
				var temp int
				fmt.Sscanf(string(data), "%d", &temp)
				temps = append(temps, float64(temp)/1000.0) // millidegrees to celsius
			}
		}
	}
	
	maxTemp := 0.0
	for _, t := range temps {
		if t > maxTemp {
			maxTemp = t
		}
	}
	
	return map[string]interface{}{
		"zones":      len(temps),
		"max_temp_c": maxTemp,
	}
}