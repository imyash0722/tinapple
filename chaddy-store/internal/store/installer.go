package store

import (
	"fmt"
	"os"
	"os/exec"
)

func (s *Store) Install(appIDs []string) error {
	for _, id := range appIDs {
		app := s.Repo.Find(id)
		if app == nil {
			return fmt.Errorf("app not found: %s", id)
		}

		cmdStr := app.InstallCmd
		if cmdStr == "" {
			pkg := app.PackageName
			if pkg == "" {
				pkg = app.ID
			}
			cmdStr = fmt.Sprintf("pacman -S --noconfirm %s", pkg)
		}

		cmd := exec.Command("sh", "-c", cmdStr)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to install %s: %w", app.Name, err)
		}
		app.Installed = true
		s.Installed[app.ID] = app
	}
	return nil
}

func (s *Store) Remove(appIDs []string) error {
	for _, id := range appIDs {
		app := s.Repo.Find(id)
		if app == nil {
			return fmt.Errorf("app not found: %s", id)
		}

		cmdStr := app.UninstallCmd
		if cmdStr == "" {
			pkg := app.PackageName
			if pkg == "" {
				pkg = app.ID
			}
			cmdStr = fmt.Sprintf("pacman -R --noconfirm %s", pkg)
		}

		cmd := exec.Command("sh", "-c", cmdStr)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to remove %s: %w", app.Name, err)
		}
		app.Installed = false
		delete(s.Installed, app.ID)
	}
	return nil
}

func (s *Store) UpdateAll() error {
	cmd := exec.Command("pacman", "-Syu", "--noconfirm")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("system update failed: %w", err)
	}
	s.RefreshInstalledStatus()
	return nil
}

func (s *Store) UpdateDatabase() error {
	cmd := exec.Command("pacman", "-Sy")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("package database refresh failed: %w", err)
	}
	return s.SaveRepositoryCache()
}
