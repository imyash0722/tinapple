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
		if _, err := os.Stat(filepath.Join(distDir, "guides")); err == nil {
			r.Static("/guides", filepath.Join(distDir, "guides"))
		}
		if _, err := os.Stat(filepath.Join(distDir, "images")); err == nil {
			r.Static("/images", filepath.Join(distDir, "images"))
		}
		wpDir := api.FindWallpapersDir(distDir)
		r.Static("/wallpapers", wpDir)
		r.StaticFile("/favicon.ico", filepath.Join(distDir, "favicon.ico"))
		serveIndex := func(c *gin.Context) {
			c.Header("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0")
			c.Header("Pragma", "no-cache")
			c.Header("Expires", "0")
			c.File(filepath.Join(distDir, "index.html"))
		}
		guideMap := map[string]string{
			"/guide/plezy":       "/guides/plezy.html",
			"/guide/jellyfin":    "/guides/plezy.html",
			"/guide/seerr":       "/guides/seerr.html",
			"/guide/servarr":     "/guides/seerr.html",
			"/guide/adguard":     "/guides/adguard.html",
			"/guide/navidrome":   "/guides/navidrome.html",
			"/guide/syncyomi":    "/guides/syncyomi.html",
			"/guide/beeper":      "/guides/beeper.html",
			"/guide/mautrix":     "/guides/mautrix.html",
			"/guide/matrix":      "/guides/mautrix.html",
			"/guide/vaultwarden": "/guides/vaultwarden.html",
			"/guide/syncthing":   "/guides/syncthing.html",
			"/guide/obsidian":    "/guides/obsidian.html",
			"/guide/ssh":         "/guides/ssh.html",
			"/guide/tor":         "/guides/tor.html",
		}
		for routePath, targetFile := range guideMap {
			tgt := targetFile
			r.GET(routePath, func(c *gin.Context) {
				c.Redirect(http.StatusFound, tgt)
			})
		}

		r.GET("/", serveIndex)
		r.NoRoute(func(c *gin.Context) {
			path := c.Request.URL.Path

			// Unified App & Guide routes: always serve Pineapple Hub React SPA
			if strings.HasSuffix(path, "-guide") || strings.HasPrefix(path, "/app/") || strings.HasPrefix(path, "/guide/") {
				serveIndex(c)
				return
			}

			if strings.HasPrefix(path, "/tsumiru") || strings.HasPrefix(path, "/suwayomi") {
				host := c.Request.Host
				if colon := strings.Index(host, ":"); colon != -1 {
					host = host[:colon]
				}
				c.Redirect(http.StatusFound, "http://"+host+":4567/")
				return
			}
			if strings.HasPrefix(path, "/pinchflat") || strings.HasPrefix(path, "/youtube") {
				host := c.Request.Host
				if colon := strings.Index(host, ":"); colon != -1 {
					host = host[:colon]
				}
				c.Redirect(http.StatusFound, "http://"+host+":8945/")
				return
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