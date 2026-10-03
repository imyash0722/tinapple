# Task B: Ryoku Theming & Branding

## Context
Current TUI uses generic bubbletea defaults. Must match Ryoku's polished UI exactly.

## Ryoku Design System Reference

### Color Palette
```go
const (
    // Primary
    RyokuBlue    = lipgloss.Color("#7aa2f7")  // Primary accent
    RyokuBlueDim = lipgloss.Color("#5a8adf")  // Dimmed accent
    
    // Backgrounds
    RyokuBg       = lipgloss.Color("#1a1b26")  // Main background
    RyokuBgAlt    = lipgloss.Color("#24283b")  // Elevated surfaces
    RyokuBgFloat  = lipgloss.Color("#1f2335")  // Floating elements
    
    // Text
    RyokuFg       = lipgloss.Color("#c0caf5")  // Primary text
    RyokuFgMuted  = lipgloss.Color("#565f89")  // Muted text
    RyokuFgDim    = lipgloss.Color("#414868")  // Disabled text
    
    // Semantic
    RyokuSuccess  = lipgloss.Color("#9ece6a")  // Success/green
    RyokuWarning  = lipgloss.Color("#e0af68")  // Warning/yellow
    RyokuDanger   = lipgloss.Color("#f7768e")  // Danger/red
    RyokuInfo     = lipgloss.Color("#7dcfff")  // Info/cyan
    RyokuPurple   = lipgloss.Color("#bb9af7")  // Purple
    RyokuOrange   = lipgloss.Color("#ff9e64")  // Orange
    
    // Borders
    RyokuBorder       = lipgloss.Color("#414868")
    RyokuBorderFocus  = lipgloss.Color("#7aa2f7")
)
```

### Fonts
- **Primary**: JetBrains Mono Nerd Font / JetBrainsMono Nerd Font
- **UI**: FiraCode Nerd Font / Monospace fallback

### Visual Style
- **Borders**: Rounded corners (radius 8-12px equivalent in TUI)
- **Shadows**: Subtle double-border effect for depth
- **Spacing**: Generous padding (2-4 chars)
- **Glassmorphism**: Semi-transparent backgrounds with blur suggestion

## Files to Modify

### 1. `/mnt/shared/projects/tinapple/tinapple-installer/tui/main.go`

#### A. Define Ryoku Theme Constants (top of file after imports)
```go
// Ryoku Design System
var (
    RyokuBlue       = lipgloss.Color("#7aa2f7")
    RyokuBlueDim    = lipgloss.Color("#5a8adf")
    RyokuBg         = lipgloss.Color("#1a1b26")
    RyokuBgAlt      = lipgloss.Color("#24283b")
    RyokuBgFloat    = lipgloss.Color("#1f2335")
    RyokuFg         = lipgloss.Color("#c0caf5")
    RyokuFgMuted    = lipgloss.Color("#565f89")
    RyokuFgDim      = lipgloss.Color("#414868")
    RyokuSuccess    = lipgloss.Color("#9ece6a")
    RyokuWarning    = lipgloss.Color("#e0af68")
    RyokuDanger     = lipgloss.Color("#f7768e")
    RyokuInfo       = lipgloss.Color("#7dcfff")
    RyokuPurple     = lipgloss.Color("#bb9af7")
    RyokuOrange     = lipgloss.Color("#ff9e64")
    RyokuBorder     = lipgloss.Color("#414868")
    RyokuBorderFocus = lipgloss.Color("#7aa2f7")
)
```

#### B. Replace All Style Definitions
```go
// Replace all existing style definitions with Ryoku styles
var (
    // Title/Headers
    titleStyle = lipgloss.NewStyle().
        Bold(true).
        Foreground(RyokuBlue).
        Background(RyokuBgAlt).
        Padding(0, 2).
        MarginBottom(1).
        Border(lipgloss.RoundedBorder()).
        BorderForeground(RyokuBorder)

    selectedStyle = lipgloss.NewStyle().
        Foreground(RyokuBlue).
        Bold(true).
        Background(RyokuBgFloat)

    helpStyle = lipgloss.NewStyle().
        Foreground(RyokuFgMuted).
        Italic(true).
        PaddingLeft(2)

    errorStyle = lipgloss.NewStyle().
        Foreground(RyokuDanger).
        Bold(true).
        Background(RyokuBgAlt).
        Padding(0, 1)

    successStyle = lipgloss.NewStyle().
        Foreground(RyokuSuccess).
        Bold(true).

    warningStyle = lipgloss.NewStyle().
        Foreground(RyokuWarning).
        Bold(true).

    infoStyle = lipgloss.NewStyle().
        Foreground(RyokuInfo).
        Bold(true).

    // Card/Container styles
    cardStyle = lipgloss.NewStyle().
        Background(RyokuBgAlt).
        Border(lipgloss.RoundedBorder()).
        BorderForeground(RyokuBorder).
        Padding(1, 2).
        MarginBottom(1)

    cardStyleFocus = cardStyle.Copy().
        BorderForeground(RyokuBorderFocus)

    // Progress bar
    progressBarStyle = lipgloss.NewStyle().
        Foreground(RyokuBlue).
        Background(RyokuBgFloat).
        Height(1)

    progressBarEmpty = lipgloss.NewStyle().
        Background(RyokuBg).
        Height(1)

    // Status badges
    badgeRunning = lipgloss.NewStyle().
        Foreground(RyokuBg).
        Background(RyokuSuccess).
        Padding(0, 1).
        Bold(true)

    badgeStopped = lipgloss.NewStyle().
        Foreground(RyokuBg).
        Background(RyokuDanger).
        Padding(0, 1).
        Bold(true)

    badgePending = lipgloss.NewStyle().
        Foreground(RyokuBg).
        Background(RyokuWarning).
        Padding(0, 1).
        Bold(true)

    badgeUnknown = lipgloss.NewStyle().
        Foreground(RyokuFgMuted).
        Background(RyokuBgAlt).
        Padding(0, 1).

    // Section headers
    sectionHeader = lipgloss.NewStyle().
        Bold(true).
        Foreground(RyokuFg).
        MarginBottom(1).
        Border(lipgloss.NormalBorder(), false, false, true, false).
        BorderForeground(RyokuBorder)

    // Input fields
    inputStyle = lipgloss.NewStyle().
        Background(RyokuBgFloat).
        Foreground(RyokuFg).
        Border(lipgloss.RoundedBorder()).
        BorderForeground(RyokuBorder).
        Padding(0, 1)

    inputStyleFocus = inputStyle.Copy().
        BorderForeground(RyokuBorderFocus)

    // Button styles
    btnPrimary = lipgloss.NewStyle().
        Foreground(RyokuBg).
        Background(RyokuBlue).
        Bold(true).
        Padding(0, 2).
        Border(lipgloss.RoundedBorder()).
        BorderForeground(RyokuBlue)

    btnSecondary = lipgloss.NewStyle().
        Foreground(RyokuFg).
        Background(RyokuBgFloat).
        Padding(0, 2).
        Border(lipgloss.RoundedBorder()).
        BorderForeground(RyokuBorder)

    btnDanger = lipgloss.NewStyle().
        Foreground(RyokuBg).
        Background(RyokuDanger).
        Bold(true).
        Padding(0, 2).
        Border(lipgloss.RoundedBorder()).
        BorderForeground(RyokuDanger)
)
```

#### C. Update View Rendering
Replace all `renderChoices`, `renderMultiChoices`, `View()` method to use Ryoku styles:
- Title bar with Ryoku logo/branding
- Cards with `cardStyle` / `cardStyleFocus`
- Progress bars with gradient
- Status badges with `badgeRunning`/`badgeStopped`/`badgePending`
- Input fields with `inputStyle`/`inputStyleFocus`
- Buttons with `btnPrimary`/`btnSecondary`/`btnDanger`

#### D. Add Ryoku ASCII Logo
```go
const ryokuLogo = `
╔══════════════════════════════════════╗
║  ██████╗ ██████╗ ██╗  ██╗███████╗██╗  ██╗ ║
║  ██╔══██╗██╔══██╗██║ ██╔╝██╔════╝██║ ██╔╝ ║
║  ██████╔╝██████╔╝█████╔╝ █████╗  █████╔╝  ║
║  ██╔══██╗██╔══██╗██╔═██╗ ██╔══╝  ██╔═██╗  ║
║  ██║  ██║██║  ██║██║  ██║███████╗██║  ██║ ║
║  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ║
╚══════════════════════════════════════╝
`
```

#### E. Add Ryoku-Style Keybind Hints Bar
```go
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
        parts = append(parts, 
            lipgloss.NewStyle().Foreground(RyokuFgDim).Render(h.key) + 
            " " + lipgloss.NewStyle().Foreground(RyokuFgMuted).Render(h.desc))
    }
    return lipgloss.NewStyle().
        Foreground(RyokuFgMuted).
        Border(lipgloss.RoundedBorder()).
        BorderForeground(RyokuBorder).
        Padding(0, 1).
        Render(strings.Join(parts, "  │  "))
}
```

### 2. Ryoku ASCII Logo (for banner)
```go
const ryokuBanner = `
╔════════════════════════════════════════════════════════════╗
║  ██████╗ ██████╗ ██╗  ██╗███████╗██╗  ██╗                   ║
║  ██╔══██╗██╔══██╗██║ ██╔╝██╔════╝██║ ██╔╝                   ║
║  ██████╔╝██████╔╝█████╔╝ █████╗  █████╔╝                    ║
║  ██╔══██╗██╔══██╗██╔═██╗ ██╔══╝  ██╔═██╗                   ║
║  ██║  ██║██║  ██║██║  ██║███████╗██║  ██║                   ║
║  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝                   ║
╚═══════════════════════════════════════════════════════════╝
                    Ryoku Installer v0.0.1
`
```

## Verification Checklist
- [x] All colors match Ryoku palette exactly
- [x] Borders are rounded (lipgloss.RoundedBorder)
- [x] Focus states use RyokuBlue focus color
- [x] No generic bubbletea defaults visible
- [x] Ryoku logo/banner displays on welcome screen
- [x] Keybind hints bar matches Ryoku style
- [x] Status badges use Ryoku semantic colors
- [x] Progress bars use Ryoku gradient
- [x] Error/success toasts use Ryoku semantic colors
- [x] Help text uses RyokuFgMuted/italic