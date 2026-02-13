package sections

import (
	"strings"
	"testing"

	"github.com/studiowebux/mdplanner/internal/domain"
)

func TestGoalsParserBasic(t *testing.T) {
	parser := NewGoalsParser()

	lines := []string{
		"<!-- Goals -->",
		"# Goals",
		"",
		"## Launch MVP {type: project; kpi: Users > 100; start: 2026-01-01; end: 2026-06-01; status: active}",
		"",
		"<!-- id: goal_1 -->",
		"Description of the goal.",
	}

	goals := parser.Parse(lines)

	if len(goals) != 1 {
		t.Fatalf("Expected 1 goal, got %d", len(goals))
	}

	goal := goals[0]
	if goal.Title != "Launch MVP" {
		t.Errorf("Expected title 'Launch MVP', got '%s'", goal.Title)
	}
	if goal.ID != "goal_1" {
		t.Errorf("Expected ID 'goal_1', got '%s'", goal.ID)
	}
	if goal.Type != "project" {
		t.Errorf("Expected type 'project', got '%s'", goal.Type)
	}
	if goal.KPI != "Users > 100" {
		t.Errorf("Expected KPI 'Users > 100', got '%s'", goal.KPI)
	}
	if goal.StartDate != "2026-01-01" {
		t.Errorf("Expected start '2026-01-01', got '%s'", goal.StartDate)
	}
	if goal.EndDate != "2026-06-01" {
		t.Errorf("Expected end '2026-06-01', got '%s'", goal.EndDate)
	}
	if goal.Status != "active" {
		t.Errorf("Expected status 'active', got '%s'", goal.Status)
	}
	if !strings.Contains(goal.Description, "Description") {
		t.Errorf("Expected description, got '%s'", goal.Description)
	}
}

func TestGoalsParserDefaults(t *testing.T) {
	parser := NewGoalsParser()

	lines := []string{
		"<!-- Goals -->",
		"# Goals",
		"",
		"## Simple Goal {kpi: None}",
	}

	goals := parser.Parse(lines)

	if len(goals) != 1 {
		t.Fatalf("Expected 1 goal, got %d", len(goals))
	}

	goal := goals[0]
	if goal.Type != "project" {
		t.Errorf("Expected default type 'project', got '%s'", goal.Type)
	}
	if goal.Status != "planning" {
		t.Errorf("Expected default status 'planning', got '%s'", goal.Status)
	}
}

func TestGoalsParserMultiple(t *testing.T) {
	parser := NewGoalsParser()

	lines := []string{
		"<!-- Goals -->",
		"# Goals",
		"",
		"## Goal One {type: team; kpi: KPI1; start: 2026-01-01; end: 2026-03-01; status: active}",
		"",
		"## Goal Two {type: personal; kpi: KPI2; start: 2026-04-01; end: 2026-06-01; status: planning}",
	}

	goals := parser.Parse(lines)

	if len(goals) != 2 {
		t.Fatalf("Expected 2 goals, got %d", len(goals))
	}

	if goals[0].Title != "Goal One" || goals[0].Type != "team" {
		t.Errorf("Goal One mismatch: %+v", goals[0])
	}
	if goals[1].Title != "Goal Two" || goals[1].Type != "personal" {
		t.Errorf("Goal Two mismatch: %+v", goals[1])
	}
}

func TestGoalsParserRoundTrip(t *testing.T) {
	parser := NewGoalsParser()

	original := []domain.Goal{
		{
			ID:          "goal_1",
			Title:       "Test Goal",
			Type:        "project",
			KPI:         "Test KPI",
			StartDate:   "2026-01-01",
			EndDate:     "2026-12-31",
			Status:      "active",
			Description: "This is a test goal description.",
		},
	}

	// Serialize
	serialized := parser.Serialize(original)

	// Parse back
	lines := strings.Split(serialized, "\n")
	parsed := parser.Parse(lines)

	if len(parsed) != 1 {
		t.Fatalf("Expected 1 goal after round-trip, got %d", len(parsed))
	}

	goal := parsed[0]
	if goal.ID != "goal_1" {
		t.Errorf("ID mismatch: got '%s'", goal.ID)
	}
	if goal.Title != "Test Goal" {
		t.Errorf("Title mismatch: got '%s'", goal.Title)
	}
	if goal.Type != "project" {
		t.Errorf("Type mismatch: got '%s'", goal.Type)
	}
	if goal.KPI != "Test KPI" {
		t.Errorf("KPI mismatch: got '%s'", goal.KPI)
	}
}

func TestGoalsParserFindByID(t *testing.T) {
	parser := NewGoalsParser()

	goals := []domain.Goal{
		{ID: "goal_1", Title: "First"},
		{ID: "goal_2", Title: "Second"},
	}

	found := parser.FindByID(goals, "goal_2")
	if found == nil || found.Title != "Second" {
		t.Error("Failed to find goal_2")
	}

	notFound := parser.FindByID(goals, "goal_99")
	if notFound != nil {
		t.Error("Should not find non-existent goal")
	}
}

func TestGoalsParserGenerateID(t *testing.T) {
	parser := NewGoalsParser()

	goals := []domain.Goal{
		{ID: "goal_1"},
		{ID: "goal_5"},
		{ID: "goal_3"},
	}

	newID := parser.GenerateID(goals)
	if newID != "goal_6" {
		t.Errorf("Expected 'goal_6', got '%s'", newID)
	}
}

func TestGoalsParserEmpty(t *testing.T) {
	parser := NewGoalsParser()

	lines := []string{
		"<!-- Goals -->",
		"# Goals",
	}

	goals := parser.Parse(lines)

	if len(goals) != 0 {
		t.Errorf("Expected 0 goals, got %d", len(goals))
	}
}
