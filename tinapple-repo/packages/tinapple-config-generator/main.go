package main

import (
	"fmt"
	"os"

	"tinapple-config-generator/manifest"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintf(os.Stderr, "Usage: tinapple-config-generator <command> [args...]\n")
		fmt.Fprintf(os.Stderr, "Commands: generate, validate, migrate\n")
		os.Exit(1)
	}

	cmd := os.Args[1]
	switch cmd {
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