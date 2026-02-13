package domain

// Position represents x,y coordinates on a canvas
type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// Size represents width and height dimensions
type Size struct {
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

// StickyNote represents a sticky note on the canvas
type StickyNote struct {
	ID       string   `json:"id"`
	Content  string   `json:"content"`
	Color    string   `json:"color"` // "yellow", "pink", "blue", "green", "purple", "orange"
	Position Position `json:"position"`
	Size     Size     `json:"size"`
}

// MindmapNode represents a node in a mindmap
type MindmapNode struct {
	ID       string        `json:"id"`
	Text     string        `json:"text"`
	Level    int           `json:"level"`
	Children []MindmapNode `json:"children,omitempty"`
	Parent   string        `json:"parent,omitempty"`
}

// Mindmap represents a complete mindmap diagram
type Mindmap struct {
	ID    string        `json:"id"`
	Title string        `json:"title"`
	Nodes []MindmapNode `json:"nodes"`
}
