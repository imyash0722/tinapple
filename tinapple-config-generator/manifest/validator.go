package manifest

import (
	"fmt"
	"net"
	"regexp"
	"strings"
)

var (
	hostnameRegex = regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$`)
)

// ValidationError represents an error containing multiple validation issues.
type ValidationError struct {
	Errors []string
}

func (ve *ValidationError) Error() string {
	return fmt.Sprintf("manifest validation failed with %d error(s):\n - %s",
		len(ve.Errors), strings.Join(ve.Errors, "\n - "))
}

// Validate checks whether a Manifest complies with the tinapple specification.
func Validate(m *Manifest) error {
	var errs []string

	if m.Version <= 0 {
		errs = append(errs, fmt.Sprintf("invalid version %d: must be a positive integer", m.Version))
	}

	if m.Hostname == "" {
		errs = append(errs, "hostname cannot be empty")
	} else if len(m.Hostname) > 63 || !hostnameRegex.MatchString(m.Hostname) {
		errs = append(errs, fmt.Sprintf("invalid hostname '%s': must follow RFC 1123 standards", m.Hostname))
	}

	switch m.KernelProfile {
	case "lts", "hardened", "current":
	default:
		errs = append(errs, fmt.Sprintf("invalid kernel_profile '%s': must be one of [lts, hardened, current]", m.KernelProfile))
	}

	switch m.SessionMode {
	case "headless", "interactive", "kiosk":
	default:
		errs = append(errs, fmt.Sprintf("invalid session_mode '%s': must be one of [headless, interactive, kiosk]", m.SessionMode))
	}

	switch m.HardwareProfile {
	case "auto", "desktop", "laptop":
	default:
		errs = append(errs, fmt.Sprintf("invalid hardware_profile '%s': must be one of [auto, desktop, laptop]", m.HardwareProfile))
	}

	switch m.Filesystem {
	case "ext4", "xfs", "btrfs":
	default:
		errs = append(errs, fmt.Sprintf("invalid filesystem '%s': must be one of [ext4, xfs, btrfs]", m.Filesystem))
	}

	switch m.Bootloader {
	case "auto", "grub", "limine":
	default:
		errs = append(errs, fmt.Sprintf("invalid bootloader '%s': must be one of [auto, grub, limine]", m.Bootloader))
	}

	// Battery validation
	bat := m.Hardware.Battery
	if bat.ChargeLimit < 1 || bat.ChargeLimit > 100 {
		errs = append(errs, fmt.Sprintf("battery.charge_limit must be between 1 and 100 (got %d)", bat.ChargeLimit))
	}
	if bat.ChargeLimitMin < 1 || bat.ChargeLimitMin > bat.ChargeLimit {
		errs = append(errs, fmt.Sprintf("battery.charge_limit_min must be between 1 and charge_limit (%d) (got %d)", bat.ChargeLimit, bat.ChargeLimitMin))
	}
	switch bat.CriticalAction {
	case "hibernate", "poweroff", "suspend", "hybrid-sleep":
	default:
		errs = append(errs, fmt.Sprintf("invalid battery.critical_action '%s': must be one of [hibernate, poweroff, suspend, hybrid-sleep]", bat.CriticalAction))
	}
	if bat.CriticalThreshold < 1 || bat.CriticalThreshold > 50 {
		errs = append(errs, fmt.Sprintf("battery.critical_threshold must be between 1 and 50 (got %d)", bat.CriticalThreshold))
	}

	// Power & Thermal profiles
	switch m.Hardware.PowerProfile {
	case "balanced", "performance", "power-saver", "custom":
	default:
		errs = append(errs, fmt.Sprintf("invalid hardware.power_profile '%s': must be one of [balanced, performance, power-saver, custom]", m.Hardware.PowerProfile))
	}

	switch m.Hardware.ThermalProfile {
	case "balanced", "performance", "quiet", "server":
	default:
		errs = append(errs, fmt.Sprintf("invalid hardware.thermal_profile '%s': must be one of [balanced, performance, quiet, server]", m.Hardware.ThermalProfile))
	}

	switch m.Hardware.LidPolicy {
	case "ignore", "clamshell":
	default:
		errs = append(errs, fmt.Sprintf("invalid hardware.lid_policy '%s': must be one of [ignore, clamshell]", m.Hardware.LidPolicy))
	}

	// Network
	if strings.TrimSpace(m.Network.Interface) == "" {
		errs = append(errs, "network.interface cannot be empty")
	}

	if m.Network.StaticFallback != nil {
		sf := m.Network.StaticFallback
		if sf.Address != "" {
			_, _, err := net.ParseCIDR(sf.Address)
			if err != nil {
				errs = append(errs, fmt.Sprintf("invalid network.static_fallback.address '%s': %v", sf.Address, err))
			}
		}
		if sf.Gateway != "" {
			if ip := net.ParseIP(sf.Gateway); ip == nil {
				errs = append(errs, fmt.Sprintf("invalid network.static_fallback.gateway IP '%s'", sf.Gateway))
			}
		}
		for _, dns := range sf.DNS {
			if ip := net.ParseIP(dns); ip == nil {
				errs = append(errs, fmt.Sprintf("invalid network.static_fallback.dns IP '%s'", dns))
			}
		}
	}

	// Services validation
	for name, svc := range m.Services {
		if svc.Port < 0 || svc.Port > 65535 {
			errs = append(errs, fmt.Sprintf("service '%s': invalid port %d (must be 0-65535)", name, svc.Port))
		}
	}

	if len(errs) > 0 {
		return &ValidationError{Errors: errs}
	}

	return nil
}
