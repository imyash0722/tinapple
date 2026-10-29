#!/usr/bin/env bash
# ==============================================================================
# tinapple Live Update & Deployment Tool
# Builds and hot-deploys dashboard and appliance updates directly to the server.
# No OS reinstallation or reboot required.
# ==============================================================================
set -euo pipefail

TARGET_HOST="${1:-192.168.1.17}"
TARGET_USER="${TARGET_USER:-tinapple}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║             tinapple Appliance Update & Deploy             ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo -e "Target Server: ${YELLOW}${TARGET_USER}@${TARGET_HOST}${NC}"
echo ""

# 1. Verify Connectivity
echo -e "${CYAN}[1/5] Verifying SSH connectivity...${NC}"
if ! ssh -o ConnectTimeout=5 -q "${TARGET_USER}@${TARGET_HOST}" "exit 0"; then
  echo -e "${RED}Error: Cannot connect to ${TARGET_USER}@${TARGET_HOST} over SSH.${NC}"
  echo "Make sure the server is powered on and reachable on your network / Tailscale."
  exit 1
fi
echo -e "${GREEN}✓ Connected successfully.${NC}"

# 2. Build Frontend
echo -e "${CYAN}[2/5] Compiling tinapple-hub frontend asset bundle...${NC}"
cd "${REPO_DIR}/tinapple-hub"
npm run build --silent
cp -r "${REPO_DIR}/tinapple-hub/dist/assets" "${REPO_DIR}/tinapple-hub/dist/index.html" "${REPO_DIR}/tinapple-dash/web/dist/"
echo -e "${GREEN}✓ Frontend bundle compiled.${NC}"

# 3. Build Backend Binary
echo -e "${CYAN}[3/5] Cross-compiling tinapple-dash Go binary...${NC}"
cd "${REPO_DIR}/tinapple-dash"
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/tinapple-dash ./cmd/tinapple-dash
echo -e "${GREEN}✓ Binary compiled successfully ($(ls -lh bin/tinapple-dash | awk '{print $5}')).${NC}"

# 4. Stream Updates to Server
echo -e "${CYAN}[4/5] Deploying assets and binary to server...${NC}"
ssh "${TARGET_USER}@${TARGET_HOST}" "sudo systemctl stop tinapple-dash.service"
scp -q bin/tinapple-dash "${TARGET_USER}@${TARGET_HOST}:/tmp/tinapple-dash"
ssh "${TARGET_USER}@${TARGET_HOST}" "sudo cp /tmp/tinapple-dash /usr/bin/tinapple-dash && sudo cp /tmp/tinapple-dash /usr/local/bin/tinapple-dash && sudo chmod 755 /usr/bin/tinapple-dash /usr/local/bin/tinapple-dash && rm -f /tmp/tinapple-dash"
tar -C "${REPO_DIR}/tinapple-dash/web/dist" -cf - . | ssh "${TARGET_USER}@${TARGET_HOST}" "sudo tar -C /usr/share/tinapple-dash/web/dist -xf -"

# Deploy installer suite scripts
for script in tinapple-master-install tinapple-install-app tinapple-install-pack tinapple-install-syncyomi tinapple-configure-seerr beeper-ctl tinapple-update tinapple-display-sleep; do
  if [[ -f "${REPO_DIR}/scripts/${script}" ]]; then
    scp -q "${REPO_DIR}/scripts/${script}" "${TARGET_USER}@${TARGET_HOST}:/tmp/${script}"
    ssh "${TARGET_USER}@${TARGET_HOST}" "sudo install -Dm755 /tmp/${script} /usr/local/bin/${script} && rm -f /tmp/${script}"
  fi
done
# Ensure /usr/local/bin/beeper symlink
ssh "${TARGET_USER}@${TARGET_HOST}" "sudo ln -sf /usr/local/bin/beeper-ctl /usr/local/bin/beeper 2>/dev/null || true"

if [[ -f "${REPO_DIR}/scripts/tinapple-wifi-watchdog" && -f "${REPO_DIR}/scripts/tinapple-wifi-watchdog.service" ]]; then
  scp -q "${REPO_DIR}/scripts/tinapple-wifi-watchdog" "${TARGET_USER}@${TARGET_HOST}:/tmp/tinapple-wifi-watchdog"
  scp -q "${REPO_DIR}/scripts/tinapple-wifi-watchdog.service" "${TARGET_USER}@${TARGET_HOST}:/tmp/tinapple-wifi-watchdog.service"
  ssh "${TARGET_USER}@${TARGET_HOST}" "sudo install -Dm755 /tmp/tinapple-wifi-watchdog /usr/local/bin/tinapple-wifi-watchdog && sudo install -Dm644 /tmp/tinapple-wifi-watchdog.service /etc/systemd/system/tinapple-wifi-watchdog.service && rm -f /tmp/tinapple-wifi-watchdog /tmp/tinapple-wifi-watchdog.service && sudo systemctl daemon-reload && sudo systemctl enable --now tinapple-wifi-watchdog.service >/dev/null 2>&1 || true"
fi

if [[ -f "${REPO_DIR}/scripts/tinapple-configure-seerr" ]]; then
  scp -q "${REPO_DIR}/scripts/tinapple-configure-seerr" "${TARGET_USER}@${TARGET_HOST}:/tmp/tinapple-configure-seerr"
  ssh "${TARGET_USER}@${TARGET_HOST}" "sudo install -Dm755 /tmp/tinapple-configure-seerr /usr/local/bin/tinapple-configure-seerr && rm -f /tmp/tinapple-configure-seerr"
fi

# Deploy systemd lid and sleep configurations (headless 24/7 server mode)
if [[ -f "${REPO_DIR}/tinapple-base/configs/logind.conf.d/tinapple-lid.conf" ]]; then
  scp -q "${REPO_DIR}/tinapple-base/configs/logind.conf.d/tinapple-lid.conf" "${TARGET_USER}@${TARGET_HOST}:/tmp/tinapple-lid.conf"
  ssh "${TARGET_USER}@${TARGET_HOST}" "sudo install -Dm644 /tmp/tinapple-lid.conf /etc/systemd/logind.conf.d/tinapple-lid.conf && rm -f /tmp/tinapple-lid.conf"
fi
if [[ -f "${REPO_DIR}/tinapple-base/configs/sleep.conf.d/disable-sleep.conf" ]]; then
  scp -q "${REPO_DIR}/tinapple-base/configs/sleep.conf.d/disable-sleep.conf" "${TARGET_USER}@${TARGET_HOST}:/tmp/disable-sleep.conf"
  ssh "${TARGET_USER}@${TARGET_HOST}" "sudo install -Dm644 /tmp/disable-sleep.conf /etc/systemd/sleep.conf.d/disable-sleep.conf && rm -f /tmp/disable-sleep.conf"
fi

# Deploy hardware daemons
if [[ -f "${REPO_DIR}/tinapple-repo/packages/tinapple-hw/src/tinapple-thermal.bin" ]]; then
  scp -q "${REPO_DIR}/tinapple-repo/packages/tinapple-hw/src/tinapple-thermal.bin" "${TARGET_USER}@${TARGET_HOST}:/tmp/tinapple-thermal"
  ssh "${TARGET_USER}@${TARGET_HOST}" "sudo install -Dm755 /tmp/tinapple-thermal /usr/bin/tinapple-thermal && rm -f /tmp/tinapple-thermal"
fi
if [[ -f "${REPO_DIR}/tinapple-repo/packages/tinapple-hw/src/tinapple-battery" ]]; then
  scp -q "${REPO_DIR}/tinapple-repo/packages/tinapple-hw/src/tinapple-battery" "${TARGET_USER}@${TARGET_HOST}:/tmp/tinapple-battery"
  ssh "${TARGET_USER}@${TARGET_HOST}" "sudo install -Dm755 /tmp/tinapple-battery /usr/bin/tinapple-battery && rm -f /tmp/tinapple-battery"
fi

ssh "${TARGET_USER}@${TARGET_HOST}" "sudo systemctl start tinapple-dash.service"
echo -e "${GREEN}✓ Assets deployed and tinapple-dash restarted.${NC}"

# 5. Health Check
echo -e "${CYAN}[5/5] Running post-deploy health check...${NC}"
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${TARGET_HOST}:8088/api/v1/system/info" || echo "000")
if [[ "${HTTP_CODE}" == "200" ]]; then
  echo -e "${GREEN}✓ Deployment verified! Dashboard is live and responding (HTTP 200).${NC}"
else
  echo -e "${YELLOW}Notice: Health check returned HTTP ${HTTP_CODE}. Service may still be initializing.${NC}"
fi

echo ""
echo -e "${GREEN}Update completed successfully!${NC}"
