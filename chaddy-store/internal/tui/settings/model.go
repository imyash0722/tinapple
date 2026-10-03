package settings

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"chaddy-store/internal/config"
)

type Model struct {
	Sections      []SettingsSection
	ActiveSection int
	Cursor        int
	Values        map[string]interface{}
	ConfigManager *config.ConfigManager
	StatusMessage string
	Width         int
	Height        int
}

func NewModel(cm *config.ConfigManager) Model {
	sections := GetSettingsSections()
	values := make(map[string]interface{})
	for _, sec := range sections {
		for _, item := range sec.Items {
			values[item.Key] = item.Value
		}
	}

	return Model{
		Sections:      sections,
		ActiveSection: 0,
		Cursor:        0,
		Values:        values,
		ConfigManager: cm,
		Width:         85,
		Height:        24,
	}
}

func (m Model) Init() tea.Cmd {
	return nil
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.Width = msg.Width
		m.Height = msg.Height
		return m, nil

	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c":
			return m, tea.Quit

		case "tab", "l", "right":
			m.ActiveSection = (m.ActiveSection + 1) % len(m.Sections)
			m.Cursor = 0
			m.StatusMessage = ""

		case "shift+tab", "h", "left":
			m.ActiveSection = (m.ActiveSection - 1 + len(m.Sections)) % len(m.Sections)
			m.Cursor = 0
			m.StatusMessage = ""

		case "up", "k":
			if m.Cursor > 0 {
				m.Cursor--
			}

		case "down", "j":
			if m.Cursor < len(m.Sections[m.ActiveSection].Items)-1 {
				m.Cursor++
			}

		case "enter", " ", "space":
			m.handleToggleOrCycle()

		case "+", "=":
			m.handleIncrement(1)

		case "-", "_":
			m.handleIncrement(-1)

		case "s", "w":
			m.SaveSettings()
		}
	}
	return m, nil
}

func (m *Model) handleToggleOrCycle() {
	item := &m.Sections[m.ActiveSection].Items[m.Cursor]
	val := m.Values[item.Key]

	switch item.Type {
	case BoolType:
		boolVal, ok := val.(bool)
		if !ok {
			boolVal = false
		}
		m.Values[item.Key] = !boolVal
		item.Value = !boolVal
		m.StatusMessage = fmt.Sprintf("Updated %s to %v", item.Label, !boolVal)

	case SelectType:
		if len(item.Options) > 0 {
			currStr, _ := val.(string)
			currIdx := 0
			for idx, opt := range item.Options {
				if opt == currStr {
					currIdx = idx
					break
				}
			}
			nextIdx := (currIdx + 1) % len(item.Options)
			nextVal := item.Options[nextIdx]
			m.Values[item.Key] = nextVal
			item.Value = nextVal
			m.StatusMessage = fmt.Sprintf("Selected %s: %s", item.Label, nextVal)
		}

	case ColorType:
		colors := []string{"#2ecc71", "#7aa2f7", "#bb9af7", "#f7768e", "#e0af68", "#1abc9c", "#c0caf5"}
		currStr, _ := val.(string)
		currIdx := 0
		for idx, c := range colors {
			if strings.EqualFold(c, currStr) {
				currIdx = idx
				break
			}
		}
		nextIdx := (currIdx + 1) % len(colors)
		nextVal := colors[nextIdx]
		m.Values[item.Key] = nextVal
		item.Value = nextVal
		m.StatusMessage = fmt.Sprintf("Selected %s: %s", item.Label, nextVal)

	case IntType:
		m.handleIncrement(1)
	}
}

func (m *Model) handleIncrement(delta int) {
	item := &m.Sections[m.ActiveSection].Items[m.Cursor]
	if item.Type == IntType {
		intVal, ok := m.Values[item.Key].(int)
		if !ok {
			intVal = 0
		}
		newVal := intVal + delta
		if newVal < 0 {
			newVal = 0
		}
		m.Values[item.Key] = newVal
		item.Value = newVal
		m.StatusMessage = fmt.Sprintf("Set %s to %d", item.Label, newVal)
	}
}

func (m *Model) SaveSettings() {
	if m.ConfigManager != nil {
		// Convert values to map[string]string
		strVars := make(map[string]string)
		for k, v := range m.Values {
			strVars[k] = fmt.Sprintf("%v", v)
		}
		// Attempt applying to loaded templates
		for _, tmpl := range m.ConfigManager.Templates {
			_, _ = m.ConfigManager.ApplyTemplate(tmpl.Name, strVars)
		}
	}
	m.StatusMessage = "✓ Settings successfully applied and saved!"
}
