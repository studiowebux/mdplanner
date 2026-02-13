package markdown

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// BackupManager handles automatic backups with hash deduplication
type BackupManager struct {
	backupDir  string
	maxBackups int
	lastHash   map[string]string // path -> hash
}

// NewBackupManager creates a new backup manager
func NewBackupManager(backupDir string, maxBackups int) *BackupManager {
	return &BackupManager{
		backupDir:  backupDir,
		maxBackups: maxBackups,
		lastHash:   make(map[string]string),
	}
}

// CreateBackup creates a backup of the file if content has changed
func (bm *BackupManager) CreateBackup(filePath string) error {
	content, err := os.ReadFile(filePath)
	if err != nil {
		// File doesn't exist yet, nothing to backup
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("read file for backup: %w", err)
	}

	// Calculate hash
	hash := sha256.Sum256(content)
	hashStr := hex.EncodeToString(hash[:])

	// Check if content changed
	if bm.lastHash[filePath] == hashStr {
		return nil // No changes, skip backup
	}
	bm.lastHash[filePath] = hashStr

	// Ensure backup directory exists
	if err := os.MkdirAll(bm.backupDir, 0755); err != nil {
		return fmt.Errorf("create backup dir: %w", err)
	}

	// Generate backup filename
	baseName := strings.TrimSuffix(filepath.Base(filePath), ".md")
	timestamp := time.Now().Format("2006-01-02T15-04-05-000")
	backupPath := filepath.Join(bm.backupDir, fmt.Sprintf("%s_backup_%s.md", baseName, timestamp))

	// Write backup
	if err := os.WriteFile(backupPath, content, 0644); err != nil {
		return fmt.Errorf("write backup: %w", err)
	}

	// Cleanup old backups
	return bm.cleanupOldBackups(baseName)
}

// cleanupOldBackups removes old backups beyond maxBackups limit
func (bm *BackupManager) cleanupOldBackups(baseName string) error {
	pattern := filepath.Join(bm.backupDir, baseName+"_backup_*.md")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return fmt.Errorf("glob backups: %w", err)
	}

	if len(matches) <= bm.maxBackups {
		return nil
	}

	// Sort by modification time (oldest first)
	type fileInfo struct {
		path    string
		modTime time.Time
	}
	files := make([]fileInfo, 0, len(matches))
	for _, path := range matches {
		info, err := os.Stat(path)
		if err != nil {
			continue
		}
		files = append(files, fileInfo{path: path, modTime: info.ModTime()})
	}
	sort.Slice(files, func(i, j int) bool {
		return files[i].modTime.Before(files[j].modTime)
	})

	// Remove oldest backups
	toRemove := len(files) - bm.maxBackups
	for i := 0; i < toRemove; i++ {
		if err := os.Remove(files[i].path); err != nil {
			// Log but don't fail
			fmt.Printf("warning: failed to remove old backup %s: %v\n", files[i].path, err)
		}
	}

	return nil
}
