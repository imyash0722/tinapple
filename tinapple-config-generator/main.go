package main

import (
	"fmt"
	"io"
	"os"

	"tinapple-config-generator/manifest"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Usage: tinapple-config-generator <command> [args...]\n")
		fmt.Fprintf(os.Stderr, "Commands: generate, validate, migrate, nginx-sync\n")
		os.Exit(1)
	}

	cmd := os.Args[1]
	switch cmd {
	case "caddy-sync", "proxy-sync":
		if err := syncCaddy(os.Args[2:]); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}

	case "nginx-sync":
		hasStdin := false
		newArgs := make([]string, 0, len(os.Args[2:]))
		for _, arg := range os.Args[2:] {
			if arg == "--catalog-stdin" || arg == "-catalog-stdin" {
				hasStdin = true
			} else {
				newArgs = append(newArgs, arg)
			}
		}
		if hasStdin {
			data, err := io.ReadAll(os.Stdin)
			if err == nil && len(data) > 0 {
				_ = os.MkdirAll("/var/lib/tinapple", 0755)
				_ = os.WriteFile("/var/lib/tinapple/nginx-catalog.json", data, 0644)
				_ = os.WriteFile("/var/lib/tinapple/caddy-catalog.json", data, 0644)
			}
		}
		// Synchronize both Nginx and Caddy to ensure unified multi-proxy transition
		_ = syncCaddy(newArgs)
		if err := syncNginx(newArgs); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}

	case "generate":
		if len(os.Args) < 3 {
			fmt.Fprintf(os.Stderr, "Usage: tinapple-config-generator generate <manifest.yaml> [output-dir]\n")
			os.Exit(1)
		}
		manifestFile := os.Args[2]
		outputDir := "/etc/tinapple/generated"
		if len(os.Args) > 3 {
			outputDir = os.Args[3]
		}

		m, err := manifest.LoadManifest(manifestFile)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error loading manifest: %v\n", err)
			os.Exit(1)
		}

		if err := manifest.GenerateConfigs(m, outputDir); err != nil {
			fmt.Fprintf(os.Stderr, "Error generating configs: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("Configs generated to %s\n", outputDir)

	case "validate":
		if len(os.Args) < 3 {
			fmt.Fprintf(os.Stderr, "Usage: tinapple-config-generator validate <manifest.yaml>\n")
			os.Exit(1)
		}
		manifestFile := os.Args[2]
		m, err := manifest.LoadManifest(manifestFile)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error loading manifest: %v\n", err)
			os.Exit(1)
		}
		if err := manifest.Validate(m); err != nil {
			fmt.Fprintf(os.Stderr, "Validation failed: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("Manifest is valid")

	case "migrate":
		fmt.Println("Migration not yet implemented")

	default:
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n", cmd)
		os.Exit(1)
	}
}
