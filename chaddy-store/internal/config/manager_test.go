package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestConfigManagerTemplateApplyAndRestore(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "config-mgr-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	tmplDir := filepath.Join(tmpDir, "templates")
	backupDir := filepath.Join(tmpDir, "backups")
	targetFile := filepath.Join(tmpDir, "etc", "testapp.conf")

	_ = os.MkdirAll(tmplDir, 0755)

	// Create a dummy template
	tmpl := &ConfigTemplate{
		Name:        "testapp",
		Description: "Test application configuration",
		Category:    "test",
		Files: map[string]string{
			targetFile: "PORT={{.port}}\nUSER={{.user}}\nENABLED={{.enabled}}\n",
		},
		Variables: map[string]Variable{
			"port":    {Name: "port", Default: "8080", Required: true, Type: "int"},
			"user":    {Name: "user", Default: "admin", Required: true, Type: "string"},
			"enabled": {Name: "enabled", Default: "true", Required: false, Type: "bool"},
		},
	}

	cm := NewConfigManager(tmplDir, backupDir)
	cm.RegisterTemplate(tmpl)

	// 1. Initial write
	applied, err := cm.ApplyTemplate("testapp", map[string]string{
		"port": "9090",
		"user": "tinapple",
	})
	if err != nil {
		t.Fatalf("ApplyTemplate failed: %v", err)
	}

	if len(applied.FilesWritten) != 1 || applied.FilesWritten[0] != targetFile {
		t.Errorf("Expected files written to contain %s, got %v", targetFile, applied.FilesWritten)
	}

	content, err := os.ReadFile(targetFile)
	if err != nil {
		t.Fatalf("Failed to read target file: %v", err)
	}

	expected := "PORT=9090\nUSER=tinapple\nENABLED=true\n"
	if string(content) != expected {
		t.Errorf("Rendered content mismatch.\nExpected:\n%s\nGot:\n%s", expected, string(content))
	}

	// 2. Second apply to verify backup creation
	applied2, err := cm.ApplyTemplate("testapp", map[string]string{
		"port": "3000",
		"user": "root",
	})
	if err != nil {
		t.Fatalf("Second ApplyTemplate failed: %v", err)
	}

	newContent, _ := os.ReadFile(targetFile)
	if string(newContent) != "PORT=3000\nUSER=root\nENABLED=true\n" {
		t.Errorf("Second apply did not update file correctly")
	}

	// 3. Restore backup
	err = cm.RestoreBackup(applied2.BackupID)
	if err != nil {
		t.Fatalf("RestoreBackup failed: %v", err)
	}

	restoredContent, _ := os.ReadFile(targetFile)
	if string(restoredContent) != expected {
		t.Errorf("Restored content mismatch.\nExpected:\n%s\nGot:\n%s", expected, string(restoredContent))
	}
}
