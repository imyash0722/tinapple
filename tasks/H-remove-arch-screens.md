# Task H: Remove Arch Linux Welcome/Timezone Screens

## Context
The current installer shows:
1. "Welcome to Arch Linux" screen
4. Timezone selection screen

These should be removed - Ryoku installer doesn't have them. The installer should be streamlined like Ryoku: keyboard → network → disk → user → profiles → confirm → install.

## Current Flow (to be simplified)
```
Welcome → Keyboard → Network → Timezone → Disk → FS → LUKS → User → Hardware → Kernel → Profile → Drivers → Confirm → Install
```

## Target Flow (Ryoku-style, streamlined)
```
Keyboard → Network → Disk → FS → LUKS → User → Hardware → Kernel → Profile → Drivers → Confirm → Install
```

## Files to Modify

### 1. `/mnt/shared/projects/tinapple/tinapple-installer/tui/main.go`

#### Remove Timezone Step
- Remove `stepTimezone` from step constants
- Remove timezone selection from step flow
- Remove timezone from manifest answers

#### Remove "Welcome to Arch Linux" Screen
- Remove `stepWelcome` or repurpose it to just show branding briefly
- Skip directly to Keyboard selection

#### Update Step Flow
Current steps (15): welcome → keyboard → network → timezone → bootloader-detect → disk → fs-select → luks → filesystem → mount → mirrors → pacstrap → cachyos-repo → configure → deploy → network → drivers → bootloader-install → snapshots → hooks-restore

Target (12 steps):
keyboard → network → bootloader-detect → disk → fs-select → luks → filesystem → mount → pacstrap → cachyos-repo → configure → deploy → network → drivers → bootloader-install → snapshots → hooks-restore

Actually, let's keep it simpler like Ryoku:
1. keyboard
2. network  
3. disk
3. filesystem
4. luks
5. user
6. hardware
7. kernel
8. profile
9. drivers
9. confirm
10. install

### 2. Update TUI Model
- Remove `stepWelcome` and `stepTimezone` from step enum
- Remove timezone from answers map
- Update step navigation logic

### 3. Update Tests
- Update `TestFullNavigationFlow` expected steps
- Remove timezone-related tests

## Files to Modify
1. `/mnt/shared/projects/tinapple/tinapple-installer/tui/main.go` - Main TUI logic
2. `/mnt/shared/projects/tinapple/tinapple-installer/tui/main_test.go` - Tests
3. `/mnt/shared/projects/tinapple/tinapple-installer/backend/lib/configure.sh` - Remove timezone handling

## Verification
- `make test` passes
- Flow skips directly from network → disk (no timezone)
- No "Welcome to Arch Linux" screen
- No timezone selection prompt

## Run Command
```bash
agy --dangerously-skip-permissions -p "$(cat /mnt/shared/projects/tinapple/tasks/H-remove-arch-screens.md)"
```