package store

import (
	"time"
)

type App struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Category     string   `json:"category"`
	Version      string   `json:"version"`
	Maintainer   string   `json:"maintainer"`
	RepoURL      string   `json:"repo_url"`
	PackageName  string   `json:"package_name"`
	InstallCmd   string   `json:"install_cmd"`
	UninstallCmd string   `json:"uninstall_cmd"`
	Dependencies []string `json:"dependencies"`
	Tags         []string `json:"tags"`
	Icon         string   `json:"icon"`
	Size         int64    `json:"size_bytes"`
	Homepage     string   `json:"homepage"`
	License      string   `json:"license"`
	Installed    bool     `json:"installed"`
	UpdateAvail  bool     `json:"update_available"`
}

type Repository struct {
	Apps        []App     `json:"apps"`
	LastUpdated time.Time `json:"last_updated"`
	Source      string    `json:"source"`
}

func (r *Repository) Find(idOrName string) *App {
	for i := range r.Apps {
		if r.Apps[i].ID == idOrName || r.Apps[i].Name == idOrName || r.Apps[i].PackageName == idOrName {
			return &r.Apps[i]
		}
	}
	return nil
}
