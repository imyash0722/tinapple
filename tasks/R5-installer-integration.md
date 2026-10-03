# Task R5: Installer Integration - Connect Chaddy Store to Installer

## Goal
Integrate the Chaddy Store and Settings into the main tinapple installer TUI, so users can access the app store and settings from within the installer.

## Files to Modify

### 1. Update Main Installer TUI (`/mnt/shared/projects/tinapple/tinapple-installer/tui/main.go`)

#### 1. Add Store/Settings Menu Items
In the profile selection step (stepProfile), add options to access the store and settings:

```go
// In stepProfile case, add new options
case stepProfile:
    m.choices = []string{
        "Select Service Profiles",
        "🏪 Open App Store (chaddy-store)",
        "⚙️  Open Settings (chaddy-settings)",
        "Continue to Confirm",
    }
```

Add new step constants:
```go
const (
    // ... existing steps ...
    stepStore      // App store
    stepSettings   // Settings hub
    stepConfirm
    stepInstall
    stepDone
)
```

Add case handlers:
```go
case stepStore:
    // Launch chaddy-store TUI
    return m.launchStore()
case stepSettings:
    // Launch settings TUI
    return m.launchSettings()
```

Add handler methods:
```go
func (m *model) launchStore() tea.Cmd {
    // Launch chaddy-store TUI as subprocess
    return tea.ExecProcess(
        exec.Command("/usr/local/bin/chaddy-store"),
        func(err error) tea.Msg {
            if err != nil {
                return installStageErrorMsg{stage: "store", err: err}
            }
            return installStageDoneMsg{stage: "store"}
        },
    )
}

func (m *model) launchSettings() tea.Cmd {
    // Launch settings TUI
    return tea.ExecProcess(
        exec.Command("/usr/local/bin/chaddy-settings"),
        func(err error) tea.Msg {
            if err != nil {
                return installStageErrorMsg{stage: "settings", err: err}
            }
            return installStageDoneMsg{stage: "settings"}
        },
    )
}
```

### 2. Update Install Stages
Add store and settings stages to the installation flow:

```go
var installStages = []stageInfo{
    {"preflight", "running pre-flight system checks..."},
    {"bootloader-detect", "detecting firmware type..."},
    {"partition", "partitioning target disk..."},
    {"fs-select", "validating filesystem..."},
    {"luks", "configuring disk encryption..."},
    {"filesystem", "formatting partitions..."},
    {"mount", "mounting filesystems..."},
    {"mirrors", "ranking mirrors..."},
    {"pacstrap", "installing base packages..."},
    {"cachyos-repo", "configuring CachyOS repos..."},
    {"configure", "configuring system..."},
    {"deploy", "deploying configs..."},
    {"store", "launching app store (optional)"},        // NEW
    {"settings", "configuring settings (optional)"},   // NEW
    {"network", "configuring network..."},
    {"drivers", "installing drivers..."},
    {"bootloader-install", "installing bootloader..."},
    {"snapshots", "configuring snapshots..."},
    {"hooks-restore", "restoring hooks..."},
    {"confirm", "confirming installation..."},
    {"install", "running installation..."},
    {"done", "installation complete"},
}
```

### 2. Update Manifest
Add chaddy-store and chaddy-settings to base profile packages in `packages.x86_64`:
```
# Installer tools
chaddy-store
chaddy-settings
```

### 2. Update TUI to Launch External Binaries
In `main.go`, add methods to launch external binaries:

```go
func (m *model) launchStore() tea.Cmd {
    return tea.ExecProcess(
        exec.Command("/usr/local/bin/chaddy-store"),
        func(err error) tea.Msg {
            if err != nil {
                return installStageErrorMsg{stage: "store", err: err}
            }
            return installStageDoneMsg{stage: "store"}
        },
    )
}

func (m *model) launchSettings() tea.Cmd {
    return tea.ExecProcess(
        exec.Command("/usr/local/bin/chaddy-settings"),
        func(err error) tea.Msg {
            if err != nil {
                return installStageErrorMsg{stage: "settings", err: err}
            }
            return installStageDoneMsg{stage: "settings"}
        },
    )
}
```

### 3. Update Installer Binary
Ensure the installer binary includes the new stages and can launch external binaries.

### 3. Update Bootstrap Script
**File:** `/mnt/shared/projects/tinapple/tinapple-installer/bootstrap/install.sh`

Add chaddy-store and chaddy-settings to the installation:
```bash
# In post_install function:
say "Installing Chaddy Store & Settings..."
pacman -S --noconfirm chaddy-store chaddy-settings 2>/dev/null || warn "Failed to install chaddy-store/settings"
```

### 4. Update Package Lists
Add to `packages.x86_64`:
```
# Installer tools
chaddy-store
chaddy-settings
```

## Verification
```bash
# Test integration
cd /mnt/shared/projects/tinapple/tinapple-installer/tui
go test -v ./...

# Build and test
cd /mnt/shared/projects/tinapple
make build
make test

# Verify binaries exist
ls -la /usr/local/bin/chaddy-store /usr/local/bin/chaddy-settings
```

## Integration Test
```bash
# 1. Build everything
make build

# 2. Run installer TUI
./bin/tinapple-tui

# 3. Navigate to profile step
# 4. Select "Open App Store" - should launch chaddy-store TUI
# 5. Select "Open Settings" - should launch settings TUI
# 5. Complete installation
# 6. Verify chaddy-store and chaddy-settings installed on target
```
EOF