package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
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

type SubsonicPlayQueueResponse struct {
	SubsonicResponse struct {
		Status    string `json:"status"`
		PlayQueue struct {
			Current   interface{}               `json:"current"`
			Position  int                       `json:"position"`
			Username  string                    `json:"username"`
			Changed   string                    `json:"changed"`
			ChangedBy string                    `json:"changedBy"`
			Entry     []SubsonicNowPlayingEntry `json:"entry"`
		} `json:"playQueue"`
	} `json:"subsonic-response"`
}

type MusicTrackDTO struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Artist     string `json:"artist"`
	Album      string `json:"album"`
	CoverURL   string `json:"coverUrl"`
	Duration   int    `json:"duration"`
	MinutesAgo int    `json:"minutesAgo"`
	Username   string `json:"username"`
}

type MusicNowPlayingResponse struct {
	Active bool           `json:"active"`
	Track  *MusicTrackDTO `json:"track"`
}

func (h *Handler) GetMusicNowPlaying(c *gin.Context) {
	client := http.Client{Timeout: 3 * time.Second}

	// 1. Try getNowPlaying.view (populated when clients explicitly submit scrobbles)
	nowURL := "http://127.0.0.1:4533/rest/getNowPlaying.view?u=pineapple&p=pine%402507&v=1.16.1&c=tinapple&f=json"
	if resp, err := client.Get(nowURL); err == nil {
		defer resp.Body.Close()
		if resp.StatusCode == http.StatusOK {
			if body, err := io.ReadAll(resp.Body); err == nil {
				var subResp SubsonicResponse
				if err := json.Unmarshal(body, &subResp); err == nil {
					entries := subResp.SubsonicResponse.NowPlaying.Entry
					if len(entries) > 0 {
						first := entries[0]
						coverURL := ""
						if first.CoverArt != "" {
							coverURL = fmt.Sprintf("/api/v1/music/cover?id=%s", url.QueryEscape(first.CoverArt))
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
						return
					}
				}
			}
		}
	}

	// 2. Fallback to getPlayQueue.view (live active playback queue used by WebUI and modern players like psysonic)
	pqURL := "http://127.0.0.1:4533/rest/getPlayQueue.view?u=pineapple&p=pine%402507&v=1.16.1&c=tinapple&f=json"
	resp, err := client.Get(pqURL)
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

	var pqResp SubsonicPlayQueueResponse
	if err := json.Unmarshal(body, &pqResp); err != nil {
		c.JSON(http.StatusOK, MusicNowPlayingResponse{Active: false, Track: nil})
		return
	}

	pq := pqResp.SubsonicResponse.PlayQueue
	if len(pq.Entry) == 0 {
		c.JSON(http.StatusOK, MusicNowPlayingResponse{Active: false, Track: nil})
		return
	}

	// Find the current entry by matching ID or index
	curStr := fmt.Sprintf("%v", pq.Current)
	var matched *SubsonicNowPlayingEntry
	for i := range pq.Entry {
		if pq.Entry[i].ID == curStr {
			matched = &pq.Entry[i]
			break
		}
	}
	if matched == nil {
		if idx, err := strconv.Atoi(curStr); err == nil && idx >= 0 && idx < len(pq.Entry) {
			matched = &pq.Entry[idx]
		}
	}
	if matched == nil && len(pq.Entry) > 0 {
		matched = &pq.Entry[0]
	}

	// Calculate recency and active status
	active := false
	minutesAgo := 0
	if pq.Changed != "" {
		changedTime, err := time.Parse(time.RFC3339Nano, pq.Changed)
		if err != nil {
			changedTime, _ = time.Parse(time.RFC3339, pq.Changed)
		}
		if !changedTime.IsZero() {
			diff := time.Since(changedTime)
			minutesAgo = int(diff.Minutes())
			threshold := time.Duration(matched.Duration+180) * time.Second
			if threshold < 10*time.Minute {
				threshold = 10 * time.Minute
			}
			if diff >= 0 && diff <= threshold {
				active = true
			}
		}
	}

	coverURL := ""
	if matched.CoverArt != "" {
		coverURL = fmt.Sprintf("/api/v1/music/cover?id=%s", url.QueryEscape(matched.CoverArt))
	}

	track := &MusicTrackDTO{
		ID:         matched.ID,
		Title:      matched.Title,
		Artist:     matched.Artist,
		Album:      matched.Album,
		CoverURL:   coverURL,
		Duration:   matched.Duration,
		MinutesAgo: minutesAgo,
		Username:   pq.Username,
	}

	c.JSON(http.StatusOK, MusicNowPlayingResponse{
		Active: active,
		Track:  track,
	})
}

func (h *Handler) GetMusicCover(c *gin.Context) {
	id := c.Query("id")
	if id == "" {
		c.Status(http.StatusBadRequest)
		return
	}

	navURL := fmt.Sprintf("http://127.0.0.1:4533/rest/getCoverArt.view?id=%s&u=pineapple&p=pine%%402507&v=1.16.1&c=tinapple", url.QueryEscape(id))
	client := http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(navURL)
	if err != nil {
		c.Status(http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.Status(resp.StatusCode)
		return
	}

	c.Header("Cache-Control", "public, max-age=86400")
	c.Header("Content-Type", resp.Header.Get("Content-Type"))
	io.Copy(c.Writer, resp.Body)
}

