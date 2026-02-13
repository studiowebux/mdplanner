package domain

// Retrospective represents a team retrospective
type Retrospective struct {
	ID       string   `json:"id"`
	Title    string   `json:"title"`
	Date     string   `json:"date"`
	Status   string   `json:"status"` // "open", "closed"
	Continue []string `json:"continue,omitempty"`
	Stop     []string `json:"stop,omitempty"`
	Start    []string `json:"start,omitempty"`
}
