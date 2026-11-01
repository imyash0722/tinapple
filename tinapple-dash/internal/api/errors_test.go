package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"tinapple-dash/internal/config"
	"tinapple-dash/internal/services"
	"tinapple-dash/internal/telemetry"

	"github.com/gin-gonic/gin"
)

func setupTestRouter() (*gin.Engine, *Handler) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	cfg := config.DefaultManifest()
	svcMgr := services.NewSystemdManager()
	tel := telemetry.NewCollector(svcMgr, cfg)
	h := NewHandler(cfg, svcMgr, tel)

	r.GET("/api/v1/system/errors", h.GetSystemErrors)
	r.POST("/api/v1/system/errors/client", h.ReportClientError)
	r.POST("/api/v1/system/errors/clear", h.ClearClientErrors)
	r.GET("/api/v1/ai/status", h.GetAIStatus)
	r.POST("/api/v1/ai/test-key", h.TestAIKey)
	r.POST("/api/v1/ai/analyze-error", h.AnalyzeErrorWithAI)

	return r, h
}

func TestReportAndGetSystemErrors(t *testing.T) {
	r, _ := setupTestRouter()

	// 1. Report a simulated frontend client error
	reportPayload := ClientErrorReport{
		Message:   "Test TypeError: Cannot read property undefined",
		Stack:     "TypeError at HomarrAppTile.tsx:42",
		Source:    "HomarrAppTile",
		URL:       "http://pineapple-server:8088/",
		Timestamp: "2026-11-01T10:00:00Z",
	}
	body, _ := json.Marshal(reportPayload)
	req, _ := http.NewRequest("POST", "/api/v1/system/errors/client", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d: %s", w.Code, w.Body.String())
	}

	// 2. Fetch all system errors
	getReq, _ := http.NewRequest("GET", "/api/v1/system/errors", nil)
	getW := httptest.NewRecorder()
	r.ServeHTTP(getW, getReq)

	if getW.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d: %s", getW.Code, getW.Body.String())
	}

	var resp struct {
		Errors []SystemErrorItem `json:"errors"`
		Count  int               `json:"count"`
	}
	if err := json.Unmarshal(getW.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	foundClient := false
	for _, e := range resp.Errors {
		if e.Source == "frontend" && e.Message == reportPayload.Message {
			foundClient = true
			break
		}
	}
	if !foundClient {
		t.Errorf("Reported client error not found in /api/v1/system/errors response")
	}

	// 3. Clear errors
	clearReq, _ := http.NewRequest("POST", "/api/v1/system/errors/clear", nil)
	clearW := httptest.NewRecorder()
	r.ServeHTTP(clearW, clearReq)
	if clearW.Code != http.StatusOK {
		t.Errorf("Expected 200 for clear, got %d", clearW.Code)
	}
}

func TestAIStatus(t *testing.T) {
	r, _ := setupTestRouter()

	req, _ := http.NewRequest("GET", "/api/v1/ai/status", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d", w.Code)
	}

	var resp struct {
		Configured bool   `json:"configured"`
		MaskedKey  string `json:"maskedKey"`
		Model      string `json:"model"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to parse status response: %v", err)
	}
	if resp.Model != "gemini-2.5-flash" {
		t.Errorf("Expected gemini-2.5-flash, got %s", resp.Model)
	}
}
