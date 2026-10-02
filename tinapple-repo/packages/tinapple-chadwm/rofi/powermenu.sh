#!/usr/bin/env bash
# Power menu script for Rofi modi

if [ -z "$1" ]; then
    echo "󰐥 Power Off"
    echo "󰜉 Reboot"
    echo "󰌾 Lock Screen"
    echo "󰤄 Suspend"
    echo "󰍃 Logout / Exit Chadwm"
    exit 0
fi

case "$1" in
    *"Power Off"*)
        systemctl poweroff
        ;;
    *"Reboot"*)
        systemctl reboot
        ;;
    *"Lock Screen"*)
        loginctl lock-session 2>/dev/null || xflock4 2>/dev/null || slock 2>/dev/null
        ;;
    *"Suspend"*)
        systemctl suspend
        ;;
    *"Logout"*)
        killall chadwm 2>/dev/null || systemctl --user stop graphical-session.target
        ;;
esac
