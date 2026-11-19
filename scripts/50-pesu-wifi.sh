#!/bin/bash
# ==============================================================================
# NetworkManager Dispatcher: PESU WiFi Auto-Login & Daemon Supervision
# Automatically ensures pesu-wifi.service is active and triggers captive portal
# login immediately upon associating with PESU campus Wi-Fi or renewing DHCP.
# ==============================================================================

IFACE="$1"
ACTION="$2"

# Filter to station wireless interface
if [[ "$IFACE" != "wlp3s0" ]]; then
    exit 0
fi

case "$ACTION" in
    up|dhcp4-change)
        # 1. Ensure pesu-wifi daemon is running
        if systemctl is-enabled pesu-wifi.service >/dev/null 2>&1; then
            systemctl is-active --quiet pesu-wifi.service || systemctl start pesu-wifi.service
        fi

        # 2. Trigger asynchronous auto-login if connected to a PESU network
        SSID=$(nmcli -t -f active,ssid dev wifi 2>/dev/null | awk -F: '$1=="yes"{print $2}')
        if [[ "$SSID" =~ PESU ]]; then
            (
                sleep 1
                /usr/local/bin/pesu-wifi login >/dev/null 2>&1 || true
                sleep 3
                /usr/local/bin/tinapple-resume-downloads >/dev/null 2>&1 || true
            ) &
        else
            (
                sleep 3
                /usr/local/bin/tinapple-resume-downloads >/dev/null 2>&1 || true
            ) &
        fi
        ;;
esac
exit 0
