package markdown

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/studiowebux/mdplanner/internal/domain"
)

func setupTestParser(t *testing.T) (*Parser, string, func()) {
	t.Helper()

	// Create temp directory
	tmpDir, err := os.MkdirTemp("", "mdplanner-test-*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}

	backupDir := filepath.Join(tmpDir, "backups")
	os.MkdirAll(backupDir, 0755)

	// Create test markdown file
	// Note: Using only comment markers, not both comment and header
	testFile := filepath.Join(tmpDir, "test.md")
	content := `<!-- Project Info -->
# Test Project

<!-- Configurations -->
Start Date: 2026-01-01
Working Days: 5

<!-- Board -->

## Todo

- [ ] (1) Test task {priority: 1}

## Done

- [x] (2) Completed task

<!-- Notes -->

## Test Note

<!-- id: note_1 | created: 2026-01-01T00:00:00Z | updated: 2026-01-01T00:00:00Z | rev: 1 -->
Test note content.

<!-- Goals -->

## Test Goal {type: project; kpi: Test; start: 2026-01-01; end: 2026-12-31; status: active}

<!-- id: goal_1 -->
Goal description.

<!-- Milestones -->

## M1 {start: 2026-01-01; end: 2026-03-31; status: open}

<!-- id: ms_1 -->
Milestone description.

<!-- SWOT Analysis -->

## Test SWOT
<!-- id: swot_1 -->
Date: 2026-02-12

### Strengths
- Strong team

### Weaknesses
- Limited resources

### Opportunities
- Market growth

### Threats
- Competition
`

	err = os.WriteFile(testFile, []byte(content), 0644)
	if err != nil {
		os.RemoveAll(tmpDir)
		t.Fatalf("Failed to write test file: %v", err)
	}

	parser := NewParser(tmpDir, backupDir, 5)
	parser.activeFile = "test.md"

	cleanup := func() {
		os.RemoveAll(tmpDir)
	}

	return parser, tmpDir, cleanup
}

func TestParserReadTasks(t *testing.T) {
	parser, _, cleanup := setupTestParser(t)
	defer cleanup()

	ctx := context.Background()
	tasks, err := parser.ReadTasks(ctx)
	if err != nil {
		t.Fatalf("ReadTasks failed: %v", err)
	}

	if len(tasks) != 2 {
		t.Errorf("Expected 2 tasks, got %d", len(tasks))
	}

	// Verify first task
	var todoTask *domain.Task
	for i := range tasks {
		if tasks[i].ID == "1" {
			todoTask = &tasks[i]
			break
		}
	}
	if todoTask == nil {
		t.Fatal("Task ID 1 not found")
	}
	if todoTask.Title != "Test task" {
		t.Errorf("Expected 'Test task', got '%s'", todoTask.Title)
	}
	if todoTask.Completed {
		t.Error("Task should not be completed")
	}
	if todoTask.Config.Priority != 1 {
		t.Errorf("Expected priority 1, got %d", todoTask.Config.Priority)
	}
}

func TestParserCreateTask(t *testing.T) {
	parser, _, cleanup := setupTestParser(t)
	defer cleanup()

	ctx := context.Background()

	newTask := domain.Task{
		Title:   "New task",
		Section: "Todo",
		Config: domain.TaskConfig{
			Priority: 2,
		},
	}

	id, err := parser.CreateTask(ctx, newTask)
	if err != nil {
		t.Fatalf("CreateTask failed: %v", err)
	}

	if id == "" {
		t.Error("Expected non-empty ID")
	}

	// Verify task was created
	tasks, err := parser.ReadTasks(ctx)
	if err != nil {
		t.Fatalf("ReadTasks failed: %v", err)
	}

	if len(tasks) != 3 {
		t.Errorf("Expected 3 tasks after create, got %d", len(tasks))
	}
}

func TestParserUpdateTask(t *testing.T) {
	parser, _, cleanup := setupTestParser(t)
	defer cleanup()

	ctx := context.Background()

	updatedTask := domain.Task{
		ID:        "1",
		Title:     "Updated task",
		Section:   "Todo",
		Completed: true,
	}

	err := parser.UpdateTask(ctx, "1", updatedTask)
	if err != nil {
		t.Fatalf("UpdateTask failed: %v", err)
	}

	// Verify task was updated
	task, err := parser.GetTask(ctx, "1")
	if err != nil {
		t.Fatalf("GetTask failed: %v", err)
	}

	if task.Title != "Updated task" {
		t.Errorf("Expected 'Updated task', got '%s'", task.Title)
	}
	if !task.Completed {
		t.Error("Task should be completed")
	}
}

func TestParserDeleteTask(t *testing.T) {
	parser, _, cleanup := setupTestParser(t)
	defer cleanup()

	ctx := context.Background()

	err := parser.DeleteTask(ctx, "1")
	if err != nil {
		t.Fatalf("DeleteTask failed: %v", err)
	}

	// Verify task was deleted
	tasks, err := parser.ReadTasks(ctx)
	if err != nil {
		t.Fatalf("ReadTasks failed: %v", err)
	}

	if len(tasks) != 1 {
		t.Errorf("Expected 1 task after delete, got %d", len(tasks))
	}
}

func TestParserReadNotes(t *testing.T) {
	parser, _, cleanup := setupTestParser(t)
	defer cleanup()

	ctx := context.Background()
	notes, err := parser.ReadNotes(ctx)
	if err != nil {
		t.Fatalf("ReadNotes failed: %v", err)
	}

	if len(notes) != 1 {
		t.Errorf("Expected 1 note, got %d", len(notes))
	}

	note := notes[0]
	if note.ID != "note_1" {
		t.Errorf("Expected ID 'note_1', got '%s'", note.ID)
	}
	if note.Title != "Test Note" {
		t.Errorf("Expected title 'Test Note', got '%s'", note.Title)
	}
}

func TestParserReadGoals(t *testing.T) {
	parser, _, cleanup := setupTestParser(t)
	defer cleanup()

	ctx := context.Background()
	goals, err := parser.ReadGoals(ctx)
	if err != nil {
		t.Fatalf("ReadGoals failed: %v", err)
	}

	if len(goals) != 1 {
		t.Errorf("Expected 1 goal, got %d", len(goals))
	}

	goal := goals[0]
	if goal.ID != "goal_1" {
		t.Errorf("Expected ID 'goal_1', got '%s'", goal.ID)
	}
	if goal.Status != "active" {
		t.Errorf("Expected status 'active', got '%s'", goal.Status)
	}
}

func TestParserReadMilestones(t *testing.T) {
	parser, _, cleanup := setupTestParser(t)
	defer cleanup()

	ctx := context.Background()
	milestones, err := parser.ReadMilestones(ctx)
	if err != nil {
		t.Fatalf("ReadMilestones failed: %v", err)
	}

	if len(milestones) != 1 {
		t.Errorf("Expected 1 milestone, got %d", len(milestones))
	}

	ms := milestones[0]
	// ID is auto-generated as milestone_N if not parsed from comment
	if ms.ID == "" {
		t.Errorf("Expected non-empty ID, got '%s'", ms.ID)
	}
	if ms.Status != "open" {
		t.Errorf("Expected status 'open', got '%s'", ms.Status)
	}
}

func TestParserReadSwotAnalyses(t *testing.T) {
	parser, _, cleanup := setupTestParser(t)
	defer cleanup()

	ctx := context.Background()
	swots, err := parser.ReadSwotAnalyses(ctx)
	if err != nil {
		t.Fatalf("ReadSwotAnalyses failed: %v", err)
	}

	if len(swots) != 1 {
		t.Errorf("Expected 1 SWOT, got %d", len(swots))
	}

	swot := swots[0]
	if swot.ID != "swot_1" {
		t.Errorf("Expected ID 'swot_1', got '%s'", swot.ID)
	}
	if len(swot.Strengths) != 1 {
		t.Errorf("Expected 1 strength, got %d", len(swot.Strengths))
	}
}

func TestParserScanProjects(t *testing.T) {
	parser, tmpDir, cleanup := setupTestParser(t)
	defer cleanup()

	// Create another project file
	anotherFile := filepath.Join(tmpDir, "another.md")
	content := `<!-- Project Info -->
# Another Project
`
	os.WriteFile(anotherFile, []byte(content), 0644)

	ctx := context.Background()
	projects, err := parser.ScanProjects(ctx)
	if err != nil {
		t.Fatalf("ScanProjects failed: %v", err)
	}

	if len(projects) != 2 {
		t.Errorf("Expected 2 projects, got %d", len(projects))
	}
}

func TestParserSwitchProject(t *testing.T) {
	parser, _, cleanup := setupTestParser(t)
	defer cleanup()

	ctx := context.Background()

	err := parser.SwitchProject(ctx, "test.md")
	if err != nil {
		t.Fatalf("SwitchProject failed: %v", err)
	}

	if parser.activeFile != "test.md" {
		t.Errorf("Expected activeFile 'test.md', got '%s'", parser.activeFile)
	}
}

func TestParserReadProjectConfig(t *testing.T) {
	parser, _, cleanup := setupTestParser(t)
	defer cleanup()

	ctx := context.Background()
	config, err := parser.ReadProjectConfig(ctx)
	if err != nil {
		t.Fatalf("ReadProjectConfig failed: %v", err)
	}

	if config.StartDate != "2026-01-01" {
		t.Errorf("Expected StartDate '2026-01-01', got '%s'", config.StartDate)
	}
	if config.WorkingDays != 5 {
		t.Errorf("Expected WorkingDays 5, got %d", config.WorkingDays)
	}
}

func TestParserGetSections(t *testing.T) {
	parser, _, cleanup := setupTestParser(t)
	defer cleanup()

	ctx := context.Background()
	sectionList, err := parser.GetSections(ctx)
	if err != nil {
		t.Fatalf("GetSections failed: %v", err)
	}

	// Should have multiple sections from the test file
	if len(sectionList) == 0 {
		t.Error("Expected non-empty section list")
	}
}

func TestParserGetActiveProject(t *testing.T) {
	parser, _, cleanup := setupTestParser(t)
	defer cleanup()

	ctx := context.Background()
	active, err := parser.GetActiveProject(ctx)
	if err != nil {
		t.Fatalf("GetActiveProject failed: %v", err)
	}

	if active != "test.md" {
		t.Errorf("Expected 'test.md', got '%s'", active)
	}
}
