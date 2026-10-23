package routing

import (
	"bufio"
	"context"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

// NGINX_BINARY points at a native nginx binary. All files/listeners are isolated.
func TestNativeNginxProxyAndSSE(t *testing.T) {
	binary := os.Getenv("NGINX_BINARY")
	if binary == "" {
		t.Skip("set NGINX_BINARY to run native proxy integration")
	}
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "telemetry/stream") {
			w.Header().Set("Content-Type", "text/event-stream")
			fmt.Fprint(w, "data: first\n\n")
			w.(http.Flusher).Flush()
			select {
			case <-time.After(time.Second):
				fmt.Fprint(w, "data: second\n\n")
			case <-r.Context().Done():
			}
			return
		}
		w.Header().Set("X-Upstream-Path", r.URL.Path)
		w.Header().Set("X-Proxy-Prefix", r.Header.Get("X-Forwarded-Prefix"))
		w.WriteHeader(200)
	}))
	defer upstream.Close()
	_, portString, _ := net.SplitHostPort(strings.TrimPrefix(upstream.URL, "http://"))
	port, _ := strconv.Atoi(portString)
	apps := append([]App(nil), Defaults...)
	for i := range apps {
		apps[i].Port = port
	}
	data, err := Render(apps, nil)
	if err != nil {
		t.Fatal(err)
	}
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	proxyPort := listener.Addr().(*net.TCPAddr).Port
	listener.Close()
	data = []byte(strings.ReplaceAll(string(data), "listen 80 default_server;", fmt.Sprintf("listen 127.0.0.1:%d default_server;", proxyPort)))
	data = []byte(strings.ReplaceAll(string(data), "listen [::]:80 default_server;", ""))
	data = []byte(strings.ReplaceAll(string(data), "127.0.0.1:8088", strings.TrimPrefix(upstream.URL, "http://")))
	dir := t.TempDir()
	routeFile := filepath.Join(dir, "routes.conf")
	os.WriteFile(routeFile, data, 0644)
	configPath := filepath.Join(dir, "nginx.conf")
	// Validate the shipped main template too, redirecting only filesystem paths.
	mainTemplate, err := os.ReadFile("../../tinapple-nginx/nginx.conf.template")
	if err != nil {
		t.Fatal(err)
	}
	os.WriteFile(filepath.Join(dir, "mime.types"), []byte("types { text/html html; }"), 0644)
	config := strings.NewReplacer(
		"worker_processes auto;", "worker_processes 1;",
		"/var/log/nginx/error.log", filepath.Join(dir, "error.log"),
		"/var/log/nginx/access.log", filepath.Join(dir, "access.log"),
		"/run/nginx.pid", filepath.Join(dir, "nginx.pid"),
		"/etc/nginx/mime.types", filepath.Join(dir, "mime.types"),
		"/etc/nginx/conf.d/*.conf", routeFile,
		"http {", fmt.Sprintf("http { proxy_temp_path %s/proxy; client_body_temp_path %s/body;", dir, dir),
	).Replace(string(mainTemplate))
	os.WriteFile(configPath, []byte(config), 0644)
	if out, err := exec.Command(binary, "-t", "-p", dir, "-c", configPath).CombinedOutput(); err != nil {
		t.Fatalf("nginx -t: %s: %v", out, err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	cmd := exec.CommandContext(ctx, binary, "-p", dir, "-c", configPath, "-g", "daemon off;")
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	defer func() { exec.Command(binary, "-p", dir, "-c", configPath, "-s", "quit").Run(); cmd.Wait() }()
	url := fmt.Sprintf("http://127.0.0.1:%d", proxyPort)
	client := http.Client{Timeout: 3 * time.Second}
	for i := 0; i < 100; i++ {
		resp, e := client.Head(url)
		if e == nil {
			resp.Body.Close()
			break
		}
		time.Sleep(20 * time.Millisecond)
	}
	resp, err := client.Head(url)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatal(resp.Status)
	}
	for _, app := range apps {
		path := "/" + Paths[app.ID]
		resp, err := client.Get(url + path + "/probe")
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		if resp.StatusCode != 200 || resp.Header.Get("X-Upstream-Path") != "/probe" || resp.Header.Get("X-Proxy-Prefix") != path {
			t.Fatalf("bad routing for %s: %v", app.ID, resp.Header)
		}
	}
	start := time.Now()
	resp, err = client.Get(url + "/api/v1/system/telemetry/stream")
	if err != nil {
		t.Fatal(err)
	}
	first, err := bufio.NewReader(resp.Body).ReadString('\n')
	resp.Body.Close()
	if err != nil || first != "data: first\n" || time.Since(start) > 700*time.Millisecond {
		t.Fatalf("SSE stalled: %q %v (%s)", first, err, time.Since(start))
	}
}
