# Task R2: Config Manager - Config Manager from tinarchy

## Goal
Build a configuration manager that reads templates from tinarchy/configs/, applies them with variable substitution, handles backup/restore, and manages service enablement.

## Files to Create/Modify

### 1. Config Manager Library
**Directory:** `/mnt/shared/projects/tinapple/chaddy-store/internal/config/`

#### `config/manager.go`
```go
package config

import (
"encoding/json"
"os"
"path/filepath"
"text/template"
"time"
)

type ConfigManager struct {
TemplatesDir string
BackupDir    string
Templates    map[string]*ConfigTemplate
Applied      map[string]*AppliedConfig
Backups      []Backup
}

type ConfigTemplate struct {
Name        string            `json:"name"`
Description string            `json:"description"`
Category    string            `json:"category"`
Files       map[string]string `json:"files"`       // path -> template content
Variables   map[string]Variable `json:"variables"`
Services    []string          `json:"services"`
Commands    []string          `json:"commands"`
Priority    int               `json:"priority"`
}

type Variable struct {
Name        string `json:"name"`
Description string `json:"description"`
Default     string `json:"default"`
Required    bool   `json:"required"`
Type        string `json:"type"` // string, bool, int, path, password, select
Options     []string `json:"options,omitempty"`
Validator   string `json:"validator,omitempty"` // regex pattern
}

type AppliedConfig struct {
TemplateName string            `json:"template_name"`
AppliedAt    time.Time         `json:"applied_at"`
Variables    map[string]string `json:"variables"`
FilesWritten []string          `json:"files_written"`
ServicesEnabled []string       `json:"services_enabled"`
BackupID     string            `json:"backup_id"`
}

type Backup struct {
ID        string            `json:"id"`
Timestamp time.Time         `json:"timestamp"`
Files     map[string]string `json:"files"` // path -> content
Reason    string            `json:"reason"`
}

func NewConfigManager(templatesDir, backupDir string) *ConfigManager {
return &ConfigManager{
TemplatesDir: templatesDir,
BackupDir:    backupDir,
Templates:    make(map[string]*ConfigTemplate),
Applied:      make(map[string]*AppliedConfig),
Backups:      []Backup{},
}
}

func (cm *ConfigManager) LoadTemplates() error {
// Scan templates directory for JSON configs
entries, err := os.ReadDir(cm.TemplatesDir)
if err != nil {
return err
}
for _, entry := range entries {
if filepath.Ext(entry.Name()) == ".json" {
data, err := os.ReadFile(filepath.Join(cm.TemplatesDir, entry.Name()))
if err != nil {
continue
}
var tmpl ConfigTemplate
if err := json.Unmarshal(data, &tmpl); err != nil {
continue
}
cm.Templates[tmpl.Name] = &tmpl
}
return nil
}
}

func (cm *ConfigManager) ApplyTemplate(name string, vars map[string]string) (*AppliedConfig, error) {
tmpl, ok := cm.Templates[name]
if !tmpl {
return nil, fmt.Errorf("template not found: %s", name)
}

// Validate required variables
for _, v := range tmpl.Variables {
if v.Required {
if _, ok := vars[v.Name]; !ok {
return nil, fmt.Errorf("required variable %s not provided", v.Name)
}
}
// Apply defaults
for _, v := range tmpl.Variables {
if _, ok := vars[v.Name]; !ok && v.Default != "" {
vars[v.Name] = v.Default
}
}

// Backup existing files
backup := Backup{
ID:        fmt.Sprintf("backup-%d", time.Now().Unix()),
Timestamp: time.Now(),
Files:     make(map[string]string),
Reason:    fmt.Sprintf("Applying template: %s", name),
}

applied := &AppliedConfig{
TemplateName: name,
AppliedAt:    time.Now(),
Variables:    vars,
FilesWritten: []string{},
BackupID:     backup.ID,
}

// Apply each file
for path, templateContent := range tmpl.Files {
// Render template
tmpl, err := template.New("config").Parse(templateContent)
if err != nil {
return nil, fmt.Errorf("template parse error: %w", err)
}

var buf strings.Builder
if err := tmpl.Execute(&buf, vars); err != nil {
return nil, fmt.Errorf("template execution error: %w", err)
}

content := buf.String()
targetPath := tmpl.Variables["path"] // or use the key from Files map

// Backup original
if original, err := os.ReadFile(targetPath); err == nil {
backup.Files[targetPath] = string(original)
}

// Write new content
if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
return nil, err
}
if err := os.WriteFile(targetPath, []byte(content), 0644); err != nil {
return nil, err
}

applied.FilesWritten = append(applied.FilesWritten, targetPath)
}

// Enable services
for _, svc := range tmpl.Services {
if err := enableService(svc); err != nil {
log.Printf("Warning: failed to enable service %s: %v", svc, err)
} else {
applied.ServicesEnabled = append(applied.ServicesEnabled, svc)
}
}

// Run post-install commands
for _, cmd := range tmpl.Commands {
if err := exec.Command("sh", "-c", cmd).Run(); err != nil {
log.Printf("Warning: command failed: %s: %v", cmd, err)
}
}

// Save backup
cm.Backups = append(cm.Backups, backup)
cm.Applied[name] = applied

return applied, nil
}
}

func (cm *ConfigManager) RestoreBackup(backupID string) error {
for i, b := range cm.Backups {
if b.ID == backupID {
for path, content := range b.Files {
if err := os.WriteFile(path, []byte(b.Files[path]), 0644); err != nil {
return err
}
}
// Remove from history
cm.Backups = append(cm.Backups[:i], cm.Backups[i+1:]...)
return nil
}
}
return fmt.Errorf("backup not found: %s", backupID)
}

func (cm *ConfigManager) ListTemplates() []*ConfigTemplate {
var templates []*ConfigTemplate
for _, t := range cm.Templates {
templates = append(templates, t)
}
return templates
}

func (cm *ConfigManager) GetApplied(name string) *AppliedConfig {
return cm.Applied[name]
}

func (cm *ConfigManager) ListBackups() []Backup {
return cm.Backups
}
```

### 2. Template Files (JSON)
**Directory:** `/mnt/shared/projects/tinapple/tinapple-config-generator/templates/`

**Example: `/mnt/shared/projects/tinapple/tinapple-config-generator/templates/chadwm.json`**
```json
{
  "name": "chadwm",
  "description": "chadwm window manager configuration",
  "category": "chadwm",
  "priority": 10,
  "files": {
    "/home/{{.user}}/.config/chadwm/config.h": "#define MODKEY Mod4Mask\n#define GAPS {{.gaps}}\n#define BORDER_WIDTH {{.border_width}}\n#define BORDER_COLOR_FOCUSED \"{{.border_color_focused}}\"\n#define BORDER_COLOR_UNFOCUSED \"{{.border_color_unfocused}}\"\n#define GAPS_INNER {{.gaps_inner}}\n#define GAPS_OUTER {{.gaps_outer}}\n#define SMART_GAPS {{.smart_gaps}}\n#define SMART_BORDERS {{.smart_borders}}\n#define BAR_POSITION \"{{.bar_position}}\"\n#define BAR_HEIGHT {{.bar_height}}\n#define FONT \"{{.font}}\"\n#define MODKEY {{.mod_key}}\n",
    "/home/{{.user}}/.config/picom/picom.conf": "backend = \"glx\";\nvsync = true;\nshadow = true;\nshadow-radius = 12;\nshadow-offset-x = -8;\nshadow-offset-y = -8;\nshadow-opacity = 0.3;\nfading = true;\nfade-in-step = 0.03;\nfade-out-step = 0.03;\n",
    "/home/{{.user}}/.config/polybar/config.ini": "[bar/main]\nmonitor = {{.monitor}}\nwidth = 100%\nheight = {{.bar_height}}\nbackground = ${colors.background}\nforeground = {{colors.foreground}}\nfont-0 = {{.font}}:size=10;2\nfont-1 = Noto Color Emoji:size=10;2\nmodules-left = tinapple-workspaces\nmodules-center = tinapple-date\nmodules-right = tinapple-pulseaudio tinapple-battery tinapple-network\n",
    "/home/{{.user}}/.config/rofi/config.rasi": "* { font: \"{{.font}}\"; }",
    "/home/{{.user}}/.config/dunst/dunstrc": "[global]\nfont = {{.font}}\nframe_width = 2\nframe_color = \"{{.border_color_focused}}\"\nformat = \"<b>{{summary}}</b>\\n{{body}}\""
}
```

### 2. System Template
```json
{
  "name": "system-base",
  "description": "Base system configuration",
  "category": "system",
  "priority": 100,
  "files": {
    "/etc/hostname": "{{.hostname}}",
    "/etc/hosts": "127.0.0.1\tlocalhost\n::1\tlocalhost\n127.0.1.1\t{{.hostname}}.localdomain\t{{.hostname}}",
    "/etc/locale.gen": "en_US.UTF-8 UTF-8\n{{.locale}} UTF-8",
    "/etc/locale.conf": "LANG={{.locale}}\nLC_TIME={{.locale}}",
    "/etc/vconsole.conf": "KEYMAP={{.keymap}}\nFONT={{.console_font}}",
    "/etc/locale.conf": "LANG={{.locale}}\nLC_TIME={{.locale}}",
    "/etc/timezone": "{{.timezone}}",
    "/etc/hostname": "{{.hostname}}"
  },
  "variables": {
    "hostname": {"name": "hostname", "description": "System hostname", "default": "tinapple", "required": true, "type": "string"},
    "timezone": {"name": "timezone", "description": "System timezone", "default": "UTC", "type": "string", "options": ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo"]},
    "locale": {"name": "locale", "description": "System locale", "default": "en_US.UTF-8", "type": "string"},
    "keymap": {"name": "keymap", "description": "Keyboard layout", "default": "us", "type": "string"}
  },
  "services": ["systemd-resolved", "systemd-networkd", "NetworkManager", "tinapple-hw-detect", "tinapple-power-profile-apply"],
  "commands": ["systemctl enable systemd-resolved systemd-networkd NetworkManager"]
}
```

---

## Verification
```bash
cd /mnt/shared/projects/tinapple/chaddy-store
go build -o ../bin/chaddy-store ./cmd/chaddy-store
./bin/chaddy-store --help
./bin/chaddy-store --dry-run install vim
```
