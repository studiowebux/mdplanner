package domain

// C4Connection represents a connection between C4 components
type C4Connection struct {
	Target string `json:"target"`
	Label  string `json:"label,omitempty"`
}

// C4Component represents a component in a C4 architecture diagram
type C4Component struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Level       string         `json:"level"` // "context", "container", "component", "code"
	Type        string         `json:"type"`  // "Person", "System", "Container", "Component", "Database", etc.
	Technology  string         `json:"technology,omitempty"`
	Description string         `json:"description,omitempty"`
	Position    Position       `json:"position"`
	Connections []C4Connection `json:"connections,omitempty"`
	Children    []string       `json:"children,omitempty"` // IDs of child components
	Parent      string         `json:"parent,omitempty"`   // ID of parent component
}
