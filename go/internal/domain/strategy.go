package domain

// StrategicLevelType defines the hierarchy of strategic levels
var StrategicLevelOrder = []string{
	"vision",
	"mission",
	"goals",
	"objectives",
	"strategies",
	"tactics",
}

// StrategicLevel represents a level in the strategic hierarchy
type StrategicLevel struct {
	ID                string   `json:"id"`
	Title             string   `json:"title"`
	Description       string   `json:"description,omitempty"`
	Level             string   `json:"level"` // vision, mission, goals, objectives, strategies, tactics
	ParentID          string   `json:"parentId,omitempty"`
	Order             int      `json:"order"`
	LinkedTasks       []string `json:"linkedTasks,omitempty"`
	LinkedMilestones  []string `json:"linkedMilestones,omitempty"`
}

// StrategicLevelsBuilder represents a strategic planning hierarchy
type StrategicLevelsBuilder struct {
	ID     string           `json:"id"`
	Title  string           `json:"title"`
	Date   string           `json:"date"`
	Levels []StrategicLevel `json:"levels,omitempty"`
}

// StrategicLevelWithProgress includes computed progress
type StrategicLevelWithProgress struct {
	StrategicLevel
	Progress int `json:"progress"` // 0-100
}
