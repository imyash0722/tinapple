package services

import (
	"bufio"
	"bytes"
	"context"
	"os/exec"
	"strings"
	"time"
)

type SystemdManager struct{}

func NewSystemdManager() *SystemdManager {
	return &SystemdManager{}
}

func (m *SystemdManager) GetStatus(name string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	cmd := exec.CommandContext(ctx, "systemctl", "is-active", name)
	output, err := cmd.Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return strings.TrimSpace(string(exitErr.Stderr)), nil
		}
		return "unknown", err
	}
	return strings.TrimSpace(string(output)), nil
}

func (m *SystemdManager) Start(name string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "systemctl", "start", name)
	return cmd.Run()
}

func (m *SystemdManager) Stop(name string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "systemctl", "stop", name)
	return cmd.Run()
}

func (m *SystemdManager) Restart(name string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "systemctl", "restart", name)
	return cmd.Run()
}

func (m *SystemdManager) Enable(name string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "systemctl", "enable", "--now", name)
	return cmd.Run()
}

func (m *SystemdManager) Disable(name string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "systemctl", "disable", "--now", name)
	return cmd.Run()
}

func (m *SystemdManager) Logs(name string, lines string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	cmd := exec.CommandContext(ctx, "journalctl", "-u", name, "-n", lines, "--no-pager")
	output, err := cmd.Output()
	if err != nil {
		return "", err
	}
	return string(output), nil
}

func (m *SystemdManager) IsEnabled(name string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	cmd := exec.CommandContext(ctx, "systemctl", "is-enabled", name)
	output, err := cmd.Output()
	if err != nil {
		return false, nil
	}
	return strings.TrimSpace(string(output)) == "enabled", nil
}

func (m *SystemdManager) GetUnitProperties(name string) (map[string]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	cmd := exec.CommandContext(ctx, "systemctl", "show", name)
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	
	props := make(map[string]string)
	scanner := bufio.NewScanner(bytes.NewReader(output))
	for scanner.Scan() {
		line := scanner.Text()
		if idx := strings.Index(line, "="); idx > 0 {
			key := line[:idx]
			value := line[idx+1:]
			props[key] = value
		}
	}
	return props, scanner.Err()
}

func (m *SystemdManager) ListUnits(pattern string) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	cmd := exec.CommandContext(ctx, "systemctl", "list-units", "--type=service", "--state=active", "--no-legend", "--no-pager")
	if pattern != "" {
		cmd.Args = append(cmd.Args, pattern)
	}
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	
	var units []string
	scanner := bufio.NewScanner(bytes.NewReader(output))
	for scanner.Scan() {
		fields := strings.Fields(scanner.Text())
		if len(fields) > 0 {
			units = append(units, fields[0])
		}
	}
	return units, scanner.Err()
}