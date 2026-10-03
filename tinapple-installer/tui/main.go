package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

const (
	stepKeyboard = iota
	stepNetwork
	stepBootloader
	stepDisk
	stepFilesystem
	stepLUKS
	stepUser
	stepHardware
	stepKernel
	stepProfile
	stepDrivers
	stepConfirm
	stepInstall
	stepDone
)

var stepNames = []string{
	"Keyboard",
	"Network",
	"Bootloader",
	"Disk Layout",
	"Filesystem",
	"LUKS Encryption",
	"User Profile",
	"Hardware",
	"Kernel Profile",
	"Service Profiles",
	"Hardware Drivers",
	"Confirmation",
	"Installation",
	"Completed",
}

var stepIcons = []string{
	"󰌌", // Keyboard
	"󰒋", // Network
	"󰌽", // Bootloader
	"󰋊", // Disk Layout
	"󰒋", // Filesystem
	"", // LUKS Encryption
	"", // User Profile
	"󰒃", // Hardware
	"", // Kernel Profile
	"󰀵", // Service Profiles
	"󰚥", // Hardware Drivers
	"󰘳", // Confirmation
	"󰑓", // Installation
	"", // Completed
}

// Tinapple Design System - High-Contrast Terminal & TTY Theme
var (
	// Neutral Slate & Charcoal Greys
	TinappleBg = lipgloss.CompleteColor{
		TrueColor: "#0e1015",
		ANSI256:   "233",
		ANSI:      "0",
	}
	TinappleBgAlt = lipgloss.CompleteColor{
		TrueColor: "#161922",
		ANSI256:   "234",
		ANSI:      "0",
	}
	TinappleBgFloat = lipgloss.CompleteColor{
		TrueColor: "#1f2430",
		ANSI256:   "235",
		ANSI:      "0",
	}
	TinappleBgHighlight = lipgloss.CompleteColor{
		TrueColor: "#262d3d",
		ANSI256:   "236",
		ANSI:      "0", // Prevents harsh cyan fallback in 16-color TTY!
	}
	TinappleBorder = lipgloss.CompleteColor{
		TrueColor: "#3b4457",
		ANSI256:   "240",
		ANSI:      "8", // Dark Grey
	}
	TinappleBorderFocus = lipgloss.CompleteColor{
		TrueColor: "#ffd166",
		ANSI256:   "220",
		ANSI:      "11", // Bright Yellow
	}
	TinappleBorderDanger = lipgloss.CompleteColor{
		TrueColor: "#ff4757",
		ANSI256:   "196",
		ANSI:      "9", // Bright Red
	}

	TinappleFg = lipgloss.CompleteColor{
		TrueColor: "#f8fafc",
		ANSI256:   "231",
		ANSI:      "15", // Crisp White
	}
	TinappleFgMuted = lipgloss.CompleteColor{
		TrueColor: "#94a3b8",
		ANSI256:   "248",
		ANSI:      "7", // Light Grey / Silver (NEVER green or cyan)
	}
	TinappleFgDim = lipgloss.CompleteColor{
		TrueColor: "#64748b",
		ANSI256:   "242",
		ANSI:      "8", // Dim Grey
	}

	// Cyber Yellow / Amber Accents
	TinappleYellow = lipgloss.CompleteColor{
		TrueColor: "#ffd166",
		ANSI256:   "220",
		ANSI:      "11", // Bright Yellow
	}
	TinappleGold = lipgloss.CompleteColor{
		TrueColor: "#f59e0b",
		ANSI256:   "214",
		ANSI:      "11",
	}

	// Apple Red / Crimson Accents
	TinappleRed = lipgloss.CompleteColor{
		TrueColor: "#ff4757",
		ANSI256:   "196",
		ANSI:      "9", // Bright Red
	}
	TinappleDanger = lipgloss.CompleteColor{
		TrueColor: "#ff4757",
		ANSI256:   "196",
		ANSI:      "9",
	}

	// Status Accents
	TinappleSuccess = lipgloss.CompleteColor{
		TrueColor: "#10b981",
		ANSI256:   "42",
		ANSI:      "10", // Bright Green
	}
	TinappleWarning = lipgloss.CompleteColor{
		TrueColor: "#ffd166",
		ANSI256:   "220",
		ANSI:      "11", // Bright Yellow
	}
	TinappleInfo = lipgloss.CompleteColor{
		TrueColor: "#38bdf8",
		ANSI256:   "75",
		ANSI:      "14", // Bright Cyan
	}
)

// Gradient Ramps: Apple Red -> Coral -> Orange -> Amber -> Gold -> Cyber Yellow
var gradientColors = []lipgloss.TerminalColor{
	lipgloss.CompleteColor{TrueColor: "#ef4444", ANSI256: "196", ANSI: "9"},
	lipgloss.CompleteColor{TrueColor: "#f43f5e", ANSI256: "203", ANSI: "9"},
	lipgloss.CompleteColor{TrueColor: "#ff6b6b", ANSI256: "209", ANSI: "9"},
	lipgloss.CompleteColor{TrueColor: "#f97316", ANSI256: "208", ANSI: "3"},
	lipgloss.CompleteColor{TrueColor: "#f59e0b", ANSI256: "214", ANSI: "11"},
	lipgloss.CompleteColor{TrueColor: "#eab308", ANSI256: "220", ANSI: "11"},
	lipgloss.CompleteColor{TrueColor: "#facc15", ANSI256: "221", ANSI: "11"},
	lipgloss.CompleteColor{TrueColor: "#ffd166", ANSI256: "222", ANSI: "11"},
}

// Tinapple Style Definitions
var (
	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(TinappleYellow).
			Padding(0, 2).
			MarginBottom(1).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(TinappleBorder)

	selectedStyle = lipgloss.NewStyle().
			Foreground(TinappleFg).
			Bold(true).
			Background(TinappleBgHighlight)

	helpStyle = lipgloss.NewStyle().
			Foreground(TinappleFgMuted).
			Italic(true)

	errorStyle = lipgloss.NewStyle().
			Foreground(TinappleDanger).
			Bold(true).
			Padding(0, 1)

	successStyle = lipgloss.NewStyle().
			Foreground(TinappleSuccess).
			Bold(true)

	warningStyle = lipgloss.NewStyle().
			Foreground(TinappleWarning).
			Bold(true)

	infoStyle = lipgloss.NewStyle().
			Foreground(TinappleInfo).
			Bold(true)

	cardStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(TinappleBorder).
			Width(76).
			Padding(1, 2)

	cardStyleFocus = cardStyle.Copy().
			BorderForeground(TinappleYellow)

	progressBarStyle = lipgloss.NewStyle().
				Foreground(TinappleYellow).
				Height(1)

	progressBarEmpty = lipgloss.NewStyle().
				Height(1)

	badgeRunning = lipgloss.NewStyle().
			Foreground(TinappleSuccess).
			Bold(true).
			Padding(0, 1).
			Border(lipgloss.NormalBorder()).
			BorderForeground(TinappleSuccess)

	badgeStopped = lipgloss.NewStyle().
			Foreground(TinappleRed).
			Bold(true).
			Padding(0, 1).
			Border(lipgloss.NormalBorder()).
			BorderForeground(TinappleRed)

	badgePending = lipgloss.NewStyle().
			Foreground(TinappleYellow).
			Bold(true).
			Padding(0, 1).
			Border(lipgloss.NormalBorder()).
			BorderForeground(TinappleYellow)

	badgeUnknown = lipgloss.NewStyle().
			Foreground(TinappleFgMuted).
			Padding(0, 1).
			Border(lipgloss.NormalBorder()).
			BorderForeground(TinappleBorder)

	sectionHeader = lipgloss.NewStyle().
			Bold(true).
			Foreground(TinappleYellow).
			MarginBottom(1).
			Border(lipgloss.NormalBorder(), false, false, true, false).
			BorderForeground(TinappleBorder)

	inputStyle = lipgloss.NewStyle().
			Foreground(TinappleFg).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(TinappleBorder).
			Padding(0, 1)

	inputStyleFocus = inputStyle.Copy().
			BorderForeground(TinappleYellow)

	btnPrimary = lipgloss.NewStyle().
			Foreground(TinappleYellow).
			Bold(true).
			Padding(0, 2).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(TinappleYellow)

	btnSecondary = lipgloss.NewStyle().
			Foreground(TinappleFgMuted).
			Padding(0, 2).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(TinappleBorder)

	btnDanger = lipgloss.NewStyle().
			Foreground(TinappleRed).
			Bold(true).
			Padding(0, 2).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(TinappleRed)
)

const tinappleLogo = `
╔══════════════════════════════════════════════════════════════════════════╗
║    ████████╗██╗███╗   ██╗ █████╗ ██████╗ ██████╗ ██╗     ███████╗        ║
║    ╚══██╔══╝██║████╗  ██║██╔══██╗██╔══██╗██╔══██╗██║     ██╔════╝        ║
║       ██║   ██║██╔██╗ ██║███████║██████╔╝██████╔╝██║     █████╗          ║
║       ██║   ██║██║╚██╗██║██╔══██║██╔═══╝ ██╔═══╝ ██║     ██╔══╝          ║
║       ██║   ██║██║ ╚████║██║  ██║██║     ██║     ███████╗███████╗        ║
║       ╚═╝   ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚══════╝╚══════╝        ║
╚══════════════════════════════════════════════════════════════════════════╝
`

const tinappleBanner = `
╔══════════════════════════════════════════════════════════════════════════╗
║    ████████╗██╗███╗   ██╗ █████╗ ██████╗ ██████╗ ██╗     ███████╗        ║
║    ╚══██╔══╝██║████╗  ██║██╔══██╗██╔══██╗██╔══██╗██║     ██╔════╝        ║
║       ██║   ██║██╔██╗ ██║███████║██████╔╝██████╔╝██║     █████╗          ║
║       ██║   ██║██║╚██╗██║██╔══██║██╔═══╝ ██╔═══╝ ██║     ██╔══╝          ║
║       ██║   ██║██║ ╚████║██║  ██║██║     ██║     ███████╗███████╗        ║
║       ╚═╝   ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚══════╝╚══════╝        ║
╚══════════════════════════════════════════════════════════════════════════╝
          ◈ TINAPPLE HOMELAB OS ◈ APPLIANCE ENGINE v0.0.1 ◈
`

type stageInfo struct {
	id   string
	desc string
}

var installStages = []stageInfo{
	{"preflight", "running pre-flight system checks (CPU, memory, firmware)..."},
	{"bootloader-detect", "detecting firmware type and validating bootloader..."},
	{"partition", "partitioning target disk layout..."},
	{"fs-select", "validating filesystem selection and layout..."},
	{"luks", "configuring disk encryption parameters..."},
	{"filesystem", "formatting root and ESP partitions..."},
	{"mount", "mounting filesystems to target root..."},
	{"mirrors", "ranking and selecting fastest package mirrors..."},
	{"pacstrap", "installing base system packages via pacstrap..."},
	{"cachyos-repo", "configuring optimized CachyOS repositories..."},
	{"configure", "configuring hostname, users, sudo, and manifest.yaml..."},
	{"bootloader-install", "installing and configuring system bootloader..."},
	{"deploy", "deploying systemd presets and tinapple configurations..."},
	{"network", "configuring network services and resolvers..."},
	{"drivers", "detecting hardware and matching drivers..."},
}

type model struct {
	width         int
	height        int
	step          int
	choices       []string
	cursor        int
	selected      map[string]bool
	answers       map[string]string
	err           string
	dryRun        bool
	installing    bool
	installOutput string
	progress      float64
	stageIndex    int
	installStages []stageInfo
}

type installProgressMsg struct {
	stageIndex int
	stageID    string
	desc       string
	done       bool
	err        error
}

type installStageDoneMsg struct{ stage string }
type installStageErrorMsg struct {
	stage string
	err   error
}

func initialModel() model {
	dryRun := os.Getenv("TINAPPLE_DRYRUN") == "1"
	for _, arg := range os.Args[1:] {
		if arg == "--dry-run" || arg == "-d" {
			dryRun = true
		}
	}

	selected := map[string]bool{
		"base":      true,
		"chadwm":    true,
		"media":     true,
		"downloads": true,
	}

	return model{
		step:     stepKeyboard,
		choices:  []string{"us", "uk", "de", "fr", "es", "it", "jp", "other"},
		cursor:   0,
		selected: selected,
		answers: map[string]string{
			"hostname": "tinapple",
			"username": "tinapple",
			"firmware": "uefi",
		},
		dryRun:        dryRun,
		installStages: installStages,
	}
}

func (m *model) getInstallStages() []stageInfo {
	if len(m.installStages) > 0 {
		return m.installStages
	}
	return installStages
}

func getRunnerPath() string {
	if p := os.Getenv("TINAPPLE_RUN_STAGE"); p != "" {
		return p
	}
	const defaultPath = "/usr/lib/tinapple-installer/backend/run-stage.sh"
	if _, err := os.Stat(defaultPath); err == nil {
		return defaultPath
	}
	for _, rel := range []string{
		"backend/run-stage.sh",
		"../backend/run-stage.sh",
		"../../backend/run-stage.sh",
		"/mnt/shared/projects/tinapple/tinapple-installer/backend/run-stage.sh",
	} {
		if _, err := os.Stat(rel); err == nil {
			return rel
		}
	}
	return defaultPath
}

func (m *model) buildStageEnv() []string {
	env := os.Environ()
	for k, v := range m.answers {
		env = append(env, fmt.Sprintf("TINAPPLE_%s=%s", strings.ToUpper(k), v))
	}
	if m.dryRun {
		env = append(env, "TINAPPLE_DRYRUN=1")
	}

	if fs, ok := m.answers["filesystem"]; ok {
		cleanFs := strings.TrimSpace(strings.Split(fs, "(")[0])
		env = append(env, fmt.Sprintf("TINAPPLE_FS=%s", cleanFs))
	}
	if boot, ok := m.answers["bootloader"]; ok {
		cleanBoot := strings.TrimSpace(strings.Split(boot, "(")[0])
		env = append(env, fmt.Sprintf("TINAPPLE_BOOTLOADER=%s", cleanBoot))
	}
	if kernel, ok := m.answers["kernel_profile"]; ok {
		cleanKernel := strings.TrimSpace(strings.Split(kernel, "(")[0])
		env = append(env, fmt.Sprintf("TINAPPLE_KERNEL_PROFILE=%s", cleanKernel))
	}
	if profiles := m.selectedProfilesList(); len(profiles) > 0 {
		env = append(env, fmt.Sprintf("TINAPPLE_PROFILES=%s", strings.Join(profiles, ",")))
	}
	if prop, ok := m.answers["proprietary_drivers"]; ok {
		if strings.HasPrefix(strings.ToLower(prop), "yes") {
			env = append(env, "TINAPPLE_ENABLE_PROPRIETARY=1")
		} else {
			env = append(env, "TINAPPLE_ENABLE_PROPRIETARY=0")
		}
	}

	if _, ok := m.answers["disk"]; !ok && os.Getenv("TINAPPLE_DISK") == "" {
		env = append(env, "TINAPPLE_DISK=/dev/vda")
	}

	if os.Getenv("TINAPPLE_BACKEND_DIR") == "" {
		if _, err := os.Stat("/usr/lib/tinapple-installer/backend/lib"); err != nil {
			for _, dir := range []string{
				"backend",
				"../backend",
				"/mnt/shared/projects/tinapple/tinapple-installer/backend",
			} {
				if _, err := os.Stat(dir + "/lib"); err == nil {
					abs, _ := filepath.Abs(dir)
					env = append(env, fmt.Sprintf("TINAPPLE_BACKEND_DIR=%s", abs))
					break
				}
			}
		}
	}

	return env
}

func (m *model) startRealInstall() tea.Cmd {
	m.installing = true
	prefix := ""
	if m.dryRun {
		prefix = "[DRY-RUN MODE] "
	}
	m.installOutput = fmt.Sprintf("%sStarting real installation...\n", prefix)
	m.stageIndex = 0
	m.progress = 0
	return m.runNextStage()
}

func (m *model) runNextStage() tea.Cmd {
	stages := m.getInstallStages()
	if m.stageIndex >= len(stages) {
		return m.installComplete()
	}

	stage := stages[m.stageIndex]
	m.installOutput += fmt.Sprintf("@@STEP %s\n", stage.id)

	env := m.buildStageEnv()
	c := exec.Command(getRunnerPath(), stage.id)
	c.Env = env

	return tea.ExecProcess(
		c,
		func(err error) tea.Msg {
			if err != nil {
				return installStageErrorMsg{stage: stage.id, err: err}
			}
			return installStageDoneMsg{stage: stage.id}
		},
	)
}

func (m *model) installComplete() tea.Cmd {
	m.installing = false
	m.progress = 1.0
	m.step = stepDone
	m.installOutput += "\n@@DONE Installation complete! Reboot to start tinapple.\n"
	return tea.Quit
}

func (m model) Init() tea.Cmd {
	return nil
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case installStageDoneMsg:
		m.installOutput += fmt.Sprintf("@@DONE %s\n", msg.stage)
		m.stageIndex++
		stages := m.getInstallStages()
		m.progress = float64(m.stageIndex) / float64(len(stages))
		cmd := m.runNextStage()
		return m, cmd

	case installStageErrorMsg:
		m.installOutput += fmt.Sprintf("@@ERROR %s: %v\n", msg.stage, msg.err)
		m.err = fmt.Sprintf("@@ERROR %s: %v", msg.stage, msg.err)
		m.installing = false
		return m, nil

	case installProgressMsg:
		if msg.err != nil {
			m.err = msg.err.Error()
			m.installing = false
			return m, nil
		}
		if msg.done {
			m.installing = false
			m.progress = 1.0
			m.step = stepDone
			m.installOutput += "@@DONE all\nAll stages completed successfully.\n"
			return m, nil
		}
		stages := m.getInstallStages()
		m.progress = float64(msg.stageIndex+1) / float64(len(stages))
		dryPrefix := ""
		if m.dryRun {
			dryPrefix = "DRYRUN: "
		}
		m.installOutput += fmt.Sprintf("@@STEP %s\n  [tinapple] [INFO] %s%s\n@@DONE %s\n",
			msg.stageID, dryPrefix, msg.desc, msg.stageID)
		return m, nil

	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			return m, tea.Quit
		case "enter":
			return m.handleEnter()
		case "up", "k":
			if m.cursor > 0 {
				m.cursor--
			}
		case "down", "j":
			if m.cursor < len(m.choices)-1 {
				m.cursor++
			}
		case " ":
			if m.step == stepDisk || m.step == stepProfile || m.step == stepDrivers {
				m.toggleChoice()
			}
		case "a", "A":
			if m.step == stepProfile {
				return m, m.launchStore()
			}
		case "s", "S", "c", "C":
			if m.step == stepProfile {
				return m, m.launchSettings()
			}
		}
	}
	return m, nil
}

func (m model) handleEnter() (tea.Model, tea.Cmd) {
	switch m.step {
	case stepKeyboard:
		if m.cursor >= 0 && m.cursor < len(m.choices) {
			m.answers["keyboard"] = m.choices[m.cursor]
		}
		m.step = stepNetwork
		m.cursor = 0
		m.choices = []string{"DHCP", "Static", "WiFi"}

	case stepNetwork:
		if m.cursor >= 0 && m.cursor < len(m.choices) {
			m.answers["network"] = m.choices[m.cursor]
		}
		m.step = stepBootloader
		m.cursor = 0
		if _, err := os.Stat("/sys/firmware/efi"); err == nil {
			m.answers["firmware"] = "uefi"
			m.choices = []string{"limine (recommended)", "grub"}
		} else {
			m.answers["firmware"] = "bios"
			m.choices = []string{"grub (only option)"}
		}

	case stepBootloader:
		if m.cursor >= 0 && m.cursor < len(m.choices) {
			m.answers["bootloader"] = m.choices[m.cursor]
		}
		m.step = stepDisk
		m.cursor = 0
		m.choices = []string{"Use entire disk (auto)", "Custom layout"}

	case stepDisk:
		if m.cursor >= 0 && m.cursor < len(m.choices) && m.choices[m.cursor] == "Use entire disk (auto)" {
			m.answers["disk_strategy"] = "auto"
		} else {
			m.answers["disk_strategy"] = "custom"
		}
		m.step = stepFilesystem
		m.cursor = 0
		m.choices = []string{"ext4 (default)", "xfs", "btrfs"}

	case stepFilesystem:
		if m.cursor >= 0 && m.cursor < len(m.choices) {
			m.answers["filesystem"] = m.choices[m.cursor]
		}
		m.step = stepLUKS
		m.cursor = 0
		m.choices = []string{"No encryption", "LUKS2 (enter passphrase)"}

	case stepLUKS:
		if m.cursor >= 0 && m.cursor < len(m.choices) && strings.HasPrefix(m.choices[m.cursor], "LUKS2") {
			m.answers["luks"] = "yes"
		} else {
			m.answers["luks"] = "no"
		}
		m.step = stepUser
		m.cursor = 0
		m.choices = []string{
			"Default user (user: tinapple, host: tinapple)",
			"Server admin (user: admin, host: tinapple-server)",
			"Live demo user (user: demo, host: tinapple-box)",
		}

	case stepUser:
		if m.cursor == 1 {
			m.answers["hostname"] = "tinapple-server"
			m.answers["username"] = "admin"
		} else if m.cursor == 2 {
			m.answers["hostname"] = "tinapple-box"
			m.answers["username"] = "demo"
		} else {
			m.answers["hostname"] = "tinapple"
			m.answers["username"] = "tinapple"
		}
		m.step = stepHardware
		m.cursor = 0
		m.choices = []string{"auto", "desktop", "laptop"}

	case stepHardware:
		if m.cursor >= 0 && m.cursor < len(m.choices) {
			m.answers["hardware_profile"] = m.choices[m.cursor]
		}
		m.step = stepKernel
		m.cursor = 0
		m.choices = []string{"lts (recommended)", "hardened", "current"}

	case stepKernel:
		if m.cursor >= 0 && m.cursor < len(m.choices) {
			m.answers["kernel_profile"] = m.choices[m.cursor]
		}
		m.step = stepProfile
		m.cursor = 0
		m.choices = []string{"base", "chadwm", "media", "downloads", "backups", "network", "infrastructure", "databases"}
		if m.selected == nil {
			m.selected = make(map[string]bool)
		}
		for _, p := range []string{"base", "chadwm", "media", "downloads"} {
			m.selected[p] = true
		}

	case stepProfile:
		m.step = stepDrivers
		m.cursor = 0
		m.choices = []string{
			"No (open-source only)",
			"Yes (install detected proprietary drivers)",
		}

	case stepDrivers:
		if m.cursor >= 0 && m.cursor < len(m.choices) {
			m.answers["proprietary_drivers"] = m.choices[m.cursor]
		}
		m.step = stepConfirm
		m.cursor = 0

	case stepConfirm:
		m.step = stepInstall
		cmd := m.startInstall()
		return m, cmd

	case stepInstall:
		// Installation in progress
	case stepDone:
		return m, tea.Quit
	}
	return m, nil
}

func (m *model) toggleChoice() {
	if m.cursor >= 0 && m.cursor < len(m.choices) {
		choice := m.choices[m.cursor]
		if m.selected[choice] {
			delete(m.selected, choice)
		} else {
			m.selected[choice] = true
			if choice == "base" {
				m.selected["chadwm"] = true
			}
		}
	}
}

func (m *model) toggleProfile() {
	m.toggleChoice()
}

func (m *model) launchStore() tea.Cmd {
	bin := "/usr/local/bin/chaddy-store"
	if _, err := exec.LookPath(bin); err != nil {
		if p, err2 := exec.LookPath("chaddy-store"); err2 == nil {
			bin = p
		}
	}
	return tea.ExecProcess(
		exec.Command(bin),
		func(err error) tea.Msg {
			if err != nil {
				return installStageErrorMsg{stage: "store", err: err}
			}
			return installStageDoneMsg{stage: "store"}
		},
	)
}

func (m *model) launchSettings() tea.Cmd {
	bin := "/usr/local/bin/chaddy-settings"
	if _, err := exec.LookPath(bin); err != nil {
		if p, err2 := exec.LookPath("chaddy-settings"); err2 == nil {
			bin = p
		}
	}
	return tea.ExecProcess(
		exec.Command(bin),
		func(err error) tea.Msg {
			if err != nil {
				return installStageErrorMsg{stage: "settings", err: err}
			}
			return installStageDoneMsg{stage: "settings"}
		},
	)
}

func (m *model) startInstall() tea.Cmd {
	manifestContent := m.generateManifest()
	if manifestPath := os.Getenv("TINAPPLE_MANIFEST_OUT"); manifestPath != "" {
		_ = os.WriteFile(manifestPath, []byte(manifestContent), 0644)
	} else {
		_ = os.MkdirAll("/etc/tinapple", 0755)
		_ = os.WriteFile("/etc/tinapple/manifest.yaml", []byte(manifestContent), 0644)
	}

	return m.startRealInstall()
}

func (m model) selectedProfilesList() []string {
	var list []string
	allProfiles := []string{"base", "chadwm", "media", "downloads", "backups", "network", "infrastructure", "databases"}
	for _, p := range allProfiles {
		if p == "chadwm" {
			if m.selected["chadwm"] || m.selected["base"] || len(m.selected) == 0 {
				list = append(list, p)
			}
		} else if m.selected[p] {
			list = append(list, p)
		}
	}
	return list
}

func (m model) generateManifest() string {
	var profiles strings.Builder
	profs := m.selectedProfilesList()
	if len(profs) == 0 {
		profs = []string{"base", "chadwm", "media", "downloads"}
	}
	for _, p := range profs {
		profiles.WriteString(fmt.Sprintf("  - %s\n", p))
	}

	hostname := m.answers["hostname"]
	if hostname == "" {
		hostname = "tinapple"
	}
	kernel := m.answers["kernel_profile"]
	if kernel == "" {
		kernel = "lts"
	}
	hw := m.answers["hardware_profile"]
	if hw == "" {
		hw = "auto"
	}
	fs := m.answers["filesystem"]
	if fs == "" {
		fs = "ext4"
	}
	boot := m.answers["bootloader"]
	if boot == "" {
		boot = "grub"
	}

	return fmt.Sprintf(`version: 1
hostname: %s
kernel_profile: %s
session_mode: headless
hardware_profile: %s
cachyos_repos: true
ease_of_use_mode: false
filesystem: %s
bootloader: %s
profiles:
%s`, hostname, kernel, hw, fs, boot, profiles.String())
}

func (m model) renderBanner() string {
	if m.height > 0 && m.height < 28 {
		topLine := lipgloss.NewStyle().Foreground(TinappleRed).Bold(true).Render("╭────────────────────────────────────────────────────────────────────────────╮")
		botLine := lipgloss.NewStyle().Foreground(TinappleYellow).Bold(true).Render("╰────────────────────────────────────────────────────────────────────────────╯")
		tagline := lipgloss.NewStyle().
			Width(74).
			Align(lipgloss.Center).
			Render(
				lipgloss.NewStyle().Foreground(TinappleRed).Bold(true).Render("◈  ") +
					lipgloss.NewStyle().Foreground(TinappleYellow).Bold(true).Render("TINAPPLE SERVER OS") +
					lipgloss.NewStyle().Foreground(TinappleFgMuted).Render("  ▪  HOMELAB APPLIANCE  ▪  ") +
					lipgloss.NewStyle().Foreground(TinappleYellow).Bold(true).Render("Tinapple Installer v0.0.1") +
					lipgloss.NewStyle().Foreground(TinappleRed).Bold(true).Render(" ◈"),
			)
		midLine := lipgloss.NewStyle().Foreground(TinappleBorder).Render("│") + tagline + lipgloss.NewStyle().Foreground(TinappleBorder).Render("│")
		return fmt.Sprintf("%s\n%s\n%s", topLine, midLine, botLine)
	}

	appleSil := []struct {
		leaf bool
		text string
	}{
		{leaf: true, text: "   ▄█   "},
		{leaf: true, text: " ▄██▀   "},
		{leaf: false, text: "▄████▄  "},
		{leaf: false, text: "██████  "},
		{leaf: false, text: "██████  "},
		{leaf: false, text: " ▀██▀   "},
	}

	textLines := []string{
		"████████╗██╗███╗   ██╗ █████╗ ██████╗ ██████╗ ██╗     ███████╗",
		"╚══██╔══╝██║████╗  ██║██╔══██╗██╔══██╗██╔══██╗██║     ██╔════╝",
		"   ██║   ██║██╔██╗ ██║███████║██████╔╝██████╔╝██║     █████╗  ",
		"   ██║   ██║██║╚██╗██║██╔══██║██╔═══╝ ██╔═══╝ ██║     ██╔══╝  ",
		"   ██║   ██║██║ ╚████║██║  ██║██║     ██║     ███████╗███████╗",
		"   ╚═╝   ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚══════╝╚══════╝",
	}

	topBorder := lipgloss.NewStyle().Foreground(TinappleBorder).Render("╭──────────────────────────────────────────────────────────────────────────╮")
	botBorder := lipgloss.NewStyle().Foreground(TinappleBorder).Render("╰──────────────────────────────────────────────────────────────────────────╯")

	var b strings.Builder
	b.WriteString(topBorder + "\n")

	for i := 0; i < len(appleSil); i++ {
		var silStyled string
		if appleSil[i].leaf {
			silStyled = lipgloss.NewStyle().Foreground(TinappleYellow).Bold(true).Render(appleSil[i].text)
		} else {
			silStyled = lipgloss.NewStyle().Foreground(TinappleRed).Bold(true).Render(appleSil[i].text)
		}

		c := gradientColors[i%len(gradientColors)]
		titleStyled := lipgloss.NewStyle().Foreground(c).Bold(true).Render(textLines[i])

		leftBorder := lipgloss.NewStyle().Foreground(TinappleBorder).Render("│")
		rightBorder := lipgloss.NewStyle().Foreground(TinappleBorder).Render("│")

		b.WriteString(fmt.Sprintf("%s %s  %s %s\n", leftBorder, silStyled, titleStyled, rightBorder))
	}
	b.WriteString(botBorder + "\n")

	sub := lipgloss.NewStyle().
		Foreground(TinappleRed).Bold(true).Render("◈  ") +
		lipgloss.NewStyle().Foreground(TinappleYellow).Bold(true).Render("TINAPPLE SERVER OS") +
		lipgloss.NewStyle().Foreground(TinappleFgMuted).Render("  ▪  HOMELAB APPLIANCE  ▪  ") +
		lipgloss.NewStyle().Foreground(TinappleYellow).Bold(true).Render("Tinapple Installer v0.0.1") +
		lipgloss.NewStyle().Foreground(TinappleRed).Bold(true).Render(" ◈")

	b.WriteString(lipgloss.NewStyle().Width(76).Align(lipgloss.Center).Render(sub))
	return lipgloss.NewStyle().Width(76).Align(lipgloss.Center).Render(b.String())
}

func (m model) renderStepper() string {
	if m.step >= len(stepNames) {
		return ""
	}
	stepNum := fmt.Sprintf("STEP %02d OF %02d", m.step+1, 12)
	pill := lipgloss.NewStyle().
		Foreground(TinappleYellow).
		Bold(true).
		Padding(0, 1).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(TinappleYellow).
		Render(stepNum)

	icon := ""
	if m.step >= 0 && m.step < len(stepIcons) {
		icon = stepIcons[m.step] + "  "
	}
	currName := lipgloss.NewStyle().
		Foreground(TinappleFg).
		Bold(true).
		Render(icon + strings.ToUpper(stepNames[m.step]))

	var dots strings.Builder
	for i := 0; i < 12; i++ {
		if i < m.step {
			dots.WriteString(lipgloss.NewStyle().Foreground(TinappleSuccess).Render("✓ "))
		} else if i == m.step {
			dots.WriteString(lipgloss.NewStyle().Foreground(TinappleYellow).Render("● "))
		} else {
			dots.WriteString(lipgloss.NewStyle().Foreground(TinappleFgDim).Render("○ "))
		}
	}

	totalWidth := 72
	used := lipgloss.Width(pill) + 2 + lipgloss.Width(currName) + lipgloss.Width(dots.String())
	gap := totalWidth - used
	if gap < 2 {
		gap = 2
	}

	headerRow := lipgloss.JoinHorizontal(lipgloss.Center,
		pill,
		"  ",
		currName,
		strings.Repeat(" ", gap),
		dots.String(),
	)

	var rule strings.Builder
	for i := 0; i < totalWidth; i++ {
		idx := (i * len(gradientColors)) / totalWidth
		if idx >= len(gradientColors) {
			idx = len(gradientColors) - 1
		}
		rule.WriteString(lipgloss.NewStyle().Foreground(gradientColors[idx]).Render("━"))
	}

	return fmt.Sprintf("%s\n%s", headerRow, rule.String())
}

func (m model) placeCentered(content string) string {
	w := m.width
	if w <= 0 {
		w = 80
	}
	h := m.height
	if h <= 0 {
		h = 28
	}
	boxWidth := lipgloss.Width(content)
	boxHeight := lipgloss.Height(content)
	if w < boxWidth {
		w = boxWidth
	}
	if h < boxHeight {
		h = boxHeight
	}
	return lipgloss.Place(w, h, lipgloss.Center, lipgloss.Center, content)
}

func (m model) renderKeybinds() string {
	hints := []struct{ key, desc string }{
		{"↑/↓", "navigate"},
		{"Enter", "select"},
		{"Space", "toggle"},
		{"Tab", "next"},
		{"Esc/q", "quit/back"},
	}

	var parts []string
	for _, h := range hints {
		keyCol := TinappleYellow
		if strings.Contains(h.key, "q") || strings.Contains(h.key, "Esc") {
			keyCol = TinappleRed
		}
		keycap := lipgloss.NewStyle().Foreground(keyCol).Bold(true).Render(h.key)
		desc := lipgloss.NewStyle().Foreground(TinappleFgMuted).Render(h.desc)
		parts = append(parts, fmt.Sprintf("%s %s", keycap, desc))
	}

	sep := lipgloss.NewStyle().Foreground(TinappleBorder).Render(" │ ")
	inner := strings.Join(parts, sep)
	return lipgloss.NewStyle().
		Foreground(TinappleFgMuted).
		Border(lipgloss.RoundedBorder()).
		BorderForeground(TinappleBorder).
		Width(76).
		Align(lipgloss.Center).
		Padding(0, 1).
		Render(inner)
}

func renderProgressBar(progress float64, width int) string {
	if progress < 0 {
		progress = 0
	}
	if progress > 1 {
		progress = 1
	}
	filled := int(progress * float64(width))
	if filled > width {
		filled = width
	}

	var bar strings.Builder
	for i := 0; i < filled; i++ {
		idx := (i * len(gradientColors)) / width
		if idx >= len(gradientColors) {
			idx = len(gradientColors) - 1
		}
		bar.WriteString(lipgloss.NewStyle().Foreground(gradientColors[idx]).Render("█"))
	}
	empty := width - filled
	for i := 0; i < empty; i++ {
		bar.WriteString(lipgloss.NewStyle().Foreground(TinappleBorder).Render("░"))
	}
	return bar.String()
}

func renderChoices(choices []string, cursor int) string {
	var s strings.Builder
	for i, c := range choices {
		if i == cursor {
			indicator := lipgloss.NewStyle().Foreground(TinappleYellow).Bold(true).Render("  ▶ ")
			radio := lipgloss.NewStyle().Foreground(TinappleYellow).Bold(true).Render("[●] ")
			label := lipgloss.NewStyle().Foreground(TinappleFg).Bold(true).Render(c)
			rowContent := fmt.Sprintf("%s%s", radio, label)
			styledRow := selectedStyle.Copy().Width(64).Padding(0, 1).Render(rowContent)
			s.WriteString(fmt.Sprintf("%s%s\n", indicator, styledRow))
		} else {
			indicator := lipgloss.NewStyle().Foreground(TinappleFgDim).Render("     ")
			radio := lipgloss.NewStyle().Foreground(TinappleFgDim).Render("[○] ")
			label := lipgloss.NewStyle().Foreground(TinappleFgMuted).Render(c)
			s.WriteString(fmt.Sprintf("%s%s%s\n", indicator, radio, label))
		}
	}
	return s.String()
}

func renderMultiChoices(choices []string, selected map[string]bool, cursor ...int) string {
	var s strings.Builder
	activeCursor := -1
	if len(cursor) > 0 {
		activeCursor = cursor[0]
	}

	for i, c := range choices {
		isCursor := i == activeCursor

		var indicator string
		if isCursor {
			indicator = lipgloss.NewStyle().Foreground(TinappleYellow).Bold(true).Render("  ▶ ")
		} else {
			indicator = lipgloss.NewStyle().Foreground(TinappleFgDim).Render("     ")
		}

		var box string
		var badge string
		var labelStyle lipgloss.Style

		if selected[c] {
			box = lipgloss.NewStyle().Foreground(TinappleYellow).Bold(true).Render(" [✓]")
			badge = badgeRunning.Render("ENABLED")
			labelStyle = lipgloss.NewStyle().Foreground(TinappleFg).Bold(true)
		} else {
			box = lipgloss.NewStyle().Foreground(TinappleFgDim).Render(" [ ]")
			badge = badgeStopped.Render("DISABLED")
			labelStyle = lipgloss.NewStyle().Foreground(TinappleFgMuted)
		}

		name := labelStyle.Render(fmt.Sprintf("%-18s", c))
		rowContent := fmt.Sprintf("%s  %s  %s", box, name, badge)
		if isCursor {
			styledRow := selectedStyle.Copy().Width(64).Padding(0, 1).Render(rowContent)
			s.WriteString(fmt.Sprintf("%s%s\n", indicator, styledRow))
		} else {
			s.WriteString(fmt.Sprintf("%s%s\n", indicator, rowContent))
		}
	}
	return s.String()
}

func (m model) View() string {
	banner := m.renderBanner()

	if m.err != "" {
		var content strings.Builder
		content.WriteString(sectionHeader.Render("Installation Error"))
		content.WriteString("\n\n")
		content.WriteString(fmt.Sprintf("%s  %s\n\n",
			badgeStopped.Render("ERROR"),
			errorStyle.Render(m.err),
		))
		content.WriteString(helpStyle.Render("An unrecoverable error occurred during installation.") + "\n\n")
		content.WriteString(btnDanger.Render("Quit [q]"))
		content.WriteString("\n")

		card := cardStyle.Copy().BorderForeground(TinappleRed).Render(content.String())
		full := lipgloss.JoinVertical(lipgloss.Center, banner, "\n", card, m.renderKeybinds())
		return m.placeCentered(full)
	}

	if m.installing {
		var content strings.Builder
		content.WriteString(sectionHeader.Render(fmt.Sprintf("Installing... %.0f%%", m.progress*100)))
		content.WriteString("\n\n")
		content.WriteString(fmt.Sprintf("%s  %s\n\n",
			renderProgressBar(m.progress, 46),
			badgeRunning.Render("IN PROGRESS"),
		))

		logBox := lipgloss.NewStyle().
			Foreground(TinappleFg).
			Background(TinappleBgFloat).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(TinappleBorder).
			Width(68).
			Padding(0, 1).
			Render(m.installOutput)
		content.WriteString(logBox)
		content.WriteString("\n")

		card := cardStyleFocus.Render(content.String())
		full := lipgloss.JoinVertical(lipgloss.Center, banner, "\n", card, m.renderKeybinds())
		return m.placeCentered(full)
	}

	if m.step == stepDone {
		var content strings.Builder
		content.WriteString(sectionHeader.Render(stepIcons[stepDone] + "  Installation Complete"))
		content.WriteString("\n\n")
		content.WriteString(fmt.Sprintf("%s  %s\n\n",
			badgeRunning.Render("SUCCESS"),
			successStyle.Render("All installation stages completed successfully!"),
		))
		content.WriteString(lipgloss.NewStyle().Foreground(TinappleFg).Render("Installation complete! Reboot to start tinapple.\n\n"))
		content.WriteString(btnPrimary.Render("Reboot [Enter]") + "  " + btnSecondary.Render("Quit [q]"))
		content.WriteString("\n")

		card := cardStyle.Copy().BorderForeground(TinappleSuccess).Render(content.String())
		full := lipgloss.JoinVertical(lipgloss.Center, banner, "\n", card, m.renderKeybinds())
		return m.placeCentered(full)
	}

	var content strings.Builder
	if m.step < len(stepNames) {
		content.WriteString(m.renderStepper())
		content.WriteString("\n\n")
	}

	switch m.step {
	case stepKeyboard:
		content.WriteString(sectionHeader.Render(stepIcons[stepKeyboard] + "  Select Keyboard Layout"))
		content.WriteString("\n")
		content.WriteString(helpStyle.Render("Choose your console keymap"))
		content.WriteString("\n\n")
		content.WriteString(renderChoices(m.choices, m.cursor))
		content.WriteString("\n")
		content.WriteString(btnPrimary.Render("Next [Enter]"))
		content.WriteString("\n")

	case stepNetwork:
		content.WriteString(sectionHeader.Render(stepIcons[stepNetwork] + "  Network Configuration"))
		content.WriteString("\n")
		content.WriteString(helpStyle.Render("Select connection management method"))
		content.WriteString("\n\n")
		content.WriteString(renderChoices(m.choices, m.cursor))
		content.WriteString("\n")
		content.WriteString(btnPrimary.Render("Next [Enter]"))
		content.WriteString("\n")

	case stepBootloader:
		content.WriteString(sectionHeader.Render(stepIcons[stepBootloader] + "  Bootloader Selection"))
		content.WriteString("\n")
		fwBadge := badgeRunning.Render(strings.ToUpper(m.answers["firmware"]))
		content.WriteString(fmt.Sprintf("Firmware: %s\n", fwBadge))
		content.WriteString(helpStyle.Render("Select bootloader for your system"))
		content.WriteString("\n\n")
		content.WriteString(renderChoices(m.choices, m.cursor))
		content.WriteString("\n")
		content.WriteString(btnPrimary.Render("Next [Enter]"))
		content.WriteString("\n")

	case stepDisk:
		content.WriteString(sectionHeader.Render(stepIcons[stepDisk] + "  Disk Layout Strategy"))
		content.WriteString("\n")
		content.WriteString(helpStyle.Render("Select disk partitioning strategy"))
		content.WriteString("\n\n")
		content.WriteString(renderChoices(m.choices, m.cursor))
		content.WriteString("\n")
		content.WriteString(btnPrimary.Render("Next [Enter]"))
		content.WriteString("\n")

	case stepFilesystem:
		content.WriteString(sectionHeader.Render(stepIcons[stepFilesystem] + "  Root Filesystem"))
		content.WriteString("\n")
		content.WriteString(helpStyle.Render("Select filesystem type for root"))
		content.WriteString("\n\n")
		content.WriteString(renderChoices(m.choices, m.cursor))
		content.WriteString("\n")
		content.WriteString(btnPrimary.Render("Next [Enter]"))
		content.WriteString("\n")

	case stepLUKS:
		content.WriteString(sectionHeader.Render(stepIcons[stepLUKS] + "  Disk Encryption (LUKS2)"))
		content.WriteString("\n")
		content.WriteString(helpStyle.Render("Configure full disk encryption"))
		content.WriteString("\n\n")
		content.WriteString(renderChoices(m.choices, m.cursor))
		content.WriteString("\n")
		if m.cursor >= 0 && m.cursor < len(m.choices) && strings.HasPrefix(m.choices[m.cursor], "LUKS2") {
			content.WriteString(inputStyle.Render("Encryption: LUKS2 AES-XTS-PLAIN64") + "\n\n")
		}
		content.WriteString(btnPrimary.Render("Next [Enter]"))
		content.WriteString("\n")

	case stepUser:
		content.WriteString(sectionHeader.Render(stepIcons[stepUser] + "  User Account Configuration"))
		content.WriteString("\n")
		content.WriteString(helpStyle.Render("Select user and hostname profile"))
		content.WriteString("\n\n")
		content.WriteString(renderChoices(m.choices, m.cursor))
		content.WriteString("\n")
		content.WriteString(lipgloss.NewStyle().Foreground(TinappleFgMuted).Render("Active credentials:") + "\n")
		content.WriteString(fmt.Sprintf("%s  %s\n\n",
			inputStyleFocus.Render("Hostname: "+m.answers["hostname"]),
			inputStyleFocus.Render("User: "+m.answers["username"]),
		))
		content.WriteString(btnPrimary.Render("Next [Enter]"))
		content.WriteString("\n")

	case stepHardware:
		content.WriteString(sectionHeader.Render(stepIcons[stepHardware] + "  Hardware Profile"))
		content.WriteString("\n")
		content.WriteString(helpStyle.Render("Select target hardware profile"))
		content.WriteString("\n\n")
		content.WriteString(renderChoices(m.choices, m.cursor))
		content.WriteString("\n")
		content.WriteString(btnPrimary.Render("Next [Enter]"))
		content.WriteString("\n")

	case stepKernel:
		content.WriteString(sectionHeader.Render(stepIcons[stepKernel] + "  Kernel Profile"))
		content.WriteString("\n")
		content.WriteString(helpStyle.Render("Select Linux kernel flavor"))
		content.WriteString("\n\n")
		content.WriteString(renderChoices(m.choices, m.cursor))
		content.WriteString("\n")
		content.WriteString(btnPrimary.Render("Next [Enter]"))
		content.WriteString("\n")

	case stepProfile:
		if m.selected == nil {
			m.selected = make(map[string]bool)
		}
		if m.selected["base"] {
			m.selected["chadwm"] = true
		}
		content.WriteString(sectionHeader.Render(stepIcons[stepProfile] + "  Service Profiles"))
		content.WriteString("\n")
		content.WriteString(helpStyle.Render("Space toggle │ Enter next │ [A] App Store (chaddy-store) │ [S] Settings (chaddy-settings)"))
		content.WriteString("\n\n")
		content.WriteString(renderMultiChoices(m.choices, m.selected, m.cursor))
		content.WriteString("\n")
		content.WriteString(btnPrimary.Render("Next [Enter]"))
		content.WriteString("\n")

	case stepDrivers:
		content.WriteString(sectionHeader.Render(stepIcons[stepDrivers] + "  Proprietary Drivers"))
		content.WriteString("\n")
		content.WriteString(helpStyle.Render("Explicit consent required for proprietary drivers (NVIDIA, etc.)"))
		content.WriteString("\n\n")
		content.WriteString(renderChoices(m.choices, m.cursor))
		content.WriteString("\n")
		content.WriteString(btnPrimary.Render("Next [Enter]"))
		content.WriteString("\n")

	case stepConfirm:
		content.WriteString(sectionHeader.Render(stepIcons[stepConfirm] + "  Confirm Installation Parameters"))
		content.WriteString("\n\n")

		summaryItems := []struct {
			label string
			val   string
			badge string
		}{
			{"Hostname", m.answers["hostname"], badgeRunning.Render("CONFIGURED")},
			{"User Profile", m.answers["username"], badgeRunning.Render("CONFIGURED")},
			{"Disk Strategy", fmt.Sprintf("%s (%s)", m.answers["disk_strategy"], m.answers["filesystem"]), badgeRunning.Render("TARGET")},
			{"Boot Engine", m.answers["bootloader"], badgeRunning.Render("BOOTLOADER")},
			{"Kernel Flavor", m.answers["kernel_profile"], badgeRunning.Render("KERNEL")},
			{"Profiles", fmt.Sprintf("%v", m.selectedProfilesList()), badgeRunning.Render("SERVICES")},
		}

		for _, it := range summaryItems {
			label := lipgloss.NewStyle().Foreground(TinappleFgMuted).Width(16).Render(it.label + ":")
			val := lipgloss.NewStyle().Foreground(TinappleFg).Bold(true).Render(it.val)
			content.WriteString(fmt.Sprintf("  %s %-32s %s\n", label, val, it.badge))
		}

		if m.answers["proprietary_drivers"] != "" {
			label := lipgloss.NewStyle().Foreground(TinappleFgMuted).Width(16).Render("Drivers:")
			val := lipgloss.NewStyle().Foreground(TinappleYellow).Bold(true).Render(m.answers["proprietary_drivers"])
			content.WriteString(fmt.Sprintf("  %s %-32s %s\n", label, val, badgePending.Render("PROPRIETARY")))
		}

		if m.dryRun {
			content.WriteString("\n  " + badgePending.Render("MODE: DRY-RUN (SIMULATION ONLY)") + "\n")
		}

		cautionBox := lipgloss.NewStyle().
			Foreground(TinappleRed).
			Background(TinappleBgFloat).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(TinappleRed).
			Width(70).
			Padding(0, 1).
			Align(lipgloss.Center).
			Render("⚠ CAUTION: DATA ON TARGET DRIVE WILL BE COMPLETELY OVERWRITTEN ⚠")

		content.WriteString("\n" + cautionBox + "\n\n")
		content.WriteString("  " + btnPrimary.Render("⚡ Begin Installation [Enter]") + "   " + btnSecondary.Render("Quit [q]"))
		content.WriteString("\n")
	}

	card := cardStyleFocus.Render(content.String())
	full := lipgloss.JoinVertical(lipgloss.Center, banner, "\n", card, m.renderKeybinds())
	return m.placeCentered(full)
}

func runAutoInstall() error {
	m := initialModel()
	if fs := os.Getenv("TINAPPLE_FS"); fs != "" {
		m.answers["filesystem"] = fs
	}
	if boot := os.Getenv("TINAPPLE_BOOTLOADER"); boot != "" {
		m.answers["bootloader"] = boot
	}
	if kernel := os.Getenv("TINAPPLE_KERNEL_PROFILE"); kernel != "" {
		m.answers["kernel_profile"] = kernel
	}
	if disk := os.Getenv("TINAPPLE_DISK"); disk != "" {
		m.answers["disk"] = disk
	}
	if luks := os.Getenv("TINAPPLE_LUKS"); luks != "" {
		m.answers["luks"] = luks
	}
	if host := os.Getenv("TINAPPLE_HOSTNAME"); host != "" {
		m.answers["hostname"] = host
	}
	if user := os.Getenv("TINAPPLE_USERNAME"); user != "" {
		m.answers["username"] = user
	}
	if profiles := os.Getenv("TINAPPLE_PROFILES"); profiles != "" {
		for _, p := range strings.Split(profiles, ",") {
			p = strings.TrimSpace(p)
			if p != "" {
				m.selected[p] = true
			}
		}
	}

	env := m.buildStageEnv()
	runner := getRunnerPath()
	stages := m.getInstallStages()

	fmt.Printf("[tinapple-install] Starting automated installation (%d stages)...\n", len(stages))
	for i, st := range stages {
		fmt.Printf("[tinapple-install] [%d/%d] Stage: %s (%s)\n", i+1, len(stages), st.id, st.desc)
		cmd := exec.Command(runner, st.id)
		cmd.Env = env
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("stage %s failed: %w", st.id, err)
		}
	}
	fmt.Println("[tinapple-install] Installation completed successfully! Reboot to start tinapple.")
	return nil
}

func main() {
	isAuto := os.Getenv("TINAPPLE_AUTO") == "1"
	for _, arg := range os.Args[1:] {
		if arg == "--auto" || arg == "-y" || arg == "--non-interactive" {
			isAuto = true
		}
	}
	if isAuto {
		if err := runAutoInstall(); err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			os.Exit(1)
		}
		return
	}

	p := tea.NewProgram(initialModel(), tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}
}
