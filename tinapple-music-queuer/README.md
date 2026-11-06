# 🎵 Tinapple Music Queuer (`tinapple-music-queuer`)

[![Release](https://img.shields.io/badge/release-v0.0.1-cyan.svg)](https://github.com/imyash0722/tinapple-music-queuer/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.9+](https://img.shields.io/badge/Python-3.9%2B-blue.svg)](https://www.python.org/)
[![Audio Format](https://img.shields.io/badge/Audio-FLAC%20%7C%20ALAC%20Lossless-purple.svg)](#)

> Automated studio lossless FLAC audio resolver, batch queuer, and library manager for **Navidrome**, **Jellyfin**, and **Subsonic** servers powered by [Antra](https://github.com/anandprtp/Antra).

---

## 🌟 Overview

**Tinapple Music Queuer** is a headless Linux background daemon and CLI utility engineered to automate the ingest of music playlists into self-hosted music servers in pristine **lossless FLAC / ALAC** quality.

It consumes Spotify and Apple Music playlist URLs, automatically divides large playlists into bounded batches (enforcing upstream batch constraints of $\le 100$ items), resolves audio streams through Deezer, Apple, Qobuz, and Tidal backends, streams download progress over WebSockets, and extracts lossless files directly into organized `/srv/media/music/Playlists/` hierarchies with sanitized permissions for instant Navidrome playback.

```
┌─────────────────────────────────┐
│   Spotify / Apple Music URLs    │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  tinapple-music-queuer CLI & Daemon                         │
│  • Auto-chunking into ≤ 100 track batches                   │
│  • Antra session management & WebSocket event streamer      │
│  • Fault isolation & per-track error cataloging             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Antra Lossless Resolvers (Apple / Deezer / Qobuz / Tidal)  │
│  • 16-bit / 44.1 kHz & 24-bit studio FLAC/ALAC bitstreams   │
│  • Direct metadata tagging & album art embedding            │
└────────────────┬────────────────────────────────────────────┘
                 │ (Clean ZIP package stream)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  /srv/media/music/Playlists/<Playlist_Name>/                │
│  • Permissions: 0664 (group: media)                         │
│  • Instant Subsonic indexing in Navidrome & Feishin         │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

- **Lossless FLAC Stream Ingestion**: Sourced in studio 16-bit / 44.1 kHz or 24-bit ALAC/FLAC with full ID3/Vorbis comment metadata tags and embedded high-resolution cover artwork.
- **Automated Batch Chunking**: Playlists of any size (e.g., 600+ tracks) are split into sequentially executed chunks conforming to API limits without overloading host bandwidth.
- **Realtime WebSocket Event Stream**: Connects to the Antra job WebSocket (`wss://.../api/jobs/<id>/ws`) to monitor track resolution, bitrate, download status, and packaging in real time.
- **Fault-Tolerant Error Management**: If an obscure track lacks a lossless copy on mirror backends, the queuer logs the failed track into the error manager and proceeds without breaking the rest of the batch.
- **Systemd Background Daemon**: Runs 24/7 as a managed system service or user unit with auto-restart and low resource footprint.
- **Navidrome Ready**: Automatically organizes folders by playlist name and assigns permissions (`media` group, `0664` file mode) so Navidrome or Jellyfin can immediately index and stream the tracks.
- **Zero-Disruption Queue Management**: Inspect progress, queue new playlists, retry failed batches, or clear error logs live from the CLI without restarting the background service.

---

## 🚀 Quick Start

### 1. One-Line Installation (Linux)

Clone and run the automated installer:
```bash
git clone https://github.com/imyash0722/tinapple-music-queuer.git
cd tinapple-music-queuer
sudo ./install.sh
```

### 2. Manual Installation (Pip / Virtual Environment)

```bash
git clone https://github.com/imyash0722/tinapple-music-queuer.git
cd tinapple-music-queuer

python3 -m venv venv
./venv/bin/pip install -e .
```

---

## ⚙️ Configuration

The configuration file is stored at `~/.config/tinapple/music_queuer.json`:

```json
{
  "base_url": "https://antra.hoshi.cfd",
  "username": "your_username",
  "password": "your_password",
  "output_dir": "/srv/media/music",
  "format": "lossless-16",
  "max_batch_size": 100,
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}
```

| Parameter | Default | Description |
|---|---|---|
| `base_url` | `https://antra.hoshi.cfd` | Antra server API base URL |
| `username` | `""` | User account username |
| `password` | `""` | User account password |
| `output_dir` | `/srv/media/music` | Music root directory where playlists are saved |
| `format` | `lossless-16` | Audio format: `lossless-16`, `lossless-24`, or `high-mp3` |
| `max_batch_size` | `100` | Maximum tracks per job batch |

---

## 🛠️ CLI Usage & Commands

### Add Playlists to Queue
Add any Apple Music or Spotify playlist URL. The resolver extracts playlist metadata, determines the total track count, and automatically creates the necessary batches:
```bash
tinapple-music-queuer add "https://music.apple.com/in/playlist/brazilian-phonk/pl.6d9baf0fa37844fc953613759e835846"
tinapple-music-queuer add "https://open.spotify.com/playlist/7vUQxFBFIfLNOYmVqCBRJF"
```

### Check Queue Status
View all queued playlists, their current status (`pending`, `in_progress`, `completed`), and per-batch track counts:
```bash
tinapple-music-queuer status
```
Example Output:
```text
═════════════════════════════════════════════════════════════════════════
                    🎵 TINAPPLE MUSIC QUEUE STATUS                       
═════════════════════════════════════════════════════════════════════════
[1] Brazilian Phonk (ID: q_1793956192383) — 119 tracks
    Status: IN_PROGRESS | Batches: 0/2 | Added: 2026-11-06T09:09:52
      • Batch 1 [0:100]: in_progress (done: 52/100)
      • Batch 2 [100:119]: pending (done: 0/19)
[2] BRAZILIAN PHONK 2024 (ID: q_1793956194891) — 155 tracks
    Status: PENDING | Batches: 0/2 | Added: 2026-11-06T09:09:54
      • Batch 1 [0:100]: pending (done: 0/100)
      • Batch 2 [100:155]: pending (done: 0/55)
```

### Error Management
If individual songs were skipped or lacked a lossless stream copy:
```bash
# View list of failed tracks and error reasons
tinapple-music-queuer errors

# Retry failed or uncompleted batches
tinapple-music-queuer retry
tinapple-music-queuer retry --id q_1793956192383

# Clear error history after review
tinapple-music-queuer clear-errors

# Remove a playlist from the queue
tinapple-music-queuer remove q_1793956192383
```

### Start the Worker Daemon
Run foreground processor (ideal for debugging or interactive terminal):
```bash
tinapple-music-queuer run
```

---

## 🔄 Systemd Service Integration

Enable and start the daemon as a system background service:
```bash
# System-wide daemon
sudo systemctl enable --now tinapple-music-queuer.service

# Or as a user daemon
systemctl --user enable --now tinapple-music-queuer.service
```

Follow live streaming logs:
```bash
journalctl -u tinapple-music-queuer.service -f
```

---

## 📁 Output Structure

Downloaded files are organized into dedicated playlist folders with sanitized names:
```
/srv/media/music/
└── Playlists/
    ├── Brazilian Phonk/
    │   ├── 01 - Sequência da Dz7.flac
    │   ├── 02 - Rude boy (NFL Phonk Edit).flac
    │   └── ...
    └── Masala Coffee/
        ├── 01 - Kaantha.flac
        └── ...
```

---

## 🛡️ License

This project is licensed under the [MIT License](LICENSE).
Copyright (c) 2026 Yash Sharma ([@imyash0722](https://github.com/imyash0722)).
