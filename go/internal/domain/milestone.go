package domain

// Milestone represents a project milestone
type Milestone struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Target      string `json:"target"` // Target date
	Status      string `json:"status"` // "open", "closed"
	Description string `json:"description,omitempty"`
}

// MilestoneWithProgress includes computed progress metrics
type MilestoneWithProgress struct {
	Milestone
	TaskCount      int `json:"taskCount"`
	CompletedCount int `json:"completedCount"`
	Progress       int `json:"progress"` // 0-100
}
