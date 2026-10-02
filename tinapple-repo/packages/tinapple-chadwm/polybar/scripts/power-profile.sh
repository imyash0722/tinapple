#!/usr/bin/env bash
# Power profile manager and status indicator for Polybar

get_profile() {
    if command -v powerprofilesctl &>/dev/null; then
        powerprofilesctl get 2>/dev/null || echo "balanced"
    elif [ -f /sys/firmware/acpi/platform_profile ]; then
        cat /sys/firmware/acpi/platform_profile 2>/dev/null || echo "balanced"
    else
        echo "balanced"
    fi
}

toggle_profile() {
    current=$(get_profile)
    case "$current" in
        "performance")
            next="power-saver"
            ;;
        "power-saver")
            next="balanced"
            ;;
        *)
            next="performance"
            ;;
    esac

    if command -v powerprofilesctl &>/dev/null; then
        powerprofilesctl set "$next" 2>/dev/null
    elif [ -w /sys/firmware/acpi/platform_profile ]; then
        echo "$next" > /sys/firmware/acpi/platform_profile 2>/dev/null
    fi
}

case "$1" in
    toggle)
        toggle_profile
        ;;
    *)
        profile=$(get_profile)
        case "$profile" in
            "performance")
                echo " Perf"
                ;;
            "power-saver")
                echo " Saver"
                ;;
            *)
                echo " Bal"
                ;;
        esac
        ;;
esac
