#!/usr/bin/env bash
# tinapple-dash status indicator for Polybar

if command -v tinapple-session &>/dev/null; then
    STATUS=$(tinapple-session status 2>/dev/null | grep -i "mode:" | awk '{print $2}')
    if [ "$STATUS" = "interactive" ]; then
        echo "󱗼 Live"
    elif [ "$STATUS" = "headless" ]; then
        echo "󱗼 Headless"
    else
        echo "󱗼 Ready"
    fi
elif systemctl --user is-active --quiet graphical-session.target 2>/dev/null; then
    echo "󱗼 Live"
else
    echo "󱗼 Standby"
fi
