package settings

import (
	"fmt"
	"os"

	tea "github.com/charmbracelet/bubbletea"
	"chaddy-store/internal/config"
)

func RunSettings(cm *config.ConfigManager) error {
	m := NewModel(cm)
	p := tea.NewProgram(m, tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		return fmt.Errorf("error running settings TUI: %w", err)
	}
	return nil
}

func ExecSettings() {
	cfg := config.Load()
	cm := config.NewConfigManager(cfg.Store.InstallRoot+"/etc/tinapple/templates", cfg.Store.CacheDir+"/backups")
	_ = cm.LoadTemplates()

	if err := RunSettings(cm); err != nil {
		fmt.Fprintf(os.Stderr, "Settings error: %v\n", err)
		os.Exit(1)
	}
}
