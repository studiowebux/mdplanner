package markdown

import (
	"fmt"
	"os"
)

// Writer handles atomic file writes
type Writer struct {
	fileLock      *FileLock
	backupManager *BackupManager
}

// NewWriter creates a new atomic writer
func NewWriter(lock *FileLock, backup *BackupManager) *Writer {
	return &Writer{
		fileLock:      lock,
		backupManager: backup,
	}
}

// WriteFile writes content to file atomically with backup
func (w *Writer) WriteFile(filePath, content string) error {
	return w.fileLock.WithLock(filePath, func() error {
		// Create backup before writing
		if err := w.backupManager.CreateBackup(filePath); err != nil {
			return fmt.Errorf("create backup: %w", err)
		}

		// Atomic write: temp file + rename
		return w.atomicWrite(filePath, content)
	})
}

// atomicWrite writes to temp file then renames
func (w *Writer) atomicWrite(filePath, content string) error {
	tempPath := filePath + ".tmp"

	// Write to temp file
	if err := os.WriteFile(tempPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("write temp file: %w", err)
	}

	// Atomic rename
	if err := os.Rename(tempPath, filePath); err != nil {
		os.Remove(tempPath) // Cleanup on failure
		return fmt.Errorf("rename temp to target: %w", err)
	}

	return nil
}
