# Native routing, provisioning, and recovery

## NGINX

`tinapple-nginx.service` runs native NGINX, conflicting with the distribution
`nginx.service` so two masters cannot compete for port 80. Its pre-start runs
`tinapple-config-generator nginx-sync --no-reload`; this adopts the shipped main
configuration and backs up the original as `/etc/nginx/nginx.conf.pre-tinapple`.
The generated `/etc/nginx/conf.d/tinapple-services.conf` contains **server blocks**
for inclusion in the main configuration's `http` block.

The Hub always proxies to `127.0.0.1:8088`. The six core routes are:

| Path | App | Default upstream |
| --- | --- | --- |
| `/jellyfin/` | Jellyfin | 8096 |
| `/qbittorrent/` | qBittorrent | 8080 |
| `/suwayomi/` | Suwayomi | 4567 |
| `/files/` | FileBrowser | 8081 |
| `/navidrome/` | Navidrome | 4533 |
| `/vault/` | Vaultwarden | 8000 |

Routes are published only for installed packages with active systemd units.
Manifest `services.<id>.port` overrides the catalog's port. Live systemd state
controls route availability, including services manually started outside the Hub.
Install, uninstall, start, stop, and restart in the Hub synchronously refresh routes.
The reconcile timer also handles external state changes within 30 seconds.
The Hub supplies its full app catalog to the generator; it persists the supported
HTTP entries in `/var/lib/tinapple/nginx-catalog.json` for later boot/timer runs.
A newly installed system uses the six core defaults until the Hub supplies a catalog.
Database and game protocol ports are never treated as HTTP services.

Writes are serialized, atomically published, syntax checked, and restored on test
or reload failure. Unchanged configuration does not trigger reloads. SSE buffering
and caching are disabled; WebSocket Upgrade headers are forwarded.

For optional host-based routes, add e.g.:

```yaml
network:
  proxy_domains:
    - tinapple-server.local
    - example.ts.net
```

This generates exact hosts such as `jellyfin.tinapple-server.local`, **not DNS
records or TLS certificates**. Configure your own DNS aliases/wildcard records;
Tailscale MagicDNS does not automatically provide these child names. HTTPS and
Vaultwarden secure-context requirements still need suitable TLS termination.

Subpath prefixes are stripped before forwarding, as specified by the module API.
The proxy rewrites redirects/cookies and forwards `X-Forwarded-Prefix`; applications
that emit absolute asset/API URLs must also support/configure a matching external
base URL. Host-based routing is the compatible option for root-only applications.
Never disable application authentication/CSRF protections to work around routing.

## First boot

The service runs noninteractively with a five-minute deadline, skips live ISO
boots, and is gated by `/etc/tinapple/.provisioned`. It validates the YAML manifest,
sets the hostname, initializes machine identity, replaces image SSH host keys,
configures UFW before enabling it, and starts core services. Enrollment uses
`services.tailscale.auth_key` only when supplied; no key means no interactive
login. The key is passed through a mode-0600 temporary file and removed on exit.
It is never placed in an argv value or echoed into logs. Network enrollment is
bounded to 90 seconds.

The installer empties the target `/etc/machine-id` so PID 1 allocates a fresh ID
on the first boot; setup calls `systemd-machine-id-setup` to initialize/commit that
identity. It does not replace a running system's machine ID underneath D-Bus.
Golden images must likewise have an empty machine-id and no provisioned marker.
An intermediate identity marker prevents SSH key rotation on provisioning retries.
Completion is recorded only after every required step succeeds. Do not delete
these identity/completion markers just to change normal configuration.

```sh
tinapple-setup --dry-run
```

## Btrfs recovery contract

The supported installed layout is Btrfs root **@**, separate **@snapshots** mounted
at `/.snapshots`, and a separate mounted `/boot` (as created by the installer).
`/usr`, `/etc`, and `/var/lib/pacman` must remain inside @. Home, logs, cache, and
other separately mounted application data are not rolled back. Snapshots are not
backups; retain off-device backups for disk failures and application databases.

`tinapple-snapshot-boot init` registers the existing snapshots mount with Snapper
(or uses `snapper create-config` when it is absent). First boot invokes this too,
so installing packages inside an installer chroot does not leave the runtime
Snapper configuration uninitialized.

The pre-transaction hook covers **Install, Upgrade, and Remove**, creates a
read-only `pre-update-<timestamp>` snapshot, and creates a writable
`@tinapple-recovery-<id>` clone with an adjusted root fstab. It pins matching kernel,
initramfs, and microcode files under `/boot/tinapple-recovery/<id>/`, records
checksums, and publishes Limine/GRUB recovery entries. Booting a recovery entry
runs this isolated writable clone, preserving the original read-only snapshot.
GRUB must have its standard `custom.cfg` loader; Limine entries are synchronized
to the installer paths including `EFI/BOOT/limine.conf` and `EFI/limine/limine.conf`.
Unsupported layouts or missing boot artifacts fail the pre-hook with
`AbortOnFail`, before packages are changed. Non-Btrfs installations explicitly log
that updates have **no snapshot protection**, rather than pretending to protect them.

The post-hook creates a paired post snapshot, republishes recovery entries,
refreshes proxy routes, and records health and snapshot IDs in
`/var/lib/tinapple/maintenance/last-transaction.json`. Health failure is reported;
it does **not** initiate an unattended reboot or destructive rollback.

Recovery snapshots/clones/artifacts are intentionally pinned, with no automatic
cleanup. Monitor free space and remove old recovery sets deliberately after
verifying a newer one. An interrupted package transaction leaves the `transaction`
file in that directory; inspect its snapshot ID and pacman logs, finish/repair the
transaction, and archive/remove that state file before beginning another update.

```sh
tinapple-update-hook pre --dry-run
tinapple-rollback list --dry-run
tinapple-rollback list
tinapple-rollback diff                 # changed paths against latest recovery point
tinapple-rollback diff 42
# Boot live media or a recovery entry; mount the ORIGINAL @, @snapshots and /boot:
tinapple-rollback restore 42 --root /mnt --dry-run
tinapple-rollback restore 42 --root /mnt
```

Restore refuses the running root. It verifies snapshot and boot checksums, creates
a writable replacement, unmounts the offline target, renames the old @ to
`@tinapple-before-restore-<timestamp>`, and publishes the new @. It restores matching
kernel files and leaves reboot to the operator. A failed final boot-file copy
requires repair before reboot; the previous root, pinned boot files and recovery
entries remain available. Restoring is not a live `snapper undochange` operation.

## Health and verification

`tinapple-health-check` checks all SMART-discovered NVMe/SATA devices, Btrfs error
counters, root capacity, and the critical dashboard/NGINX/Tailscale/Docker units.
It atomically publishes `/var/run/tinapple/health.json`, including failures, and
returns nonzero for failed checks. The timer refreshes this report every five
minutes. The file is the interface for dashboard consumption.

```sh
make test-bash
make test-go
python3 scripts/test_provisioning_maintenance.py
# Optional isolated native integration (no host /etc or privileged ports changed):
cd tinapple-config-generator
NGINX_BINARY=/path/to/nginx go test -v ./routing
# On an installed appliance:
nginx -t -c /etc/nginx/nginx.conf
curl -IL http://localhost/
curl -N http://localhost/api/v1/system/telemetry/stream
```

Fixture tests cover provisioning retries, secret redaction, failed health checks,
failed snapshot preparation, boot-menu idempotence/checksums, dry runs and refusing
live restore. Native NGINX tests validate the shipped template, all six subpaths,
Hub forwarding and immediate SSE flushing. Actual reboot/restore behavior still
requires a disposable Btrfs VM with the installed bootloader; fixture tests are
not evidence of a completed machine boot or disk rollback.

References: [NGINX URI and buffering rules](https://nginx.org/en/docs/http/ngx_http_proxy_module.html),
[Snapper command semantics](https://snapper.io/manpages/snapper.html),
[Limine configuration](https://github.com/limine-bootloader/limine/blob/v12.x/CONFIG.md),
[Tailscale key-file authentication](https://tailscale.com/docs/reference/tailscale-cli/up).
