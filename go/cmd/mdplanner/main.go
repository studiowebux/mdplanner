package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/studiowebux/mdplanner/internal/api"
	"github.com/studiowebux/mdplanner/internal/config"
	"github.com/studiowebux/mdplanner/internal/storage/markdown"
	"github.com/studiowebux/mdplanner/web"
)

func main() {
	// Parse command line flags
	var (
		port     int
		dataDir  string
		showHelp bool
	)

	flag.IntVar(&port, "port", 0, "HTTP server port (default: 8003, or MDPLANNER_PORT env)")
	flag.StringVar(&dataDir, "data", "", "Data directory (default: current dir, or MDPLANNER_DATA_DIR env)")
	flag.BoolVar(&showHelp, "help", false, "Show help")
	flag.Parse()

	if showHelp {
		printHelp()
		os.Exit(0)
	}

	// Load configuration
	cfg := config.Load()

	// Override with flags if provided
	if port != 0 {
		cfg.Port = port
	}
	if dataDir != "" {
		cfg.DataDirectory = dataDir
	}

	// Create storage backend
	store := markdown.NewParser(cfg.DataDirectory, cfg.BackupDir, cfg.MaxBackups)

	// Handle positional argument (markdown file)
	args := flag.Args()
	if len(args) > 0 {
		if err := store.SwitchProject(nil, args[0]); err != nil {
			log.Printf("Warning: Could not switch to %s: %v", args[0], err)
		} else {
			log.Printf("Using markdown file: %s", args[0])
		}
	}

	// Create router with static file handler and storage
	router := api.Router(web.StaticHandler(), store)

	// Start server
	addr := fmt.Sprintf(":%d", cfg.Port)
	log.Printf("MD Planner v%s starting on http://localhost%s", api.Version, addr)
	log.Printf("Data directory: %s", cfg.DataDirectory)

	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func printHelp() {
	fmt.Println(`MD Planner - Markdown-based Project Management

Usage:
  mdplanner [options] [markdown-file]

Options:
  -port int      HTTP server port (default: 8003)
  -data string   Data directory path (default: current directory)
  -help          Show this help message

Environment Variables:
  MDPLANNER_PORT           Server port
  MDPLANNER_DATA_DIR       Data directory
  MD_PLANNER_MAX_BACKUPS   Maximum backup files to keep (default: 10)
  MD_PLANNER_BACKUP_DIR    Backup directory (default: ./backups)
  MDPLANNER_DEBUG          Enable debug logging

Examples:
  mdplanner                    Start with defaults
  mdplanner project.md         Start with specific markdown file
  mdplanner -port 3000         Start on port 3000
  mdplanner -data /path/to/dir Start with data directory`)
}
