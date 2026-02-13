package markdown

import "sync"

// FileLock provides mutex-based write locking per file
type FileLock struct {
	mu    sync.Mutex
	locks map[string]*sync.Mutex
}

// NewFileLock creates a new file lock manager
func NewFileLock() *FileLock {
	return &FileLock{
		locks: make(map[string]*sync.Mutex),
	}
}

// getLock returns the mutex for a specific file path
func (fl *FileLock) getLock(path string) *sync.Mutex {
	fl.mu.Lock()
	defer fl.mu.Unlock()

	if fl.locks[path] == nil {
		fl.locks[path] = &sync.Mutex{}
	}
	return fl.locks[path]
}

// WithLock executes a function while holding the lock for a file
func (fl *FileLock) WithLock(path string, fn func() error) error {
	lock := fl.getLock(path)
	lock.Lock()
	defer lock.Unlock()
	return fn()
}
