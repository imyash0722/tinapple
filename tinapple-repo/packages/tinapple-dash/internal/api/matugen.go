package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// MatugenRequest holds request parameters for Material 3 color generation
type MatugenRequest struct {
	Hex       string `json:"hex" form:"hex"`
	Wallpaper string `json:"wallpaper" form:"wallpaper"`
	Mode      string `json:"mode" form:"mode"` // "dark" or "light" (defaults to "dark")
}

// MatugenResponse provides the standard Material Design 3 token palette
type MatugenResponse struct {
	SourceColor string            `json:"source_color"`
	Mode        string            `json:"mode"`
	Engine      string            `json:"engine"`
	Colors      map[string]string `json:"colors"`
}

var (
	matugenCacheMu sync.RWMutex
	matugenCache   = make(map[string]*MatugenResponse)
)

var hexPattern = regexp.MustCompile(`^#?([0-9a-fA-F]{6})$`)

// GetMatugenPalette generates or extracts Material 3 dynamic colors via matugen
func (h *Handler) GetMatugenPalette(c *gin.Context) {
	var req MatugenRequest
	if c.Request.Method == http.MethodPost {
		_ = c.ShouldBindJSON(&req)
	}
	if req.Hex == "" {
		req.Hex = c.Query("hex")
	}
	if req.Wallpaper == "" {
		req.Wallpaper = c.Query("wallpaper")
	}
	if req.Mode == "" {
		req.Mode = c.Query("mode")
	}

	mode := strings.ToLower(strings.TrimSpace(req.Mode))
	if mode != "light" {
		mode = "dark"
	}

	reqHex := strings.TrimSpace(req.Hex)
	reqWp := strings.TrimSpace(req.Wallpaper)

	// Clean up hex
	if reqHex != "" {
		if !strings.HasPrefix(reqHex, "#") {
			reqHex = "#" + reqHex
		}
		if !hexPattern.MatchString(reqHex) {
			reqHex = "#38bdf8"
		}
	} else if reqWp == "" {
		reqHex = "#38bdf8"
	}

	cacheKey := fmt.Sprintf("%s|%s|%s", mode, reqHex, reqWp)
	matugenCacheMu.RLock()
	cached, ok := matugenCache[cacheKey]
	matugenCacheMu.RUnlock()
	if ok && cached != nil {
		c.JSON(http.StatusOK, cached)
		return
	}

	// 1. Attempt image extraction if wallpaper specified
	if reqWp != "" {
		imgFile := resolveWallpaperFile(reqWp)
		if imgFile != "" && isImageFile(imgFile) {
			resp, err := extractMatugenImage(imgFile, mode)
			if err == nil && resp != nil {
				matugenCacheMu.Lock()
				matugenCache[cacheKey] = resp
				matugenCacheMu.Unlock()
				c.JSON(http.StatusOK, resp)
				return
			}
		}
	}

	// 2. Attempt hex color palette generation via matugen CLI
	if reqHex != "" {
		resp, err := extractMatugenColor(reqHex, mode)
		if err == nil && resp != nil {
			matugenCacheMu.Lock()
			matugenCache[cacheKey] = resp
			matugenCacheMu.Unlock()
			c.JSON(http.StatusOK, resp)
			return
		}
	}

	// 3. Fallback M3 algorithmic generation
	seedHex := reqHex
	if seedHex == "" {
		seedHex = "#38bdf8"
	}
	fallback := generateAlgorithmicM3(seedHex, mode)
	c.JSON(http.StatusOK, fallback)
}

func resolveWallpaperFile(input string) string {
	clean := filepath.Base(input)
	clean = strings.TrimPrefix(clean, "/wallpapers/")

	candidates := []string{
		input,
		filepath.Join("/usr/share/tinapple-dash/wallpapers", clean),
		filepath.Join("/mnt/shared/projects/tinapple/wallpapers", clean),
		filepath.Join("wallpapers", clean),
		filepath.Join("../wallpapers", clean),
	}

	for _, p := range candidates {
		if info, err := os.Stat(p); err == nil && !info.IsDir() {
			return p
		}
	}
	return ""
}

func isImageFile(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	return ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".webp"
}

type rawMatugenOutput struct {
	Colors map[string]map[string]struct {
		Color string `json:"color"`
	} `json:"colors"`
}

func extractMatugenImage(imagePath, mode string) (*MatugenResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "matugen", "image", imagePath, "--source-color-index", "0", "-m", mode, "-j", "hex", "--dry-run")
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("matugen image failed: %w", err)
	}

	var raw rawMatugenOutput
	if err := json.Unmarshal(out, &raw); err != nil {
		return nil, fmt.Errorf("matugen output parse failed: %w", err)
	}

	colors := parseMatugenColors(raw.Colors, mode)
	source := colors["primary"]
	return &MatugenResponse{
		SourceColor: source,
		Mode:        mode,
		Engine:      "matugen-cli",
		Colors:      colors,
	}, nil
}

func extractMatugenColor(hexColor, mode string) (*MatugenResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "matugen", "color", "hex", hexColor, "-m", mode, "-j", "hex")
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("matugen color failed: %w", err)
	}

	var raw rawMatugenOutput
	if err := json.Unmarshal(out, &raw); err != nil {
		return nil, fmt.Errorf("matugen color parse failed: %w", err)
	}

	colors := parseMatugenColors(raw.Colors, mode)
	return &MatugenResponse{
		SourceColor: hexColor,
		Mode:        mode,
		Engine:      "matugen-cli",
		Colors:      colors,
	}, nil
}

func parseMatugenColors(raw map[string]map[string]struct {
	Color string `json:"color"`
}, mode string) map[string]string {
	out := make(map[string]string)
	for name, modeMap := range raw {
		if val, exists := modeMap[mode]; exists && val.Color != "" {
			out[name] = val.Color
		} else if def, exists := modeMap["default"]; exists && def.Color != "" {
			out[name] = def.Color
		}
	}
	return out
}

// generateAlgorithmicM3 generates a synthetic Material 3 palette if matugen CLI is unavailable
func generateAlgorithmicM3(sourceHex, mode string) *MatugenResponse {
	// Clean hex
	h := strings.TrimPrefix(sourceHex, "#")
	if len(h) != 6 {
		h = "38bdf8"
	}

	r, g, b := hexToRGB(h)
	// Base tonal generation
	colors := make(map[string]string)

	if mode == "dark" {
		colors["primary"] = fmt.Sprintf("#%s", h)
		colors["on_primary"] = "#003549"
		colors["primary_container"] = rgbToHex(clamp(r/3), clamp(g/3), clamp(b/3))
		colors["on_primary_container"] = "#c4e7ff"
		colors["secondary"] = rgbToHex(clamp(r*3/4), clamp(g*3/4+20), clamp(b*3/4+30))
		colors["on_secondary"] = "#1f333e"
		colors["secondary_container"] = "#354854"
		colors["on_secondary_container"] = "#d1e5f4"
		colors["tertiary"] = rgbToHex(clamp(r/2+100), clamp(g/2+80), clamp(b/2+120))
		colors["on_tertiary"] = "#322c4c"
		colors["tertiary_container"] = "#494264"
		colors["on_tertiary_container"] = "#e6deff"
		colors["surface"] = "#0b111b"
		colors["surface_dim"] = "#090e17"
		colors["surface_bright"] = "#2c3442"
		colors["surface_container_lowest"] = "#05080f"
		colors["surface_container_low"] = "#0e1522"
		colors["surface_container"] = "#121b2b"
		colors["surface_container_high"] = "#182337"
		colors["surface_container_highest"] = "#202d44"
		colors["on_surface"] = "#dfe3ec"
		colors["on_surface_variant"] = "#c0c7d4"
		colors["outline"] = "#8a929f"
		colors["outline_variant"] = "#3f4755"
		colors["background"] = "#080c14"
		colors["on_background"] = "#dfe3ec"
		colors["error"] = "#ffb4ab"
		colors["error_container"] = "#93000a"
	} else {
		colors["primary"] = fmt.Sprintf("#%s", h)
		colors["on_primary"] = "#ffffff"
		colors["primary_container"] = "#c4e7ff"
		colors["on_primary_container"] = "#001e2c"
		colors["secondary"] = "#4e616d"
		colors["on_secondary"] = "#ffffff"
		colors["secondary_container"] = "#d1e5f4"
		colors["on_secondary_container"] = "#0a1e28"
		colors["tertiary"] = "#615a7d"
		colors["on_tertiary"] = "#ffffff"
		colors["tertiary_container"] = "#e6deff"
		colors["on_tertiary_container"] = "#1d1736"
		colors["surface"] = "#f6fafe"
		colors["surface_dim"] = "#d7dbdf"
		colors["surface_bright"] = "#f6fafe"
		colors["surface_container_lowest"] = "#ffffff"
		colors["surface_container_low"] = "#f0f4f8"
		colors["surface_container"] = "#eaeff2"
		colors["surface_container_high"] = "#e5e9ed"
		colors["surface_container_highest"] = "#dfe3e7"
		colors["on_surface"] = "#181c1f"
		colors["on_surface_variant"] = "#41484d"
		colors["outline"] = "#71787d"
		colors["outline_variant"] = "#c0c7cd"
		colors["background"] = "#f6fafe"
		colors["on_background"] = "#181c1f"
		colors["error"] = "#ba1a1a"
		colors["error_container"] = "#ffdad6"
	}

	return &MatugenResponse{
		SourceColor: fmt.Sprintf("#%s", h),
		Mode:        mode,
		Engine:      "tinapple-m3-fallback",
		Colors:      colors,
	}
}

func hexToRGB(hex string) (int, int, int) {
	var r, g, b int
	fmt.Sscanf(hex, "%02x%02x%02x", &r, &g, &b)
	return r, g, b
}

func rgbToHex(r, g, b int) string {
	return fmt.Sprintf("#%02x%02x%02x", r, g, b)
}

func clamp(v int) int {
	if v < 0 {
		return 0
	}
	if v > 255 {
		return 255
	}
	return v
}
