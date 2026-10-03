package config

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"text/template"
	"time"
)

type ConfigManager struct {
	TemplatesDir string                     `json:"templates_dir"`
	BackupDir    string                     `json:"backup_dir"`
	Templates    map[string]*ConfigTemplate `json:"templates"`
	Applied      map[string]*AppliedConfig  `json:"applied"`
	Backups      []Backup                   `json:"backups"`
}

type ConfigTemplate struct {
	Name        string              `json:"name"`
	Description string              `json:"description"`
	Category    string              `json:"category"`
	Files       map[string]string   `json:"files"` // destination path -> template content
	Variables   map[string]Variable `json:"variables"`
	Services    []string            `json:"services"`
	Commands    []string            `json:"commands"`
	Priority    int                 `json:"priority"`
}

type Variable struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Default     string   `json:"default"`
	Required    bool     `json:"required"`
	Type        string   `json:"type"` // string, bool, int, path, password, select
	Options     []string `json:"options,omitempty"`
	Validator   string   `json:"validator,omitempty"`
}

type AppliedConfig struct {
	TemplateName    string            `json:"template_name"`
	AppliedAt       time.Time         `json:"applied_at"`
	Variables       map[string]string `json:"variables"`
	FilesWritten    []string          `json:"files_written"`
	ServicesEnabled []string          `json:"services_enabled"`
	BackupID        string            `json:"backup_id"`
}

type Backup struct {
	ID        string            `json:"id"`
	Timestamp time.Time         `json:"timestamp"`
	Files     map[string]string `json:"files"` // path -> original content
	Reason    string            `json:"reason"`
}

func NewConfigManager(templatesDir, backupDir string) *ConfigManager {
	if templatesDir == "" {
		templatesDir = "/etc/tinapple/templates"
	}
	if backupDir == "" {
		backupDir = "/var/backups/tinapple-configs"
	}
	return &ConfigManager{
		TemplatesDir: templatesDir,
		BackupDir:    backupDir,
		Templates:    make(map[string]*ConfigTemplate),
		Applied:      make(map[string]*AppliedConfig),
		Backups:      []Backup{},
	}
}

func (cm *ConfigManager) LoadTemplates() error {
	if _, err := os.Stat(cm.TemplatesDir); os.IsNotExist(err) {
		return nil
	}

	entries, err := os.ReadDir(cm.TemplatesDir)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}
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

func (cm *ConfigManager) RegisterTemplate(tmpl *ConfigTemplate) {
	if tmpl != nil && tmpl.Name != "" {
		cm.Templates[tmpl.Name] = tmpl
	}
}

func (cm *ConfigManager) ApplyTemplate(name string, vars map[string]string) (*AppliedConfig, error) {
	tmpl, ok := cm.Templates[name]
	if !ok {
		return nil, fmt.Errorf("template not found: %s", name)
	}

	if vars == nil {
		vars = make(map[string]string)
	}

	// Apply defaults
	for vName, v := range tmpl.Variables {
		if _, exists := vars[vName]; !exists && v.Default != "" {
			vars[vName] = v.Default
		}
	}

	// Validate required variables
	for vName, v := range tmpl.Variables {
		if v.Required {
			val, exists := vars[vName]
			if !exists || strings.TrimSpace(val) == "" {
				return nil, fmt.Errorf("required variable %s not provided", vName)
			}
		}
	}

	backup := Backup{
		ID:        fmt.Sprintf("backup-%d", time.Now().UnixNano()),
		Timestamp: time.Now(),
		Files:     make(map[string]string),
		Reason:    fmt.Sprintf("Applying template: %s", name),
	}

	applied := &AppliedConfig{
		TemplateName:    name,
		AppliedAt:       time.Now(),
		Variables:       vars,
		FilesWritten:    []string{},
		ServicesEnabled: []string{},
		BackupID:        backup.ID,
	}

	for targetPathTmpl, contentTmpl := range tmpl.Files {
		// Render target path if it has variables
		pTmpl, err := template.New("path").Parse(targetPathTmpl)
		if err != nil {
			return nil, fmt.Errorf("path template error (%s): %w", targetPathTmpl, err)
		}
		var pathBuf strings.Builder
		if err := pTmpl.Execute(&pathBuf, vars); err != nil {
			return nil, fmt.Errorf("path execution error: %w", err)
		}
		targetPath := pathBuf.String()

		// Render content
		cTmpl, err := template.New("content").Parse(contentTmpl)
		if err != nil {
			return nil, fmt.Errorf("content template parse error for %s: %w", targetPath, err)
		}
		var contentBuf strings.Builder
		if err := cTmpl.Execute(&contentBuf, vars); err != nil {
			return nil, fmt.Errorf("content template execution error for %s: %w", targetPath, err)
		}
		renderedContent := contentBuf.String()

		// Backup original file if exists
		if origData, err := os.ReadFile(targetPath); err == nil {
			backup.Files[targetPath] = string(origData)
		}

		if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
			return nil, fmt.Errorf("failed to create directory for %s: %w", targetPath, err)
		}
		if err := os.WriteFile(targetPath, []byte(renderedContent), 0644); err != nil {
			return nil, fmt.Errorf("failed to write %s: %w", targetPath, err)
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

	// Run commands
	for _, cmd := range tmpl.Commands {
		if err := exec.Command("sh", "-c", cmd).Run(); err != nil {
			log.Printf("Warning: command failed (%s): %v", cmd, err)
		}
	}

	// Persist backup record
	cm.Backups = append(cm.Backups, backup)
	cm.Applied[name] = applied

	return applied, nil
}

func enableService(name string) error {
	cmd := exec.Command("systemctl", "enable", name)
	return cmd.Run()
}

func (cm *ConfigManager) RestoreBackup(backupID string) error {
	for i, b := range cm.Backups {
		if b.ID == backupID {
			for path, content := range b.Files {
				_ = os.MkdirAll(filepath.Dir(path), 0755)
				if err := os.WriteFile(path, []byte(content), 0644); err != nil {
					return fmt.Errorf("failed to restore %s: %w", path, err)
				}
			}
			cm.Backups = append(cm.Backups[:i], cm.Backups[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("backup not found: %s", backupID)
}

func (cm *ConfigManager) ListTemplates() []*ConfigTemplate {
	templates := make([]*ConfigTemplate, 0, len(cm.Templates))
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
