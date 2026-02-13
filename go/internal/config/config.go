package config

import (
	"os"
	"strconv"
)

// Config holds application configuration
type Config struct {
	Port          int
	DataDirectory string
	MaxBackups    int
	BackupDir     string
	Debug         bool
}

// Load reads configuration from environment variables with defaults
func Load() *Config {
	return &Config{
		Port:          getEnvInt("MDPLANNER_PORT", 8003),
		DataDirectory: getEnvStr("MDPLANNER_DATA_DIR", "."),
		MaxBackups:    getEnvInt("MD_PLANNER_MAX_BACKUPS", 10),
		BackupDir:     getEnvStr("MD_PLANNER_BACKUP_DIR", "./backups"),
		Debug:         getEnvBool("MDPLANNER_DEBUG", false),
	}
}

func getEnvStr(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return defaultVal
}

func getEnvBool(key string, defaultVal bool) bool {
	if v := os.Getenv(key); v != "" {
		return v == "true" || v == "1"
	}
	return defaultVal
}
