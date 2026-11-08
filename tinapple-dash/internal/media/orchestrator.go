package media

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

type Config struct {
	SonarrURL  string `json:"sonarr_url"`
	SonarrKey  string `json:"sonarr_key"`
	RadarrURL  string `json:"radarr_url"`
	RadarrKey  string `json:"radarr_key"`
	BazarrURL  string `json:"bazarr_url"`
	BazarrKey  string `json:"bazarr_key"`
	ShowsPath  string `json:"shows_path"`
	MoviesPath string `json:"movies_path"`
}

type XMLConfig struct {
	ApiKey string `xml:"ApiKey"`
	Port   string `xml:"Port"`
}

type MediaSearchResult struct {
	ID        int      `json:"id"`
	Type      string   `json:"type"` // "movie" or "tv"
	Title     string   `json:"title"`
	Year      int      `json:"year"`
	Overview  string   `json:"overview"`
	PosterURL string   `json:"poster_url"`
	RemoteID  int      `json:"remote_id"`
	Monitored bool     `json:"monitored"`
	Existing  bool     `json:"existing"`
	Status    string   `json:"status"`
	Genres    []string `json:"genres"`
}

type MediaRequest struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"` // "movie" or "tv"
	Title       string    `json:"title"`
	Year        int       `json:"year"`
	Overview    string    `json:"overview"`
	PosterURL   string    `json:"poster_url"`
	TMDBID      int       `json:"tmdb_id,omitempty"`
	TVDBID      int       `json:"tvdb_id,omitempty"`
	RequestedBy string    `json:"requested_by"`
	RequestedAt time.Time `json:"requested_at"`
	Status      string    `json:"status"` // "requested", "downloading", "subtitles", "available", "failed"
	Progress    float64   `json:"progress"`
	ETA         string    `json:"eta,omitempty"`
	ServiceFile string    `json:"service_file,omitempty"`
	Error       string    `json:"error,omitempty"`
}

type Orchestrator struct {
	cfg        Config
	mu         sync.RWMutex
	client     *http.Client
	storePath  string
	configPath string
	requests   map[string]*MediaRequest
}

func NewOrchestrator() *Orchestrator {
	orch := &Orchestrator{
		storePath:  "/etc/tinapple/media_requests.json",
		configPath: "/etc/tinapple/media_automation.json",
		requests:   make(map[string]*MediaRequest),
		client: &http.Client{
			Timeout: 12 * time.Second,
		},
	}

	orch.loadConfig()
	orch.loadRequests()

	// Background poll to update downloading queues and subtitle status
	go orch.startStatusPoller()

	return orch
}

func (o *Orchestrator) loadConfig() {
	o.mu.Lock()
	defer o.mu.Unlock()

	// 1. Defaults
	o.cfg = Config{
		SonarrURL:  "http://127.0.0.1:8989",
		RadarrURL:  "http://127.0.0.1:7878",
		BazarrURL:  "http://127.0.0.1:6767/bazarr",
		ShowsPath:  "/srv/media/shows",
		MoviesPath: "/srv/media/movies",
	}

	// 2. Load declarative file if present
	if data, err := os.ReadFile(o.configPath); err == nil {
		_ = json.Unmarshal(data, &o.cfg)
	}

	// 3. Fallback discovery from arr application config files
	if o.cfg.RadarrKey == "" {
		if key := extractArrKey("/var/lib/radarr/config.xml"); key != "" {
			o.cfg.RadarrKey = key
		}
	}
	if o.cfg.SonarrKey == "" {
		if key := extractArrKey("/var/lib/sonarr/config.xml"); key != "" {
			o.cfg.SonarrKey = key
		}
	}
	if o.cfg.BazarrKey == "" {
		if key := extractBazarrKey("/var/lib/bazarr/config/config.yaml"); key != "" {
			o.cfg.BazarrKey = key
		}
	}

	// Persist resolved declarative config
	if o.cfg.RadarrKey != "" || o.cfg.SonarrKey != "" {
		if data, err := json.MarshalIndent(o.cfg, "", "  "); err == nil {
			_ = os.WriteFile(o.configPath, data, 0644)
		}
	}
}

func extractArrKey(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	var xmlCfg XMLConfig
	if err := xml.Unmarshal(data, &xmlCfg); err == nil && xmlCfg.ApiKey != "" {
		return xmlCfg.ApiKey
	}
	return ""
}

func extractBazarrKey(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	lines := strings.Split(string(data), "\n")
	inAuth := false
	for _, l := range lines {
		trimmed := strings.TrimSpace(l)
		if strings.HasPrefix(trimmed, "auth:") {
			inAuth = true
			continue
		}
		if inAuth {
			if strings.HasPrefix(trimmed, "apikey:") {
				val := strings.TrimSpace(strings.TrimPrefix(trimmed, "apikey:"))
				val = strings.Trim(val, `"' `)
				if val != "" {
					return val
				}
			} else if !strings.HasPrefix(l, " ") && !strings.HasPrefix(l, "\t") {
				inAuth = false
			}
		}
	}
	return ""
}

func (o *Orchestrator) loadRequests() {
	o.mu.Lock()
	defer o.mu.Unlock()

	data, err := os.ReadFile(o.storePath)
	if err != nil {
		return
	}

	var list []*MediaRequest
	if err := json.Unmarshal(data, &list); err == nil {
		for _, req := range list {
			o.requests[req.ID] = req
		}
	}
}

func (o *Orchestrator) saveRequestsLocked() {
	list := make([]*MediaRequest, 0, len(o.requests))
	for _, r := range o.requests {
		list = append(list, r)
	}

	data, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile(o.storePath, data, 0644)
}

func (o *Orchestrator) Search(ctx context.Context, term, mediaType string) ([]MediaSearchResult, error) {
	o.mu.RLock()
	cfg := o.cfg
	o.mu.RUnlock()

	term = strings.TrimSpace(term)
	if term == "" {
		return nil, fmt.Errorf("search term required")
	}

	var results []MediaSearchResult

	// Query Radarr (movies)
	if mediaType == "" || mediaType == "movie" || mediaType == "all" {
		if cfg.RadarrKey != "" {
			reqUrl := fmt.Sprintf("%s/api/v3/movie/lookup?term=%s", strings.TrimRight(cfg.RadarrURL, "/"), url.QueryEscape(term))
			req, err := http.NewRequestWithContext(ctx, "GET", reqUrl, nil)
			if err == nil {
				req.Header.Set("X-Api-Key", cfg.RadarrKey)
				if resp, err := o.client.Do(req); err == nil {
					defer resp.Body.Close()
					if resp.StatusCode == 200 {
						var movies []map[string]any
						if err := json.NewDecoder(resp.Body).Decode(&movies); err == nil {
							for _, m := range movies {
								res := parseRadarrMovie(m)
								results = append(results, res)
							}
						}
					}
				}
			}
		}
	}

	// Query Sonarr (series / anime / shows)
	if mediaType == "" || mediaType == "tv" || mediaType == "series" || mediaType == "all" {
		if cfg.SonarrKey != "" {
			reqUrl := fmt.Sprintf("%s/api/v3/series/lookup?term=%s", strings.TrimRight(cfg.SonarrURL, "/"), url.QueryEscape(term))
			req, err := http.NewRequestWithContext(ctx, "GET", reqUrl, nil)
			if err == nil {
				req.Header.Set("X-Api-Key", cfg.SonarrKey)
				if resp, err := o.client.Do(req); err == nil {
					defer resp.Body.Close()
					if resp.StatusCode == 200 {
						var shows []map[string]any
						if err := json.NewDecoder(resp.Body).Decode(&shows); err == nil {
							for _, s := range shows {
								res := parseSonarrSeries(s)
								results = append(results, res)
							}
						}
					}
				}
			}
		}
	}

	return results, nil
}

func parseRadarrMovie(m map[string]any) MediaSearchResult {
	id, _ := m["id"].(float64)
	title, _ := m["title"].(string)
	year, _ := m["year"].(float64)
	overview, _ := m["overview"].(string)
	tmdbId, _ := m["tmdbId"].(float64)
	monitored, _ := m["monitored"].(bool)
	hasFile, _ := m["hasFile"].(bool)

	poster := ""
	if images, ok := m["images"].([]any); ok {
		for _, img := range images {
			if im, ok := img.(map[string]any); ok {
				coverType, _ := im["coverType"].(string)
				if coverType == "poster" {
					if remote, ok := im["remoteUrl"].(string); ok && remote != "" {
						poster = remote
						break
					}
				}
			}
		}
	}

	status := "Not Monitored"
	if hasFile {
		status = "Available in Library"
	} else if monitored {
		status = "Monitored / Wanted"
	}

	return MediaSearchResult{
		ID:        int(id),
		Type:      "movie",
		Title:     title,
		Year:      int(year),
		Overview:  overview,
		PosterURL: poster,
		RemoteID:  int(tmdbId),
		Monitored: monitored,
		Existing:  id > 0,
		Status:    status,
	}
}

func parseSonarrSeries(s map[string]any) MediaSearchResult {
	id, _ := s["id"].(float64)
	title, _ := s["title"].(string)
	year, _ := s["year"].(float64)
	overview, _ := s["overview"].(string)
	tvdbId, _ := s["tvdbId"].(float64)
	monitored, _ := s["monitored"].(bool)

	poster := ""
	if images, ok := s["images"].([]any); ok {
		for _, img := range images {
			if im, ok := img.(map[string]any); ok {
				coverType, _ := im["coverType"].(string)
				if coverType == "poster" {
					if remote, ok := im["remoteUrl"].(string); ok && remote != "" {
						poster = remote
						break
					}
				}
			}
		}
	}

	status := "Not Monitored"
	if id > 0 {
		status = "In Library"
	}

	return MediaSearchResult{
		ID:        int(id),
		Type:      "tv",
		Title:     title,
		Year:      int(year),
		Overview:  overview,
		PosterURL: poster,
		RemoteID:  int(tvdbId),
		Monitored: monitored,
		Existing:  id > 0,
		Status:    status,
	}
}

func (o *Orchestrator) RequestMedia(ctx context.Context, user string, req MediaRequest) (*MediaRequest, error) {
	o.mu.Lock()
	cfg := o.cfg
	o.mu.Unlock()

	if req.Title == "" {
		return nil, fmt.Errorf("media title required")
	}
	if user == "" {
		user = "friend"
	}

	reqId := fmt.Sprintf("%s-%d", req.Type, time.Now().UnixNano())
	req.ID = reqId
	req.RequestedBy = user
	req.RequestedAt = time.Now()
	req.Status = "requested"
	req.Progress = 0

	if req.Type == "movie" {
		if cfg.RadarrKey == "" {
			return nil, fmt.Errorf("Radarr service is not configured")
		}
		// Submit to Radarr
		body := map[string]any{
			"title":            req.Title,
			"tmdbId":           req.TMDBID,
			"year":             req.Year,
			"qualityProfileId": 6, // Any / default
			"rootFolderPath":   cfg.MoviesPath,
			"monitored":        true,
			"addOptions": map[string]any{
				"searchForMovie": true,
			},
		}

		jsonBody, _ := json.Marshal(body)
		rUrl := fmt.Sprintf("%s/api/v3/movie", strings.TrimRight(cfg.RadarrURL, "/"))
		httpReq, err := http.NewRequestWithContext(ctx, "POST", rUrl, bytes.NewReader(jsonBody))
		if err != nil {
			return nil, err
		}
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("X-Api-Key", cfg.RadarrKey)

		resp, err := o.client.Do(httpReq)
		if err != nil {
			return nil, fmt.Errorf("failed connecting to Radarr: %w", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 400 {
			respBytes, _ := io.ReadAll(resp.Body)
			// Check if already exists in Radarr
			if strings.Contains(string(respBytes), "MovieExistsValidator") || strings.Contains(string(respBytes), "already exists") {
				req.Status = "downloading"
				req.Progress = 10
			} else {
				return nil, fmt.Errorf("Radarr returned HTTP %d: %s", resp.StatusCode, string(respBytes))
			}
		} else {
			req.Status = "downloading"
			req.Progress = 5
		}
	} else if req.Type == "tv" {
		if cfg.SonarrKey == "" {
			return nil, fmt.Errorf("Sonarr service is not configured")
		}
		// Submit to Sonarr
		body := map[string]any{
			"title":            req.Title,
			"tvdbId":           req.TVDBID,
			"year":             req.Year,
			"qualityProfileId": 1, // Any / default
			"rootFolderPath":   cfg.ShowsPath,
			"monitored":        true,
			"addOptions": map[string]any{
				"searchForMissingEpisodes": true,
			},
		}

		jsonBody, _ := json.Marshal(body)
		sUrl := fmt.Sprintf("%s/api/v3/series", strings.TrimRight(cfg.SonarrURL, "/"))
		httpReq, err := http.NewRequestWithContext(ctx, "POST", sUrl, bytes.NewReader(jsonBody))
		if err != nil {
			return nil, err
		}
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("X-Api-Key", cfg.SonarrKey)

		resp, err := o.client.Do(httpReq)
		if err != nil {
			return nil, fmt.Errorf("failed connecting to Sonarr: %w", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 400 {
			respBytes, _ := io.ReadAll(resp.Body)
			if strings.Contains(string(respBytes), "SeriesExistsValidator") || strings.Contains(string(respBytes), "already exists") {
				req.Status = "downloading"
				req.Progress = 10
			} else {
				return nil, fmt.Errorf("Sonarr returned HTTP %d: %s", resp.StatusCode, string(respBytes))
			}
		} else {
			req.Status = "downloading"
			req.Progress = 5
		}
	}

	o.mu.Lock()
	o.requests[req.ID] = &req
	o.saveRequestsLocked()
	o.mu.Unlock()

	return &req, nil
}

func (o *Orchestrator) ListRequests() []*MediaRequest {
	o.mu.RLock()
	defer o.mu.RUnlock()

	list := make([]*MediaRequest, 0, len(o.requests))
	for _, req := range o.requests {
		list = append(list, req)
	}
	return list
}

func (o *Orchestrator) DeleteRequest(id string) bool {
	o.mu.Lock()
	defer o.mu.Unlock()

	if _, ok := o.requests[id]; ok {
		delete(o.requests, id)
		o.saveRequestsLocked()
		return true
	}
	return false
}

func (o *Orchestrator) startStatusPoller() {
	ticker := time.NewTicker(20 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		o.syncQueueStatus()
	}
}

func (o *Orchestrator) syncQueueStatus() {
	o.mu.RLock()
	cfg := o.cfg
	hasReqs := len(o.requests) > 0
	o.mu.RUnlock()

	if !hasReqs {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	// Query Radarr queue
	radarrQueue := make(map[string]float64)
	if cfg.RadarrKey != "" {
		qUrl := fmt.Sprintf("%s/api/v3/queue", strings.TrimRight(cfg.RadarrURL, "/"))
		if req, err := http.NewRequestWithContext(ctx, "GET", qUrl, nil); err == nil {
			req.Header.Set("X-Api-Key", cfg.RadarrKey)
			if resp, err := o.client.Do(req); err == nil {
				defer resp.Body.Close()
				if resp.StatusCode == 200 {
					var qData struct {
						Records []struct {
							Title    string  `json:"title"`
							Size     float64 `json:"size"`
							Sizeleft float64 `json:"sizeleft"`
							Status   string  `json:"status"`
						} `json:"records"`
					}
					if err := json.NewDecoder(resp.Body).Decode(&qData); err == nil {
						for _, r := range qData.Records {
							if r.Size > 0 {
								prog := ((r.Size - r.Sizeleft) / r.Size) * 100
								radarrQueue[strings.ToLower(r.Title)] = prog
							}
						}
					}
				}
			}
		}
	}

	// Update in-memory requests
	o.mu.Lock()
	changed := false
	for _, r := range o.requests {
		if r.Status == "downloading" {
			titleLower := strings.ToLower(r.Title)
			matched := false
			for qTitle, prog := range radarrQueue {
				if strings.Contains(qTitle, titleLower) || strings.Contains(titleLower, qTitle) {
					r.Progress = prog
					matched = true
					changed = true
					break
				}
			}
			// If not in downloading queue anymore, it finished downloading and is now in post-processing / available
			if !matched && r.Progress > 80 {
				r.Status = "available"
				r.Progress = 100
				changed = true
			}
		}
	}

	if changed {
		o.saveRequestsLocked()
	}
	o.mu.Unlock()
}
