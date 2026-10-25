# Building and validating the live ISO

From the repository root, run `sudo tinapple-installer/iso/build.sh`.
The wrapper builds the React Hub, dashboard daemon, terminal installer and store,
stages the backend and wallpapers, then runs mkarchiso. npm dependencies must
already be installed (`cd tinapple-hub && npm ci`). Required host tools include
Go, Node/npm, archiso, rsync and the Arch/CachyOS keyrings and mirrorlists.
The local package repository is resolved relative to this checkout and copied
to a private, freshly indexed build repository to avoid stale archive metadata.

The result is `out/tinapple-os-v0.0.1-x86_64.iso` with a SHA256 checksum;
a second copy is kept in `tinapple-installer/iso/out/`. A signature is created
only when the configured GPG signing key is available. Failed work directories
are preserved under `/var/tmp` for diagnosis. `WORK_DIR` chooses a build tree;
reuse it only for an unchanged profile, since mkarchiso caches completed stages.
`STAGE_ARTIFACTS=0` skips rebuilding already staged application artifacts.

The live Hub starts on port 8088 independently of the graphical session.
Niri opens the Welcome page on tty1; Ctrl+Alt+F2 opens the terminal installer.
Add `tinapple.headless` to the kernel command line to skip Niri.

Validate real firmware boot without exposing a host disk:

```sh
python3 scripts/validate-live-iso.py out/tinapple-os-v0.0.1-x86_64.iso
python3 scripts/qemu_installer_matrix.py --all --mode dryrun --parallel 4
make test-go
make test-bash
```

The boot check starts BIOS and UEFI guests sequentially, polls HTTP 200 from the
system API, and checks the Hub page and bundled wallpaper. It saves serial logs,
QEMU logs and API responses in `out/boot-validation/`, uses temporary loopback
ports, and always terminates its guests. UEFI requires edk2's OVMF 4 MiB firmware.
The installer dry-run matrix checks stage logic; it does not install to a disk.

For interactive testing use `HUB_PORT=18088 SSH_PORT=12222 scripts/run-vm.sh
--uefi` (or `--bios`). `DISK_PATH` selects an isolated persistent virtual disk.
