package main

import (
	"fmt"
	"os"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/spf13/cobra"

	"chaddy-store/internal/config"
	"chaddy-store/internal/store"
	"chaddy-store/internal/tui"
	"chaddy-store/internal/tui/settings"
)

func main() {
	cfg := config.Load()
	st := store.New(cfg)

	rootCmd := &cobra.Command{
		Use:   "chaddy-store",
		Short: "Tinapple OS App Store & Package Manager",
		Long:  "Chaddy Store - Visual and CLI Application Management for Tinapple OS",
		Run: func(cmd *cobra.Command, args []string) {
			if len(args) == 0 {
				runTUI(st)
			}
		},
	}

	rootCmd.AddCommand(&cobra.Command{
		Use:   "tui",
		Short: "Launch interactive Chaddy Store TUI",
		Run: func(cmd *cobra.Command, args []string) {
			runTUI(st)
		},
	})

	rootCmd.AddCommand(&cobra.Command{
		Use:   "install [app...]",
		Short: "Install applications",
		Args:  cobra.MinimumNArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Printf("Installing %v...\n", args)
			if err := st.Install(args); err != nil {
				fmt.Fprintf(os.Stderr, "Error: %v\n", err)
				os.Exit(1)
			}
			fmt.Println("Installation complete.")
		},
	})

	rootCmd.AddCommand(&cobra.Command{
		Use:   "remove [app...]",
		Short: "Remove applications",
		Args:  cobra.MinimumNArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Printf("Removing %v...\n", args)
			if err := st.Remove(args); err != nil {
				fmt.Fprintf(os.Stderr, "Error: %v\n", err)
				os.Exit(1)
			}
			fmt.Println("Removal complete.")
		},
	})

	rootCmd.AddCommand(&cobra.Command{
		Use:   "search [query]",
		Short: "Search for applications",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			results := st.Search(args[0])
			fmt.Printf("Found %d applications matching '%s':\n\n", len(results), args[0])
			for _, app := range results {
				status := "[Available]"
				if app.Installed {
					status = "[Installed]"
				}
				fmt.Printf("  %-16s %-12s %-25s %s\n", app.ID, status, app.Name, app.Description)
			}
		},
	})

	rootCmd.AddCommand(&cobra.Command{
		Use:   "list",
		Short: "List installed applications",
		Run: func(cmd *cobra.Command, args []string) {
			installed := st.ListInstalled()
			fmt.Printf("Installed Applications (%d):\n\n", len(installed))
			for _, app := range installed {
				fmt.Printf("  %-16s %-25s %s\n", app.ID, app.Name, app.Version)
			}
		},
	})

	rootCmd.AddCommand(&cobra.Command{
		Use:   "update",
		Short: "Update all packages",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("Updating system packages...")
			if err := st.UpdateAll(); err != nil {
				fmt.Fprintf(os.Stderr, "Update error: %v\n", err)
				os.Exit(1)
			}
		},
	})

	rootCmd.AddCommand(&cobra.Command{
		Use:   "update-db",
		Short: "Update local package database",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("Refreshing package database...")
			if err := st.UpdateDatabase(); err != nil {
				fmt.Fprintf(os.Stderr, "Refresh error: %v\n", err)
				os.Exit(1)
			}
			fmt.Println("Database refreshed successfully.")
		},
	})

	rootCmd.AddCommand(&cobra.Command{
		Use:   "settings",
		Short: "Launch Chaddy Settings TUI",
		Run: func(cmd *cobra.Command, args []string) {
			settings.ExecSettings()
		},
	})

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func runTUI(st *store.Store) {
	m := tui.NewModel(st)
	p := tea.NewProgram(m, tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error running Chaddy Store TUI: %v\n", err)
		os.Exit(1)
	}
}
