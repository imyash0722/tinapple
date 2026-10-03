# Task: tinapple-service-infrastructure

## Status: ✅ Done

## Goal
Implement observability stack: Prometheus, Grafana, Loki, Tempo, Alertmanager

## Files to Create

### 1. `/mnt/shared/projects/tinapple/tinapple-service-infrastructure/PKGBUILD`
```bash
# Maintainer: tinapple Project <https://github.com/tinapple/tinapple-arch>
pkgname=tinapple-service-infrastructure
pkgver=0.0.1
pkgrel=1
pkgdesc="Observability stack for tinapple (prometheus, grafana, loki, tempo, alertmanager)"
arch=(any)
url="https://github.com/tinapple/tinapple-arch"
license=(MIT)
depends=('prometheus' 'grafana' 'loki' 'tempo' 'alertmanager')
optdepends=('node_exporter' 'cadvisor')
install=tinapple-service-infrastructure.install
source=()
sha256sums=()

package() {
  install -dm755 "$pkgdir/usr/share/tinapple-service-infrastructure"
}
```

### 2. `/mnt/shared/projects/tinapple/tinapple-service-infrastructure/tinapple-service-infrastructure.install`
```bash
post_install() {
  systemctl enable prometheus.service >/dev/null 2>&1 || true
  systemctl enable grafana.service >/dev/null 2>&1 || true
  systemctl enable loki.service >/dev/null 2>&1 || true
  systemctl enable tempo.service >/dev/null 2>&1 || true
  systemctl enable alertmanager.service >/dev/null 2>&1 || true
}

post_upgrade() { post_install; }

pre_remove() {
  systemctl disable prometheus.service >/dev/null 2>&1 || true
  systemctl disable grafana.service >/dev/null 2>&1 || true
  systemctl disable loki.service >/dev/null 2>&1 || true
  systemctl disable tempo.service >/dev/null 2>&1 || true
  systemctl disable alertmanager.service >/dev/null 2>&1 || true
}
```

### 3. Systemd Units (in `systemd/`)

#### `/mnt/shared/projects/tinapple/tinapple-service-infrastructure/systemd/prometheus.service`
```ini
[Unit]
Description=Prometheus Monitoring System
Documentation=https://prometheus.io/docs/
After=network-online.target
Wants=network-online.target

[Service]
Type=exec
User=prometheus
Group=prometheus
ExecStart=/usr/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus \
  --web.console.libraries=/usr/share/prometheus/console_libraries \
  --web.console.templates=/usr/share/prometheus/consoles \
  --web.enable-lifecycle \
  --web.enable-admin-api
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
```

#### `/mnt/shared/projects/tinapple/tinapple-service-infrastructure/systemd/grafana.service`
```ini
[Unit]
Description=Grafana Visualization Server
Documentation=https://grafana.com/docs/
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
User=grafana
Group=grafana
ExecStart=/usr/bin/grafana-server \
  --config=/etc/grafana/grafana.ini \
  --homepath=/usr/share/grafana \
  cfg:default.paths.data=/var/lib/grafana \
  cfg:default.paths.logs=/var/log/grafana \
  cfg:default.paths.plugins=/var/lib/grafana/plugins
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
```

#### `/mnt/shared/projects/tinapple/tinapple-service-infrastructure/systemd/loki.service`
```ini
[Unit]
Description=Grafana Loki Log Aggregation
Documentation=https://grafana.com/docs/loki/
After=network-online.target
Wants=network-online.target

[Service]
Type=exec
User=loki
Group=loki
ExecStart=/usr/bin/loki -config.file=/etc/loki/loki.yaml
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
```

#### `/mnt/shared/projects/tinapple/tinapple-service-infrastructure/systemd/tempo.service`
```ini
[Unit]
Description=Grafana Tempo Distributed Tracing
Documentation=https://grafana.com/docs/tempo/
After=network-online.target
Wants=network-online.target

[Service]
Type=exec
User=tempo
Group=tempo
ExecStart=/usr/bin/tempo -config.file=/etc/tempo/tempo.yaml
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
```

#### `/mnt/shared/projects/tinapple/tinapple-service-infrastructure/systemd/alertmanager.service`
```ini
[Unit]
Description=Alertmanager Alert Routing & Deduplication
Documentation=https://prometheus.io/docs/alerting/latest/alertmanager/
After=network-online.target
Wants=network-online.target

[Service]
Type=exec
User=alertmanager
Group=alertmanager
ExecStart=/usr/bin/alertmanager \
  --config.file=/etc/alertmanager/alertmanager.yml \
  --storage.path=/var/lib/alertmanager \
  --web.external-url=http://localhost:9093
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
```

### 4. Config Templates (in `configs/`)

#### `/mnt/shared/projects/tinapple/tinapple-service-infrastructure/configs/prometheus/prometheus.yml.template`
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: '{{ .Hostname }}'
    environment: 'homelab'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - '/etc/prometheus/rules/*.yml'

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['localhost:8080']

  - job_name: 'services'
    static_configs:
      - targets: ['localhost:8088']  # tinapple-dash
      - targets: ['localhost:8080']  # qbittorrent
      - targets: ['localhost:8096']  # jellyfin
      - targets: ['localhost:8384']  # syncthing
      - targets: ['localhost:9090']  # prometheus
      - targets: ['localhost:3000']  # grafana
      - targets: ['localhost:9093']  # alertmanager
```

#### `/mnt/shared/projects/tinapple/tinapple-service-infrastructure/configs/grafana/datasources.yaml.template`
```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    url: http://localhost:9090
    access: proxy
    isDefault: true
    editable: false

  - name: Loki
    type: loki
    url: http://localhost:3100
    access: proxy
    editable: false

  - name: Tempo
    type: tempo
    url: http://localhost:3200
    access: proxy
    editable: false
```

#### `/mnt/shared/projects/tinapple/tinapple-service-infrastructure/configs/loki/loki.yaml.template`
```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /var/lib/loki
  storage:
    filesystem:
      chunks_directory: /var/lib/loki/chunks
      rules_directory: /var/lib/loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20
```

#### `/mnt/shared/projects/tinapple/tinapple-service-infrastructure/configs/tempo/tempo.yaml.template`
```yaml
server:
  http_listen_port: 3200
  grpc_listen_port: 9095

distributor:
  receivers:
    otlp:
      protocols:
        grpc:
        http:

ingester:
  trace_idle_period: 10s
  max_block_bytes: 1000000
  max_block_duration: 5m

compactor:
  compaction:
    block_retention: 1h
    compacted_block_retention: 10m

storage:
  trace:
    backend: local
    local:
      path: /var/lib/tempo/traces

query_frontend:
  search:
    duration_slo: 5s
    throughput_bytes_slo: 1.073741824e+09
```

#### `/mnt/shared/projects/tinapple/tinapple-service-infrastructure/configs/alertmanager/alertmanager.yml.template`
```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default'

receivers:
  - name: 'default'
    webhook_configs:
      - url: 'http://localhost:8088/api/v1/alerts'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'cluster']
```

## Verification
- `makepkg -sf` builds without errors
- All 5 services install and enable correctly
- Config templates render via `tinapple-config-generator`
- Prometheus scrapes all targets, Grafana datasources auto-provisioned
- Loki receives logs from systemd journal, Tempo receives traces
- Alertmanager routes alerts to tinapple-dash webhook