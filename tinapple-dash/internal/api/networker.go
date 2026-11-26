package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const networkerOrigin = "http://127.0.0.1:8092"

// ProxyNetworker forwards all /api/v1/networker/* and /api/networker/* requests to tinapple-networker.
func (h *Handler) ProxyNetworker(c *gin.Context) {
	path := c.Request.URL.Path
	if strings.HasPrefix(path, "/api/networker/") {
		path = "/api/v1/networker/" + strings.TrimPrefix(path, "/api/networker/")
	}
	targetURL := networkerOrigin + path
	if c.Request.URL.RawQuery != "" {
		targetURL += "?" + c.Request.URL.RawQuery
	}

	var bodyReader io.Reader
	if c.Request.Body != nil {
		bodyBytes, _ := io.ReadAll(c.Request.Body)
		bodyReader = bytes.NewReader(bodyBytes)
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), c.Request.Method, targetURL, bodyReader)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}
	if ct := c.GetHeader("Content-Type"); ct != "" {
		req.Header.Set("Content-Type", ct)
	}

	client := &http.Client{Timeout: 25 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   fmt.Sprintf("tinapple-networker daemon offline: %v", err),
		})
		return
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)
	ct := resp.Header.Get("Content-Type")
	if ct == "" {
		ct = "application/json"
	}
	c.Data(resp.StatusCode, ct, respBytes)
}

type networkerStatusLite struct {
	Proton struct {
		Enabled         bool   `json:"enabled"`
		Active          bool   `json:"active"`
		Configured      bool   `json:"configured"`
		ActiveProfileID string `json:"activeProfileId"`
		Endpoint        string `json:"endpoint"`
		ExitIP          string `json:"exitIp"`
		Country         string `json:"country"`
		CountryCode     string `json:"countryCode"`
		City            string `json:"city"`
		Org             string `json:"org"`
		FreeTier        bool   `json:"freeTier"`
		P2PSupported    bool   `json:"p2pSupported"`
		Profiles        []any  `json:"profiles"`
	} `json:"proton"`
	Tor struct {
		Enabled      bool   `json:"enabled"`
		Active       bool   `json:"active"`
		Bootstrapped bool   `json:"bootstrapped"`
		ExitIP       string `json:"exitIp"`
		Country      string `json:"country"`
		CountryCode  string `json:"countryCode"`
		City         string `json:"city"`
		ISP          string `json:"isp"`
	} `json:"tor"`
	Targets []struct {
		ID   string `json:"id"`
		Mode string `json:"mode"`
	} `json:"targets"`
}

func fetchNetworkerStatusLite(refresh bool) (*networkerStatusLite, error) {
	client := http.Client{Timeout: 8 * time.Second}
	u := networkerOrigin + "/api/v1/networker/status"
	if refresh {
		u += "?refresh=1"
	}
	resp, err := client.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status HTTP %d", resp.StatusCode)
	}
	var st networkerStatusLite
	if err := json.NewDecoder(resp.Body).Decode(&st); err != nil {
		return nil, err
	}
	return &st, nil
}

func postNetworkerAction(path string, payload any) (*networkerStatusLite, []byte, int, error) {
	client := http.Client{Timeout: 18 * time.Second}
	bodyBytes, _ := json.Marshal(payload)
	resp, err := client.Post(networkerOrigin+path, "application/json", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, nil, http.StatusServiceUnavailable, err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, raw, resp.StatusCode, fmt.Errorf("networker error")
	}
	var st networkerStatusLite
	_ = json.Unmarshal(raw, &st)
	return &st, raw, resp.StatusCode, nil
}

func formatLegacyProtonResponse(st *networkerStatusLite) gin.H {
	status := "stopped"
	if st.Proton.Active {
		status = "running"
	} else if !st.Proton.Configured {
		status = "unconfigured"
	}
	details := "Disconnected"
	if st.Proton.Active {
		details = fmt.Sprintf("Active via WIREGUARD • IP: %s (%s)", st.Proton.ExitIP, st.Proton.Country)
	} else if st.Proton.Configured {
		details = fmt.Sprintf("Configured (%d WireGuard profile(s))", len(st.Proton.Profiles))
	}
	var routed []string
	for _, t := range st.Targets {
		if t.Mode == "protonvpn" {
			routed = append(routed, t.ID)
		}
	}
	return gin.H{
		"active":                  st.Proton.Active,
		"status":                  status,
		"autostart":               exec.Command("systemctl", "is-enabled", "--quiet", "tinapple-networker.service").Run() == nil,
		"configured":              st.Proton.Configured,
		"tunnel_type":             "wireguard",
		"wireguard_config_exists": st.Proton.Configured,
		"active_profile_id":       st.Proton.ActiveProfileID,
		"exit_ip":                 st.Proton.ExitIP,
		"ip":                      st.Proton.ExitIP,
		"country":                 st.Proton.Country,
		"city":                    st.Proton.City,
		"org":                     st.Proton.Org,
		"server":                  st.Proton.Endpoint,
		"free_tier":               st.Proton.FreeTier,
		"p2p_supported":           st.Proton.P2PSupported,
		"details":                 details,
		"routed_services":         routed,
	}
}
