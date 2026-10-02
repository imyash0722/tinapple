#!/usr/bin/env bash
# tinapple-dash actions script for Rofi modi

if [ -z "$1" ]; then
    echo "󱗼 Toggle Session (Headless ↔ Interactive)"
    echo "󰍹 Status Overview"
    echo "󰒓 Restart Window Manager"
    echo "󰍃 Switch to Headless Mode"
    echo "󰍹 Switch to Interactive Mode"
    echo "󰕾 Audio Mixer (pavucontrol)"
    echo "󰌌 Keybinding Cheat Sheet"
    exit 0
fi

case "$1" in
    *"Toggle Session"*)
        tinapple-session toggle
        ;;
    *"Status Overview"*)
        STATUS=$(tinapple-session status 2>&1)
        notify-send "Tinapple Session Status" "$STATUS"
        ;;
    *"Restart Window Manager"*)
        kill -HUP $(pidof chadwm) 2>/dev/null || notify-send "Chadwm" "Reload signal sent"
        ;;
    *"Switch to Headless Mode"*)
        tinapple-session headless
        ;;
    *"Switch to Interactive Mode"*)
        tinapple-session interactive
        ;;
    *"Audio Mixer"*)
        pavucontrol &
        ;;
    *"Keybinding Cheat Sheet"*)
        notify-send "Tinapple Chadwm Shortcuts" "Super+Return: Term\nSuper+d: Launcher\nSuper+a: Actions\nSuper+q: Kill\nSuper+f: Fullscreen\nSuper+Shift+r: Restart"
        ;;
esac
