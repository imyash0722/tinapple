# Task: tinapple-service-databases

## Status: ✅ Done

## Goal
Implement database servers package: PostgreSQL, MariaDB, Redis, MongoDB, InfluxDB

## Files to Create

### 1. `/mnt/shared/projects/tinapple/tinapple-service-databases/PKGBUILD`
```bash
# Maintainer: tinapple Project <https://github.com/tinapple/tinapple-arch>
pkgname=tinapple-service-databases
pkgver=0.0.1
pkgrel=1
pkgdesc="Database servers for tinapple (postgresql, mariadb, redis, mongodb, influxdb)"
arch=(any)
url="https://github.com/tinapple/tinapple-arch"
license=(MIT)
depends=('postgresql' 'mariadb' 'redis' 'mongodb' 'influxdb')
install=tinapple-service-databases.install
source=()
sha256sums=()

package() {
  install -dm755 "$pkgdir/usr/share/tinapple-service-databases"
}
```

### 2. `/mnt/shared/projects/tinapple/tinapple-service-databases/tinapple-service-databases.install`
```bash
post_install() {
  systemctl enable postgresql.service >/dev/null 2>&1 || true
  systemctl enable mariadb.service >/dev/null 2>&1 || true
  systemctl enable redis.service >/dev/null 2>&1 || true
  systemctl enable mongod.service >/dev/null 2>&1 || true
  systemctl enable influxdb.service >/dev/null 2>&1 || true

  # Initialize databases on first install
  /usr/bin/postgresql-setup --initdb >/dev/null 2>&1 || true
  /usr/bin/mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql >/dev/null 2>&1 || true
}

post_upgrade() { post_install; }

pre_remove() {
  systemctl disable postgresql.service >/dev/null 2>&1 || true
  systemctl disable mariadb.service >/dev/null 2>&1 || true
  systemctl disable redis.service >/dev/null 2>&1 || true
  systemctl disable mongod.service >/dev/null 2>&1 || true
  systemctl disable influxdb.service >/dev/null 2>&1 || true
}
```

### 3. Systemd Units (in `systemd/`)

#### `/mnt/shared/projects/tinapple/tinapple-service-databases/systemd/postgresql.service`
```ini
[Unit]
Description=PostgreSQL Database Server
Documentation=https://www.postgresql.org/docs/
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
User=postgres
Group=postgres
ExecStart=/usr/bin/postgres -D /var/lib/postgres/data
ExecReload=/bin/kill -HUP $MAINPID
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

#### `/mnt/shared/projects/tinapple/tinapple-service-databases/systemd/mariadb.service`
```ini
[Unit]
Description=MariaDB Database Server
Documentation=https://mariadb.org/documentation/
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
User=mysql
Group=mysql
ExecStartPre=/usr/bin/mariadb-prepare-db-dir mariadb.service
ExecStart=/usr/bin/mariadbd --basedir=/usr --datadir=/var/lib/mysql --user=mysql
ExecReload=/bin/kill -HUP $MAINPID
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

#### `/mnt/shared/projects/tinapple/tinapple-service-databases/systemd/redis.service`
```ini
[Unit]
Description=Redis In-Memory Data Store
Documentation=https://redis.io/documentation
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
User=redis
Group=redis
ExecStart=/usr/bin/redis-server /etc/redis/redis.conf
ExecStop=/usr/bin/redis-cli shutdown
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

#### `/mnt/shared/projects/tinapple/tinapple-service-databases/systemd/mongod.service`
```ini
[Unit]
Description=MongoDB Database Server
Documentation=https://docs.mongodb.com/
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
User=mongodb
Group=mongodb
ExecStart=/usr/bin/mongod --config /etc/mongodb.conf
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

#### `/mnt/shared/projects/tinapple/tinapple-service-databases/systemd/influxdb.service`
```ini
[Unit]
Description=InfluxDB Time Series Database
Documentation=https://docs.influxdata.com/
After=network-online.target
Wants=network-online.target

[Service]
Type=exec
User=influxdb
Group=influxdb
ExecStart=/usr/bin/influxd -config /etc/influxdb/influxdb.conf
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

#### `/mnt/shared/projects/tinapple/tinapple-service-databases/configs/postgresql/postgresql.conf.template`
```text
listen_addresses = 'localhost'
port = 5432
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
wal_level = replica
max_wal_senders = 3
wal_keep_segments = 32
hot_standby = on
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_min_duration_statement = 1000
```

#### `/mnt/shared/projects/tinapple/tinapple-service-databases/configs/mariadb/my.cnf.template`
```ini
[mysqld]
bind-address = 127.0.0.1
port = 3306
datadir = /var/lib/mysql
socket = /run/mysqld/mysqld.sock
pid-file = /run/mysqld/mysqld.pid
log-error = /var/log/mariadb/mariadb.log
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
max_connections = 100
```

#### `/mnt/shared/projects/tinapple/tinapple-service-databases/configs/redis/redis.conf.template`
```text
bind 127.0.0.1
port 6379
daemonize no
supervised systemd
databases 16
save 900 1
save 300 10
save 60 10000
rdbcompression yes
rdbchecksum yes
dir /var/lib/redis
maxmemory 256mb
maxmemory-policy allkeys-lru
```

#### `/mnt/shared/projects/tinapple/tinapple-service-databases/configs/mongodb/mongod.conf.template`
```yaml
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
systemLog:
  destination: file
  path: /var/log/mongodb/mongod.log
  logAppend: true
net:
  port: 27017
  bindIp: 127.0.0.1
processManagement:
  fork: false
  pidFilePath: /run/mongodb/mongod.pid
security:
  authorization: disabled
```

#### `/mnt/shared/projects/tinapple/tinapple-service-databases/configs/influxdb/influxdb.conf.template`
```ini
[meta]
  dir = "/var/lib/influxdb/meta"
  retention-autocreate = true

[data]
  dir = "/var/lib/influxdb/data"
  wal-dir = "/var/lib/influxdb/wal"
  series-id-set-cache-size = 100
  index-version = "tsi1"

[http]
  bind-address = ":8086"
  auth-enabled = false
  log-enabled = true
  write-tracing = false
  pprof-enabled = true
  https-enabled = false

[data]
  index-version = "tsi1"
  max-values-per-tag = 100000
  max-series-per-database = 1000000
```

## Verification
- `makepkg -sf` builds without errors
- All 5 services install and enable correctly
- Databases initialize on first install (postgresql-setup, mariadb-install-db)
- Config templates render via `tinapple-config-generator`
- Services start and accept connections on localhost ports