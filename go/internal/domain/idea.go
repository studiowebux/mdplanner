package domain

// Idea represents an idea with Zettelkasten-style linking
type Idea struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Status      string   `json:"status"` // "new", "considering", "planned", "rejected"
	Category    string   `json:"category,omitempty"`
	Created     string   `json:"created"`
	Description string   `json:"description,omitempty"`
	Links       []string `json:"links,omitempty"` // IDs of linked ideas
}

// IdeaWithBacklinks includes computed backlinks
type IdeaWithBacklinks struct {
	Idea
	Backlinks []string `json:"backlinks,omitempty"` // IDs of ideas that link to this one
}
