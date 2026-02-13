package domain

// Goal represents a project or enterprise goal
type Goal struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description,omitempty"`
	Type        string `json:"type"` // "enterprise", "project"
	KPI         string `json:"kpi,omitempty"`
	StartDate   string `json:"startDate,omitempty"`
	EndDate     string `json:"endDate,omitempty"`
	Status      string `json:"status"` // "planning", "on-track", "at-risk", "late", "success", "failed"
}
