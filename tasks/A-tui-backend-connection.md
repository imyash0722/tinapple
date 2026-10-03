# Task A: TUI → Backend Connection (Critical)

## Context
- **TUI**: `/mnt/shared/projects/tinapple/tinapple-installer/tui/main.go` (bubbletea, 14 stages, currently FAKE simulation)
- **Backend**: `/mnt/shared/projects/tinapple/tinapple-installer/backend/lib/*.sh` (14 real modules)
- **Manifest**: `/etc/tinapple/manifest.yaml` (user answers from TUI)

## Task
Replace the fake `tea.Tick()` simulation in `main.go` with real backend execution.

## Current Fake Implementation (main.go:115-131)
```go
func advanceInstall(stageIndex int, dryRun bool) tea.Cmd {
    delay := 80 * time.Millisecond
    if dryRun { delay = 50 * time.Millisecond }
    return tea.Tick(delay, func(t time.Time) tea.Msg {
        if stageIndex >= len(installStages) {
            return installProgressMsg{done: true}
        }
        s := installStages[stageIndex]
        return installProgressMsg{
            stageIndex: stageIndex,
            stageID:    s.id,
            desc:       s.desc,
        }
    })
}
```

## Requirements

### 1. Create Backend Runner Script
Create `/usr/lib/tinapple-installer/backend/run-stage.sh`:
```bash
#!/usr/bin/env bash
# /usr/lib/tinapple-installer/backend/run-stage.sh
# Runs a single backend stage with manifest environment

set -euo pipefail

STAGE="$1"
[[ -z "$STAGE" ]] && { echo "Usage: $0 <stage>"; exit 1; }

# Source common functions
source /usr/lib/tinapple-installer/backend/lib/common.sh

# Source the specific stage module
STAGE_FILE="/usr/lib/tinapple-installer/backend/lib/${STAGE}.sh"
[[ -f "$STAGE_FILE" ]] || { echo "Stage file not found: $STAGE_FILE"; exit 1; }
source "$STAGE_FILE"

# Call the stage function: tinapple_<stage>
FUNC="tinapple_${STAGE}"
if declare -f "$FUNC" > /dev/null; then
    log "Starting stage: $STAGE"
    "$FUNC"
    log "Completed stage: $STAGE"
else
    echo "Function $FUNC not found in $STAGE_FILE"
    exit 1
fi
```

### 2. Replace Fake `advanceInstall` in main.go
Replace the fake `tea.Tick()` loop with real backend execution:

```go
func (m *model) startRealInstall() tea.Cmd {
    m.installing = true
    m.installOutput = "Starting real installation...\n"
    m.stageIndex = 0
    return m.runNextStage()
}

func (m *model) runNextStage() tea.Cmd {
    if m.stageIndex >= len(m.installStages) {
        return m.installComplete()
    }
    
    stage := m.installStages[m.stageIndex]
    m.installOutput += fmt.Sprintf("@@STEP %s\n", stage.id)
    
    // Build environment from manifest answers
    env := m.buildStageEnv()
    
    return tea.ExecProcess(
        exec.Command("/usr/lib/tinapple-installer/backend/run-stage.sh", stage.id),
        func(err error) tea.Msg {
            if err != nil {
                return installStageErrorMsg{stage: stage.id, err: err}
            }
            return installStageDoneMsg{stage: stage.id}
        },
        tea.WithEnvironment(env),
    )
}

func (m *model) buildStageEnv() []string {
    env := os.Environ()
    for k, v := range m.answers {
        env = append(env, fmt.Sprintf("TINAPPLE_%s=%s", strings.ToUpper(k), v))
    }
    // Add dry-run flag
    if m.dryRun {
        env = append(env, "TINAPPLE_DRYRUN=1")
    }
    return env
}

func (m *model) installComplete() tea.Cmd {
    m.installing = false
    m.installOutput += "\n@@DONE Installation complete! Reboot to start tinapple.\n"
    return tea.Quit
}
```

### 3. Update Message Handling
Add new message types:
```go
type installStageDoneMsg struct{ stage string }
type installStageErrorMsg struct{ stage string; err error }

func (m *model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
    switch msg := msg.(type) {
    case installStageDoneMsg:
        m.installOutput += fmt.Sprintf("@@DONE %s\n", msg.stage)
        m.stageIndex++
        return m.runNextStage()
    case installStageErrorMsg:
        m.installOutput += fmt.Sprintf("@@ERROR %s: %v\n", msg.stage, msg.err)
        m.installing = false
        return nil
    }
}
```

## Files to Modify
- `/mnt/shared/projects/tinapple/tinapple-installer/tui/main.go` - Replace fake installer with real backend calls
- Create `/mnt/shared/projects/tinapple/tinapple-installer/backend/run-stage.sh` (new file)

## Verification
- `go build` compiles without errors
- `make test` passes (7 tests)
- Dry-run mode (`TINAPPLE_DRYRUN=1`) prints commands without executing
- Real installation works when run with proper permissions