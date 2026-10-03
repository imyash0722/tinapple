# Task: tinapple-service-backups (Complete)

## Status: ✅ Complete

## Goal
Complete the backup services package with all systemd units and config templates.

## Files to Create

### 1. `/mnt/shared/projects/tinapple/tinapple-service-backups/systemd/syncthing@.service`
```ini
[Unit]
Description=Syncthing - Continuous File Synchronization (%i)
Documentation=https://syncthing.net/
After=network-online.target
Wants=network-online.target

[Service]
Type=exec
User=%i
Group=%i
ExecStart=/usr/bin/syncthing -no-browser -home=/var/lib/syncthing/%i
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

### 2. `/mnt/shared/projects/tinapple/tinapple-service-backups/systemd/restic-backup.service`
```ini
[Unit]
Description=Restic Backup
Documentation=https://restic.net/
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=root
EnvironmentFile=/etc/restic/restic.env
ExecStart=/usr/bin/restic -r ${RESTIC_REPOSITORY} backup ${RESTIC_PATHS} --exclude-file=${RESTIC_EXCLUDE_FILE}
StandardOutput=journal
StandardError=journal
```

### 3. `/mnt/shared/projects/tinapple/tinapple-service-backups/systemd/restic-backup.timer`
```ini
[Unit]
Description=Run Restic backup daily

[Timer]
OnCalendar=daily
Persistent=true
RandomizedDelaySec=1h

[Install]
WantedBy=timers.target
```

### 4. `/mnt/shared/projects/tinapple/tinapple-service-backups/systemd/borg-backup.service`
```ini
[Unit]
Description=Borg Backup
Documentation=https://borgbackup.readthedocs.io/
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=root
EnvironmentFile=/etc/borg/borg.env
ExecStart=/usr/bin/borg create --compression lz4 --exclude-from /etc/borg/exclude.txt ${BORG_REPOSITORY}::{hostname}-{now:%Y-%m-%dT%H:%M:%S} ${BORG_PATHS}
StandardOutput=journal
StandardError=journal
```

### 4. `/mnt/shared/projects/tinapple/tinapple-service-backups/systemd/borg-backup.timer`
```ini
[Unit]
Description=Run Borg backup daily

[Timer]
OnCalendar=daily
Persistent=true
RandomizedDelaySec=1h

[Install]
WantedBy=timers.target
```

### 5. `/mnt/shared/projects/tinapple/tinapple-service-backups/systemd/rclone-sync.service`
```ini
[Unit]
Description=Rclone Cloud Sync
Documentation=https://rclone.org/
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=root
EnvironmentFile=/etc/rclone/rclone.env
ExecStart=/usr/bin/rclone sync ${RCLONE_SOURCE} ${RCLONE_DEST} --config /etc/rclone/rclone.conf --progress
StandardOutput=journal
StandardError=journal
```

### 5. `/mnt/shared/projects/tinapple/tinapple-service-backups/systemd/rclone-sync.timer`
```ini
[Unit]
Description=Run Rclone sync every 6 hours

[Timer]
OnCalendar=*:0/6
Persistent=true
RandomizedDelaySec=30m

[Install]
WantedBy=timers.target
```

### 6. `/mnt/shared/projects/tinapple/tinapple-service-backups/systemd/snapraid-sync.service`
```ini
[Unit]
Description=SnapRAID Sync & Scrub
Documentation=https://www.snapraid.it/
After=local-fs.target

[Service]
Type=oneshot
User=root
ExecStart=/usr/bin/snapraid sync
ExecStartPost=/usr/bin/snapraid scrub -p 10
StandardOutput=journal
StandardError=journal
```

### 6. `/mnt/shared/projects/tinapple/tinapple-service-backups/systemd/snapraid-sync.timer`
```ini
[Unit]
Description=Run SnapRAID sync weekly

[Timer]
OnCalendar=weekly
Persistent=true
RandomizedDelaySec=2h

[Install]
WantedBy=timers.target
```

### 7. Config Templates (in `configs/`)

#### `/mnt/shared/projects/tinapple/tinapple-service-backups/configs/restic/restic.env.template`
```text
RESTIC_REPOSITORY=s3:https://s3.amazonaws.com/bucket/path
RESTIC_PASSWORD=changeme
RESTIC_PATHS=/home /etc /var/lib
RESTIC_EXCLUDE_FILE=/etc/restic/exclude.txt
```

#### `/mnt/shared/projects/tinapple/tinapple-service-backups/configs/restic/exclude.txt.template`
```text
*.tmp
*.log
*.cache
__pycache__/
node_modules/
.git/
```

#### `/mnt/shared/projects/tinapple/tinapple-service-backups/configs/borg/borg.env.template`
```text
BORG_REPOSITORY=ssh://user@backup-server/./borg-repo
BORG_PASSPHRASE=changeme
BORG_PATHS=/home /etc /var/lib
```

#### `/mnt/shared/projects/tinapple/tinapple-service-backups/configs/borg/exclude.txt.template`
```text
*.tmp
*.log
*.cache
__pycache__/
node_modules/
.git/
```

#### `/mnt/shared/projects/tinapple/tinapple-service-backups/configs/rclone/rclone.env.template`
```text
RCLONE_SOURCE=/home
RCLONE_DEST=remote:bucket/path
RCLONE_CONFIG=/etc/rclone/rclone.conf
```

#### `/mnt/shared/projects/tinapple/tinapple-service-backups/configs/rclone/rclone.conf.template`
```ini
[remote]
type = s3
provider = AWS
env_auth = false
access_key_id = YOUR_ACCESS_KEY
secret_access_key = YOUR_SECRET_KEY
region = us-east-1
```

#### `/mnt/shared/projects/tinapple/tinapple-service-backups/configs/snapraid/snapraid.conf.template`
```text
parity /mnt/parity/snapraid.parity
content /mnt/data1/snapraid.content
content /mnt/data2/snapraid.content
data /mnt/data1/
data /mnt/data2/
```

## Verification
- `makepkg -sf` builds without errors
- All timers and services install and enable correctly
- Config templates render via `tinapple-config-generator`
- Timers trigger correctly (daily/weekly/6-hourly)
- Backup services execute without errors