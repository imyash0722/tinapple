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
)

var (
	tmdbCacheDir     = "/var/cache/tinapple-dash/tmdb"
	inFlightDownloads sync.Map
	tmdbHTTPClient    *http.Client
)

func init() {
	if dir := os.Getenv("TINAPPLE_TMDB_CACHE_DIR"); dir != "" {
		tmdbCacheDir = dir
	}
	_ = os.MkdirAll(tmdbCacheDir, 0755)

	proxyURL, err := url.Parse(privoxyProxyURL)
	transport := &http.Transport{
		MaxIdleConns:        50,
		MaxIdleConnsPerHost: 20,
		IdleConnTimeout:     90 * time.Second,
	}
	if err == nil {
		transport.Proxy = http.ProxyURL(proxyURL)
	}

	tmdbHTTPClient = &http.Client{
		Transport: transport,
		Timeout:   20 * time.Second,
	}
}

// ServeTmdbImage handles incoming /ombi-images/*filepath requests with local disk caching
func ServeTmdbImage(c *gin.Context) {
	rawPath := c.Param("filepath")
	// Normalize path (handle /t/p/w500/... or /w500/...)
	cleanPath := filepath.Clean(strings.TrimPrefix(rawPath, "/"))
	if strings.HasPrefix(cleanPath, "t/p/") {
		cleanPath = strings.TrimPrefix(cleanPath, "t/p/")
	}

	// Prevent directory traversal
	if strings.Contains(cleanPath, "..") {
		c.AbortWithStatus(http.StatusForbidden)
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

	// Fetch upstream image from TMDb
	upstreamURL := fmt.Sprintf("https://image.tmdb.org/t/p/%s", cleanPath)

	// Single-flight deduplication per cleanPath
	type result struct {
		err error
	}
	ch := make(chan result, 1)
	actual, loaded := inFlightDownloads.LoadOrStore(cleanPath, ch)
	if loaded {
		// Another goroutine is already fetching this exact image, wait for it
		waitCh := actual.(chan result)
		res := <-waitCh
		if res.err == nil {
			c.Header("Cache-Control", "public, max-age=31536000, immutable")
			c.Header("X-Tinapple-Cache", "HIT")
			c.File(localPath)
			return
		}
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed downloading TMDb image", "details": res.err.Error()})
		return
	}

	defer inFlightDownloads.Delete(cleanPath)

	err := downloadAndCacheImage(upstreamURL, localPath)
	if err != nil {
		ch <- result{err: err}
		close(ch)
		log.Printf("[TMDb-Cache] Error fetching %s: %v", upstreamURL, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "Failed downloading TMDb image", "details": err.Error()})
		return
	}

	ch <- result{err: nil}
	close(ch)

	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.Header("X-Tinapple-Cache", "MISS")
	c.File(localPath)
}

func downloadAndCacheImage(upstreamURL, localPath string) error {
	req, err := http.NewRequest("GET", upstreamURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Tinapple/2.0")

	resp, err := tmdbHTTPClient.Do(req)
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

	runWarmCycle()

	ticker := time.NewTicker(20 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			runWarmCycle()
		case <-ctx.Done():
			return
		}
	}
}

func runWarmCycle() {
	client := &http.Client{Timeout: 30 * time.Second}

	// Verify Ombi is responding
	resp, err := client.Get(defaultOmbiBase + "/api/v1/Status")
	if err != nil || resp == nil || resp.StatusCode >= 500 {
		if resp != nil {
			resp.Body.Close()
		}
		// If status check fails, Ombi might still be starting; try again next cycle
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
		warmEndpoint(client, defaultOmbiBase+ep)
		time.Sleep(300 * time.Millisecond) // Polite spacing
	}
}

func warmEndpoint(client *http.Client, targetURL string) {
	req, err := http.NewRequest("GET", targetURL, nil)
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

	// Asynchronously pre-fetch posters and backdrops into disk cache
	go prefetchImagesFromBody(body)
}

type discoverItem struct {
	PosterPath   string `json:"posterPath"`
	Poster       string `json:"poster_path"`
	BackdropPath string `json:"backdropPath"`
}

func prefetchImagesFromBody(body []byte) {
	var items []discoverItem
	if err := json.Unmarshal(body, &items); err != nil {
		return
	}

	for _, item := range items {
		poster := item.PosterPath
		if poster == "" {
			poster = item.Poster
		}
		if poster != "" {
			cleanPoster := strings.TrimPrefix(poster, "/")
			p500 := filepath.Join(tmdbCacheDir, "w500", cleanPoster)
			if _, err := os.Stat(p500); os.IsNotExist(err) {
				_ = downloadAndCacheImage(fmt.Sprintf("https://image.tmdb.org/t/p/w500/%s", cleanPoster), p500)
			}
			p300 := filepath.Join(tmdbCacheDir, "w300", cleanPoster)
			if _, err := os.Stat(p300); os.IsNotExist(err) {
				_ = downloadAndCacheImage(fmt.Sprintf("https://image.tmdb.org/t/p/w300/%s", cleanPoster), p300)
			}
		}

		if item.BackdropPath != "" {
			cleanBackdrop := strings.TrimPrefix(item.BackdropPath, "/")
			b1280 := filepath.Join(tmdbCacheDir, "w1280", cleanBackdrop)
			if _, err := os.Stat(b1280); os.IsNotExist(err) {
				_ = downloadAndCacheImage(fmt.Sprintf("https://image.tmdb.org/t/p/w1280/%s", cleanBackdrop), b1280)
			}
		}
	}
}
