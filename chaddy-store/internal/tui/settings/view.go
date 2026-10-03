package settings

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

var (
	TinappleGreen   = lipgloss.Color("#2ecc71")
	TinappleBgAlt   = lipgloss.Color("#16213e")
	TinappleBgFloat = lipgloss.Color("#0f3460")
	TinappleBorder  = lipgloss.Color("#2c3e50")
	TinappleFg      = lipgloss.Color("#c0caf5")
	TinappleFgMuted = lipgloss.Color("#565f89")
	TinappleTeal    = lipgloss.Color("#1abc9c")
)

func (m Model) View() string {
	var b strings.Builder

	// Header
	titleStyle := lipgloss.NewStyle().
		Bold(true).
		Foreground(TinappleGreen).
		Background(TinappleBgAlt).
		Padding(0, 2).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(TinappleBorder)

	b.WriteString("\n  " + titleStyle.Render("⚙️  CHADDY SETTINGS  ▪  Tinapple OS Configuration Center") + "\n\n")

	// Section Tabs
	var tabs []string
	for i, section := range m.Sections {
		style := lipgloss.NewStyle().
			Padding(0, 2).
			Foreground(TinappleFgMuted).
			Background(TinappleBgAlt)

		if i == m.ActiveSection {
			style = style.
				Foreground(TinappleGreen).
				Background(TinappleBgFloat).
				Bold(true)
		}
		tabs = append(tabs, style.Render(fmt.Sprintf("%s %s", section.Icon, section.Name)))
	}
	b.WriteString("  " + lipgloss.JoinHorizontal(lipgloss.Top, tabs...) + "\n")
	b.WriteString("  " + lipgloss.NewStyle().Foreground(TinappleBorder).Render(strings.Repeat("─", 82)) + "\n\n")

	// Status message if present
	if m.StatusMessage != "" {
		b.WriteString("  " + lipgloss.NewStyle().Foreground(TinappleGreen).Bold(true).Render(m.StatusMessage) + "\n\n")
	}

	// Section Description
	currentSec := m.Sections[m.ActiveSection]
	b.WriteString("  " + lipgloss.NewStyle().Foreground(TinappleTeal).Italic(true).Render(currentSec.Description) + "\n\n")

	// Items list
	for i, item := range currentSec.Items {
		cursor := "  "
		isSelected := i == m.Cursor
		if isSelected {
			cursor = lipgloss.NewStyle().Foreground(TinappleGreen).Bold(true).Render("▶ ")
		}

		valStr := m.formatValue(item)
		label := fmt.Sprintf("%-24s", item.Label)
		desc := fmt.Sprintf("%-36s", item.Description)

		line := fmt.Sprintf("%s %s  %s",
			lipgloss.NewStyle().Bold(isSelected).Foreground(TinappleFg).Render(label),
			valStr,
			lipgloss.NewStyle().Foreground(TinappleFgMuted).Render(desc),
		)

		cardStyle := lipgloss.NewStyle().
			Padding(0, 1).
			Width(80)

		if isSelected {
			cardStyle = cardStyle.
				Border(lipgloss.RoundedBorder()).
				BorderForeground(TinappleGreen).
				Background(TinappleBgAlt)
		} else {
			cardStyle = cardStyle.
				Border(lipgloss.RoundedBorder()).
				BorderForeground(TinappleBorder)
		}

		b.WriteString(cursor + cardStyle.Render(line) + "\n")
	}

	// Footer / Keybindings
	b.WriteString("\n  " + lipgloss.NewStyle().Foreground(TinappleBorder).Render(strings.Repeat("─", 82)) + "\n")
	help := lipgloss.NewStyle().Foreground(TinappleFgMuted).Render("  Tab/←→: Section  │  ↑/↓: Item  │  Space/Enter: Toggle/Cycle  │  +/-: Adjust  │  s: Save  │  q: Quit")
	b.WriteString(help + "\n")

	return b.String()
}

func (m Model) formatValue(item SettingItem) string {
	val := m.Values[item.Key]
	switch item.Type {
	case BoolType:
		if b, ok := val.(bool); ok && b {
			return lipgloss.NewStyle().Foreground(TinappleGreen).Bold(true).Render("[✓] ENABLED ")
		}
		return lipgloss.NewStyle().Foreground(TinappleFgMuted).Render("[ ] Disabled")

	case IntType:
		return lipgloss.NewStyle().Foreground(TinappleTeal).Bold(true).Render(fmt.Sprintf("%-12d", val))

	case SelectType:
		str, _ := val.(string)
		return lipgloss.NewStyle().Foreground(TinappleTeal).Bold(true).Render(fmt.Sprintf("«%-10s»", str))

	case ColorType:
		colorHex, _ := val.(string)
		swatch := lipgloss.NewStyle().Foreground(lipgloss.Color(colorHex)).Render("██")
		return fmt.Sprintf("%s %-9s", swatch, colorHex)

	default:
		return fmt.Sprintf("%-12v", val)
	}
}
