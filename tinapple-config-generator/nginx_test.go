package main

import (
	"errors"
	"testing"
	"tinapple-config-generator/manifest"
	"tinapple-config-generator/routing"
)

func TestRouteAvailabilityFollowsPackagesAndUnits(t *testing.T) {
	apps := append([]routing.App(nil), routing.Defaults...)
	apps = append(apps, routing.App{ID: "postgresql", Port: 5432, Package: "postgresql", Unit: "postgresql.service"})
	configs := map[string]manifest.ServiceConfig{"jellyfin": {Port: 18096}}
	probe := func(command string, args ...string) error {
		if command == "pacman" && args[1] == "navidrome" {
			return errors.New("not installed")
		}
		if command == "systemctl" && args[2] == "vaultwarden.service" {
			return errors.New("stopped")
		}
		return nil
	}
	available, catalog, err := availableRoutes(apps, configs, probe)
	if err != nil {
		t.Fatal(err)
	}
	if len(available) != 4 || len(catalog) != 6 {
		t.Fatalf("unexpected catalogs: %v %v", available, catalog)
	}
	for _, app := range available {
		if app.ID == "jellyfin" && app.Port != 18096 {
			t.Fatal("port override ignored")
		}
		if app.ID == "vaultwarden" || app.ID == "navidrome" || app.ID == "postgresql" {
			t.Fatal("unavailable/non-http app exposed")
		}
	}
}
