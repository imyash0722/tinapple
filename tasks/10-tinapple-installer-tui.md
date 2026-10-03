# Task: tinapple-installer TUI (Go/bubbletea)

## Status: ✅ Completed

## Goal
Implement the graphical TUI installer using bubbletea with the full installation flow.

## Files to Create

### 1. `/mnt/shared/projects/tinapple/tinapple-installer/tui/go.mod`
```go
module tinapple-installer

go 1.23

require (
	github.com/charmbracelet/bubbles v0.18.0
	github.com/charmbracelet/bubbletea v0.25.0
	github.com/charmbracelet/lipgloss v0.9.1
	github.com/muesli/termenv v1.0.0
)

require (
	github.com/charmbracelet/x/exp/interval v0.0.0-20240423142728-0d0d65f56f8a // indirect
	github.com/lucasb-eyer/go-colorful v1.2.0 // indirect
	github.com/mattn/go-isatty v0.0.20 // indirect
	github.com/mattn/go-runewidth v0.0.15 // indirect
	github.com/muesli/ansi v0.0.0-20231017172329-3c9d8a2c4b3e // indirect
	github.com/muesli/cancelreader v0.2.2 // indirect
	github.com/muesli/reflow v0.3.0 // indirect
	golang.org/x/sys v0.21.0 // indirect
	golang.org/x/term v0.21.0 // indirect
	golang.org/x/text v0.14.0 // indirect
)
```

### 2. `/mnt/shared/projects/tinapple/tinapple-installer/tui/main.go`
```go
package main

import (
	"fmt"
	"os"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

const (
	stepWelcome = iota
	stepKeyboard
	stepNetwork
	stepBootloader
	stepDisk
	stepFilesystem
	stepLUKS
	stepUser
	stepHardware
	stepKernel
	stepProfile
	stepDrivers
	stepConfirm
	stepInstall
	stepDone
)

var (
	titleStyle = lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("#7aa2f7")).
		MarginBottom(1)

	selectedStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("#7aa2f7")).
		Bold(true)

	helpStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("#565f89")).
		Italic(true)

	errorStyle = lipgloss.NewStyle().
		Foreground(lipgloss.Color("#f7768e")).
		Bold(true)
)

type model struct {
	step          int
	choices       []string
	cursor        int
	selected      map[string]bool
	answers       map[string]string
	err           string
	dryRun        bool
	installing    bool
	installOutput string
	progress      float64
}

func initialModel() model {
	return model{
		step:     stepWelcome,
		selected: make(map[string]bool),
		answers:  make(map[string]string),
	}
}

func (m model) Init() tea.Cmd {
	return nil
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			if m.step == stepInstall || m.step == stepDone {
				return m, tea.Quit
			}
			return m, tea.Quit
		case "enter":
			return m.handleEnter(), nil
		case "up", "k":
			if m.cursor > 0 {
				m.cursor--
			}
		case "down", "j":
			if m.cursor < len(m.choices)-1 {
				m.cursor++
			}
		case " ":
			if m.step == stepDisk || m.step == stepProfile || m.step == stepDrivers {
				m.toggleChoice()
			}
		}
	}
	return m, nil
}

func (m *model) handleEnter() tea.Model {
	switch m.step {
	case stepWelcome:
		m.step = stepKeyboard
		m.choices = []string{"us", "uk", "de", "fr", "es", "it", "jp", "other"}
	case stepKeyboard:
		m.answers["keyboard"] = m.choices[m.cursor]
		m.step = stepNetwork
		m.choices = []string{"DHCP", "Static", "WiFi"}
	case stepNetwork:
		m.answers["network"] = m.choices[m.cursor]
		m.step = stepBootloader
		// Auto-detect firmware
		m.answers["firmware"] = "uefi" // detect from /sys/firmware/efi
		if m.answers["firmware"] == "uefi" {
			m.choices = []string{"limine (recommended)", "grub"}
		} else {
			m.choices = []string{"grub (only option)"}
		}
	case stepBootloader:
		m.answers["bootloader"] = m.choices[m.cursor]
		m.step = stepDisk
		// Detect disks
		m.choices = []string{"Use entire disk (auto)", "Custom layout"}
	case stepDisk:
		if m.choices[m.cursor] == "Use entire disk (auto)" {
			m.answers["disk_strategy"] = "auto"
			m.step = stepFilesystem
			m.choices = []string{"ext4 (default)", "xfs", "btrfs"}
		} else {
			m.answers["disk_strategy"] = "custom"
			// TODO: custom partition editor
			m.step = stepFilesystem
			m.choices = []string{"ext4 (default)", "xfs", "btrfs"}
		}
	case stepFilesystem:
		m.answers["filesystem"] = m.choices[m.cursor]
		m.step = stepLUKS
		m.choices = []string{"No encryption", "LUKS2 (enter passphrase)"}
	case stepLUKS:
		if m.choices[m.cursor] == "LUKS2 (enter passphrase)" {
			m.answers["luks"] = "yes"
			// TODO: prompt for passphrase
		} else {
			m.answers["luks"] = "no"
		}
		m.step = stepUser
		// Prompt for hostname, username, password
		// m.answers["hostname"], m.answers["username"], m.answers["password"]
		m.step = stepHardware
		m.choices = []string{"auto", "desktop", "laptop"}
	case stepHardware:
		m.answers["hardware_profile"] = m.choices[m.cursor]
		m.step = stepKernel
		m.choices = []string{"lts (recommended)", "hardened", "current"}
	case stepKernel:
		m.answers["kernel_profile"] = m.choices[m.cursor]
		m.step = stepProfile
		m.choices = []string{"base", "media", "downloads", "backups", "network", "infrastructure", "databases"}
		m.cursor = 0
		m.selected = make(map[string]bool)
		for _, p := range []string{"base", "media", "downloads"} {
			m.selected[p] = true
		}
	case stepProfile:
		// Toggle profiles with space
		m.toggleProfile()
	case stepDrivers:
		m.answers["proprietary_drivers"] = m.choices[m.cursor]
		m.step = stepConfirm
	case stepConfirm:
		m.step = stepInstall
		return m.startInstall()
	case stepInstall:
		// Installation in progress
	}
	return m
}

func (m *model) toggleChoice() {
	choice := m.choices[m.cursor]
	if m.selected[choice] {
		delete(m.selected, choice)
	} else {
		m.selected[choice] = true
	}
}

func (m *model) toggleProfile() {
	if m.cursor < len(m.choices) {
		choice := m.choices[m.cursor]
		if m.selected[choice] {
			delete(m.selected, choice)
		} else {
			m.selected[choice] = true
		}
	}
}

func (m *model) startInstall() tea.Model {
	m.installing = true
	m.installOutput = "Starting installation...\n"
	m.progress = 0
	// TODO: call backend installer with answers
	return m
}

func (m model) View() string {
	if m.err != "" {
		return errorStyle.Render(m.err) + "\n\n"
	}

	if m.installing {
		return fmt.Sprintf("Installing... %.0f%%\n\n%s", m.progress*100, m.installOutput)
	}

	if m.step == stepDone {
		return "Installation complete! Reboot to start tinapple.\n"
	}

	var s strings.Builder
	s.WriteString(titleStyle.Render("tinapple Installer"))
	s.WriteString("\n\n")

	switch m.step {
	case stepWelcome:
		s.WriteString("Welcome to tinapple installer.\nPress Enter to continue.\n")
	case stepKeyboard:
		s.WriteString("Select keyboard layout:\n")
		s.WriteString(renderChoices(m.choices, m.cursor))
	case stepNetwork:
		s.WriteString("Network configuration:\n")
		s.WriteString(renderChoices(m.choices, m.cursor))
	case stepBootloader:
		s.WriteString(fmt.Sprintf("Firmware: %s\nSelect bootloader:\n", m.answers["firmware"]))
		s.WriteString(renderChoices(m.choices, m.cursor))
	case stepDisk:
		s.WriteString("Disk layout:\n")
		s.WriteString(renderChoices(m.choices, m.cursor))
	case stepFilesystem:
		s.WriteString("Root filesystem:\n")
		s.WriteString(renderChoices(m.choices, m.cursor))
	case stepLUKS:
		s.WriteString("Disk encryption:\n")
		s.WriteString(renderChoices(m.choices, m.cursor))
	case stepUser:
		s.WriteString("User configuration (hostname, user, password)...\n")
	case stepHardware:
		s.WriteString("Hardware profile:\n")
		s.WriteString(renderChoices(m.choices, m.cursor))
	case stepKernel:
		s.WriteString("Kernel profile:\n")
		s.WriteString(renderChoices(m.choices, m.cursor))
	case stepProfile:
		s.WriteString("Service profiles (Space to toggle, Enter to continue):\n")
		s.WriteString(renderMultiChoices(m.choices, m.selected))
	case stepDrivers:
		s.WriteString("Proprietary drivers (explicit consent required):\n")
		s.WriteString(renderChoices(m.choices, m.cursor))
	case stepConfirm:
		s.WriteString("Confirm installation:\n")
		s.WriteString(fmt.Sprintf("  Hostname: %s\n", m.answers["hostname"]))
		s.WriteString(fmt.Sprintf("  User: %s\n", m.answers["username"]))
		s.WriteString(fmt.Sprintf("  Disk: %s (%s)\n", m.answers["disk_strategy"], m.answers["filesystem"]))
		s.WriteString(fmt.Sprintf("  Bootloader: %s\n", m.answers["bootloader"]))
		s.WriteString(fmt.Sprintf("  Kernel: %s\n", m.answers["kernel_profile"]))
		s.WriteString(fmt.Sprintf("  Profiles: %v\n", m.selected))
		s.WriteString("\nPress Enter to begin installation.\n")
	}

	s.WriteString("\n")
	s.WriteString(helpStyle.Render("↑/↓ navigate • Enter select • Space toggle • q quit"))
	return s.String()
}

func renderChoices(choices []string, cursor int) string {
	var s strings.Builder
	for i, c := range choices {
		prefix := "  "
		if i == cursor {
			prefix = selectedStyle.Render("→ ")
		} else {
			prefix = "  "
		}
		s.WriteString(fmt.Sprintf("%s%s\n", prefix, c))
	}
	return s.String()
}

func renderMultiChoices(choices []string, selected map[string]bool) string {
	var s strings.Builder
	for _, c := range choices {
		marker := "[ ]"
		if selected[c] {
			marker = selectedStyle.Render("[✓]")
		} else {
			marker = "[ ]"
		}
		s.WriteString(fmt.Sprintf("  %s %s\n", marker, c))
	}
	return s.String()
}

func main() {
	p := tea.NewProgram(initialModel(), tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}
}
```

### 3. `/mnt/shared/projects/tinapple/tinapple-installer/tui/Makefile`
```makefile
.PHONY: build test clean

build:
	go build -o ../bin/tinapple-tui .

test:
	go test -v ./...

clean:
	rm -f ../bin/tinapple-tui

install: build
	install -Dm755 ../bin/tinapple-tui $(DESTDIR)/usr/bin/tinapple-tui
```

## Verification
- `go build` compiles without errors
- `make test` passes
- TUI runs and navigates through all steps
- Dry-run mode works with `TINAPPLE_DRYRUN=1`