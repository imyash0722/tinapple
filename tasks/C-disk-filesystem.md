# Task C: Disk Partitioning & Filesystem (Backend Execution)

## Context
Backend modules exist but never called. Need to wire them up for real execution.

## Files to Modify/Verify
- `/mnt/shared/projects/tinapple/tinapple-installer/backend/lib/disk.sh`
- `/mnt/shared/projects/tinapple/tinapple-installer/backend/lib/filesystem.sh`
- `/mnt/shared/projects/tinapple/tinapple-installer/backend/lib/mount.sh`

## Requirements

### 1. disk.sh - Disk Partitioning
**Environment Variables Expected:**
- `TINAPPLE_DISK` - Target disk (e.g., `/dev/vda`, `/dev/sda`, `/dev/nvme0n1`)
- `TINAPPLE_FIRMWARE` - `uefi` or `bios`
- `TINAPPLE_DISK_STRATEGY` - `auto` or `custom`
- `TINAPPLE_SWAP_GIB` - Swap size in GiB (0 = no swap)
- `TINAPPLE_ESP_GIB` - ESP size in GiB (default 1)
- `TINAPPLE_LUKS` - `yes` or `no`
- `TINAPPLE_DRYRUN` - `1` for dry-run

**Requirements:**
- Auto-detect disk if not specified (`lsblk -d -o NAME,SIZE,TYPE,MODEL`)
- Support auto (whole disk) and custom layouts
- Handle BIOS (MBR) and UEFI (GPT) partitioning
- Create ESP (1GiB default, FAT32), swap (optional), root (rest)
- Use `sgdisk` for GPT, `sfdisk` for MBR
- Handle LUKS encryption if `TINAPPLE_LUKS=yes`

**Output:**
- Export partition paths: `TINAPPLE_PART_ESP`, `TINAPPLE_PART_SWAP`, `TINAPPLE_PART_ROOT`
- Export LUKS mapper: `TINAPPLE_LUKS_MAPPED` (if LUKS)

### 2. filesystem.sh - Filesystem Creation
**Environment Variables Expected:**
- `TINAPPLE_FS` - `ext4`, `xfs`, or `btrfs`
- `TINAPPLE_PART_ESP`, `TINAPPLE_PART_SWAP`, `TINAPPLE_PART_ROOT` (from disk.sh)
- `TINAPPLE_LUKS_MAPPED` (if LUKS)

**Requirements:**
- Format ESP as FAT32 (`mkfs.vfat -F32`)
- Format swap (`mkswap`)
- Format root:
  - ext4: `mkfs.ext4 -F -O 64bit,has_journal,extents,huge_file,flex_bg,metadata_csum,dir_index`
  - xfs: `mkfs.xfs -f`
  - btrfs: `mkfs.btrfs -f` + create subvolumes (@, @home, @snapshots, @var_log, @var_cache)
- Support Btrfs subvolumes (@, @home, @snapshots, @var_log, @var_cache)

### 3. mount.sh - Mount Target
**Requirements:**
- Mount root to `/mnt` (with correct options: `compress=zstd:3,noatime,space_cache=v2` for btrfs)
- Mount ESP to `/mnt/boot` or `/mnt/efi`
- Enable swap if configured (`swapon`)
- Create systemd mount units for additional partitions

## Environment Variables Contract
All stages receive manifest answers as `TINAPPLE_*` env vars:
```bash
TINAPPLE_DISK="/dev/vda"
TINAPPLE_FIRMWARE="uefi"
TINAPPLE_DISK_STRATEGY="auto"
TINAPPLE_FS="ext4"
TINAPPLE_SWAP_GIB="4"
TINAPPLE_ESP_GIB="1"
TINAPPLE_LUKS="no"
TINAPPLE_DRYRUN=""  # or "1"
```

## Deliverables
- Verified working `disk.sh`, `filesystem.sh`, `mount.sh`
- Tests pass with `TINAPPLE_DRYRUN=1`

## Verification
```bash
# Test dry-run
TINAPPLE_DISK=/dev/vda TINAPPLE_FIRMWARE=uefi TINAPPLE_DRYRUN=1 /usr/lib/tinapple-installer/backend/lib/disk.sh
TINAPPLE_DRYRUN=1 /usr/lib/tinapple-installer/backend/lib/filesystem.sh
TINAPPLE_DRYRUN=1 /mnt/shared/projects/tinapple/tinapple-installer/backend/lib/mount.sh
```

## Integration
Each stage must:
1. Source `/usr/lib/tinapple-installer/backend/lib/common.sh`
2. Export output variables for next stage
3. Return 0 on success, non-zero on failure
4. Print `@@STEP <stage>` on start, `@@DONE <stage>` on success
5. Respect `TINAPPLE_DRYRUN=1` (print commands without executing)