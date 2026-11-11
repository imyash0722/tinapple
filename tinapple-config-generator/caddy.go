package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"os"
	"os/exec"
	"syscall"
	"tinapple-config-generator/manifest"
	"tinapple-config-generator/routing"
)

func syncCaddy(args []string) error {
	flags := flag.NewFlagSet("caddy-sync", flag.ContinueOnError)
	manifestPath := flags.String("manifest", "/etc/tinapple/manifest.yaml", "manifest")
	stdin := flags.Bool("catalog-stdin", false, "read app definitions as JSON from stdin")
	noReload := flags.Bool("no-reload", false, "prepare before caddy starts")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if err := os.MkdirAll("/run/tinapple", 0755); err != nil {
		return err
	}
	lock, err := os.OpenFile("/run/tinapple/caddy.lock", os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return err
	}
	defer lock.Close()
	if err = syscall.Flock(int(lock.Fd()), syscall.LOCK_EX); err != nil {
		return err
	}
	defer syscall.Flock(int(lock.Fd()), syscall.LOCK_UN)

	apps := routing.Defaults
	catalogPath := "/var/lib/tinapple/caddy-catalog.json"
	if *stdin {
		if err = json.NewDecoder(os.Stdin).Decode(&apps); err != nil {
			return err
		}
	} else if data, e := os.ReadFile(catalogPath); e == nil {
		if err = json.Unmarshal(data, &apps); err != nil {
			return err
		}
	} else if data, e := os.ReadFile("/var/lib/tinapple/nginx-catalog.json"); e == nil {
		_ = json.Unmarshal(data, &apps)
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

	data, err := routing.RenderCaddy(available, domains)
	if err != nil {
		return err
	}

	_ = os.MkdirAll("/etc/caddy/conf.d", 0755)
	caddyfilePath := "/etc/caddy/Caddyfile"
	confdPath := "/etc/caddy/conf.d/tinapple-services.caddy"
	previousRoutes, _ := os.ReadFile(confdPath)
	changed := !bytes.Equal(previousRoutes, data)

	err = routing.Apply(confdPath, data,
		func() error {
			if _, e := exec.LookPath("caddy"); e != nil {
				return nil
			}
			if _, e := os.Stat(caddyfilePath); os.IsNotExist(e) {
				return nil
			}
			return runProxyCommand("caddy", "validate", "--config", caddyfilePath)
		},
		func() error {
			if !changed || *noReload {
				return nil
			}
			if runProxyCommand("systemctl", "is-active", "--quiet", "caddy.service") == nil {
				return runProxyCommand("systemctl", "reload", "caddy.service")
			}
			if runProxyCommand("systemctl", "is-active", "--quiet", "tinapple-nginx.service") == nil {
				return runProxyCommand("systemctl", "reload", "tinapple-nginx.service")
			}
			return nil
		})
	if err != nil {
		return err
	}

	catalogJSON, err := json.Marshal(catalog)
	if err != nil {
		return err
	}
	_ = routing.AtomicWrite(catalogPath, catalogJSON, 0644)
	return nil
}
