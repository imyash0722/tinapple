package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	defaultOmbiApiKey = "cdcb6da2f20540b8923f53f130cddb90"
	defaultOmbiBase   = "http://127.0.0.1:5000/ombi"
	privoxyProxyURL   = "http://127.0.0.1:8118"
	maxConcurrentTor  = 4
)

const fallbackPosterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450" width="100%" height="100%">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#141c26"/>
      <stop offset="100%" stop-color="#0d141b"/>
    </linearGradient>
  </defs>
  <rect width="300" height="450" fill="url(#bg)"/>
  <rect x="8" y="8" width="284" height="434" rx="8" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
  <g transform="translate(118, 175)" fill="#4a5d73">
    <rect x="0" y="0" width="64" height="48" rx="6" fill="none" stroke="#4a5d73" stroke-width="3"/>
    <circle cx="20" cy="24" r="8" fill="none" stroke="#4a5d73" stroke-width="2.5"/>
    <circle cx="44" cy="24" r="8" fill="none" stroke="#4a5d73" stroke-width="2.5"/>
    <path d="M32 0 L32 48" stroke="#4a5d73" stroke-width="2.5"/>
  </g>
  <text x="150" y="255" fill="#64748b" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500" text-anchor="middle">Poster Preview</text>
</svg>`

var (
	tmdbCacheDir      = "/var/cache/tinapple-dash/tmdb"
	inFlightDownloads  sync.Map
	tmdbDirectClient   *http.Client
	tmdbTorClient      *http.Client
	upstreamSemaphore  = make(chan struct{}, maxConcurrentTor)
)

func init() {
	if dir := os.Getenv("TINAPPLE_TMDB_CACHE_DIR"); dir != "" {
		tmdbCacheDir = dir
	}
	_ = os.MkdirAll(tmdbCacheDir, 0755)

	// Direct client for line-rate downloads (Proton VPN / unrestricted WAN)
	tmdbDirectClient = &http.Client{
		Timeout: 5 * time.Second,
	}

	// Tor fallback client via Privoxy (for campus firewall evasion when VPN is inactive)
	proxyURL, err := url.Parse(privoxyProxyURL)
	torTransport := &http.Transport{
		MaxIdleConns:        50,
		MaxIdleConnsPerHost: 20,
		IdleConnTimeout:     90 * time.Second,
	}
	if err == nil {
		torTransport.Proxy = http.ProxyURL(proxyURL)
	}

	tmdbTorClient = &http.Client{
		Transport: torTransport,
		Timeout:   25 * time.Second,
	}
}

// ServeTmdbImage handles incoming /ombi-images/*filepath requests with local disk caching
func ServeTmdbImage(c *gin.Context) {
	rawPath := c.Param("filepath")

	// Normalize path (handle /t/p/w500/... or /w500/... or double slashes)
	cleanPath := filepath.Clean(strings.TrimPrefix(rawPath, "/"))
	if strings.HasPrefix(cleanPath, "t/p/") {
		cleanPath = strings.TrimPrefix(cleanPath, "t/p/")
	}
	cleanPath = filepath.ToSlash(filepath.Clean("/" + cleanPath))
	cleanPath = strings.TrimPrefix(cleanPath, "/")

	// Prevent directory traversal or empty paths
	if strings.Contains(cleanPath, "..") || cleanPath == "" || cleanPath == "." {
		serveFallbackImage(c)
		return
	}

	localPath := filepath.Join(tmdbCacheDir, cleanPath)

	// Check if already cached on disk
	if fi, err := os.Stat(localPath); err == nil && !fi.IsDir() && fi.Size() > 0 {
		c.Header("Cache-Control", "public, max-age=31536000, immutable")
		c.Header("X-Tinapple-Cache", "HIT")
		c.File(localPath)
		return
	}

	// Single-flight deduplication per cleanPath
	type result struct {
		err error
	}
	ch := make(chan result, 1)
	actual, loaded := inFlightDownloads.LoadOrStore(cleanPath, ch)
	if loaded {
		// Another goroutine is already fetching this exact image, wait for it
		waitCh := actual.(chan result)
		select {
		case res := <-waitCh:
			if res.err == nil {
				c.Header("Cache-Control", "public, max-age=31536000, immutable")
				c.Header("X-Tinapple-Cache", "HIT")
				c.File(localPath)
				return
			}
			serveFallbackImage(c)
			return
		case <-c.Request.Context().Done():
			return
		}
	}

	defer inFlightDownloads.Delete(cleanPath)

	upstreamURL := fmt.Sprintf("https://image.tmdb.org/t/p/%s", cleanPath)

	err := downloadAndCacheImage(c.Request.Context(), upstreamURL, localPath)
	if err != nil {
		ch <- result{err: err}
		close(ch)
		log.Printf("[TMDb-Cache] Error fetching %s: %v (serving fallback image)", upstreamURL, err)
		serveFallbackImage(c)
		return
	}

	ch <- result{err: nil}
	close(ch)

	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.Header("X-Tinapple-Cache", "MISS")
	c.File(localPath)
}

func serveFallbackImage(c *gin.Context) {
	c.Header("Content-Type", "image/svg+xml")
	c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Header("X-Tinapple-Cache", "FALLBACK")
	c.String(http.StatusOK, fallbackPosterSvg)
}

func downloadAndCacheImage(ctx context.Context, upstreamURL, localPath string) error {
	// Tier 1: Attempt direct line-rate fetch (instantaneous over Proton VPN)
	err := fetchAndWrite(ctx, tmdbDirectClient, upstreamURL, localPath)
	if err == nil {
		return nil
	}

	// If client explicitly returned 404 from TMDb origin, don't retry over Tor
	if strings.Contains(err.Error(), "HTTP 404") {
		return err
	}

	// Tier 2: Fallback to Tor proxy with concurrency semaphore
	select {
	case upstreamSemaphore <- struct{}{}:
		defer func() { <-upstreamSemaphore }()
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(30 * time.Second):
		return fmt.Errorf("timeout waiting for tor semaphore slot")
	}

	// Re-check disk before downloading over Tor
	if fi, err := os.Stat(localPath); err == nil && !fi.IsDir() && fi.Size() > 0 {
		return nil
	}

	return fetchAndWrite(ctx, tmdbTorClient, upstreamURL, localPath)
}

func fetchAndWrite(ctx context.Context, client *http.Client, upstreamURL, localPath string) error {
	req, err := http.NewRequestWithContext(ctx, "GET", upstreamURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Tinapple/2.0")
	req.Header.Set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("upstream TMDb returned HTTP %d", resp.StatusCode)
	}

	if err := os.MkdirAll(filepath.Dir(localPath), 0755); err != nil {
		return err
	}

	tmpPath := fmt.Sprintf("%s.tmp.%d", localPath, time.Now().UnixNano())
	f, err := os.Create(tmpPath)
	if err != nil {
		return err
	}

	_, err = io.Copy(f, resp.Body)
	f.Close()
	if err != nil {
		_ = os.Remove(tmpPath)
		return err
	}

	return os.Rename(tmpPath, localPath)
}

// StartOmbiWarmer periodically pre-warms Ombi's Discover API cache and caches image assets
func StartOmbiWarmer(ctx context.Context) {
	log.Printf("[Ombi-Warmer] Discover pre-warmer service initialized")

	// Initial delay to allow services to settle
	select {
	case <-time.After(8 * time.Second):
	case <-ctx.Done():
		return
	}

	runWarmCycle(ctx)

	ticker := time.NewTicker(20 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			runWarmCycle(ctx)
		case <-ctx.Done():
			return
		}
	}
}

func runWarmCycle(ctx context.Context) {
	client := &http.Client{Timeout: 30 * time.Second}

	// Verify Ombi is responding
	resp, err := client.Get(defaultOmbiBase + "/api/v1/Status")
	if err != nil || resp == nil || resp.StatusCode >= 500 {
		if resp != nil {
			resp.Body.Close()
		}
		return
	}
	resp.Body.Close()

	discoverEndpoints := []string{
		"/api/v2/Search/movie/popular/0/20",
		"/api/v2/Search/tv/popular/0/20",
		"/api/v2/Search/movie/nowplaying/0/20",
		"/api/v2/Search/tv/trending/0/20",
		"/api/v2/Search/movie/upcoming/0/20",
		"/api/v2/Search/tv/anticipated/0/20",
	}

	for _, ep := range discoverEndpoints {
		select {
		case <-ctx.Done():
			return
		default:
			warmEndpoint(ctx, client, defaultOmbiBase+ep)
			time.Sleep(300 * time.Millisecond) // Polite spacing
		}
	}
}

func warmEndpoint(ctx context.Context, client *http.Client, targetURL string) {
	req, err := http.NewRequestWithContext(ctx, "GET", targetURL, nil)
	if err != nil {
		return
	}
	req.Header.Set("ApiKey", defaultOmbiApiKey)
	req.Header.Set("Accept", "application/json")

	start := time.Now()
	resp, err := client.Do(req)
	if err != nil {
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return
	}

	duration := time.Since(start)
	log.Printf("[Ombi-Warmer] Warmed %s in %v (status %d, %d bytes)", targetURL, duration, resp.StatusCode, len(body))

	// Asynchronously pre-fetch posters and backdrops into disk cache politely
	go prefetchImagesFromBody(ctx, body)
}

type discoverItem struct {
	PosterPath   string `json:"posterPath"`
	Poster       string `json:"poster_path"`
	BackdropPath string `json:"backdropPath"`
}

func prefetchImagesFromBody(ctx context.Context, body []byte) {
	var items []discoverItem
	if err := json.Unmarshal(body, &items); err != nil {
		return
	}

	for _, item := range items {
		select {
		case <-ctx.Done():
			return
		default:
		}

		poster := item.PosterPath
		if poster == "" {
			poster = item.Poster
		}
		if poster != "" {
			cleanPoster := strings.TrimPrefix(poster, "/")
			p500 := filepath.Join(tmdbCacheDir, "w500", cleanPoster)
			if _, err := os.Stat(p500); os.IsNotExist(err) {
				_ = downloadAndCacheImage(ctx, fmt.Sprintf("https://image.tmdb.org/t/p/w500/%s", cleanPoster), p500)
				time.Sleep(80 * time.Millisecond)
			}
			p300 := filepath.Join(tmdbCacheDir, "w300", cleanPoster)
			if _, err := os.Stat(p300); os.IsNotExist(err) {
				_ = downloadAndCacheImage(ctx, fmt.Sprintf("https://image.tmdb.org/t/p/w300/%s", cleanPoster), p300)
				time.Sleep(80 * time.Millisecond)
			}
		}

		if item.BackdropPath != "" {
			cleanBackdrop := strings.TrimPrefix(item.BackdropPath, "/")
			b1280 := filepath.Join(tmdbCacheDir, "w1280", cleanBackdrop)
			if _, err := os.Stat(b1280); os.IsNotExist(err) {
				_ = downloadAndCacheImage(ctx, fmt.Sprintf("https://image.tmdb.org/t/p/w1280/%s", cleanBackdrop), b1280)
				time.Sleep(80 * time.Millisecond)
			}
		}
	}
}
