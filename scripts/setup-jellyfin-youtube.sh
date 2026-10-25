#!/usr/bin/env bash
# setup-jellyfin-youtube.sh
# Provisions YouTube media directories, permissions, and Jellyfin library configuration for streaming.
set -euo pipefail

log() { echo -e "\033[1;32m[tinapple-youtube]\033[0m $*"; }
warn() { echo -e "\033[1;33m[tinapple-youtube:warn]\033[0m $*"; }

MEDIA_USER="media"
MEDIA_GROUP="media"
YOUTUBE_DIR="/srv/media/youtube"
MUSIC_DIR="/srv/media/youtube-music"
STATE_DIR="/var/lib/metube"
JELLYFIN_LIB_DIR="/var/lib/jellyfin/root/default/YouTube"

log "Ensuring media directories exist..."
mkdir -p "$YOUTUBE_DIR" "$MUSIC_DIR" "$STATE_DIR"

if getent group "$MEDIA_GROUP" >/dev/null 2>&1; then
    chown -R "$MEDIA_USER:$MEDIA_GROUP" "/srv/media" 2>/dev/null || true
    chown -R "$MEDIA_USER:$MEDIA_GROUP" "$STATE_DIR" 2>/dev/null || true
fi

# Set SGID and 0775 permissions so newly created files inherit the media group
chmod -R 2775 "$YOUTUBE_DIR" "$MUSIC_DIR" 2>/dev/null || chmod -R 775 "$YOUTUBE_DIR" "$MUSIC_DIR" 2>/dev/null || true

# Add jellyfin to media group if present
if id -u jellyfin >/dev/null 2>&1; then
    usermod -a -G "$MEDIA_GROUP" jellyfin 2>/dev/null || true
fi

# Configure systemd storage access override for Jellyfin if jellyfin is installed
if [[ -d /etc/systemd/system ]]; then
    mkdir -p /etc/systemd/system/jellyfin.service.d
    cat << 'EOF' > /etc/systemd/system/jellyfin.service.d/storage-access.conf
[Service]
SupplementaryGroups=media video render
ReadWritePaths=-/srv/media -/var/lib/jellyfin -/var/cache/jellyfin -/var/log/jellyfin
EOF
    systemctl daemon-reload >/dev/null 2>&1 || true
fi

# Pre-provision Jellyfin YouTube library definition if /var/lib/jellyfin exists
if [[ -d /var/lib/jellyfin ]]; then
    log "Configuring Jellyfin YouTube library definition..."
    mkdir -p "$JELLYFIN_LIB_DIR"
    
    # Symlink library path
    ln -sfn "$YOUTUBE_DIR" "$JELLYFIN_LIB_DIR/YouTube" 2>/dev/null || true
    
    # Options XML with NFO reader and chapter extraction enabled
    cat << 'EOF' > "$JELLYFIN_LIB_DIR/options.xml"
<?xml version="1.0" encoding="utf-8"?>
<LibraryOptions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Enabled>true</Enabled>
  <EnablePhotos>false</EnablePhotos>
  <EnableRealtimeMonitor>true</EnableRealtimeMonitor>
  <EnableChapterImageExtraction>true</EnableChapterImageExtraction>
  <ExtractChapterImagesDuringLibraryScan>true</ExtractChapterImagesDuringLibraryScan>
  <PathInfos>
    <MediaPathInfo>
      <Path>/srv/media/youtube</Path>
    </MediaPathInfo>
  </PathInfos>
  <TypeOptions>
    <TypeOptions>
      <Type>Movie</Type>
      <MetadataFetchers>
        <string>Nfo</string>
      </MetadataFetchers>
      <MetadataFetcherOrder>
        <string>Nfo</string>
      </MetadataFetcherOrder>
      <ImageFetchers>
        <string>Embedded</string>
        <string>Screen Grabber</string>
      </ImageFetchers>
    </TypeOptions>
  </TypeOptions>
</LibraryOptions>
EOF
    chown -R jellyfin:jellyfin "$JELLYFIN_LIB_DIR" 2>/dev/null || true
    chmod -R 775 "$JELLYFIN_LIB_DIR" 2>/dev/null || true
    log "Jellyfin YouTube library pre-provisioned at $JELLYFIN_LIB_DIR"
fi

log "YouTube streaming directories and Jellyfin integration ready!"
log "  - Video downloads: $YOUTUBE_DIR"
log "  - Audio downloads: $MUSIC_DIR"
log "  - Downloader Web UI: http://localhost:8085 / http://<ip>/youtube/"
