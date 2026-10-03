# Task R1: Chaddy Store Core - CLI & TUI

## Goal
Build the core Chaddy Store application with CLI and TUI interface for browsing, installing, and managing applications.

## Files to Create/Modify

### 1. Main CLI/TUI Entry Point
**File:** `/mnt/shared/projects/tinapple/chaddy-store/main.go`

### 2. Store Library
**Directory:** `/mnt/shared/projects/tinapple/chaddy-store/store/`
- `repository.go` - App repository management
- `installer.go` - Installation logic
- `updates.go` - Update checking
- `repository.go` - App catalog management

### 3. TUI Interface
**Directory:** `/mnt/shared/projects/tinapple/chaddy-store/ui/tui/`
- Main TUI application
- App browsing/listing
- Search/filter
- Install/uninstall actions
- Progress display

### 4. Configuration
**File:** `/mnt/shared/projects/tinapple/chaddy-store/config.yaml`
```yaml
store:
  repositories:
    - name: "tinapple-official"
      url: "https://repo.tinapple.org/apps"
      enabled: true
    - name: "aur"
      url: "https://aur.archlinux.org"
      enabled: true
  cache_dir: "/var/cache/chaddy-store"
  install_root: "/"
  concurrent_downloads: 3
  auto_update_check: true
  update_interval_hours: 6
```

## Implementation Details

### 1. Main Entry Point (`cmd/chaddy-store/main.go`)
```go
package main

import (
	"fmt"
	"os"
	"github.com/charmbracelet/bubbletea"
	"github.com/spf13/cobra"
	"tinapple/chaddy-store/internal/store"
	"tinapple/chaddy-store/internal/tui"
	"tinapple/chaddy-store/internal/config"
)

func main() {
	cfg := config.Load()
	
	rootCmd := &cobra.Command{
		Use:   "chaddy-store",
		Short: "Tinapple OS App Store",
		Long:  `Chaddy Store - Tinapple OS Application Manager`,
		Run: func(cmd *cobra.Command, args []string) {
			if len(args) == 0 {
				runTUI()
			} else {
				handleCLI(args)
			}
		},
	}
	
	rootCmd.AddCommand(&cobra.Command{
		Use:   "install [app...]",
		Short: "Install applications",
		Run: func(cmd *cobra.Command, args []string) {
			store.Install(args)
		},
	})
	
	rootCmd.AddCommand(&cobra.Command{
		Use:   "remove [app...]",
		Short: "Remove applications",
		Run: func(cmd *cobra.Command, args []string) {
			store.Remove(args)
		},
	})
	
	rootCmd.AddCommand(&cobra.Command{
		Use:   "search [query]",
		Short: "Search for applications",
		Run: func(cmd *cobra.Command, args []string) {
			store.Search(args[0])
		},
	})
	
	rootCmd.AddCommand(&cobra.Command{
		Use:   "update",
		Short: "Update all installed packages",
		Run: func(cmd *cobra.Command, args []string) {
			store.UpdateAll()
		},
	})
	
	rootCmd.AddCommand(&cobra.Command{
		Use:   "search [query]",
		Short: "Search for applications",
		Run: func(cmd *cobra.Command, args []string) {
			store.Search(args[0])
		},
	})
	
	rootCmd.AddCommand(&cobra.Command{
		Use:   "list",
		Short: "List installed applications",
		Run: func(cmd *cobra.Command, args []string) {
			store.ListInstalled()
		},
	})
	
	rootCmd.AddCommand(&cobra.Command{
		Use:   "update-db",
		Short: "Update local package database",
		Run: func(cmd *cobra.Command, args []string) {
			store.UpdateDatabase()
		},
	})
	
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func runTUI() {
	cfg := config.Load()
	store := store.New(cfg)
	m := tui.NewModel(store)
	p := tea.NewProgram(m, tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error running TUI: %v\n", err)
		os.Exit(1)
	}
}

func handleCLI(args []string) {
	// CLI implementation
}
```

### 2. Store Core (`internal/store/`)

#### `repository.go` - App Repository
```go
package store

type App struct {
    ID          string   `json:"id"`
    Name        string   `json:"name"`
    Description string   `json:"description"`
    Category    string   `json:"category"`
    Version     string   `json:"version"`
    Maintainer  string   `json:"maintainer"`
    RepoURL     string   `json:"repo_url"`
    InstallCmd  string   `json:"install_cmd"`
    UninstallCmd string  `json:"uninstall_cmd"`
    Dependencies []string `json:"dependencies"`
    Tags        []string `json:"tags"`
    Icon        string   `json:"icon"`
    Size        int64    `json:"size_bytes"`
    Homepage    string   `json:"homepage"`
    License     string   `json:"license"`
    Installed   bool     `json:"-"`
    UpdateAvail bool     `json:"-"`
}

type Repository struct {
    Apps []App `json:"apps"`
    LastUpdated time.Time `json:"last_updated"`
    Source string `json:"source"`
}

type Store struct {
    Repo *Repository
    Installed map[string]*App
    Config *Config
}

func New(cfg *Config) *Store {
    return &Store{
        Config: cfg,
        Installed: make(map[string]*App),
    }
}

func (s *Store) LoadRepository() error {
    // Load from local cache or download
    return nil
}

func (s *Store) Install(apps []string) error {
    for _, appID := range apps {
        app := s.Repo.Find(appID)
        if app == nil {
            return fmt.Errorf("app not found: %s", appID)
        }
        // Execute install command
        if err := exec.Command("sh", "-c", app.InstallCmd).Run(); err != nil {
            return fmt.Errorf("failed to install %s: %w", app.Name, err)
        }
        s.Installed[app.ID] = app
    }
    return nil
}
```

### 2. TUI Interface (`internal/tui/`)

```go
package tui

import (
	"github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

type Model struct {
	store *store.Store
	list  *list.Model
	search string
	selected int
	categories []string
	selectedCategory int
	installing bool
	progress float64
	currentOp string
	err error
}

func NewModel(store *store.Store) Model {
	// Initialize list with apps
	items := make([]list.Item, len(store.Repo.Apps))
	for i, app := range store.Repo.Apps {
		items[i] = appItem{app: app}
	}
	
	l := list.New(items, list.NewDefaultDelegate(), 80, 20)
	l.Title = "Chaddy Store"
	l.SetShowStatusBar(true)
	l.SetFilteringEnabled(true)
	
	return Model{
		store: store,
		list: l,
		categories: []string{"All", "System", "Development", "Media", "Network", "Security", "Utilities"},
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
		case "enter":
			if selected, ok := m.list.SelectedItem().(AppItem); ok {
				return m, m.installApp(selected.app)
			}
		case "/":
			m.list.SetFilteringEnabled(true)
			m.list.SetFilter(m.search)
		case "esc":
			m.list.ResetFilter()
		}
	}
	return m, nil
}

func (m Model) View() string {
	if m.installing {
		return m.renderProgress()
	}
	return m.list.View()
}
```

## Verification
```bash
cd /mnt/shared/projects/tinapple/chaddy-store
go build -o ../bin/chaddy-store ./cmd/chaddy-store
./bin/chaddy-store --help
./bin/chaddy-store search vim
./bin/chaddy-store install vim
```

## Files to Create
1. `/mnt/shared/projects/tinapple/chaddy-store/cmd/chaddy-store/main.go`
2. `internal/store/repository.go`
3. `internal/store/installer.go`
4. `internal/tui/model.go`
4. `internal/tui/list.go`
5. `go.mod` / `go.sum`
5. `config.yaml`
EOF