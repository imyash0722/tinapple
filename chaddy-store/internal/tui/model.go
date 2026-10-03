package tui

import (
	"fmt"

	tea "github.com/charmbracelet/bubbletea"
	"chaddy-store/internal/store"
)

type Model struct {
	Store         *store.Store
	Categories    []string
	ActiveCat     int
	Cursor        int
	FilteredApps  []store.App
	SearchQuery   string
	Searching     bool
	StatusMessage string
	IsError       bool
	Width         int
	Height        int
	InstallMode   bool
}

func NewModel(s *store.Store) Model {
	cats := []string{"All", "System", "Development", "Media", "Network", "Storage & Backups", "Remote Desktop"}
	m := Model{
		Store:      s,
		Categories: cats,
		ActiveCat:  0,
		Cursor:     0,
		Width:      90,
		Height:     24,
	}
	m.updateFilteredList()
	return m
}

func (m *Model) updateFilteredList() {
	var list []store.App
	selectedCat := m.Categories[m.ActiveCat]

	if m.SearchQuery != "" {
		list = m.Store.Search(m.SearchQuery)
		if selectedCat != "All" {
			var catFiltered []store.App
			for _, app := range list {
				if app.Category == selectedCat {
					catFiltered = append(catFiltered, app)
				}
			}
			list = catFiltered
		}
	} else if selectedCat == "All" {
		list = m.Store.Repo.Apps
	} else {
		for _, app := range m.Store.Repo.Apps {
			if app.Category == selectedCat {
				list = append(list, app)
			}
		}
	}

	m.FilteredApps = list
	if m.Cursor >= len(m.FilteredApps) {
		m.Cursor = max(0, len(m.FilteredApps)-1)
	}
}

func (m Model) Init() tea.Cmd {
	return nil
}

type statusMsg struct {
	message string
	isError bool
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.Width = msg.Width
		m.Height = msg.Height
		return m, nil

	case statusMsg:
		m.StatusMessage = msg.message
		m.IsError = msg.isError
		m.Store.RefreshInstalledStatus()
		m.updateFilteredList()
		return m, nil

	case tea.KeyMsg:
		if m.Searching {
			switch msg.String() {
			case "esc", "enter":
				m.Searching = false
			case "backspace":
				if len(m.SearchQuery) > 0 {
					m.SearchQuery = m.SearchQuery[:len(m.SearchQuery)-1]
					m.updateFilteredList()
				}
			default:
				if len(msg.String()) == 1 {
					m.SearchQuery += msg.String()
					m.updateFilteredList()
				}
			}
			return m, nil
		}

		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit

		case "tab", "l", "right":
			m.ActiveCat = (m.ActiveCat + 1) % len(m.Categories)
			m.Cursor = 0
			m.updateFilteredList()

		case "shift+tab", "h", "left":
			m.ActiveCat = (m.ActiveCat - 1 + len(m.Categories)) % len(m.Categories)
			m.Cursor = 0
			m.updateFilteredList()

		case "up", "k":
			if m.Cursor > 0 {
				m.Cursor--
			}

		case "down", "j":
			if m.Cursor < len(m.FilteredApps)-1 {
				m.Cursor++
			}

		case "/":
			m.Searching = true

		case "esc":
			if m.SearchQuery != "" {
				m.SearchQuery = ""
				m.updateFilteredList()
			}

		case "enter", "i":
			if len(m.FilteredApps) > 0 {
				app := m.FilteredApps[m.Cursor]
				return m, func() tea.Msg {
					err := m.Store.Install([]string{app.ID})
					if err != nil {
						return statusMsg{message: fmt.Sprintf("Install failed: %v", err), isError: true}
					}
					return statusMsg{message: fmt.Sprintf("Installed %s successfully!", app.Name), isError: false}
				}
			}

		case "r", "x":
			if len(m.FilteredApps) > 0 {
				app := m.FilteredApps[m.Cursor]
				return m, func() tea.Msg {
					err := m.Store.Remove([]string{app.ID})
					if err != nil {
						return statusMsg{message: fmt.Sprintf("Remove failed: %v", err), isError: true}
					}
					return statusMsg{message: fmt.Sprintf("Removed %s", app.Name), isError: false}
				}
			}

		case "u":
			return m, func() tea.Msg {
				err := m.Store.UpdateDatabase()
				if err != nil {
					return statusMsg{message: fmt.Sprintf("Update failed: %v", err), isError: true}
				}
				return statusMsg{message: "App database refreshed!", isError: false}
			}
		}
	}

	return m, nil
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
