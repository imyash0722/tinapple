package tui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

func (m Model) View() string {
	var b strings.Builder

	// Header
	header := TitleStyle.Render("🏪 CHADDY STORE  ▪  Tinapple OS App Manager")
	b.WriteString("\n  " + header + "\n\n")

	// Category Tabs
	var tabs []string
	for i, cat := range m.Categories {
		if i == m.ActiveCat {
			tabs = append(tabs, ActiveTabStyle.Render(cat))
		} else {
			tabs = append(tabs, InactiveTabStyle.Render(cat))
		}
	}
	b.WriteString("  " + lipgloss.JoinHorizontal(lipgloss.Top, tabs...) + "\n")
	b.WriteString("  " + lipgloss.NewStyle().Foreground(TinappleBorder).Render(strings.Repeat("─", 82)) + "\n\n")

	// Search bar if active or populated
	if m.Searching || m.SearchQuery != "" {
		searchIndicator := "🔍 Search: "
		if m.Searching {
			searchIndicator = "🔍 Search (typing): "
		}
		b.WriteString("  " + lipgloss.NewStyle().Foreground(TinappleTeal).Bold(true).Render(searchIndicator) + m.SearchQuery + "█\n\n")
	}

	// Status Message
	if m.StatusMessage != "" {
		stColor := TinappleGreen
		if m.IsError {
			stColor = TinappleRed
		}
		b.WriteString("  " + lipgloss.NewStyle().Foreground(stColor).Bold(true).Render(m.StatusMessage) + "\n\n")
	}

	// Apps List
	if len(m.FilteredApps) == 0 {
		b.WriteString("  " + lipgloss.NewStyle().Foreground(TinappleFgMuted).Italic(true).Render("No applications found in this category or search.") + "\n\n")
	} else {
		for i, app := range m.FilteredApps {
			isSelected := i == m.Cursor

			var badge string
			if app.Installed {
				badge = BadgeInstalled.Render("● INSTALLED")
			} else {
				badge = BadgeAvailable.Render("○ Available")
			}

			cursorMarker := "  "
			if isSelected {
				cursorMarker = lipgloss.NewStyle().Foreground(TinappleGreen).Bold(true).Render("▶ ")
			}

			sizeMB := fmt.Sprintf("%.1f MB", float64(app.Size)/(1024*1024))
			titleLine := fmt.Sprintf("%s %s  %s  %s  %s",
				app.Icon,
				lipgloss.NewStyle().Bold(true).Foreground(TinappleFg).Render(app.Name),
				lipgloss.NewStyle().Foreground(TinappleFgMuted).Render("v"+app.Version),
				badge,
				lipgloss.NewStyle().Foreground(TinapplePurple).Render("["+sizeMB+"]"),
			)

			descLine := lipgloss.NewStyle().Foreground(TinappleFgMuted).Render(app.Description)

			cardContent := fmt.Sprintf("%s\n    %s", titleLine, descLine)

			if isSelected {
				b.WriteString(cursorMarker + SelectedCardStyle.Width(80).Render(cardContent) + "\n")
			} else {
				b.WriteString(cursorMarker + CardStyle.Width(80).Render(cardContent) + "\n")
			}
		}
	}

	// Footer / Help Bar
	b.WriteString("\n  " + lipgloss.NewStyle().Foreground(TinappleBorder).Render(strings.Repeat("─", 82)) + "\n")
	helpText := HelpStyle.Render("  Tab/←→: Category  │  ↑/↓: Navigate  │  Enter/i: Install  │  r/x: Remove  │  /: Search  │  q: Quit")
	b.WriteString(helpText + "\n")

	return b.String()
}
