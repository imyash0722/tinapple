package tui

import "github.com/charmbracelet/lipgloss"

var (
	TinappleBg       = lipgloss.Color("#1a1a2e")
	TinappleBgAlt    = lipgloss.Color("#16213e")
	TinappleBgFloat  = lipgloss.Color("#0f3460")
	TinappleFg       = lipgloss.Color("#c0caf5")
	TinappleFgMuted  = lipgloss.Color("#565f89")
	TinappleGreen    = lipgloss.Color("#2ecc71")
	TinappleBlue     = lipgloss.Color("#7aa2f7")
	TinappleTeal     = lipgloss.Color("#1abc9c")
	TinapplePurple   = lipgloss.Color("#bb9af7")
	TinappleYellow   = lipgloss.Color("#e0af68")
	TinappleRed      = lipgloss.Color("#f7768e")
	TinappleBorder   = lipgloss.Color("#2c3e50")
	TinappleSelected = lipgloss.Color("#2ecc71")

	TitleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(TinappleGreen).
			Background(TinappleBgAlt).
			Padding(0, 2).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(TinappleBorder)

	BannerStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(TinappleGreen)

	ActiveTabStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(TinappleGreen).
			Background(TinappleBgFloat).
			Padding(0, 2)

	InactiveTabStyle = lipgloss.NewStyle().
				Foreground(TinappleFgMuted).
				Background(TinappleBgAlt).
				Padding(0, 2)

	CardStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(TinappleBorder).
			Padding(0, 1)

	SelectedCardStyle = lipgloss.NewStyle().
				Border(lipgloss.RoundedBorder()).
				BorderForeground(TinappleGreen).
				Background(TinappleBgAlt).
				Padding(0, 1)

	BadgeInstalled = lipgloss.NewStyle().
			Foreground(TinappleGreen).
			Bold(true)

	BadgeAvailable = lipgloss.NewStyle().
			Foreground(TinappleFgMuted)

	HelpStyle = lipgloss.NewStyle().
			Foreground(TinappleFgMuted)
)
