#!/usr/bin/env bash
# install.sh - Automated installer for Tinapple Music Queuer
set -euo pipefail

INSTALL_DIR="/opt/tinapple-music-queuer"
BIN_LINK="/usr/local/bin/tinapple-music-queuer"
VENV_DIR="$INSTALL_DIR/venv"

echo "========================================================================"
echo "    🎵 Installing Tinapple Music Queuer (Lossless FLAC Streamer)"
echo "========================================================================"

# Privilege check
if [[ $EUID -ne 0 ]]; then
  echo "[!] Please run as root (or use sudo): sudo ./install.sh"
  exit 1
fi

# Detect primary user
TARGET_USER="${SUDO_USER:-pineapple}"
if ! id "$TARGET_USER" >/dev/null 2>&1; then
  TARGET_USER=$(id -un 1000 2>/dev/null || echo "root")
fi

echo "[*] Target service user: $TARGET_USER"

# 1. Install system prerequisites if missing
if command -v pacman >/dev/null 2>&1; then
  pacman -Sy --noconfirm --needed python python-pip
elif command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y python3 python3-pip python3-venv
fi

# 2. Setup install directory
mkdir -p "$INSTALL_DIR"
cp queuer.py "$INSTALL_DIR/queuer.py"
chmod +x "$INSTALL_DIR/queuer.py"

# 3. Create virtual environment
echo "[*] Setting up Python virtual environment..."
python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --upgrade pip --quiet
"$VENV_DIR/bin/pip" install requests websockets --quiet

# 4. Create launcher wrapper in /usr/local/bin
cat << 'EOF' > "$BIN_LINK"
#!/usr/bin/env bash
exec /opt/tinapple-music-queuer/venv/bin/python3 /opt/tinapple-music-queuer/queuer.py "$@"
EOF
chmod +x "$BIN_LINK"
echo "[✓] CLI installed to $BIN_LINK"

# 5. Setup config directory for target user
USER_HOME=$(eval echo "~$TARGET_USER")
USER_CONFIG_DIR="$USER_HOME/.config/tinapple"
mkdir -p "$USER_CONFIG_DIR"
chown -R "$TARGET_USER:$TARGET_USER" "$USER_CONFIG_DIR" 2>/dev/null || true

# 6. Install systemd service
if [[ -d /etc/systemd/system ]]; then
  echo "[*] Installing systemd service..."
  sed "s/User=pineapple/User=$TARGET_USER/" systemd/tinapple-music-queuer.service > /etc/systemd/system/tinapple-music-queuer.service
  systemctl daemon-reload
  echo "[✓] Systemd unit installed at /etc/systemd/system/tinapple-music-queuer.service"
fi

echo "========================================================================"
echo " [SUCCESS] Tinapple Music Queuer is installed!"
echo " Start daemon:      systemctl enable --now tinapple-music-queuer"
echo " Add playlist:      tinapple-music-queuer add <Spotify or Apple Music URL>"
echo " Check queue:       tinapple-music-queuer status"
echo " View errors:       tinapple-music-queuer errors"
echo "========================================================================"
