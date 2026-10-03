# Task R3: Settings TUI - Visual Settings Interface

## Goal
Build a beautiful, intuitive Settings TUI with tile-based interface for system, chadwm, network, services, security, and remote access configuration.

## Files to Create/Modify

### 1. Settings TUI Application
**Directory:** `/mnt/shared/projects/tinapple/chaddy-store/ui/tui/settings/`
- `app.go` - Main settings TUI application
- `model.go` - Data model
- `view.go` - Rendering logic
- `sections.go` - Section definitions

### 1. Main Settings TUI Application
**File:** `/mnt/shared/projects/tinapple/chaddy-store/ui/tui/settings/app.go`

```go
package settings

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type SettingsApp struct {
	model     Model
	sections  []SettingsSection
	activeIdx int
	width     int
	height    int
}

type Model struct {
	sections      []SettingsSection
	activeSection int
	cursor        int
	width         int
	height        int
	err           string
	selected      map[string]interface{}
}

type SettingsSection struct {
	Name        string
	Icon        string
	Color       lipgloss.Color
	Description string
	Items       []SettingItem
}

type SettingItem struct {
	Key         string
	Label       string
	Description string
	Type        SettingType // string, bool, int, path, password, select, multiselect, color
	Value       interface{}
	Default     interface{}
	Options     []string // for select type
	Validator   func(interface{}) error
	OnChange    func(value interface{}) error
	Category    string // system, chadwm, network, services, security, remote
}

type SettingType int

const (
	StringType SettingType = iota
	BoolType
	IntType
	PathType
	PasswordType
	SelectType
	MultiSelectType
	ColorType
)

type Model struct {
	sections       []SettingsSection
	activeSection  int
	cursor         int
	width          int
	height         int
	err            string
	values         map[string]interface{}
	focused        bool
}

func NewModel(sections []SettingsSection) Model {
	return Model{
		sections:      sections,
		activeSection: 0,
		values:        make(map[string]interface{}),
	}
}

func (m Model) Init() tea.Cmd {
	return nil
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit
		case "tab", "right":
			m.activeSection = (m.activeSection + 1) % len(m.sections)
		case "shift+tab", "left":
			m.activeSection = (m.activeSection - 1 + len(m.sections)) % len(m.sections)
		case "up", "k":
		 if m.cursor > 0 {
			 m.cursor--
			}
		case "down", "j":
			if m.cursor < len(m.sections[m.activeSection].Items)-1 {
			 m.cursor++
			}
		case "enter", " ":
			return m, m.handleEnter()
		case "esc":
		 return m, nil
		}
	}
	return m, nil
}

func (m *Model) handleEnter() tea.Cmd {
	item := m.sections[m.activeSection].Items[m.cursor]
	switch item.Type {
	case BoolType:
		m.toggleBool(item.Key)
	case StringType, PathType, PasswordType:
		return m.startTextInput(item)
	case IntType:
		return m.startNumberInput(item)
	case SelectType:
		return m.startSelect(item)
	case MultiSelectType:
		return m.startMultiSelect(item)
	case ColorType:
		return m.startColorPicker(item)
	}
	return nil
}

func (m *Model) View() string {
	if m.width == 0 {
		return "Loading..."
	}

	var b strings.Builder
	
	// Header
	b.WriteString(m.renderHeader())
	b.WriteString("\n")
	
	// Section tabs
	b.WriteString(m.renderTabs())
	b.WriteString("\n")
	
	// Content area
	b.WriteString(m.renderContent())
	
	// Footer
	b.WriteString("\n")
	b.WriteString(m.renderFooter())
	
	return b.String()
}

func (m *Model) renderHeader() string {
	titleStyle := lipgloss.NewStyle().
		Bold(true).
		Foreground(TinappleGreen).
		Background(TinappleBgAlt).
		Padding(0, 2).
		MarginBottom(1).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(TinappleBorder)
	
	return titleStyle.Render("⚙️  Tinapple Settings") + "\n"
}

func (m *Model) renderTabs() string {
	var tabs []string
	for i, section := range m.sections {
		style := lipgloss.NewStyle().
			Padding(0, 2).
			Foreground(TinappleFgMuted).
			Background(TinappleBgAlt)
		
		if i == m.activeSection {
			style = style.
				Foreground(TinappleGreen).
				Background(TinappleBgFloat).
				Bold(true)
		}
		
		tabs = append(tabs, style.Render(fmt.Sprintf("%s %s", section.Icon, section.Name)))
	}
	
	return lipgloss.JoinHorizontal(lipgloss.Top, tabs...)
}

func (m *Model) renderContent() string {
	section := m.sections[m.activeSection]
	
	var b strings.Builder
	b.WriteString(section.Description + "\n\n")
	
	for i, item := range section.Items {
		cursor := "  "
	 if m.cursor == i {
		 cursor = "▶ "
		}
		
		valueStr := m.formatValue(item)
		status := m.renderStatus(item)
		
		line := fmt.Sprintf("%s %s %-30s %s %s", 
			lipgloss.NewStyle().Foreground(TinappleFgMuted).Render("▸"),
			item.Label,
			lipgloss.NewStyle().Foreground(TinappleFg).Render(item.Description),
			valueStyle,
			status)
		
		if i == m.cursor {
			line = selectedStyle.Render(line)
		}
		
		b.WriteString(line + "\n")
	}
	
	return lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(TinappleBorder).
		Padding(1, 2).
		Width(80).
		Render(b.String())
}

func (m *Model) formatValue(item SettingItem) string {
	switch item.Type {
	case BoolType:
		if v, ok := m.values[item.Key].(bool); ok && v {
			return "[✓]"
		}
		return "[ ]"
	case StringType, PathType, PasswordType:
		if v, ok := m.values[item.Key].(string); ok && v != "" {
		 return fmt.Sprintf("«%s»", v)
		}
		return "not set"
	case IntType:
		if v, ok := m.values[item.Key].(int); ok {
			return fmt.Sprintf("%d", v)
		}
		return "0"
	case SelectType:
		if v, ok := m.values[item.Key].(string); ok && v != "" {
		 return fmt.Sprintf("«%s»", v)
		}
		return "not selected"
	case MultiSelectType:
		if v, ok := m.values[item.Key].([]string); ok && len(v) > 0 {
		 return fmt.Sprintf("[%s]", strings.Join(v, ", "))
		}
		return "none"
	case ColorType:
		if v, ok := m.values[item.Key].(string); ok && v != "" {
		 return lipgloss.NewStyle().Foreground(lipgloss.Color(v)).Render("████") + " " + v
		}
		return "not set"
	}
	return ""
}

func (m *Model) renderStatus(item SettingItem) string {
	if item.OnChange != nil {
		return lipgloss.NewStyle().Foreground(TinappleWarning).Render(" ◉")
	}
	if m.values[item.Key] != nil {
		return lipgloss.NewStyle().Foreground(TinappleSuccess).Render(" ✓")
	}
	if item.Default != nil {
		return lipgloss.NewStyle().Foreground(TinappleFgMuted).Render(" (default)")
	}
	return ""
}

func (m *Model) renderFooter() string {
	help := lipgloss.NewStyle().
		Foreground(TinappleFgMuted).
		Render("Tab/←→: Switch tabs  │  ↑/↓: Navigate  │  Enter/Space: Edit  │  Esc: Back  │  q: Quit")
	
	return "\n" + lipgloss.NewStyle().
		Foreground(TinappleBorder).
		Render(strings.Repeat("─", 80)) + "\n" + help
}

func (m *Model) startTextInput(item SettingItem) tea.Cmd {
	// Implementation for text input dialog
	return nil
}

func (m *Model) startNumberInput(item SettingItem) tea.Cmd {
	return nil
}

func (m *Model) startSelect(item SettingItem) tea.Cmd {
	return nil
}

func (m *Model) startMultiSelect(item SettingItem) tea.Cmd {
	return nil
}

func (m *Model) startColorPicker(item SettingItem) tea.Cmd {
	return nil
}

func (m *Model) toggleBool(key string) {
	current := false
	if v, ok := m.values[key].(bool); ok {
		current = v
	}
	m.values[key] = !current
}
```

## Settings Categories Definition

```go
func GetSettingsSections() []SettingsSection {
	return []SettingsSection{
		{
			Name:        "System",
			Icon:        "⚙️",
			Color:       TinappleBlue,
			Description: "Core system settings",
			Items: []SettingItem{
				{Key: "hostname", Label: "Hostname", Type: StringType, Default: "tinapple", Description: "System hostname"},
				{Key: "timezone", Label: "Timezone", Type: SelectType, Options: []string{"UTC", "America/New_York", "Europe/London", "Asia/Tokyo", "auto"}, Default: "UTC", Description: "System timezone"},
				{Key: "locale", Label: "Locale", Type: SelectType, Options: []string{"en_US.UTF-8", "de_DE.UTF-8", "fr_FR.UTF-8", "ja_JP.UTF-8"}, Default: "en_US.UTF-8"},
				{Key: "keymap", Label: "Keymap", Type: SelectType, Options: []string{"us", "de", "fr", "jp", "uk"}, Default: "us"},
				{Key: "kernel", Label: "Kernel Profile", Type: SelectType, Options: []string{"lts", "hardened", "current", "cachyos"}, Default: "lts"},
				{Key: "bootloader", Label: "Bootloader", Type: SelectType, Options: []string{"grub", "limine"}, Default: "grub"},
				{Key: "filesystem", Label: "Filesystem", Type: SelectType, Options: []string{"ext4", "xfs", "btrfs"}, Default: "ext4"},
			},
		},
		{
			Name:        "Network",
			Icon:        "🌐",
			Color:       TinappleTeal,
			Description: "Network configuration",
			Items: []SettingItem{
				{Key: "interface", Label: "Interface", Type: SelectType, Options: []string{"auto", "eth0", "enp0s3", "wlan0"}, Default: "auto"},
				{Key: "dhcp", Label: "DHCP", Type: BoolType, Default: true},
				{Key: "static_ip", Label: "Static IP", Type: StringType, DependsOn: "dhcp=false"},
				{Key: "gateway", Label: "Gateway", Type: StringType},
				{Key: "dns", Label: "DNS Servers", Type: MultiSelectType, Options: []string{"1.1.1.1", "9.9.9.9", "8.8.8.8", "9.9.9.9"}},
				{Key: "wireguard", Label: "WireGuard", Type: BoolType, Default: false},
				{Key: "tailscale", Label: "Tailscale", Type: BoolType, Default: true},
			},
		},
		{
			Name:        "chadwm",
			Icon:        "🪟",
			Color:       TinappleGreen,
			Description: "chadwm window manager settings",
			Items: []SettingItem{
				{Key: "gaps", Label: "Window Gaps", Type: IntType, Default: 10, Description: "Inner window gaps in pixels"},
				{Key: "border_width", Label: "Border Width", Type: IntType, Default: 2},
				{Key: "border_color_focused", Label: "Focused Border Color", Type: ColorType, Default: "#2ecc71"},
				{Key: "border_color_unfocused", Label: "Unfocused Border Color", Type: ColorType, Default: "#2c3e50"},
				{Key: "gaps_inner", Label: "Inner Gaps", Type: IntType, Default: 10},
				{Key: "gaps_outer", Label: "Outer Gaps", Type: IntType, Default: 10},
				{Key: "smart_gaps", Label: "Smart Gaps", Type: BoolType, Default: true},
				{Key: "smart_borders", Label: "Smart Borders", Type: BoolType, Default: true},
				{Key: "bar_position", Label: "Bar Position", Type: SelectType, Options: []string{"top", "bottom"}, Default: "top"},
				{Key: "bar_height", Label: "Bar Height", Type: IntType, Default: 28},
				{Key: "font", Label: "Font", Type: StringType, Default: "JetBrainsMono Nerd Font:size=10"},
				{Key: "mod_key", Label: "Mod Key", Type: SelectType, Options: []string{"Mod4", "Mod1"}, Default: "Mod4"},
				{Key: "autostart", Label: "Autostart Apps", Type: MultiSelectType, Options: []string{"chadwm-bar", "tinapple-dash", "picom", "dunst"}},
			},
		},
		{
			Name:        "Services",
			Icon:        "🔧",
			Color:       TinapplePurple,
			Description: "Service management",
			Items: []SettingItem{
				{Key: "nginx", Label: "Nginx/Caddy", Type: BoolType, Default: true},
				{Key: "jellyfin", Label: "Jellyfin", Type: BoolType},
				{Key: "qbittorrent", Label: "qBittorrent", Type: BoolType},
				{Key: "syncthing", Label: "Syncthing", Type: BoolType},
				{Key: "tailscale", Label: "Tailscale", Type: BoolType},
				{Key: "syncthing", Label: "Syncthing", Type: BoolType},
				{Key: "prometheus", Label: "Prometheus", Type: BoolType},
				{Key: "grafana", Label: "Grafana", Type: BoolType},
			},
		},
		{
			Name:        "Security",
			Icon:        "🔒",
			Color:       TinappleRed,
			Description: "Security settings",
			Items: []SettingItem{
				{Key: "ssh_port", Label: "SSH Port", Type: IntType, Default: 22},
				{Key: "fail2ban", Label: "Fail2Ban", Type: BoolType, Default: true},
				{Key: "ufw", Label: "UFW Firewall", Type: BoolType, Default: true},
				{Key: "ssh_keys_only", Label: "SSH Keys Only", Type: BoolType, Default: true},
				{Key: "fail2ban_bantime", Label: "Ban Time (seconds)", Type: IntType, Default: 3600},
			},
		},
		{
			Name:        "Remote Access",
			Icon:        "🖥️",
			Color:       TinappleOrange,
			Description: "Remote desktop access",
			Items: []SettingItem{
				{Key: "vnc_enabled", Label: "Enable VNC", Type: BoolType, Default: false},
				{Key: "vnc_port", Label: "VNC Port", Type: IntType, Default: 5900},
				{Key: "vnc_password", Label: "VNC Password", Type: PasswordType},
				{Key: "rdp_enabled", Label: "Enable RDP (xrdp)", Type: BoolType, Default: false},
				{Key: "rdp_port", Label: "RDP Port", Type: IntType, Default: 3389},
				{Key: "ssh_tunnel_only", Label: "SSH Tunnel Only", Type: BoolType, Default: true},
			},
		},
	}
}
```

## Verification
```bash
cd /mnt/shared/projects/tinapple/chaddy-store
go build -o ../bin/chaddy-store ./cmd/chaddy-store
./bin/chaddy-store settings --help
```
EOF