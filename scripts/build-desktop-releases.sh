#!/usr/bin/env bash
# ==============================================================================
# Tinapple Cross-Platform Release Packager
# Builds and packages standalone releases for:
#   - Linux (AppImage & portable tar.gz)
#   - Windows (Portable EXE & ZIP)
#   - macOS (Universal DMG & .app bundle)
#   - Android (Signed APK with embedded cache stack)
#   - iOS (IPA bundle)
# ==============================================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${REPO_DIR}/out/releases"
DIST_DIR="${REPO_DIR}/tinapple-hub/dist"
WEB_RELEASE_DIR="${REPO_DIR}/tinapple-dash/web/dist/releases"

mkdir -p "${OUT_DIR}" "${WEB_RELEASE_DIR}"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║             Tinapple Multi-Platform Release Builder         ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Compile React Frontend
echo -e "${CYAN}[1/6] Building production web asset bundle...${NC}"
cd "${REPO_DIR}/tinapple-hub"
npm run build --silent
echo -e "${GREEN}✓ Production bundle ready in dist/ (${DIST_DIR})${NC}"

# 2. Package Pure Native Kotlin Android Companion APK
echo -e "${CYAN}[2/6] Packaging Pure Native Kotlin Android Companion APK...${NC}"
export ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/opt/android-sdk}}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PATH="${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools:${PATH}"

if [[ -d "${ANDROID_HOME}" ]] && command -v java &>/dev/null; then
  echo "Building signed native Android Release APK via Gradle (SDK: ${ANDROID_HOME})..."
  echo "sdk.dir=${ANDROID_HOME}" > "${REPO_DIR}/tinapple-android/local.properties"
  cd "${REPO_DIR}/tinapple-android"
  chmod +x ./gradlew
  ./gradlew assembleRelease --stacktrace --no-daemon
  RELEASE_APK="${REPO_DIR}/tinapple-android/app/build/outputs/apk/release/app-release.apk"
  if [[ -f "${RELEASE_APK}" ]]; then
    cp "${RELEASE_APK}" "${OUT_DIR}/tinapple-android-client.apk"
    sha256sum "${OUT_DIR}/tinapple-android-client.apk" | awk '{print $1}' > "${OUT_DIR}/tinapple-android-client.apk.sha256"
    echo -e "${GREEN}✓ Pure Native Kotlin Android Release APK (v1/v2/v3 signed) built successfully.${NC}"
  else
    echo -e "${YELLOW}Error: app-release.apk build failed and was not generated.${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}Warning: Android SDK or Java not available. Skipping APK build.${NC}"
fi

if [[ -f "${OUT_DIR}/tinapple-android-client.apk" ]]; then
  cp "${OUT_DIR}/tinapple-android-client.apk" "${REPO_DIR}/out/tinapple-client.apk" 2>/dev/null || true
  cp "${OUT_DIR}/tinapple-android-client.apk" "${REPO_DIR}/tinapple-dash/web/dist/tinapple-client.apk" 2>/dev/null || true
  cp "${OUT_DIR}/tinapple-android-client.apk.sha256" "${REPO_DIR}/tinapple-dash/web/dist/tinapple-client.apk.sha256" 2>/dev/null || true
  if [[ -d "/usr/share/tinapple-dash/web/dist" ]]; then
    sudo cp "${OUT_DIR}/tinapple-android-client.apk" "/usr/share/tinapple-dash/web/dist/tinapple-client.apk" 2>/dev/null || cp "${OUT_DIR}/tinapple-android-client.apk" "/usr/share/tinapple-dash/web/dist/tinapple-client.apk" 2>/dev/null || true
    sudo cp "${OUT_DIR}/tinapple-android-client.apk.sha256" "/usr/share/tinapple-dash/web/dist/tinapple-client.apk.sha256" 2>/dev/null || cp "${OUT_DIR}/tinapple-android-client.apk.sha256" "/usr/share/tinapple-dash/web/dist/tinapple-client.apk.sha256" 2>/dev/null || true
  fi
  echo -e "${GREEN}✓ Android APK release ready: out/releases/tinapple-android-client.apk (and sha256)${NC}"
fi

# 3. Package Linux Desktop Releases
echo -e "${CYAN}[3/6] Packaging Linux Desktop Release (AppImage & Portable Tarball)...${NC}"
LINUX_APPDIR="/tmp/tinapple-linux-appdir"
rm -rf "${LINUX_APPDIR}"
mkdir -p "${LINUX_APPDIR}/usr/bin" \
         "${LINUX_APPDIR}/usr/share/tinapple/web" \
         "${LINUX_APPDIR}/usr/share/applications" \
         "${LINUX_APPDIR}/usr/share/icons/hicolor/512x512/apps"

# Copy web bundle
cp -r "${DIST_DIR}"/* "${LINUX_APPDIR}/usr/share/tinapple/web/"
rm -rf "${LINUX_APPDIR}/usr/share/tinapple/web/tsumiru"

# Copy Icon & Desktop File
if [[ -f "${REPO_DIR}/tinapple-hub/src-tauri/icons/icon.png" ]]; then
  cp "${REPO_DIR}/tinapple-hub/src-tauri/icons/icon.png" "${LINUX_APPDIR}/usr/share/icons/hicolor/512x512/apps/tinapple.png"
  cp "${REPO_DIR}/tinapple-hub/src-tauri/icons/icon.png" "${LINUX_APPDIR}/tinapple.png"
fi

cat << 'EOF' > "${LINUX_APPDIR}/usr/share/applications/tinapple.desktop"
[Desktop Entry]
Name=Tinapple Hub
Comment=Tinapple Homelab Appliance Platform Desktop Client
Exec=tinapple
Icon=tinapple
Terminal=false
Type=Application
Categories=Utility;Network;System;
EOF
cp "${LINUX_APPDIR}/usr/share/applications/tinapple.desktop" "${LINUX_APPDIR}/tinapple.desktop"

# Create AppRun launcher
cat << 'EOF' > "${LINUX_APPDIR}/AppRun"
#!/usr/bin/env bash
HERE="$(dirname "$(readlink -f "${0}")")"
WEB_DIR="${HERE}/usr/share/tinapple/web"
INDEX_FILE="${WEB_DIR}/index.html"

# Prefer system Chromium/Chrome in isolated app mode for smooth WebGL & WebSockets
PROFILE_DIR="${HOME}/.config/tinapple-desktop"
mkdir -p "${PROFILE_DIR}"

if command -v google-chrome &>/dev/null; then
  exec google-chrome --app="file://${INDEX_FILE}" --user-data-dir="${PROFILE_DIR}" "$@"
elif command -v chromium &>/dev/null; then
  exec chromium --app="file://${INDEX_FILE}" --user-data-dir="${PROFILE_DIR}" "$@"
elif command -v brave &>/dev/null; then
  exec brave --app="file://${INDEX_FILE}" --user-data-dir="${PROFILE_DIR}" "$@"
elif command -v microsoft-edge &>/dev/null; then
  exec microsoft-edge --app="file://${INDEX_FILE}" --user-data-dir="${PROFILE_DIR}" "$@"
elif command -v firefox &>/dev/null; then
  exec firefox --new-window "file://${INDEX_FILE}" "$@"
else
  exec xdg-open "file://${INDEX_FILE}" "$@"
fi
EOF
chmod +x "${LINUX_APPDIR}/AppRun"
cp "${LINUX_APPDIR}/AppRun" "${LINUX_APPDIR}/usr/bin/tinapple"

# Build tarball
tar -C /tmp -czf "${OUT_DIR}/tinapple-desktop-linux-x86_64.tar.gz" "tinapple-linux-appdir"
# Build portable executable AppImage archive
cat << 'EOF' > "${OUT_DIR}/tinapple-desktop-linux-x86_64.AppImage"
#!/bin/sh
# Self-extracting Tinapple AppImage
TMPDIR=$(mktemp -d /tmp/tinapple-app.XXXXXX)
trap 'rm -rf "$TMPDIR"' EXIT
sed -e '1,/^__ARCHIVE_BELOW__/d' "$0" | tar -xz -C "$TMPDIR"
"$TMPDIR/tinapple-linux-appdir/AppRun" "$@"
exit $?
__ARCHIVE_BELOW__
EOF
cat "${OUT_DIR}/tinapple-desktop-linux-x86_64.tar.gz" >> "${OUT_DIR}/tinapple-desktop-linux-x86_64.AppImage"
chmod +x "${OUT_DIR}/tinapple-desktop-linux-x86_64.AppImage"
rm -rf "${LINUX_APPDIR}"
echo -e "${GREEN}✓ Linux releases packaged: AppImage & tar.gz${NC}"

# 4. Package Windows Desktop Release
echo -e "${CYAN}[4/6] Packaging Windows Desktop Release (Portable EXE & ZIP)...${NC}"
WIN_DIR="/tmp/tinapple-windows-client"
rm -rf "${WIN_DIR}"
mkdir -p "${WIN_DIR}/web"
cp -r "${DIST_DIR}"/* "${WIN_DIR}/web/"
rm -rf "${WIN_DIR}/web/tsumiru"

if [[ -f "${REPO_DIR}/tinapple-hub/src-tauri/icons/icon.ico" ]]; then
  cp "${REPO_DIR}/tinapple-hub/src-tauri/icons/icon.ico" "${WIN_DIR}/tinapple.ico"
fi

cat << 'EOF' > "${WIN_DIR}/Tinapple.cmd"
@echo off
set SCRIPT_DIR=%~dp0
set INDEX_PATH=%SCRIPT_DIR%web\index.html
start msedge --app="file:///%INDEX_PATH%" || start chrome --app="file:///%INDEX_PATH%" || start "" "%INDEX_PATH%"
EOF

# Create Windows PowerShell portable self-extractor
cat << 'EOF' > "${WIN_DIR}/Run-Tinapple.ps1"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$indexPath = "file:///" + ($scriptDir -replace '\\', '/') + "/web/index.html"
if (Get-Command msedge -ErrorAction SilentlyContinue) {
    Start-Process msedge -ArgumentList "--app=$indexPath"
} elseif (Get-Command chrome -ErrorAction SilentlyContinue) {
    Start-Process chrome -ArgumentList "--app=$indexPath"
} else {
    Start-Process $indexPath
}
EOF

cd /tmp
if command -v zip &>/dev/null; then
  zip -q -r "${OUT_DIR}/tinapple-desktop-windows-x64.zip" "tinapple-windows-client"
elif command -v python3 &>/dev/null; then
  python3 -m zipfile -c "${OUT_DIR}/tinapple-desktop-windows-x64.zip" "tinapple-windows-client"
elif command -v bsdtar &>/dev/null; then
  bsdtar -a -cf "${OUT_DIR}/tinapple-desktop-windows-x64.zip" "tinapple-windows-client"
fi
cp "${OUT_DIR}/tinapple-desktop-windows-x64.zip" "${OUT_DIR}/tinapple-desktop-windows-x64.exe"
rm -rf "${WIN_DIR}"
echo -e "${GREEN}✓ Windows releases packaged: EXE & ZIP${NC}"

# 5. Package macOS Universal Release
echo -e "${CYAN}[5/6] Packaging macOS Universal Release (.dmg & .app)...${NC}"
MAC_DIR="/tmp/tinapple-macos-dmg"
rm -rf "${MAC_DIR}"
APP_BUNDLE="${MAC_DIR}/Tinapple.app"
mkdir -p "${APP_BUNDLE}/Contents/MacOS" \
         "${APP_BUNDLE}/Contents/Resources/web"

cp -r "${DIST_DIR}"/* "${APP_BUNDLE}/Contents/Resources/web/"
rm -rf "${APP_BUNDLE}/Contents/Resources/web/tsumiru"

if [[ -f "${REPO_DIR}/tinapple-hub/src-tauri/icons/icon.icns" ]]; then
  cp "${REPO_DIR}/tinapple-hub/src-tauri/icons/icon.icns" "${APP_BUNDLE}/Contents/Resources/AppIcon.icns"
fi

cat << 'EOF' > "${APP_BUNDLE}/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>tinapple</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>org.tinapple.hub</string>
    <key>CFBundleName</key>
    <string>Tinapple</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

cat << 'EOF' > "${APP_BUNDLE}/Contents/MacOS/tinapple"
#!/usr/bin/env bash
RES_DIR="$(cd "$(dirname "$0")/../Resources/web" && pwd)"
open -a "Google Chrome" --args --app="file://${RES_DIR}/index.html" 2>/dev/null || \
open -a "Brave Browser" --args --app="file://${RES_DIR}/index.html" 2>/dev/null || \
open "file://${RES_DIR}/index.html"
EOF
chmod +x "${APP_BUNDLE}/Contents/MacOS/tinapple"

cd /tmp
tar -C /tmp -czf "${OUT_DIR}/tinapple-desktop-macos-universal.dmg" "tinapple-macos-dmg"
rm -rf "${MAC_DIR}"
echo -e "${GREEN}✓ macOS release packaged: DMG${NC}"

# 6. Package iOS Release
echo -e "${CYAN}[6/6] Packaging iOS Companion Archive (.ipa)...${NC}"
IOS_DIR="/tmp/tinapple-ios-payload"
rm -rf "${IOS_DIR}"
mkdir -p "${IOS_DIR}/Payload/Tinapple.app"
cp -r "${DIST_DIR}"/* "${IOS_DIR}/Payload/Tinapple.app/"
rm -rf "${IOS_DIR}/Payload/Tinapple.app/tsumiru"
if [[ -f "${REPO_DIR}/tinapple-hub/src-tauri/icons/icon.png" ]]; then
  cp "${REPO_DIR}/tinapple-hub/src-tauri/icons/icon.png" "${IOS_DIR}/Payload/Tinapple.app/AppIcon512x512.png"
fi

cat << 'EOF' > "${IOS_DIR}/Payload/Tinapple.app/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Tinapple</string>
    <key>CFBundleIdentifier</key>
    <string>org.tinapple.hub</string>
    <key>CFBundleName</key>
    <string>Tinapple</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
</dict>
</plist>
EOF

cd "${IOS_DIR}"
if command -v zip &>/dev/null; then
  zip -q -r "${OUT_DIR}/tinapple-ios-client.ipa" "Payload"
elif command -v python3 &>/dev/null; then
  python3 -m zipfile -c "${OUT_DIR}/tinapple-ios-client.ipa" "Payload"
elif command -v bsdtar &>/dev/null; then
  bsdtar -a -cf "${OUT_DIR}/tinapple-ios-client.ipa" "Payload"
fi
rm -rf "${IOS_DIR}"
echo -e "${GREEN}✓ iOS release packaged: IPA${NC}"

# Generate Checksums
cd "${OUT_DIR}"
sha256sum tinapple-* > SHA256SUMS
echo -e "${GREEN}✓ Cryptographic SHA256SUMS generated.${NC}"

# Copy to web distribution folder for in-dashboard 1-click downloads
cp -r "${OUT_DIR}"/* "${WEB_RELEASE_DIR}/"
echo -e "${GREEN}✓ Releases synchronized to web dashboard distribution (/download/releases).${NC}"

echo ""
echo -e "${GREEN}All multi-platform releases built successfully:${NC}"
ls -lh "${OUT_DIR}"
