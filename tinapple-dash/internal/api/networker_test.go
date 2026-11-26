package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestProxyNetworkerRouteAndFormat(t *testing.T) {
	gin.SetMode(gin.TestMode)
	var st networkerStatusLite
	st.Proton.Active = true
	st.Proton.Configured = true
	st.Proton.ExitIP = "37.19.200.23"
	st.Proton.Country = "United States"
	st.Proton.Endpoint = "37.19.200.22:51820"
	st.Proton.FreeTier = true
	st.Proton.P2PSupported = false
	st.Targets = []struct {
		ID   string `json:"id"`
		Mode string `json:"mode"`
	}{
		{ID: "pinemusic", Mode: "protonvpn"},
		{ID: "qbittorrent", Mode: "tor"},
	}

	mapped := formatLegacyProtonResponse(&st)
	if mapped["active"] != true || mapped["ip"] != "37.19.200.23" {
		t.Fatalf("unexpected mapped legacy proton payload: %+v", mapped)
	}
	routed, _ := mapped["routed_services"].([]string)
	if len(routed) != 1 || routed[0] != "pinemusic" {
		t.Fatalf("expected only pinemusic in routed_services, got %v", routed)
	}

	r := gin.New()
	h := &Handler{}
	r.GET("/api/v1/networker/status", h.ProxyNetworker)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/networker/status", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	// When networker is offline locally in test, returns clean 503 JSON rather than 404 or panicking
	if rec.Code != http.StatusServiceUnavailable && rec.Code != http.StatusOK {
		t.Fatalf("unexpected proxy status: %d (%s)", rec.Code, rec.Body.String())
	}
}
