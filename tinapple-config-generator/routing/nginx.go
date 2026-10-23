// Package routing builds native NGINX HTTP-context configuration.
package routing

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"text/template"
)

type App struct {
	ID      string `json:"id"`
	Package string `json:"package"`
	Unit    string `json:"unit"`
	Port    int    `json:"port"`
}

// Only HTTP applications are proxied; databases and game protocols are excluded.
var Paths = map[string]string{"jellyfin": "jellyfin", "qbittorrent": "qbittorrent", "suwayomi": "suwayomi", "filebrowser": "files", "navidrome": "navidrome", "vaultwarden": "vault", "sonarr": "sonarr", "radarr": "radarr", "prowlarr": "prowlarr", "bazarr": "bazarr", "syncthing": "syncthing", "grafana": "grafana", "prometheus": "prometheus", "seerr": "seerr", "adguard": "adguard"}
var Defaults = []App{
	{"jellyfin", "jellyfin-server", "jellyfin.service", 8096},
	{"qbittorrent", "qbittorrent-nox", "qbittorrent-nox.service", 8080},
	{"suwayomi", "suwayomi-server", "suwayomi-server.service", 4567},
	{"filebrowser", "filebrowser", "filebrowser.service", 8081},
	{"navidrome", "navidrome", "navidrome.service", 4533},
	{"vaultwarden", "vaultwarden", "vaultwarden.service", 8000},
}
var hostRE = regexp.MustCompile(`^[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?$`)
var unitRE = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9@_.-]*\.service$`)
var packageRE = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9@+_.-]*$`)

func ValidateApp(app App) error {
	if _, ok := Paths[app.ID]; !ok {
		return fmt.Errorf("unsupported HTTP app %q", app.ID)
	}
	if app.Port < 1 || app.Port > 65535 || !unitRE.MatchString(app.Unit) || !packageRE.MatchString(app.Package) {
		return fmt.Errorf("invalid routing metadata for %s", app.ID)
	}
	return nil
}

type route struct {
	ID, Path string
	Port     int
}
type host struct {
	Name string
	Port int
}

const proxy = `        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
`
const config = `# Managed by tinapple-config-generator. Included in http {}, not server {}.
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 0;
    location / {
        proxy_pass http://127.0.0.1:8088;
` + proxy + `    }
{{range .Routes}}
    location = /{{.Path}} { return 308 /{{.Path}}/$is_args$args; }
    location ^~ /{{.Path}}/ {
        proxy_pass http://127.0.0.1:{{.Port}}/;
` + proxy + `        proxy_set_header X-Forwarded-Prefix /{{.Path}};
        proxy_redirect ~^(/.*)$ /{{.Path}}$1;
        proxy_cookie_path / /{{.Path}}/;
    }
{{end}}
}
{{range .Hosts}}
server {
    listen 80;
    listen [::]:80;
    server_name {{.Name}};
    client_max_body_size 0;
    location / {
        proxy_pass http://127.0.0.1:{{.Port}};
` + proxy + `    }
}
{{end}}`

// Render accepts only available apps, and returns stable, injection-safe output.
func Render(apps []App, domains []string) ([]byte, error) {
	var data struct {
		Routes []route
		Hosts  []host
	}
	seen := map[string]bool{}
	for _, domain := range domains {
		if len(domain) > 253 || !hostRE.MatchString(domain) || strings.Contains(domain, "..") {
			return nil, fmt.Errorf("invalid proxy domain %q", domain)
		}
		for _, label := range strings.Split(domain, ".") {
			if len(label) > 63 || label == "" || strings.HasPrefix(label, "-") || strings.HasSuffix(label, "-") {
				return nil, fmt.Errorf("invalid proxy domain %q", domain)
			}
		}
	}
	apps = append([]App(nil), apps...)
	sort.Slice(apps, func(i, j int) bool { return apps[i].ID < apps[j].ID })
	for _, app := range apps {
		if err := ValidateApp(app); err != nil {
			return nil, err
		}
		if seen[app.ID] {
			return nil, fmt.Errorf("duplicate route %s", app.ID)
		}
		seen[app.ID] = true
		data.Routes = append(data.Routes, route{app.ID, Paths[app.ID], app.Port})
		for _, domain := range domains {
			data.Hosts = append(data.Hosts, host{app.ID + "." + domain, app.Port})
		}
	}
	var output bytes.Buffer
	err := template.Must(template.New("nginx").Parse(config)).Execute(&output, data)
	return output.Bytes(), err
}

func AtomicWrite(path string, data []byte, mode os.FileMode) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	file, err := os.CreateTemp(filepath.Dir(path), ".tinapple-*")
	if err != nil {
		return err
	}
	defer os.Remove(file.Name())
	if err = file.Chmod(mode); err == nil {
		_, err = file.Write(data)
	}
	if err == nil {
		err = file.Sync()
	}
	closeErr := file.Close()
	if err == nil {
		err = closeErr
	}
	if err != nil {
		return err
	}
	return os.Rename(file.Name(), path)
}

// Apply retains the previous on-disk configuration on validation/reload failure.
func Apply(path string, data []byte, validate, reload func() error) error {
	old, err := os.ReadFile(path)
	existed := err == nil
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	if err = AtomicWrite(path, data, 0644); err != nil {
		return err
	}
	if err = validate(); err == nil {
		err = reload()
	}
	if err != nil {
		var restore error
		if existed {
			restore = AtomicWrite(path, old, 0644)
		} else {
			restore = os.Remove(path)
		}
		if restore != nil {
			return fmt.Errorf("apply: %v; restoring prior config: %w", err, restore)
		}
		return err
	}
	return nil
}
