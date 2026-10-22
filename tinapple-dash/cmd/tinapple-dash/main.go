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

	// Proxy legacy Tinarchy backend routes (e.g. /api/widgets, /api/wallpapers, etc.) to port 8085
	tinarchyTarget, err := url.Parse("http://127.0.0.1:8085")
	if err == nil {
		proxy := httputil.NewSingleHostReverseProxy(tinarchyTarget)
		proxyHandler := func(c *gin.Context) {
			proxy.ServeHTTP(c.Writer, c.Request)
		}

		r.Any("/api/wallpaper/*path", proxyHandler)
		r.Any("/api/wallpapers", proxyHandler)
		r.Any("/api/pywal", proxyHandler)
		r.Any("/api/system/tor-exit", proxyHandler)
		r.Any("/api/reports/*path", proxyHandler)
	}

	// Web UI static files (check for modern React Hub build in web/dist)
	distDir := "/usr/share/tinapple-dash/web/dist"
	if _, err := os.Stat("web/dist"); err == nil {
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

	// Suwayomi-Tsumiru Manga Client APK route
	r.GET("/tsumiru-client.apk", func(c *gin.Context) {
		tsumiruApkPath := filepath.Join(distDir, "tsumiru-client.apk")
		if _, err := os.Stat("tsumiru-client.apk"); err == nil {
			c.File("tsumiru-client.apk")
			return
		}
		if _, err := os.Stat(tsumiruApkPath); err == nil {
			c.File(tsumiruApkPath)
			return
		}
		c.Redirect(http.StatusFound, "https://github.com/Suwayomi/Tsumiru/releases/latest")
	})
	r.GET("/download/tsumiru", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/tsumiru-client.apk")
	})

	// Tsumiru Web App route
	tsumiruDir := filepath.Join(distDir, "tsumiru")
	if _, err := os.Stat(tsumiruDir); err == nil {
		r.Static("/tsumiru", tsumiruDir)
	}

	if _, err := os.Stat(filepath.Join(distDir, "index.html")); err == nil {
		r.Static("/assets", filepath.Join(distDir, "assets"))
		r.Static("/icons", filepath.Join(distDir, "icons"))
		if _, err := os.Stat(filepath.Join(distDir, "images")); err == nil {
			r.Static("/images", filepath.Join(distDir, "images"))
		}
		if _, err := os.Stat(filepath.Join(distDir, "wallpapers")); err == nil {
			r.Static("/wallpapers", filepath.Join(distDir, "wallpapers"))
		} else if _, err := os.Stat("wallpapers"); err == nil {
			r.Static("/wallpapers", "wallpapers")
		} else if _, err := os.Stat("../wallpapers"); err == nil {
			r.Static("/wallpapers", "../wallpapers")
		}
		r.StaticFile("/favicon.ico", filepath.Join(distDir, "favicon.ico"))
		r.GET("/", func(c *gin.Context) {
			c.File(filepath.Join(distDir, "index.html"))
		})
		r.NoRoute(func(c *gin.Context) {
			path := c.Request.URL.Path
			if strings.HasPrefix(path, "/api") {
				c.JSON(http.StatusNotFound, gin.H{"error": "API route not found"})
				return
			}
			c.File(filepath.Join(distDir, "index.html"))
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
		r.LoadHTMLGlob(templateGlob)
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