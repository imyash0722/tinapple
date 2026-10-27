package api

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// WallpaperItem represents a wallpaper in the catalog
type WallpaperItem struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	File      string `json:"file"`
	URL       string `json:"url"`
	IsVideo   bool   `json:"isVideo"`
	Category  string `json:"category"`
	Extension string `json:"extension"`
	Size      int64  `json:"size"`
}

// FindWallpapersDir locates the directory containing wallpaper assets
func FindWallpapersDir(distDir string) string {
	candidates := []string{
		"/usr/share/tinapple-dash/wallpapers",
		filepath.Join(distDir, "wallpapers"),
		"wallpapers",
		"../wallpapers",
		"/home/pineapple/Pictures/wallpapers",
		"/mnt/shared/projects/tinapple/wallpapers",
	}

	validExts := map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".mp4": true, ".webm": true,
	}

	for _, dir := range candidates {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			if entries, err := os.ReadDir(dir); err == nil {
				for _, e := range entries {
					if !e.IsDir() && validExts[strings.ToLower(filepath.Ext(e.Name()))] {
						return dir
					}
				}
			}
		}
	}

	// Default fallback: create directory
	fallback := "/usr/share/tinapple-dash/wallpapers"
	_ = os.MkdirAll(fallback, 0755)
	return fallback
}

// categorizeWallpaper assigns a friendly category based on filename and format
func categorizeWallpaper(filename string, isVideo bool) string {
	if isVideo {
		return "Animated"
	}

	lower := strings.ToLower(filename)

	switch {
	case strings.Contains(lower, "pixel"):
		return "Pixel Art"
	case strings.Contains(lower, "anime") || strings.Contains(lower, "samurai") ||
		strings.Contains(lower, "ryoku") || strings.Contains(lower, "torii") ||
		strings.Contains(lower, "sword") || strings.Contains(lower, "wallhaven"):
		return "Anime & Aesthetic"
	case strings.Contains(lower, "mountain") || strings.Contains(lower, "valley") ||
		strings.Contains(lower, "forest") || strings.Contains(lower, "clouds") ||
		strings.Contains(lower, "aurora") || strings.Contains(lower, "lake") ||
		strings.Contains(lower, "pagoda") || strings.Contains(lower, "oasis") ||
		strings.Contains(lower, "rainy") || strings.Contains(lower, "ryokan") ||
		strings.Contains(lower, "sunset") || strings.Contains(lower, "twilight") ||
		strings.Contains(lower, "autumn"):
		return "Nature & Scenery"
	case strings.Contains(lower, "cyber") || strings.Contains(lower, "planet") ||
		strings.Contains(lower, "saturn") || strings.Contains(lower, "battlestation") ||
		strings.Contains(lower, "keyboard") || strings.Contains(lower, "space") ||
		strings.Contains(lower, "tunnel"):
		return "Sci-Fi & Tech"
	case strings.Contains(lower, "pineapple"):
		return "Pineapple"
	default:
		return "Atmospheric"
	}
}

// formatWallpaperTitle turns a filename into a beautiful title
func formatWallpaperTitle(filename string) string {
	name := strings.TrimSuffix(filename, filepath.Ext(filename))
	// Replace delimiters with spaces
	name = strings.ReplaceAll(name, "-", " ")
	name = strings.ReplaceAll(name, "_", " ")
	name = regexp.MustCompile(`\s+`).ReplaceAllString(name, " ")

	// Capitalize words
	words := strings.Fields(name)
	for i, w := range words {
		if len(w) > 0 {
			words[i] = strings.ToUpper(w[:1]) + strings.ToLower(w[1:])
		}
	}
	return strings.Join(words, " ")
}

// ListWallpapers returns all available image and video wallpapers
func (h *Handler) ListWallpapers(c *gin.Context) {
	wpDir := FindWallpapersDir("/usr/share/tinapple-dash/web/dist")
	entries, err := os.ReadDir(wpDir)
	if err != nil {
		c.JSON(http.StatusOK, []WallpaperItem{})
		return
	}

	validExts := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
		".mp4":  true,
		".webm": true,
	}

	items := make([]WallpaperItem, 0)
	for _, entry := range entries {
		if entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		ext := strings.ToLower(filepath.Ext(entry.Name()))
		if !validExts[ext] {
			continue
		}

		info, err := entry.Info()
		var size int64 = 0
		if err == nil {
			size = info.Size()
		}

		isVideo := ext == ".mp4" || ext == ".webm"
		title := formatWallpaperTitle(entry.Name())
		category := categorizeWallpaper(entry.Name(), isVideo)

		items = append(items, WallpaperItem{
			ID:        entry.Name(),
			Name:      title,
			File:      entry.Name(),
			URL:       "/wallpapers/" + entry.Name(),
			IsVideo:   isVideo,
			Category:  category,
			Extension: ext,
			Size:      size,
		})
	}

	// Sort: Animated first, then Pineapple, then by name
	sort.Slice(items, func(i, j int) bool {
		if items[i].IsVideo != items[j].IsVideo {
			return items[i].IsVideo // videos first
		}
		if items[i].Category == "Pineapple" && items[j].Category != "Pineapple" {
			return true
		}
		if items[j].Category == "Pineapple" && items[i].Category != "Pineapple" {
			return false
		}
		return items[i].Name < items[j].Name
	})

	c.JSON(http.StatusOK, items)
}

// SelectWallpaper handles wallpaper selection and returns metadata
func (h *Handler) SelectWallpaper(c *gin.Context) {
	var req struct {
		Filename string `json:"filename"`
		URL      string `json:"url"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		// Also accept query or url param
		req.Filename = c.Query("filename")
		req.URL = c.Query("url")
	}

	filename := req.Filename
	if filename == "" && req.URL != "" {
		filename = filepath.Base(req.URL)
	}

	if filename == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Filename or URL required"})
		return
	}

	cleanFile := filepath.Base(filename)
	ext := strings.ToLower(filepath.Ext(cleanFile))
	isVideo := ext == ".mp4" || ext == ".webm"

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"filename": cleanFile,
		"url":      "/wallpapers/" + cleanFile,
		"isVideo":  isVideo,
		"title":    formatWallpaperTitle(cleanFile),
		"category": categorizeWallpaper(cleanFile, isVideo),
	})
}

// UploadWallpaper allows users to upload a custom wallpaper or video loop
func (h *Handler) UploadWallpaper(c *gin.Context) {
	wpDir := FindWallpapersDir("/usr/share/tinapple-dash/web/dist")
	_ = os.MkdirAll(wpDir, 0755)

	// Check for multipart file
	file, header, err := c.Request.FormFile("wallpaper")
	if err != nil {
		file, header, err = c.Request.FormFile("file")
	}

	if err == nil && header != nil {
		defer file.Close()
		ext := strings.ToLower(filepath.Ext(header.Filename))
		validExts := map[string]bool{
			".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".mp4": true, ".webm": true,
		}
		if !validExts[ext] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid format. Supported: .jpg, .png, .webp, .mp4, .webm"})
			return
		}

		safeName := regexp.MustCompile(`[^a-zA-Z0-9._-]`).ReplaceAllString(filepath.Base(header.Filename), "_")
		dstPath := filepath.Join(wpDir, safeName)

		out, err := os.Create(dstPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to save wallpaper: %v", err)})
			return
		}
		defer out.Close()

		if _, err := io.Copy(out, file); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to write wallpaper: %v", err)})
			return
		}

		isVideo := ext == ".mp4" || ext == ".webm"
		c.JSON(http.StatusOK, gin.H{
			"success":  true,
			"url":      "/wallpapers/" + safeName,
			"filename": safeName,
			"name":     formatWallpaperTitle(safeName),
			"isVideo":  isVideo,
			"category": categorizeWallpaper(safeName, isVideo),
		})
		return
	}

	// Fallback to JSON base64 upload (Tinarchy compatible)
	var jsonReq struct {
		Filename string `json:"filename"`
		Data     string `json:"data"`
	}

	if err := c.ShouldBindJSON(&jsonReq); err == nil && jsonReq.Data != "" {
		safeName := regexp.MustCompile(`[^a-zA-Z0-9._-]`).ReplaceAllString(filepath.Base(jsonReq.Filename), "_")
		if safeName == "" {
			safeName = fmt.Sprintf("custom_wallpaper_%d.jpg", time.Now().Unix())
		}
		ext := strings.ToLower(filepath.Ext(safeName))

		b64Content := jsonReq.Data
		if strings.Contains(b64Content, ",") {
			b64Content = strings.SplitN(b64Content, ",", 2)[1]
		}

		bytes, err := base64.StdEncoding.DecodeString(b64Content)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid base64 payload"})
			return
		}

		dstPath := filepath.Join(wpDir, safeName)
		if err := os.WriteFile(dstPath, bytes, 0644); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to write file: %v", err)})
			return
		}

		isVideo := ext == ".mp4" || ext == ".webm"
		c.JSON(http.StatusOK, gin.H{
			"success":  true,
			"url":      "/wallpapers/" + safeName,
			"filename": safeName,
			"name":     formatWallpaperTitle(safeName),
			"isVideo":  isVideo,
			"category": categorizeWallpaper(safeName, isVideo),
		})
		return
	}

	c.JSON(http.StatusBadRequest, gin.H{"error": "No wallpaper file or base64 data received"})
}
