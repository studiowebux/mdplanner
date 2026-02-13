package domain

// ProjectConfig holds project-level configuration
type ProjectConfig struct {
	StartDate      string   `json:"startDate,omitempty"`
	WorkingDays    int      `json:"workingDays,omitempty"`
	CustomSchedule []string `json:"customSchedule,omitempty"` // ["Mon", "Tue", "Wed", "Thu", "Fri"]
	Assignees      []string `json:"assignees,omitempty"`
	Tags           []string `json:"tags,omitempty"`
	Sections       []string `json:"sections,omitempty"`
	DefaultSection string   `json:"defaultSection,omitempty"`
}

// ProjectLink represents an external reference link
type ProjectLink struct {
	Title string `json:"title"`
	URL   string `json:"url"`
}

// ProjectStatus represents the current project status
type ProjectStatus struct {
	Status  string `json:"status"` // "active", "on-track", "at-risk", "late", "completed"
	Comment string `json:"comment,omitempty"`
}

// ProjectInfo holds project metadata and content
type ProjectInfo struct {
	Name        string                   `json:"name"`
	Description string                   `json:"description,omitempty"`
	Status      ProjectStatus            `json:"status"`
	Links       []ProjectLink            `json:"links,omitempty"`
	LastUpdated string                   `json:"lastUpdated,omitempty"`
	Notes       []Note                   `json:"notes,omitempty"`
	Goals       []Goal                   `json:"goals,omitempty"`
	StickyNotes []StickyNote             `json:"stickyNotes,omitempty"`
	Mindmaps    []Mindmap                `json:"mindmaps,omitempty"`
	C4Components []C4Component           `json:"c4Components,omitempty"`
}

// ProjectMeta holds basic info for project listing
type ProjectMeta struct {
	Filename    string `json:"filename"`
	Name        string `json:"name"`
	LastUpdated string `json:"lastUpdated,omitempty"`
}
