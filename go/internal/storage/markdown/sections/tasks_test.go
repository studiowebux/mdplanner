package sections

import (
	"strings"
	"testing"

	"github.com/studiowebux/mdplanner/internal/domain"
)

func TestTaskParserBasicTask(t *testing.T) {
	parser := NewTaskParser()

	lines := []string{
		"# Board",
		"## Todo",
		"- [ ] (1) Simple task",
	}

	tasks, sections := parser.Parse(lines)

	if len(sections) != 1 || sections[0] != "Todo" {
		t.Errorf("Expected 1 section 'Todo', got %v", sections)
	}

	todoTasks := tasks["Todo"]
	if len(todoTasks) != 1 {
		t.Fatalf("Expected 1 task, got %d", len(todoTasks))
	}

	task := todoTasks[0]
	if task.ID != "1" {
		t.Errorf("Expected ID '1', got '%s'", task.ID)
	}
	if task.Title != "Simple task" {
		t.Errorf("Expected title 'Simple task', got '%s'", task.Title)
	}
	if task.Completed {
		t.Error("Expected task to be incomplete")
	}
	if task.Section != "Todo" {
		t.Errorf("Expected section 'Todo', got '%s'", task.Section)
	}
}

func TestTaskParserCompletedTask(t *testing.T) {
	parser := NewTaskParser()

	lines := []string{
		"# Board",
		"## Done",
		"- [x] (2) Completed task",
	}

	tasks, _ := parser.Parse(lines)
	task := tasks["Done"][0]

	if !task.Completed {
		t.Error("Expected task to be completed")
	}
}

func TestTaskParserWithConfig(t *testing.T) {
	parser := NewTaskParser()

	lines := []string{
		"# Board",
		"## Todo",
		"- [ ] (1) Task with config {due_date: 2026-02-15; assignee: john; priority: 2; tag: [urgent, bug]}",
	}

	tasks, _ := parser.Parse(lines)
	task := tasks["Todo"][0]

	if task.Config.DueDate != "2026-02-15" {
		t.Errorf("Expected due_date '2026-02-15', got '%s'", task.Config.DueDate)
	}
	if task.Config.Assignee != "john" {
		t.Errorf("Expected assignee 'john', got '%s'", task.Config.Assignee)
	}
	if task.Config.Priority != 2 {
		t.Errorf("Expected priority 2, got %d", task.Config.Priority)
	}
	if len(task.Config.Tag) != 2 || task.Config.Tag[0] != "urgent" || task.Config.Tag[1] != "bug" {
		t.Errorf("Expected tags [urgent, bug], got %v", task.Config.Tag)
	}
}

func TestTaskParserNestedTasks(t *testing.T) {
	parser := NewTaskParser()

	lines := []string{
		"# Board",
		"## Todo",
		"- [ ] (1) Parent task",
		"  - [ ] (2) Child task",
		"    - [ ] (3) Grandchild task",
	}

	tasks, _ := parser.Parse(lines)
	parent := tasks["Todo"][0]

	if parent.ID != "1" {
		t.Errorf("Expected parent ID '1', got '%s'", parent.ID)
	}
	if len(parent.Children) != 1 {
		t.Fatalf("Expected 1 child, got %d", len(parent.Children))
	}

	child := parent.Children[0]
	if child.ID != "2" {
		t.Errorf("Expected child ID '2', got '%s'", child.ID)
	}
	if child.ParentID != "1" {
		t.Errorf("Expected child parentID '1', got '%s'", child.ParentID)
	}
	if len(child.Children) != 1 {
		t.Fatalf("Expected 1 grandchild, got %d", len(child.Children))
	}

	grandchild := child.Children[0]
	if grandchild.ID != "3" {
		t.Errorf("Expected grandchild ID '3', got '%s'", grandchild.ID)
	}
	if grandchild.ParentID != "2" {
		t.Errorf("Expected grandchild parentID '2', got '%s'", grandchild.ParentID)
	}
}

func TestTaskParserMultipleSections(t *testing.T) {
	parser := NewTaskParser()

	lines := []string{
		"# Board",
		"## Todo",
		"- [ ] (1) Todo task",
		"## In Progress",
		"- [ ] (2) In progress task",
		"## Done",
		"- [x] (3) Done task",
	}

	tasks, sections := parser.Parse(lines)

	if len(sections) != 3 {
		t.Errorf("Expected 3 sections, got %d", len(sections))
	}
	if sections[0] != "Todo" || sections[1] != "In Progress" || sections[2] != "Done" {
		t.Errorf("Unexpected section order: %v", sections)
	}

	if len(tasks["Todo"]) != 1 {
		t.Errorf("Expected 1 todo task, got %d", len(tasks["Todo"]))
	}
	if len(tasks["In Progress"]) != 1 {
		t.Errorf("Expected 1 in progress task, got %d", len(tasks["In Progress"]))
	}
	if len(tasks["Done"]) != 1 {
		t.Errorf("Expected 1 done task, got %d", len(tasks["Done"]))
	}
}

func TestTaskParserRoundTrip(t *testing.T) {
	parser := NewTaskParser()

	// Create tasks
	original := map[string][]domain.Task{
		"Todo": {
			{
				ID:        "1",
				Title:     "Parent task",
				Completed: false,
				Section:   "Todo",
				Config: domain.TaskConfig{
					DueDate:  "2026-02-15",
					Assignee: "john",
					Priority: 2,
				},
				Children: []domain.Task{
					{
						ID:        "2",
						Title:     "Child task",
						Completed: true,
						Section:   "Todo",
						ParentID:  "1",
					},
				},
			},
		},
		"Done": {
			{
				ID:        "3",
				Title:     "Completed task",
				Completed: true,
				Section:   "Done",
			},
		},
	}
	sectionOrder := []string{"Todo", "Done"}

	// Serialize
	serialized := parser.Serialize(original, sectionOrder)

	// Parse back
	lines := strings.Split(serialized, "\n")
	parsed, parsedSections := parser.Parse(lines)

	// Verify sections
	if len(parsedSections) != 2 {
		t.Errorf("Expected 2 sections, got %d", len(parsedSections))
	}

	// Verify Todo tasks
	todoTasks := parsed["Todo"]
	if len(todoTasks) != 1 {
		t.Fatalf("Expected 1 todo task, got %d", len(todoTasks))
	}

	parent := todoTasks[0]
	if parent.ID != "1" || parent.Title != "Parent task" || parent.Completed {
		t.Errorf("Parent task mismatch: %+v", parent)
	}
	if parent.Config.DueDate != "2026-02-15" || parent.Config.Assignee != "john" || parent.Config.Priority != 2 {
		t.Errorf("Parent config mismatch: %+v", parent.Config)
	}

	if len(parent.Children) != 1 {
		t.Fatalf("Expected 1 child, got %d", len(parent.Children))
	}
	child := parent.Children[0]
	if child.ID != "2" || child.Title != "Child task" || !child.Completed {
		t.Errorf("Child task mismatch: %+v", child)
	}

	// Verify Done tasks
	doneTasks := parsed["Done"]
	if len(doneTasks) != 1 {
		t.Fatalf("Expected 1 done task, got %d", len(doneTasks))
	}
	if doneTasks[0].ID != "3" || doneTasks[0].Title != "Completed task" || !doneTasks[0].Completed {
		t.Errorf("Done task mismatch: %+v", doneTasks[0])
	}
}

func TestFlattenTasks(t *testing.T) {
	tasks := map[string][]domain.Task{
		"Todo": {
			{
				ID:    "1",
				Title: "Parent",
				Children: []domain.Task{
					{ID: "2", Title: "Child"},
				},
			},
		},
		"Done": {
			{ID: "3", Title: "Done task"},
		},
	}

	flat := FlattenTasks(tasks)

	if len(flat) != 3 {
		t.Errorf("Expected 3 flat tasks, got %d", len(flat))
	}

	ids := make(map[string]bool)
	for _, task := range flat {
		ids[task.ID] = true
		if len(task.Children) > 0 {
			t.Error("Flattened tasks should not have children")
		}
	}

	if !ids["1"] || !ids["2"] || !ids["3"] {
		t.Errorf("Missing task IDs in flattened list: %v", ids)
	}
}

func TestFindTaskByID(t *testing.T) {
	tasks := map[string][]domain.Task{
		"Todo": {
			{
				ID:    "1",
				Title: "Parent",
				Children: []domain.Task{
					{
						ID:    "2",
						Title: "Child",
						Children: []domain.Task{
							{ID: "3", Title: "Grandchild"},
						},
					},
				},
			},
		},
	}

	// Find parent
	if task := FindTaskByID(tasks, "1"); task == nil || task.Title != "Parent" {
		t.Error("Failed to find parent task")
	}

	// Find nested child
	if task := FindTaskByID(tasks, "2"); task == nil || task.Title != "Child" {
		t.Error("Failed to find child task")
	}

	// Find deeply nested
	if task := FindTaskByID(tasks, "3"); task == nil || task.Title != "Grandchild" {
		t.Error("Failed to find grandchild task")
	}

	// Non-existent
	if task := FindTaskByID(tasks, "999"); task != nil {
		t.Error("Should not find non-existent task")
	}
}

func TestGenerateTaskID(t *testing.T) {
	tasks := map[string][]domain.Task{
		"Todo": {
			{ID: "1"},
			{ID: "5", Children: []domain.Task{{ID: "10"}}},
		},
	}

	newID := GenerateTaskID(tasks)
	if newID != "11" {
		t.Errorf("Expected new ID '11', got '%s'", newID)
	}
}

func TestTaskParserEmptyBoard(t *testing.T) {
	parser := NewTaskParser()

	lines := []string{
		"# Board",
	}

	tasks, sections := parser.Parse(lines)

	if len(sections) != 0 {
		t.Errorf("Expected 0 sections, got %d", len(sections))
	}
	if len(tasks) != 0 {
		t.Errorf("Expected empty tasks map, got %d entries", len(tasks))
	}
}

func TestTaskParserWithDescription(t *testing.T) {
	parser := NewTaskParser()

	lines := []string{
		"# Board",
		"## Todo",
		"- [ ] (1) Task with description",
		"  This is line 1 of description",
		"  This is line 2 of description",
	}

	tasks, _ := parser.Parse(lines)
	task := tasks["Todo"][0]

	if len(task.Description) != 2 {
		t.Errorf("Expected 2 description lines, got %d", len(task.Description))
	}
	if task.Description[0] != "This is line 1 of description" {
		t.Errorf("Unexpected description[0]: '%s'", task.Description[0])
	}
}

func TestTaskParserConfigAllFields(t *testing.T) {
	parser := NewTaskParser()

	lines := []string{
		"# Board",
		"## Todo",
		"- [ ] (1) Full config {tag: [a, b]; due_date: 2026-01-01; assignee: bob; priority: 3; effort: 5; blocked_by: [2, 3]; milestone: v1.0; planned_start: 2026-01-01; planned_end: 2026-01-15}",
	}

	tasks, _ := parser.Parse(lines)
	config := tasks["Todo"][0].Config

	if len(config.Tag) != 2 || config.Tag[0] != "a" {
		t.Errorf("Tag mismatch: %v", config.Tag)
	}
	if config.DueDate != "2026-01-01" {
		t.Errorf("DueDate mismatch: %s", config.DueDate)
	}
	if config.Assignee != "bob" {
		t.Errorf("Assignee mismatch: %s", config.Assignee)
	}
	if config.Priority != 3 {
		t.Errorf("Priority mismatch: %d", config.Priority)
	}
	if config.Effort != 5 {
		t.Errorf("Effort mismatch: %d", config.Effort)
	}
	if len(config.BlockedBy) != 2 {
		t.Errorf("BlockedBy mismatch: %v", config.BlockedBy)
	}
	if config.Milestone != "v1.0" {
		t.Errorf("Milestone mismatch: %s", config.Milestone)
	}
	if config.PlannedStart != "2026-01-01" {
		t.Errorf("PlannedStart mismatch: %s", config.PlannedStart)
	}
	if config.PlannedEnd != "2026-01-15" {
		t.Errorf("PlannedEnd mismatch: %s", config.PlannedEnd)
	}
}

func TestCountIndent(t *testing.T) {
	tests := []struct {
		input    string
		expected int
	}{
		{"no indent", 0},
		{"  two spaces", 2},
		{"    four spaces", 4},
		{"\ttab", 2},
		{"  \t  mixed", 6},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := countIndent(tt.input)
			if result != tt.expected {
				t.Errorf("countIndent(%q) = %d, want %d", tt.input, result, tt.expected)
			}
		})
	}
}
