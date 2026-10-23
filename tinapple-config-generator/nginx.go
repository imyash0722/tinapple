package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"
	"tinapple-config-generator/manifest"
	"tinapple-config-generator/routing"
)

func runProxyCommand(name string, args ...string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	out, err := exec.CommandContext(ctx, name, args...).CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s: %w: %s", name, err, out)
	}
	return nil
}
func syncNginx(args []string) error {
	flags := flag.NewFlagSet("nginx-sync", flag.ContinueOnError)
	manifestPath := flags.String("manifest", "/etc/tinapple/manifest.yaml", "manifest")
	stdin := flags.Bool("catalog-stdin", false, "read app definitions as JSON from stdin")
	noReload := flags.Bool("no-reload", false, "prepare before nginx starts")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if err := os.MkdirAll("/run/tinapple", 0755); err != nil {
		return err
	}
	lock, err := os.OpenFile("/run/tinapple/nginx.lock", os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return err
	}
	defer lock.Close()
	if err = syscall.Flock(int(lock.Fd()), syscall.LOCK_EX); err != nil {
		return err
	}
	defer syscall.Flock(int(lock.Fd()), syscall.LOCK_UN)
	apps := routing.Defaults
	catalogPath := "/var/lib/tinapple/nginx-catalog.json"
	if *stdin {
		if err = json.NewDecoder(os.Stdin).Decode(&apps); err != nil {
			return err
		}
	} else if data, e := os.ReadFile(catalogPath); e == nil {
		if err = json.Unmarshal(data, &apps); err != nil {
			return err
		}
	}
	var domains []string
	var configs map[string]manifest.ServiceConfig
	if m, e := manifest.LoadManifest(*manifestPath); e == nil {
		domains = m.Network.ProxyDomains
		configs = m.Services
	} else if !errors.Is(e, os.ErrNotExist) {
		return e
	}
	available, catalog, err := availableRoutes(apps, configs, runProxyCommand)
	if err != nil {
		return err
	}

	data, err := routing.Render(available, domains)
	if err != nil {
		return err
	}
	mainPath := "/etc/nginx/nginx.conf"
	templateData, err := os.ReadFile("/etc/tinapple/nginx.conf.template")
	if err != nil {
		return err
	}
	// Preserve the distribution/custom config once when adopting this managed service.
	old, readErr := os.ReadFile(mainPath)
	if readErr != nil && !os.IsNotExist(readErr) {
		return readErr
	}
	backup := mainPath + ".pre-tinapple"
	if readErr == nil {
		if _, e := os.Stat(backup); os.IsNotExist(e) {
			if err = routing.AtomicWrite(backup, old, 0644); err != nil {
				return err
			}
		}
	}
	if err = os.MkdirAll(filepath.Dir(mainPath)+"/conf.d", 0755); err != nil {
		return err
	}
	if err = routing.AtomicWrite(mainPath, templateData, 0644); err != nil {
		return err
	}
	previousRoutes, _ := os.ReadFile("/etc/nginx/conf.d/tinapple-services.conf")
	changed := !bytes.Equal(old, templateData) || !bytes.Equal(previousRoutes, data)
	err = routing.Apply("/etc/nginx/conf.d/tinapple-services.conf", data,
		func() error { return runProxyCommand("nginx", "-t", "-c", mainPath) },
		func() error {
			if !changed || *noReload || runProxyCommand("systemctl", "is-active", "--quiet", "tinapple-nginx.service") != nil {
				return nil
			}
			return runProxyCommand("systemctl", "reload", "tinapple-nginx.service")
		})
	if err != nil {
		if readErr == nil {
			_ = routing.AtomicWrite(mainPath, old, 0644)
		} else {
			_ = os.Remove(mainPath)
		}
		return err
	}
	catalogJSON, err := json.Marshal(catalog)
	if err != nil {
		return err
	}
	return routing.AtomicWrite(catalogPath, catalogJSON, 0644)
}

// Probe live state rather than persisted UI cache; no inactive/uninstalled app
// should leave a route pointing at an unrelated process that later reuses a port.
func availableRoutes(apps []routing.App, configs map[string]manifest.ServiceConfig, run func(string, ...string) error) ([]routing.App, []routing.App, error) {
	var available []routing.App
	var catalog []routing.App
	for _, app := range apps {
		if _, ok := routing.Paths[app.ID]; !ok {
			continue
		}
		if err := routing.ValidateApp(app); err != nil {
			return nil, nil, err
		}
		catalog = append(catalog, app)
		if svc, ok := configs[app.ID]; ok {
			if svc.Port != 0 {
				app.Port = svc.Port
			}
		}
		if run("pacman", "-Q", app.Package) == nil && run("systemctl", "is-active", "--quiet", app.Unit) == nil {
			available = append(available, app)
		}
	}
	return available, catalog, nil
}
