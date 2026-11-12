// Package routing builds native Caddy HTTP-context configuration.
package routing

import (
	"bytes"
	"fmt"
	"sort"
	"strings"
	"text/template"
)

const caddySnippetTemplate = `{{range .Routes}}
# Route for {{.ID}}
redir /{{.Path}} /{{.Path}}/ permanent
handle_path /{{.Path}}/* {
	reverse_proxy localhost:{{.Port}} {
		header_up X-Forwarded-Prefix /{{.Path}}
		header_down Location "http://" "https://"
	}
}
{{end}}
{{range .Hosts}}
http://{{.Name}} {
	reverse_proxy localhost:{{.Port}}
}
{{end}}`

// RenderCaddy accepts available apps and returns clean, injection-safe Caddy routing configuration.
func RenderCaddy(apps []App, domains []string) ([]byte, error) {
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
	err := template.Must(template.New("caddy").Parse(caddySnippetTemplate)).Execute(&output, data)
	return output.Bytes(), err
}
