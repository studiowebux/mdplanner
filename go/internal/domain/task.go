package domain

// TimeEntry represents a time tracking entry for a task
type TimeEntry struct {
	ID          string  `json:"id"`
	Date        string  `json:"date"`
	Hours       float64 `json:"hours"`
	Person      string  `json:"person,omitempty"`
	Description string  `json:"description,omitempty"`
}

// TaskConfig contains task metadata and configuration
type TaskConfig struct {
	Tag          []string    `json:"tag,omitempty"`
	DueDate      string      `json:"due_date,omitempty"`
	Assignee     string      `json:"assignee,omitempty"`
	Priority     int         `json:"priority,omitempty"`
	Effort       int         `json:"effort,omitempty"`
	BlockedBy    []string    `json:"blocked_by,omitempty"`
	Milestone    string      `json:"milestone,omitempty"`
	PlannedStart string      `json:"planned_start,omitempty"`
	PlannedEnd   string      `json:"planned_end,omitempty"`
	TimeEntries  []TimeEntry `json:"time_entries,omitempty"`
}

// Task represents a task item with optional children (subtasks)
type Task struct {
	ID          string     `json:"id"`
	Title       string     `json:"title"`
	Completed   bool       `json:"completed"`
	Section     string     `json:"section"`
	Config      TaskConfig `json:"config"`
	Description []string   `json:"description,omitempty"`
	Children    []Task     `json:"children,omitempty"`
	ParentID    string     `json:"parentId,omitempty"`
}

// FindTaskByID recursively searches for a task by ID
func FindTaskByID(tasks []Task, id string) *Task {
	for i := range tasks {
		if tasks[i].ID == id {
			return &tasks[i]
		}
		if found := FindTaskByID(tasks[i].Children, id); found != nil {
			return found
		}
	}
	return nil
}

// FlattenTasks converts hierarchical tasks to flat list with parentId
func FlattenTasks(tasks []Task) []Task {
	var result []Task
	var flatten func(tasks []Task, parentID string)
	flatten = func(tasks []Task, parentID string) {
		for _, t := range tasks {
			flat := t
			flat.ParentID = parentID
			flat.Children = nil
			result = append(result, flat)
			flatten(t.Children, t.ID)
		}
	}
	flatten(tasks, "")
	return result
}
