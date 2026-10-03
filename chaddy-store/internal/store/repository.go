package store

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"chaddy-store/internal/config"
)

type Store struct {
	Repo      *Repository
	Installed map[string]*App
	Config    *config.Config
}

func New(cfg *config.Config) *Store {
	if cfg == nil {
		cfg = config.DefaultConfig()
	}
	s := &Store{
		Repo:      DefaultCatalog(),
		Installed: make(map[string]*App),
		Config:    cfg,
	}
	_ = s.LoadRepository()
	s.RefreshInstalledStatus()
	return s
}

func (s *Store) LoadRepository() error {
	cachePath := filepath.Join(s.Config.Store.CacheDir, "catalog.json")
	if data, err := os.ReadFile(cachePath); err == nil {
		var cachedRepo Repository
		if err := json.Unmarshal(data, &cachedRepo); err == nil && len(cachedRepo.Apps) > 0 {
			// Merge with defaults
			s.Repo = &cachedRepo
		}
	}
	return nil
}

func (s *Store) SaveRepositoryCache() error {
	if err := os.MkdirAll(s.Config.Store.CacheDir, 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(s.Repo, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(s.Config.Store.CacheDir, "catalog.json"), data, 0644)
}

func (s *Store) RefreshInstalledStatus() {
	s.Installed = make(map[string]*App)
	for i := range s.Repo.Apps {
		app := &s.Repo.Apps[i]
		pkg := app.PackageName
		if pkg == "" {
			pkg = app.ID
		}
		// Query pacman
		installed := isPackageInstalled(pkg)
		app.Installed = installed
		if installed {
			s.Installed[app.ID] = app
		}
	}
}

func isPackageInstalled(pkgName string) bool {
	cmd := exec.Command("pacman", "-Q", pkgName)
	return cmd.Run() == nil
}

func (s *Store) Search(query string) []App {
	q := strings.ToLower(strings.TrimSpace(query))
	if q == "" {
		return s.Repo.Apps
	}
	var results []App
	for _, app := range s.Repo.Apps {
		if strings.Contains(strings.ToLower(app.Name), q) ||
			strings.Contains(strings.ToLower(app.ID), q) ||
			strings.Contains(strings.ToLower(app.Description), q) ||
			strings.Contains(strings.ToLower(app.Category), q) {
			results = append(results, app)
			continue
		}
		for _, tag := range app.Tags {
			if strings.Contains(strings.ToLower(tag), q) {
				results = append(results, app)
				break
			}
		}
	}
	return results
}

func (s *Store) ListInstalled() []App {
	s.RefreshInstalledStatus()
	var list []App
	for _, app := range s.Installed {
		list = append(list, *app)
	}
	return list
}
