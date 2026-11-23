package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type SubsonicNowPlayingEntry struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Artist     string `json:"artist"`
	Album      string `json:"album"`
	CoverArt   string `json:"coverArt"`
	Duration   int    `json:"duration"`
	MinutesAgo int    `json:"minutesAgo"`
	Username   string `json:"username"`
	PlayerID   int    `json:"playerId"`
}

type SubsonicResponse struct {
	SubsonicResponse struct {
		Status     string `json:"status"`
		NowPlaying struct {
			Entry []SubsonicNowPlayingEntry `json:"entry"`
		} `json:"nowPlaying"`
	} `json:"subsonic-response"`
}

type MusicTrackDTO struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Artist      string `json:"artist"`
	Album       string `json:"album"`
	CoverURL    string `json:"coverUrl"`
	Duration    int    `json:"duration"`
	MinutesAgo  int    `json:"minutesAgo"`
	Username    string `json:"username"`
}

type MusicNowPlayingResponse struct {
	Active bool           `json:"active"`
	Track  *MusicTrackDTO `json:"track"`
}

func (h *Handler) GetMusicNowPlaying(c *gin.Context) {
	navURL := "http://127.0.0.1:4533/rest/getNowPlaying.view?u=pineapple&p=pine%402507&v=1.16.1&c=tinapple&f=json"
	client := http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get(navURL)
	if err != nil {
		c.JSON(http.StatusOK, MusicNowPlayingResponse{Active: false, Track: nil})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusOK, MusicNowPlayingResponse{Active: false, Track: nil})
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusOK, MusicNowPlayingResponse{Active: false, Track: nil})
		return
	}

	var subResp SubsonicResponse
	if err := json.Unmarshal(body, &subResp); err != nil {
		c.JSON(http.StatusOK, MusicNowPlayingResponse{Active: false, Track: nil})
		return
	}

	entries := subResp.SubsonicResponse.NowPlaying.Entry
	if len(entries) == 0 {
		c.JSON(http.StatusOK, MusicNowPlayingResponse{Active: false, Track: nil})
		return
	}

	first := entries[0]
	coverURL := ""
	if first.CoverArt != "" {
		coverURL = fmt.Sprintf("/api/v1/music/cover?id=%s", first.CoverArt)
	}

	track := &MusicTrackDTO{
		ID:         first.ID,
		Title:      first.Title,
		Artist:     first.Artist,
		Album:      first.Album,
		CoverURL:   coverURL,
		Duration:   first.Duration,
		MinutesAgo: first.MinutesAgo,
		Username:   first.Username,
	}

	c.JSON(http.StatusOK, MusicNowPlayingResponse{
		Active: true,
		Track:  track,
	})
}

func (h *Handler) GetMusicCover(c *gin.Context) {
	id := c.Query("id")
	if id == "" {
		c.Status(http.StatusBadRequest)
		return
	}

	navURL := fmt.Sprintf("http://127.0.0.1:4533/rest/getCoverArt.view?id=%s&u=pineapple&p=pine%%402507&v=1.16.1&c=tinapple", id)
	client := http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(navURL)
	if err != nil {
		c.Status(http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	c.Header("Cache-Control", "public, max-age=86400")
	c.Header("Content-Type", resp.Header.Get("Content-Type"))
	io.Copy(c.Writer, resp.Body)
}
