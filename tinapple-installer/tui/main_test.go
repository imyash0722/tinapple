package main

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
	"testing"

	tea "github.com/charmbracelet/bubbletea"
)

func TestInitialModel(t *testing.T) {
	os.Setenv("TINAPPLE_DRYRUN", "1")
	defer os.Unsetenv("TINAPPLE_DRYRUN")

	m := initialModel()
	if m.step != stepKeyboard {
		t.Fatalf("expected initial step %d (stepKeyboard), got %d", stepKeyboard, m.step)
	}
	if !m.dryRun {
		t.Fatalf("expected dryRun to be true with TINAPPLE_DRYRUN=1")
	}
	if m.answers["hostname"] != "tinapple" {
		t.Errorf("expected default hostname 'tinapple', got '%s'", m.answers["hostname"])
	}
	if m.answers["username"] != "tinapple" {
		t.Errorf("expected default username 'tinapple', got '%s'", m.answers["username"])
	}
}

func TestCursorMovement(t *testing.T) {
	m := initialModel()
	if len(m.choices) == 0 {
		t.Fatalf("expected non-empty choices at stepKeyboard")
	}

	// Move down
	mModel, _ := m.Update(tea.KeyMsg{Type: tea.KeyDown})
	m = mModel.(model)
	if m.cursor != 1 {
		t.Errorf("expected cursor to be 1, got %d", m.cursor)
	}

	// Move up
	mModel, _ = m.Update(tea.KeyMsg{Type: tea.KeyUp})
	m = mModel.(model)
	if m.cursor != 0 {
		t.Errorf("expected cursor to be 0, got %d", m.cursor)
	}

	// Move up past 0 (should stay at 0)
	mModel, _ = m.Update(tea.KeyMsg{Type: tea.KeyUp})
	m = mModel.(model)
	if m.cursor != 0 {
		t.Errorf("expected cursor to remain at 0, got %d", m.cursor)
	}
}

func TestFullNavigationFlow(t *testing.T) {
	m := initialModel()
	m.dryRun = true

	expectedSteps := []int{
		stepKeyboard,
		stepNetwork,
		stepBootloader,
		stepDisk,
		stepFilesystem,
		stepLUKS,
		stepUser,
		stepHardware,
		stepKernel,
		stepProfile,
		stepDrivers,
		stepConfirm,
		stepInstall,
	}

	for i, expected := range expectedSteps {
		if m.step != expected {
			t.Fatalf("at iteration %d, expected step %d, got %d", i, expected, m.step)
		}

		if m.step == stepProfile {
			// Test toggling profile with space
			m.cursor = 0
			m.toggleChoice()
			m.toggleChoice() // toggle back
		}

		mModel, _ := m.Update(tea.KeyMsg{Type: tea.KeyEnter})
		m = mModel.(model)
	}

	if m.step != stepInstall {
		t.Fatalf("expected step to be stepInstall (%d), got %d", stepInstall, m.step)
	}
	if !m.installing {
		t.Fatalf("expected m.installing to be true")
	}
}

func TestNoArchWelcomeOrTimezoneScreens(t *testing.T) {
	m := initialModel()
	m.dryRun = true

	// Verify initial step is stepKeyboard, skipping any welcome screen
	if m.step != stepKeyboard {
		t.Fatalf("expected initial step to be stepKeyboard (0), got %d", m.step)
	}

	// Verify no "Welcome to Arch Linux" or timezone prompts across the entire flow
	for step := 0; step < stepInstall; step++ {
		view := m.View()
		if strings.Contains(strings.ToLower(view), "welcome to arch linux") {
			t.Fatalf("step %d view contains 'Welcome to Arch Linux'", m.step)
		}
		if strings.Contains(strings.ToLower(view), "timezone") || strings.Contains(strings.ToLower(view), "time zone") {
			t.Fatalf("step %d view contains timezone prompt: %s", m.step, view)
		}

		if _, hasTimezone := m.answers["timezone"]; hasTimezone {
			t.Fatalf("answers contains timezone key at step %d", m.step)
		}

		mModel, _ := m.Update(tea.KeyMsg{Type: tea.KeyEnter})
		m = mModel.(model)
	}

	manifest := m.generateManifest()
	if strings.Contains(strings.ToLower(manifest), "timezone") {
		t.Fatalf("generated manifest should not contain timezone: %s", manifest)
	}
}

func TestMultiChoiceToggle(t *testing.T) {
	m := initialModel()
	m.choices = []string{"base", "media", "databases"}
	m.cursor = 1
	m.selected = make(map[string]bool)

	m.toggleChoice()
	if !m.selected["media"] {
		t.Fatalf("expected 'media' to be selected")
	}

	m.toggleChoice()
	if m.selected["media"] {
		t.Fatalf("expected 'media' to be unselected")
	}
}

func TestInstallProgressAndCompletion(t *testing.T) {
	m := initialModel()
	m.step = stepInstall
	m.installing = true
	m.dryRun = true

	// Simulate all progress stages
	for i := 0; i < len(installStages); i++ {
		msg := installProgressMsg{
			stageIndex: i,
			stageID:    installStages[i].id,
			desc:       installStages[i].desc,
		}
		mModel, _ := m.Update(msg)
		m = mModel.(model)
		if m.progress <= 0 {
			t.Errorf("expected positive progress at stage %d, got %f", i, m.progress)
		}
	}

	// Completion message
	doneMsg := installProgressMsg{done: true}
	mModel, _ := m.Update(doneMsg)
	m = mModel.(model)

	if m.installing {
		t.Errorf("expected installing to be false on done")
	}
	if m.step != stepDone {
		t.Errorf("expected step to be stepDone (%d), got %d", stepDone, m.step)
	}
	if m.progress != 1.0 {
		t.Errorf("expected progress 1.0, got %f", m.progress)
	}
}

func TestViewRendering(t *testing.T) {
	m := initialModel()
	view := m.View()
	t.Logf("\n--- INITIAL VIEW ---\n%s\n--------------------\n", view)
	if !strings.Contains(view, "Tinapple Installer") {
		t.Errorf("expected title in view: %s", view)
	}
	if !strings.Contains(view, "Select Keyboard Layout") {
		t.Errorf("expected keyboard layout in view: %s", view)
	}

	m.step = stepInstall
	m.installing = true
	m.progress = 0.5
	m.installOutput = "Testing install..."
	view = m.View()
	if !strings.Contains(view, "Installing... 50%") {
		t.Errorf("expected installing progress in view: %s", view)
	}

	m.installing = false
	m.step = stepDone
	view = m.View()
	if !strings.Contains(view, "Installation complete") {
		t.Errorf("expected complete message in view: %s", view)
	}

	m.err = "fatal disk error"
	view = m.View()
	if !strings.Contains(view, "fatal disk error") {
		t.Errorf("expected error message in view: %s", view)
	}
}

func TestGenerateManifest(t *testing.T) {
	m := initialModel()
	m.answers["hostname"] = "custom-node"
	m.answers["kernel_profile"] = "hardened"
	m.answers["filesystem"] = "btrfs"
	m.answers["bootloader"] = "limine"
	m.selected["base"] = true
	m.selected["databases"] = true

	manifest := m.generateManifest()
	if !strings.Contains(manifest, "hostname: custom-node") {
		t.Errorf("manifest missing hostname: %s", manifest)
	}
	if !strings.Contains(manifest, "kernel_profile: hardened") {
		t.Errorf("manifest missing kernel_profile: %s", manifest)
	}
	if !strings.Contains(manifest, "filesystem: btrfs") {
		t.Errorf("manifest missing filesystem: %s", manifest)
	}
	if !strings.Contains(manifest, "bootloader: limine") {
		t.Errorf("manifest missing bootloader: %s", manifest)
	}
	if !strings.Contains(manifest, "- base") || !strings.Contains(manifest, "- databases") {
		t.Errorf("manifest missing selected profiles: %s", manifest)
	}
}

func TestTinappleTheming(t *testing.T) {
	m := initialModel()

	// 1. Initial screen displays Tinapple title
	view := m.View()
	if !strings.Contains(view, "Tinapple Installer") {
		t.Errorf("initial view should display Tinapple title, got: %s", view)
	}
	if !strings.Contains(view, "navigate") || !strings.Contains(view, "quit/back") {
		t.Errorf("initial view should display keybind hints bar, got: %s", view)
	}

	// 2. Keybinds rendering
	keybinds := m.renderKeybinds()
	if !strings.Contains(keybinds, "↑/↓") || !strings.Contains(keybinds, "Enter") {
		t.Errorf("renderKeybinds missing standard keys: %s", keybinds)
	}

	// 3. Progress bar gradient rendering
	bar := renderProgressBar(0.5, 20)
	if !strings.Contains(bar, "█") || !strings.Contains(bar, "░") {
		t.Errorf("renderProgressBar should contain filled and unfilled blocks: %s", bar)
	}

	// 4. Multi-choice status badges
	choices := []string{"base", "databases"}
	selected := map[string]bool{"base": true}
	multiView := renderMultiChoices(choices, selected, 0)
	if !strings.Contains(multiView, "ENABLED") {
		t.Errorf("renderMultiChoices should contain ENABLED badge: %s", multiView)
	}
	if !strings.Contains(multiView, "DISABLED") {
		t.Errorf("renderMultiChoices should contain DISABLED badge: %s", multiView)
	}

	// 5. Choices rendering with cursor indicator
	singleView := renderChoices([]string{"us", "uk"}, 0)
	if !strings.Contains(singleView, "▶") {
		t.Errorf("renderChoices should show cursor indicator: %s", singleView)
	}
}

func TestRealInstallStageMessages(t *testing.T) {
	m := initialModel()
	m.step = stepInstall
	m.installing = true
	m.dryRun = true

	stages := m.getInstallStages()
	for i := 0; i < len(stages); i++ {
		msg := installStageDoneMsg{stage: stages[i].id}
		mModel, cmd := m.Update(msg)
		m = mModel.(model)

		if i < len(stages)-1 {
			if !m.installing {
				t.Fatalf("expected installing to remain true at stage %d", i)
			}
			if cmd == nil {
				t.Fatalf("expected next stage cmd at stage %d", i)
			}
		}
	}

	// After all stages complete, stageIndex should reach len(stages), step should be stepDone, installing false
	if m.installing {
		t.Errorf("expected installing to be false when all stages complete")
	}
	if m.step != stepDone {
		t.Errorf("expected step to be stepDone (%d), got %d", stepDone, m.step)
	}
	if m.progress != 1.0 {
		t.Errorf("expected progress 1.0, got %f", m.progress)
	}

	// Test error message handling
	m = initialModel()
	m.step = stepInstall
	m.installing = true
	errMsg := installStageErrorMsg{stage: "pacstrap", err: fmt.Errorf("network timeout")}
	mModel, _ := m.Update(errMsg)
	m = mModel.(model)

	if m.installing {
		t.Errorf("expected installing to be false on error")
	}
	if !strings.Contains(m.err, "network timeout") {
		t.Errorf("expected error message to contain 'network timeout', got: %s", m.err)
	}
	if !strings.Contains(m.installOutput, "@@ERROR pacstrap") {
		t.Errorf("expected installOutput to contain '@@ERROR pacstrap', got: %s", m.installOutput)
	}
}

func TestBuildStageEnv(t *testing.T) {
	m := initialModel()
	m.dryRun = true
	m.answers["hostname"] = "testhost"
	m.answers["filesystem"] = "btrfs"
	m.answers["bootloader"] = "limine (recommended)"
	m.answers["kernel_profile"] = "hardened"
	m.selected["base"] = true
	m.selected["media"] = true

	env := m.buildStageEnv()
	joined := strings.Join(env, "\n")

	if !strings.Contains(joined, "TINAPPLE_HOSTNAME=testhost") {
		t.Errorf("env missing TINAPPLE_HOSTNAME: %s", joined)
	}
	if !strings.Contains(joined, "TINAPPLE_DRYRUN=1") {
		t.Errorf("env missing TINAPPLE_DRYRUN=1: %s", joined)
	}
	if !strings.Contains(joined, "TINAPPLE_FS=btrfs") {
		t.Errorf("env missing TINAPPLE_FS=btrfs: %s", joined)
	}
	if !strings.Contains(joined, "TINAPPLE_BOOTLOADER=limine") {
		t.Errorf("env missing TINAPPLE_BOOTLOADER=limine: %s", joined)
	}
	if !strings.Contains(joined, "TINAPPLE_KERNEL_PROFILE=hardened") {
		t.Errorf("env missing TINAPPLE_KERNEL_PROFILE=hardened: %s", joined)
	}
	if !strings.Contains(joined, "TINAPPLE_PROFILES=") || !strings.Contains(joined, "base") || !strings.Contains(joined, "chadwm") || !strings.Contains(joined, "media") {
		t.Errorf("env missing TINAPPLE_PROFILES with base, chadwm, media: %s", joined)
	}
	if !strings.Contains(joined, "TINAPPLE_DISK=") {
		t.Errorf("env missing TINAPPLE_DISK: %s", joined)
	}
}

func TestChadwmDefaultProfile(t *testing.T) {
	m := initialModel()
	if !m.selected["chadwm"] {
		t.Errorf("expected chadwm to be pre-selected in initialModel")
	}
	profs := m.selectedProfilesList()
	found := false
	for _, p := range profs {
		if p == "chadwm" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected chadwm to be present in selectedProfilesList")
	}

	manifest := m.generateManifest()
	if !strings.Contains(manifest, "- chadwm") {
		t.Errorf("expected manifest to include '- chadwm' by default, got:\n%s", manifest)
	}
}

func TestRealStageExecutionDryRun(t *testing.T) {
	runner := getRunnerPath()
	if _, err := os.Stat(runner); err != nil {
		t.Skipf("runner not found at %s", runner)
	}

	cmd := exec.Command(runner, "preflight")
	cmd.Env = append(os.Environ(), "TINAPPLE_DRYRUN=1")
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("failed to run stage preflight in dry-run mode: %v\nOutput: %s", err, string(output))
	}
	outStr := string(output)
	if !strings.Contains(outStr, "Completed stage: preflight") {
		t.Errorf("expected output to contain 'Completed stage: preflight', got: %s", outStr)
	}
}

func TestTaskDStagesDryRun(t *testing.T) {
	runner := getRunnerPath()
	if _, err := os.Stat(runner); err != nil {
		t.Skipf("runner not found at %s", runner)
	}

	stages := []string{"pacstrap", "configure", "bootloader-install", "cachyos-repo", "deploy"}
	for _, stage := range stages {
		cmd := exec.Command(runner, stage)
		cmd.Env = append(os.Environ(),
			"TINAPPLE_DRYRUN=1",
			"TINAPPLE_KERNEL_PROFILE=lts",
			"TINAPPLE_PROFILES=base,media,downloads,backups,network,infrastructure,databases",
			"TINAPPLE_CACHYOS_REPOS=true",
			"TINAPPLE_DISK=/dev/sda",
			"TINAPPLE_PART_ESP=/dev/sda1",
			"TINAPPLE_PART_ROOT=/dev/sda2",
		)
		output, err := cmd.CombinedOutput()
		if err != nil {
			t.Fatalf("failed to run stage %s in dry-run mode: %v\nOutput: %s", stage, err, string(output))
		}
		outStr := string(output)
		if !strings.Contains(outStr, fmt.Sprintf("Completed stage: %s", stage)) {
			t.Errorf("stage %s: expected output to contain 'Completed stage: %s', got:\n%s", stage, stage, outStr)
		}
	}
}

func TestLiveEnvironmentAndBootstrap(t *testing.T) {
	isoAirootfs := "../iso/airootfs"
	if _, err := os.Stat(isoAirootfs); err != nil {
		t.Skipf("airootfs not found at %s", isoAirootfs)
	}

	// 1. Check binaries in airootfs /usr/local/bin
	binaries := []string{
		isoAirootfs + "/usr/local/bin/tinapple-install",
		isoAirootfs + "/usr/local/bin/tinapple-bootstrap",
	}
	for _, bin := range binaries {
		info, err := os.Stat(bin)
		if err != nil {
			t.Fatalf("expected binary %s to exist: %v", bin, err)
		}
		if info.Mode()&0111 == 0 {
			t.Errorf("expected binary %s to be executable, mode: %v", bin, info.Mode())
		}
	}

	// 2. Check backend lib and run-stage in airootfs
	runStage := isoAirootfs + "/usr/lib/tinapple-installer/backend/run-stage.sh"
	rsInfo, err := os.Stat(runStage)
	if err != nil {
		t.Fatalf("expected %s to exist: %v", runStage, err)
	}
	if rsInfo.Mode()&0111 == 0 {
		t.Errorf("expected %s to be executable", runStage)
	}

	requiredLibFiles := []string{
		"common.sh", "disk.sh", "filesystem.sh", "mount.sh",
		"pacstrap.sh", "configure.sh", "bootloader-install.sh",
	}
	for _, f := range requiredLibFiles {
		p := isoAirootfs + "/usr/lib/tinapple-installer/backend/lib/" + f
		if _, err := os.Stat(p); err != nil {
			t.Errorf("expected backend module %s to exist: %v", p, err)
		}
	}

	// 3. Check .automated_script.sh
	autoScript := isoAirootfs + "/root/.automated_script.sh"
	asInfo, err := os.Stat(autoScript)
	if err != nil {
		t.Fatalf("expected %s to exist: %v", autoScript, err)
	}
	if asInfo.Mode()&0111 == 0 {
		t.Errorf("expected %s to be executable", autoScript)
	}
	content, err := os.ReadFile(autoScript)
	if err != nil {
		t.Fatalf("failed to read %s: %v", autoScript, err)
	}
	if !strings.Contains(string(content), "/usr/local/bin/tinapple-install") {
		t.Errorf("%s should reference /usr/local/bin/tinapple-install", autoScript)
	}
	if !strings.Contains(string(content), "tty1") {
		t.Errorf("%s should check for tty1", autoScript)
	}

	// 4. Check systemd services
	isoService := isoAirootfs + "/etc/systemd/system/tinapple-install.service"
	isContent, err := os.ReadFile(isoService)
	if err != nil {
		t.Fatalf("failed to read %s: %v", isoService, err)
	}
	if !strings.Contains(string(isContent), "ExecStart=/usr/local/bin/tinapple-install") {
		t.Errorf("%s missing ExecStart", isoService)
	}

	firstbootService := "../../tinapple-firstboot/systemd/tinapple-install.service"
	fbContent, err := os.ReadFile(firstbootService)
	if err != nil {
		t.Fatalf("failed to read %s: %v", firstbootService, err)
	}
	if !strings.Contains(string(fbContent), "ExecStart=/usr/local/bin/tinapple-install") {
		t.Errorf("%s missing ExecStart", firstbootService)
	}

	// 5. Check autologin drop-in
	autologin := isoAirootfs + "/etc/systemd/system/getty@tty1.service.d/autologin.conf"
	alContent, err := os.ReadFile(autologin)
	if err != nil {
		t.Fatalf("failed to read %s: %v", autologin, err)
	}
	if !strings.Contains(string(alContent), "autologin root") {
		t.Errorf("%s missing autologin root configuration", autologin)
	}

	// 6. Check bootstrap script
	bootstrapScript := "../bootstrap/install.sh"
	cmd := exec.Command(bootstrapScript, "--help")
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("bootstrap script --help failed: %v, output: %s", err, string(out))
	}
	if !strings.Contains(string(out), "tinapple") {
		t.Errorf("bootstrap --help output missing 'tinapple': %s", string(out))
	}
}

func TestUniversalDriversStage(t *testing.T) {
	runner := getRunnerPath()
	if _, err := os.Stat(runner); err != nil {
		t.Skipf("runner not found at %s", runner)
	}

	// 1. Test with proprietary consent enabled
	cmd := exec.Command(runner, "drivers")
	cmd.Env = append(os.Environ(),
		"TINAPPLE_DRYRUN=1",
		"TINAPPLE_ENABLE_PROPRIETARY=1",
		"TINAPPLE_TARGET=/tmp/tinapple-test-target",
	)
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("failed to run stage drivers with proprietary consent: %v\nOutput: %s", err, string(output))
	}
	outStr := string(output)

	for _, expected := range []string{
		"Starting stage: drivers",
		"performing universal hardware detection & driver resolution...",
		"scanning PCI devices...",
		"CPU detected",
		"ucode",
		"scanning USB devices...",
		"Completed stage: drivers",
	} {
		if !strings.Contains(outStr, expected) {
			t.Errorf("drivers output missing expected substring: %q", expected)
		}
	}

	// 2. Test without proprietary consent (open-source only)
	cmdNoProp := exec.Command(runner, "drivers")
	cmdNoProp.Env = append(os.Environ(),
		"TINAPPLE_DRYRUN=1",
		"TINAPPLE_ENABLE_PROPRIETARY=0",
		"TINAPPLE_TARGET=/tmp/tinapple-test-target",
	)
	outputNoProp, err := cmdNoProp.CombinedOutput()
	if err != nil {
		t.Fatalf("failed to run stage drivers without proprietary consent: %v\nOutput: %s", err, string(outputNoProp))
	}
	outNoPropStr := string(outputNoProp)
	if !strings.Contains(outNoPropStr, "Completed stage: drivers") {
		t.Errorf("drivers (no proprietary) missing 'Completed stage: drivers'")
	}
}

func TestStoreAndSettingsIntegration(t *testing.T) {
	m := initialModel()
	m.step = stepProfile
	m.cursor = 0

	// Test pressing 'a' triggers launchStore
	mModel, cmdStore := m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'a'}})
	if cmdStore == nil {
		t.Errorf("expected non-nil tea.Cmd when pressing 'a' on stepProfile")
	}
	m = mModel.(model)

	// Test pressing 's' triggers launchSettings
	mModel, cmdSettings := m.Update(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune{'s'}})
	if cmdSettings == nil {
		t.Errorf("expected non-nil tea.Cmd when pressing 's' on stepProfile")
	}

	// Verify view rendering includes hints
	viewStr := m.View()
	if !strings.Contains(viewStr, "App Store") || !strings.Contains(viewStr, "Settings") {
		t.Errorf("expected stepProfile view to contain App Store and Settings hints")
	}
}
