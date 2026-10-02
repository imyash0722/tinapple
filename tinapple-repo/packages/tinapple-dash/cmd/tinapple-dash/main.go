package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
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

	// Static files for web UI
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