package domain

// NoteParagraph represents a paragraph within a note
type NoteParagraph struct {
	ID       string         `json:"id"`
	Type     string         `json:"type"` // "text", "code", "file", "image"
	Content  string         `json:"content"`
	Language string         `json:"language,omitempty"`
	Order    int            `json:"order"`
	Metadata map[string]any `json:"metadata,omitempty"`
}

// CustomSectionTab represents a tab in a tabs custom section
type CustomSectionTab struct {
	ID      string `json:"id"`
	Title   string `json:"title"`
	Content string `json:"content"`
}

// CustomSectionConfig holds configuration for custom sections
type CustomSectionConfig struct {
	Tabs     []CustomSectionTab `json:"tabs,omitempty"`
	Timeline []any              `json:"timeline,omitempty"`
	Left     string             `json:"left,omitempty"`
	Right    string             `json:"right,omitempty"`
}

// CustomSection represents a custom section within a note (tabs, timeline, split-view)
type CustomSection struct {
	ID     string              `json:"id"`
	Type   string              `json:"type"` // "tabs", "timeline", "split-view"
	Title  string              `json:"title"`
	Order  int                 `json:"order"`
	Config CustomSectionConfig `json:"config"`
}

// Note represents a document/note with optional enhanced content
type Note struct {
	ID             string          `json:"id"`
	Title          string          `json:"title"`
	Content        string          `json:"content"`
	Paragraphs     []NoteParagraph `json:"paragraphs,omitempty"`
	CustomSections []CustomSection `json:"customSections,omitempty"`
	CreatedAt      string          `json:"createdAt"`
	UpdatedAt      string          `json:"updatedAt"`
	Revision       int             `json:"revision"`
	Mode           string          `json:"mode,omitempty"` // "simple", "enhanced"
}
