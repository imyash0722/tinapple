package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// SystemErrorItem represents a unified error reported across the entire machine or website
type SystemErrorItem struct {
	ID        string `json:"id"`
	Timestamp string `json:"timestamp"`
	Source    string `json:"source"`   // "kernel", "wifi", "hardware", "service", "frontend"
	Service   string `json:"service"`  // e.g. "jellyfin", "iwlwifi", "systemd", "disk", "website"
	Severity  string `json:"severity"` // "critical", "error", "warning"
	Message   string `json:"message"`
	Raw       string `json:"raw"`
	Component string `json:"component,omitempty"`
}

// AIErrorAnalysis represents structured root-cause analysis from Google Gemini
type AIErrorAnalysis struct {
	Source               string   `json:"source"`
	ExpectedCause        string   `json:"expectedCause"`
	FilesAffected        []string `json:"filesAffected"`
	FormattedError       string   `json:"formattedError"`
	SuggestedRemediation string   `json:"suggestedRemediation"`
	SeverityAssessment   string   `json:"severityAssessment"`
}

// ClientErrorReport payload received from browser uncaught errors
type ClientErrorReport struct {
	Message   string `json:"message"`
	Stack     string `json:"stack,omitempty"`
	Source    string `json:"source,omitempty"`
	Timestamp string `json:"timestamp,omitempty"`
	URL       string `json:"url,omitempty"`
}

// In-memory buffer for client/frontend reported errors
var (
	clientErrorsMu sync.RWMutex
	clientErrors   []SystemErrorItem
)

const maxClientErrors = 100

// ReportClientError logs an uncaught frontend exception or React ErrorBoundary crash
func (h *Handler) ReportClientError(c *gin.Context) {
	var report ClientErrorReport
	if err := c.ShouldBindJSON(&report); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid client error report payload"})
		return
	}

	clientErrorsMu.Lock()
	defer clientErrorsMu.Unlock()

	ts := report.Timestamp
	if ts == "" {
		ts = time.Now().UTC().Format(time.RFC3339)
	}

	errItem := SystemErrorItem{
		ID:        fmt.Sprintf("web-%d", time.Now().UnixNano()),
		Timestamp: ts,
		Source:    "frontend",
		Service:   "tinapple-hub",
		Severity:  "error",
		Message:   report.Message,
		Raw:       fmt.Sprintf("%s\nURL: %s\nStack:\n%s", report.Message, report.URL, report.Stack),
		Component: report.Source,
	}

	clientErrors = append([]SystemErrorItem{errItem}, clientErrors...)
	if len(clientErrors) > maxClientErrors {
		clientErrors = clientErrors[:maxClientErrors]
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "id": errItem.ID})
}

// ClearClientErrors resets in-memory client errors
func (h *Handler) ClearClientErrors(c *gin.Context) {
	clientErrorsMu.Lock()
	clientErrors = make([]SystemErrorItem, 0)
	clientErrorsMu.Unlock()

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Client errors buffer cleared"})
}

// GetSystemErrors scans the machine for kernel, hardware, wifi, systemd service, and web errors
func (h *Handler) GetSystemErrors(c *gin.Context) {
	var allErrors []SystemErrorItem
	seen := make(map[string]bool)

	// 1. Client frontend errors
	clientErrorsMu.RLock()
	for _, item := range clientErrors {
		allErrors = append(allErrors, item)
	}
	clientErrorsMu.RUnlock()

	// 2. Failed Systemd Units
	failedCmd := exec.Command("systemctl", "list-units", "--state=failed", "--no-legend", "--no-pager")
	if failedOut, err := failedCmd.Output(); err == nil {
		lines := strings.Split(strings.TrimSpace(string(failedOut)), "\n")
		for _, l := range lines {
			l = strings.TrimSpace(l)
			if l == "" {
				continue
			}
			parts := strings.Fields(l)
			if len(parts) >= 4 {
				unitName := parts[0]
				desc := strings.Join(parts[4:], " ")
				allErrors = append(allErrors, SystemErrorItem{
					ID:        fmt.Sprintf("failed-%s", unitName),
					Timestamp: time.Now().UTC().Format(time.RFC3339),
					Source:    "service",
					Service:   unitName,
					Severity:  "critical",
					Message:   fmt.Sprintf("System service '%s' is in FAILED state: %s", unitName, desc),
					Raw:       l,
					Component: "systemd",
				})
			}
		}
	}

	// 3. Kernel and Hardware Alerts (dmesg level err, crit, alert, emerg)
	dmesgCmd := exec.Command("dmesg", "-T", "--level=err,crit,alert,emerg")
	if dmesgOut, err := dmesgCmd.Output(); err == nil {
		lines := strings.Split(strings.TrimSpace(string(dmesgOut)), "\n")
		for i := len(lines) - 1; i >= 0 && len(allErrors) < 150; i-- {
			line := strings.TrimSpace(lines[i])
			if line == "" || seen[line] {
				continue
			}
			seen[line] = true

			source := "kernel"
			service := "kernel"
			severity := "error"
			lower := strings.ToLower(line)

			// Detect Hardware / Memory / Disk issues
			if strings.Contains(lower, "mce") || strings.Contains(lower, "edac") || strings.Contains(lower, "hardware error") ||
				strings.Contains(lower, "bad sector") || strings.Contains(lower, "i/o error") || strings.Contains(lower, "nvme") ||
				strings.Contains(lower, "thermal") || strings.Contains(lower, "throttl") {
				source = "hardware"
				service = "hardware-bus"
				severity = "critical"
			} else if strings.Contains(lower, "wifi") || strings.Contains(lower, "wlan") || strings.Contains(lower, "iwlwifi") ||
				strings.Contains(lower, "rtw") || strings.Contains(lower, "ath9k") || strings.Contains(lower, "deauthenticat") {
				source = "wifi"
				service = "wifi-driver"
			}

			allErrors = append(allErrors, SystemErrorItem{
				ID:        fmt.Sprintf("dmesg-%d", i),
				Timestamp: extractTimestampFromLog(line),
				Source:    source,
				Service:   service,
				Severity:  severity,
				Message:   cleanLogMessage(line),
				Raw:       line,
				Component: "dmesg",
			})
		}
	}

	// 4. Systemd Journal Priority 0..3 (Emergency, Alert, Critical, Error)
	journalCmd := exec.Command("journalctl", "-p", "0..3", "-xb", "-n", "80", "--no-pager", "-o", "short-iso")
	if journalOut, err := journalCmd.Output(); err == nil {
		lines := strings.Split(strings.TrimSpace(string(journalOut)), "\n")
		for i := len(lines) - 1; i >= 0 && len(allErrors) < 200; i-- {
			line := strings.TrimSpace(lines[i])
			if line == "" || seen[line] {
				continue
			}
			seen[line] = true

			item := parseJournalLine(line, i)
			allErrors = append(allErrors, item)
		}
	}

	// 5. WiFi & Network specific journals (check for disconnections or dhcp failures)
	netCmd := exec.Command("journalctl", "-u", "NetworkManager", "-u", "iwd", "-u", "wpa_supplicant", "-p", "0..4", "-n", "30", "--no-pager", "-o", "short-iso")
	if netOut, err := netCmd.Output(); err == nil {
		lines := strings.Split(strings.TrimSpace(string(netOut)), "\n")
		for i := len(lines) - 1; i >= 0 && len(allErrors) < 220; i-- {
			line := strings.TrimSpace(lines[i])
			if line == "" || seen[line] {
				continue
			}
			seen[line] = true

			item := parseJournalLine(line, i)
			item.Source = "wifi"
			if item.Service == "system" {
				item.Service = "network"
			}
			allErrors = append(allErrors, item)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"errors": allErrors,
		"count":  len(allErrors),
		"time":   time.Now().UTC().Format(time.RFC3339),
	})
}

func parseJournalLine(line string, idx int) SystemErrorItem {
	parts := strings.SplitN(line, " ", 4)
	ts := time.Now().UTC().Format(time.RFC3339)
	service := "system"
	msg := line

	if len(parts) >= 4 {
		ts = parts[0]
		rawProc := parts[2]
		msg = parts[3]

		// Extract clean service name e.g. "jellyfin[123]:" -> "jellyfin"
		procRe := regexp.MustCompile(`^([^:\[]+)`)
		if m := procRe.FindStringSubmatch(rawProc); len(m) > 1 {
			service = m[1]
		}
	}

	source := "service"
	lower := strings.ToLower(msg + " " + service)
	severity := "error"

	if strings.Contains(lower, "kernel") {
		source = "kernel"
	} else if strings.Contains(lower, "wifi") || strings.Contains(lower, "wlan") || strings.Contains(lower, "networkmanager") || strings.Contains(lower, "wpa_supplicant") || strings.Contains(lower, "iwd") {
		source = "wifi"
	} else if strings.Contains(lower, "mce") || strings.Contains(lower, "edac") || strings.Contains(lower, "hardware") || strings.Contains(lower, "ata") || strings.Contains(lower, "nvme") {
		source = "hardware"
		severity = "critical"
	}

	return SystemErrorItem{
		ID:        fmt.Sprintf("journal-%d", idx),
		Timestamp: ts,
		Source:    source,
		Service:   service,
		Severity:  severity,
		Message:   cleanLogMessage(msg),
		Raw:       line,
		Component: "journald",
	}
}

func extractTimestampFromLog(line string) string {
	tsRe := regexp.MustCompile(`^\[([A-Za-z0-9\s:.]+)\]`)
	if m := tsRe.FindStringSubmatch(line); len(m) > 1 {
		return m[1]
	}
	return time.Now().UTC().Format(time.RFC3339)
}

func cleanLogMessage(msg string) string {
	// Remove timestamp prefix if present
	re := regexp.MustCompile(`^(\[[^\]]+\]\s*|[0-9T:+-]+\s+[^\s]+\s+[^\s]+:\s*)`)
	cleaned := re.ReplaceAllString(msg, "")
	return strings.TrimSpace(cleaned)
}

var aiHttpClient = &http.Client{
	Timeout: 30 * time.Second,
	Transport: &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          50,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	},
}
func readGeminiKey(paramKey string) string {
	if strings.TrimSpace(paramKey) != "" {
		return strings.TrimSpace(paramKey)
	}
	// Try /etc/tinapple/gemini_key
	if keyBytes, err := os.ReadFile("/etc/tinapple/gemini_key"); err == nil {
		k := strings.TrimSpace(string(keyBytes))
		if k != "" {
			return k
		}
	}
	return strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
}

// GetAIStatus checks if an API key is configured on the machine without revealing it
func (h *Handler) GetAIStatus(c *gin.Context) {
	key := readGeminiKey("")
	configured := len(key) > 10
	masked := ""
	if configured {
		if len(key) > 8 {
			masked = key[:4] + "..." + key[len(key)-4:]
		} else {
			masked = "****"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"configured": configured,
		"maskedKey":  masked,
		"model":      "gemini-2.5-flash",
	})
}

// TestAIKey verifies if a Gemini API key is functional
func (h *Handler) TestAIKey(c *gin.Context) {
	var req struct {
		APIKey string `json:"apiKey"`
	}
	_ = c.ShouldBindJSON(&req)

	key := readGeminiKey(req.APIKey)
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No Gemini API key provided or found on machine"})
		return
	}

	endpoint := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=%s", key)
	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]string{
					{"text": "Ping. Reply with exactly the single word: READY"},
				},
			},
		},
	}

	jsonBytes, _ := json.Marshal(payload)
	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()
	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(jsonBytes))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create Gemini request: " + err.Error()})
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := aiHttpClient.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to reach Google Gemini API: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		c.JSON(resp.StatusCode, gin.H{
			"error":   fmt.Sprintf("Gemini API rejected key (status %d)", resp.StatusCode),
			"details": string(body),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Gemini API key verified successfully! Connected to gemini-2.5-flash.",
	})
}

// AnalyzeErrorWithAI queries Google Gemini to diagnose root-cause, affected files, and fixes
func (h *Handler) AnalyzeErrorWithAI(c *gin.Context) {
	var req struct {
		Error  SystemErrorItem `json:"error"`
		APIKey string          `json:"apiKey"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	key := readGeminiKey(req.APIKey)
	if key == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "No Gemini API key available. Enter an API key in the Error Logger tab or configure /etc/tinapple/gemini_key",
		})
		return
	}

	prompt := fmt.Sprintf(`You are an expert Linux kernel engineer, systems reliability engineer, and full-stack software troubleshooter for an Arch Linux appliance.
Analyze this machine or application failure:

Origin Subsystem / Source: %s
Service or Process: %s
Severity: %s
Error Message: %s
Raw Log Entry / Trace:
%s

You MUST return ONLY a valid, strict JSON object (no markdown code blocks, no backticks, no explanations outside JSON) with this exact schema:
{
  "source": "concise origin e.g. Linux Kernel (iwlwifi wireless driver) or Systemd (jellyfin.service) or React Client (HomarrBoard.tsx)",
  "expectedCause": "clear and precise explanation of the root cause behind this error",
  "filesAffected": ["/etc/system-path/file.conf", "/var/log/app.log", "source file if relevant"],
  "formattedError": "clean, human-readable summary of the error without noisy timestamps or addresses",
  "suggestedRemediation": "concrete actionable steps or shell commands to fix or investigate this",
  "severityAssessment": "low | medium | high | critical"
}`, req.Error.Source, req.Error.Service, req.Error.Severity, req.Error.Message, req.Error.Raw)

	endpoint := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=%s", key)
	payload := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]string{
					{"text": prompt},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature":     0.2,
			"responseMimeType": "application/json",
		},
	}

	jsonBytes, _ := json.Marshal(payload)
	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()
	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(jsonBytes))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create AI request: " + err.Error()})
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := aiHttpClient.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed to contact Gemini API: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		c.JSON(resp.StatusCode, gin.H{
			"error":   fmt.Sprintf("Gemini API error (HTTP %d)", resp.StatusCode),
			"details": string(body),
		})
		return
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.Unmarshal(body, &geminiResp); err != nil || len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid response format from Gemini API", "raw": string(body)})
		return
	}

	rawText := geminiResp.Candidates[0].Content.Parts[0].Text
	// Clean markdown block if returned
	rawText = strings.TrimPrefix(rawText, "```json")
	rawText = strings.TrimPrefix(rawText, "```")
	rawText = strings.TrimSuffix(rawText, "```")
	rawText = strings.TrimSpace(rawText)

	var analysis AIErrorAnalysis
	if err := json.Unmarshal([]byte(rawText), &analysis); err != nil {
		// Fallback to structured text if JSON parsing fails
		analysis = AIErrorAnalysis{
			Source:               req.Error.Source + " (" + req.Error.Service + ")",
			ExpectedCause:        rawText,
			FilesAffected:        []string{"/var/log/journal", "/etc/systemd/system"},
			FormattedError:       req.Error.Message,
			SuggestedRemediation: "Review system logs with: journalctl -u " + req.Error.Service + " -n 50",
			SeverityAssessment:   req.Error.Severity,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"analysis": analysis,
	})
}
