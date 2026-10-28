package api

import (
	"bufio"
	"fmt"
	"net/http"
	"os/exec"
	"regexp"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type OpenPortInfo struct {
	Protocol string `json:"protocol"`
	Port     int    `json:"port"`
	Address  string `json:"address"`
	Process  string `json:"process"`
	Pid      int    `json:"pid"`
	WebURL   string `json:"webUrl,omitempty"`
	Label    string `json:"label,omitempty"`
}

// Known web ports and their friendly appliance names
var knownWebApps = map[int]string{
	8088: "Tinapple Dashboard",
	8096: "Jellyfin Media",
	8080: "qBittorrent / Web",
	8084: "qBittorrent Alt",
	8085:  "MeTube Downloader",
	8945:  "Pinchflat YouTube Manager",
	4567: "Suwayomi Manga",
	4533: "Navidrome Music",
	8384: "Syncthing Web GUI",
	3000: "AdGuard Home",
	8000: "Vaultwarden Vault",
	5055: "Seerr Discovery",
	8989: "Sonarr TV",
	7878: "Radarr Movies",
	9696: "Prowlarr Indexer",
	6767: "Bazarr Subtitles",
	8082: "FileBrowser",
	8081: "FileBrowser Alt",
	25565: "Minecraft Server",
	9050: "Tor SOCKS5",
	22:   "SSH Service",
	445:  "Samba SMB Share",
}

// GetOpenPorts parses listening ports from `ss -tulpnH` or `ss -tlnpH`
func (h *Handler) GetOpenPorts(c *gin.Context) {
	cmd := exec.Command("ss", "-tlnpH")
	out, err := cmd.Output()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to inspect network sockets: " + err.Error()})
		return
	}

	ports := parseSocketOutput(string(out), "tcp")

	// Also check UDP sockets
	if uOut, err := exec.Command("ss", "-ulnpH").Output(); err == nil {
		uPorts := parseSocketOutput(string(uOut), "udp")
		ports = append(ports, uPorts...)
	}

	c.JSON(http.StatusOK, gin.H{
		"ports": ports,
		"count": len(ports),
	})
}

func parseSocketOutput(output string, defaultProto string) []OpenPortInfo {
	var list []OpenPortInfo
	seen := make(map[string]bool)

	scanner := bufio.NewScanner(strings.NewReader(output))
	// Example line: LISTEN 0 4096 0.0.0.0:8088 0.0.0.0:* users:(("tinapple-dash",pid=123,fd=4))
	portRe := regexp.MustCompile(`:([0-9]+)$`)
	userRe := regexp.MustCompile(`users:\(\("([^"]+)",pid=([0-9]+)`)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 4 {
			continue
		}

		proto := defaultProto
		if strings.HasPrefix(strings.ToLower(fields[0]), "tcp") {
			proto = "tcp"
		} else if strings.HasPrefix(strings.ToLower(fields[0]), "udp") {
			proto = "udp"
		}

		// Local address is typically index 3 or 4
		localAddr := ""
		for _, f := range fields {
			if strings.Contains(f, ":") && !strings.Contains(f, "*") && !strings.HasPrefix(f, "users:") {
				localAddr = f
				break
			}
		}
		if localAddr == "" {
			continue
		}

		matches := portRe.FindStringSubmatch(localAddr)
		if len(matches) < 2 {
			continue
		}
		pNum, err := strconv.Atoi(matches[1])
		if err != nil || pNum <= 0 {
			continue
		}

		procName := "system"
		pid := 0
		if uMatches := userRe.FindStringSubmatch(line); len(uMatches) >= 3 {
			procName = uMatches[1]
			pid, _ = strconv.Atoi(uMatches[2])
		}

		key := fmt.Sprintf("%s:%d", proto, pNum)
		if seen[key] {
			continue
		}
		seen[key] = true

		info := OpenPortInfo{
			Protocol: proto,
			Port:     pNum,
			Address:  localAddr,
			Process:  procName,
			Pid:      pid,
		}

		if label, ok := knownWebApps[pNum]; ok {
			info.Label = label
			if pNum != 22 && pNum != 445 && pNum != 9050 && pNum != 25565 {
				info.WebURL = fmt.Sprintf(":%d", pNum)
			}
		}

		list = append(list, info)
	}

	return list
}

// MaintenanceAction represents a 1-click server maintenance command
type MaintenanceAction struct {
	Action string `json:"action"` // "clean-cache", "fstrim", "daemon-reload", "restart-network"
}

// RunMaintenanceTool runs safe predefined system operations
func (h *Handler) RunMaintenanceTool(c *gin.Context) {
	isOwner, _ := h.getClientRole(c)
	if !isOwner {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin privileges required to run system operations"})
		return
	}

	var req MaintenanceAction
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var cmd *exec.Cmd
	switch req.Action {
	case "clean-cache":
		cmd = exec.Command("sh", "-c", "paccache -rk1 2>/dev/null || pacman -Sc --noconfirm 2>&1 || true")
	case "fstrim":
		cmd = exec.Command("fstrim", "-av")
	case "daemon-reload":
		cmd = exec.Command("systemctl", "daemon-reload")
	case "restart-network":
		cmd = exec.Command("sh", "-c", "systemctl restart NetworkManager 2>/dev/null || systemctl restart systemd-networkd 2>/dev/null || true")
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown maintenance action: " + req.Action})
		return
	}

	out, err := cmd.CombinedOutput()
	outputStr := string(out)
	if err != nil && len(outputStr) == 0 {
		outputStr = err.Error()
	}

	c.JSON(http.StatusOK, gin.H{
		"action":  req.Action,
		"success": err == nil || len(out) > 0,
		"output":  outputStr,
	})
}

// GetFailedUnits returns any failed systemd units
func (h *Handler) GetFailedUnits(c *gin.Context) {
	cmd := exec.Command("systemctl", "list-units", "--state=failed", "--no-legend", "--no-pager")
	out, _ := cmd.CombinedOutput()

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	var failedList []string
	for _, l := range lines {
		l = strings.TrimSpace(l)
		if l != "" {
			failedList = append(failedList, l)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"failed": failedList,
		"count":  len(failedList),
	})
}

// GetKernelLogs returns recent kernel or journal alerts
func (h *Handler) GetKernelLogs(c *gin.Context) {
	cmd := exec.Command("journalctl", "-p", "3", "-xb", "-n", "30", "--no-pager")
	out, _ := cmd.CombinedOutput()

	c.JSON(http.StatusOK, gin.H{
		"logs": string(out),
	})
}
