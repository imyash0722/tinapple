package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"tinapple-dash/internal/api"
	"tinapple-dash/internal/config"
	"tinapple-dash/internal/services"
	"tinapple-dash/internal/telemetry"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load manifest configuration
	cfg, err := config.LoadManifest("/etc/tinapple/manifest.yaml")
	if err != nil {
		log.Printf("Warning: failed to load manifest: %v", err)
		cfg = config.DefaultManifest()
	}

	// Initialize systemd service manager
	svcMgr := services.NewSystemdManager()

	// Initialize telemetry collector
	telemetryCollector := telemetry.NewCollector(svcMgr, cfg)
	go telemetryCollector.Start(context.Background(), 2*time.Second)

	// Setup Gin router
	if os.Getenv("TINAPPLE_DEBUG") != "1" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Upgrade"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// API routes
	api.SetupRoutes(r, cfg, svcMgr, telemetryCollector)

	// Legacy reports proxy if port 8085 is running
	tinarchyTarget, err := url.Parse("http://127.0.0.1:8085")
	if err == nil {
		proxy := httputil.NewSingleHostReverseProxy(tinarchyTarget)
		proxyHandler := func(c *gin.Context) {
			proxy.ServeHTTP(c.Writer, c.Request)
		}
		r.Any("/api/reports/*path", proxyHandler)
	}

	// Web UI static files (check for modern React Hub build in web/dist)
	distDir := "/usr/share/tinapple-dash/web/dist"
	if _, err := os.Stat("tinapple-dash/web/dist"); err == nil {
		distDir = "tinapple-dash/web/dist"
	} else if _, err := os.Stat("web/dist"); err == nil {
		distDir = "web/dist"
	}

	apkPath := filepath.Join(distDir, "tinapple-client.apk")
	if _, err := os.Stat("tinapple-client.apk"); err == nil {
		apkPath = "tinapple-client.apk"
	}

	r.StaticFile("/tinapple-client.apk", apkPath)
	r.GET("/download/apk", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/tinapple-client.apk")
	})
	r.GET("/download/android", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/tinapple-client.apk")
	})

	// Multi-platform releases endpoints
	releasesDir := filepath.Join(distDir, "releases")
	if _, err := os.Stat("out/releases"); err == nil {
		releasesDir = "out/releases"
	}
	r.Static("/download/releases", releasesDir)
	r.GET("/download/desktop", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/download/releases/tinapple-desktop-linux-x86_64.AppImage")
	})
	r.GET("/download/windows", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/download/releases/tinapple-desktop-windows-x64.exe")
	})
	r.GET("/download/macos", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/download/releases/tinapple-desktop-macos-universal.dmg")
	})
	r.GET("/download/ios", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/download/releases/tinapple-ios-client.ipa")
	})

	// Suwayomi-Tsumiru Manga Client APK route
	tsumiruApkPath := filepath.Join(distDir, "tsumiru-client.apk")
	if _, err := os.Stat("tsumiru-client.apk"); err == nil {
		tsumiruApkPath = "tsumiru-client.apk"
	}
	r.StaticFile("/tsumiru-client.apk", tsumiruApkPath)
	r.GET("/download/tsumiru", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/tsumiru-client.apk")
	})

	// Suwayomi & Tsumiru Web Redirects to Suwayomi reader on :4567
	// Handled seamlessly in NoRoute middleware without route collisions

	if _, err := os.Stat(filepath.Join(distDir, "index.html")); err == nil {
		r.Static("/assets", filepath.Join(distDir, "assets"))
		r.Static("/icons", filepath.Join(distDir, "icons"))
		if _, err := os.Stat(filepath.Join(distDir, "images")); err == nil {
			r.Static("/images", filepath.Join(distDir, "images"))
		}
		wpDir := api.FindWallpapersDir(distDir)
		r.Static("/wallpapers", wpDir)
		r.StaticFile("/favicon.ico", filepath.Join(distDir, "favicon.ico"))
		r.StaticFile("/sw.js", filepath.Join(distDir, "sw.js"))
		r.StaticFile("/manifest.json", filepath.Join(distDir, "manifest.json"))
		serveIndex := func(c *gin.Context) {
			c.Header("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0")
			c.Header("Pragma", "no-cache")
			c.Header("Expires", "0")
			c.File(filepath.Join(distDir, "index.html"))
		}

		// Clean unified guides handling: serves static HTML if .html requested, otherwise React SPA
		guidesDir := filepath.Join(distDir, "guides")
		r.GET("/guides", serveIndex)
		r.GET("/guides/*filepath", func(c *gin.Context) {
			param := c.Param("filepath")
			if strings.HasSuffix(param, ".html") {
				target := filepath.Join(guidesDir, filepath.Clean(param))
				if _, err := os.Stat(target); err == nil {
					c.File(target)
					return
				}
			}
			serveIndex(c)
		})

		r.GET("/", serveIndex)

		r.NoRoute(func(c *gin.Context) {
			path := c.Request.URL.Path

			// Check if file exists directly in distDir (e.g. icons, sw.js, manifest.json)
			targetFile := filepath.Join(distDir, filepath.Clean(path))
			if fi, err := os.Stat(targetFile); err == nil && !fi.IsDir() {
				c.File(targetFile)
				return
			}

			// Unified App & Guide routes: always serve Pineapple Hub React SPA
			if strings.HasSuffix(path, "-guide") || strings.HasPrefix(path, "/app/") || strings.HasPrefix(path, "/guide/") || strings.HasPrefix(path, "/guides/") || path == "/guides" || path == "/guides/" {
				serveIndex(c)
				return
			}

			// Direct port service redirects for dev/8088 dashboard access
			servicePortRedirects := map[string]int{
				"/seerr":       5055,
				"/jellyseerr":  5055,
				"/jellyfin":    8096,
				"/qbittorrent": 8080,
				"/radarr":      7878,
				"/sonarr":      8989,
				"/prowlarr":    9696,
				"/bazarr":      6767,
				"/syncthing":   8384,
				"/adguard":     3000,
				"/adguardhome": 3000,
				"/vault":       8000,
				"/vaultwarden": 8000,
				"/navidrome":   4533,
				"/pinchflat":   8945,
				"/youtube":     8945,
				"/suwayomi":    4567,
				"/tsumiru":     4567,
				"/homarr":      7575,
			}

			cleanPath := strings.TrimRight(strings.ToLower(path), "/")
			for prefix, port := range servicePortRedirects {
				if cleanPath == prefix || strings.HasPrefix(cleanPath, prefix+"/") {
					host := c.Request.Host
					if colon := strings.Index(host, ":"); colon != -1 {
						host = host[:colon]
					}
					proto := "http"
					if port == 8000 && (c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https") {
						proto = "https"
					}
					c.Redirect(http.StatusFound, fmt.Sprintf("%s://%s:%d/", proto, host, port))
					return
				}
			}
			if strings.HasPrefix(path, "/api") ||
				strings.HasPrefix(path, "/assets") ||
				strings.HasPrefix(path, "/icons") ||
				strings.HasPrefix(path, "/images") ||
				strings.HasPrefix(path, "/wallpapers") {
				c.JSON(http.StatusNotFound, gin.H{"error": "Resource not found"})
				return
			}
			serveIndex(c)
		})
	} else {
		// Fallback to legacy templates if dist not present
		staticDir := "/usr/share/tinapple-dash/web/static"
		templateGlob := "/usr/share/tinapple-dash/web/templates/*"
		if _, err := os.Stat("web/static"); err == nil {
			staticDir = "web/static"
			templateGlob = "web/templates/*"
		}
		r.Static("/static", staticDir)
		if matches, _ := filepath.Glob(templateGlob); len(matches) > 0 {
			r.LoadHTMLGlob(templateGlob)
		}
		r.GET("/", func(c *gin.Context) {
			c.HTML(http.StatusOK, "index.html", gin.H{
				"title":   "tinapple Dashboard",
				"version": "0.0.1",
			})
		})
	}

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "tinapple-dash"})
	})

	// Start server
	port := cfg.Services["dash"].Port
	if p := os.Getenv("PORT"); p != "" {
		var customPort int
		if _, err := fmt.Sscanf(p, "%d", &customPort); err == nil && customPort > 0 {
			port = customPort
		}
	}
	if port == 0 {
		port = 8088
	}
	addr := fmt.Sprintf(":%d", port)
	srv := &http.Server{
		Addr:    addr,
		Handler: r,
	}

	go func() {
		log.Printf("Starting tinapple-dash on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}
	log.Println("Server exited")
}