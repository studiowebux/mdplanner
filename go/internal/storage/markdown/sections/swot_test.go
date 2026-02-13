package sections

import (
	"strings"
	"testing"

	"github.com/studiowebux/mdplanner/internal/domain"
)

func TestSwotParserBasic(t *testing.T) {
	parser := NewSwotParser()

	lines := []string{
		"<!-- SWOT Analysis -->",
		"# SWOT Analysis",
		"",
		"## Product Launch",
		"<!-- id: swot_abc123 -->",
		"Date: 2026-02-12",
		"",
		"### Strengths",
		"- Strong brand",
		"- Good team",
		"",
		"### Weaknesses",
		"- Limited budget",
		"",
		"### Opportunities",
		"- New market",
		"- Growing demand",
		"",
		"### Threats",
		"- Competition",
	}

	analyses := parser.Parse(lines)

	if len(analyses) != 1 {
		t.Fatalf("Expected 1 analysis, got %d", len(analyses))
	}

	swot := analyses[0]
	if swot.Title != "Product Launch" {
		t.Errorf("Expected title 'Product Launch', got '%s'", swot.Title)
	}
	if swot.ID != "swot_abc123" {
		t.Errorf("Expected ID 'swot_abc123', got '%s'", swot.ID)
	}
	if swot.Date != "2026-02-12" {
		t.Errorf("Expected date '2026-02-12', got '%s'", swot.Date)
	}
	if len(swot.Strengths) != 2 {
		t.Errorf("Expected 2 strengths, got %d", len(swot.Strengths))
	}
	if len(swot.Weaknesses) != 1 {
		t.Errorf("Expected 1 weakness, got %d", len(swot.Weaknesses))
	}
	if len(swot.Opportunities) != 2 {
		t.Errorf("Expected 2 opportunities, got %d", len(swot.Opportunities))
	}
	if len(swot.Threats) != 1 {
		t.Errorf("Expected 1 threat, got %d", len(swot.Threats))
	}
}

func TestSwotParserMultiple(t *testing.T) {
	parser := NewSwotParser()

	lines := []string{
		"<!-- SWOT Analysis -->",
		"# SWOT Analysis",
		"",
		"## Analysis One",
		"Date: 2026-01-01",
		"",
		"### Strengths",
		"- S1",
		"### Weaknesses",
		"### Opportunities",
		"### Threats",
		"",
		"## Analysis Two",
		"Date: 2026-02-01",
		"",
		"### Strengths",
		"- S2",
		"### Weaknesses",
		"### Opportunities",
		"### Threats",
	}

	analyses := parser.Parse(lines)

	if len(analyses) != 2 {
		t.Fatalf("Expected 2 analyses, got %d", len(analyses))
	}

	if analyses[0].Title != "Analysis One" {
		t.Errorf("Expected 'Analysis One', got '%s'", analyses[0].Title)
	}
	if analyses[1].Title != "Analysis Two" {
		t.Errorf("Expected 'Analysis Two', got '%s'", analyses[1].Title)
	}
}

func TestSwotParserRoundTrip(t *testing.T) {
	parser := NewSwotParser()

	original := []domain.SwotAnalysis{
		{
			ID:            "swot_test",
			Title:         "Test Analysis",
			Date:          "2026-02-12",
			Strengths:     []string{"Strong", "Very strong"},
			Weaknesses:    []string{"Weak"},
			Opportunities: []string{"Opportunity 1", "Opportunity 2"},
			Threats:       []string{"Threat"},
		},
	}

	// Serialize
	serialized := parser.Serialize(original)

	// Parse back
	lines := strings.Split(serialized, "\n")
	parsed := parser.Parse(lines)

	if len(parsed) != 1 {
		t.Fatalf("Expected 1 analysis after round-trip, got %d", len(parsed))
	}

	swot := parsed[0]
	if swot.ID != "swot_test" {
		t.Errorf("ID mismatch: got '%s'", swot.ID)
	}
	if swot.Title != "Test Analysis" {
		t.Errorf("Title mismatch: got '%s'", swot.Title)
	}
	if swot.Date != "2026-02-12" {
		t.Errorf("Date mismatch: got '%s'", swot.Date)
	}
	if len(swot.Strengths) != 2 {
		t.Errorf("Expected 2 strengths, got %d", len(swot.Strengths))
	}
	if len(swot.Weaknesses) != 1 {
		t.Errorf("Expected 1 weakness, got %d", len(swot.Weaknesses))
	}
	if len(swot.Opportunities) != 2 {
		t.Errorf("Expected 2 opportunities, got %d", len(swot.Opportunities))
	}
	if len(swot.Threats) != 1 {
		t.Errorf("Expected 1 threat, got %d", len(swot.Threats))
	}
}

func TestSwotParserFindByID(t *testing.T) {
	parser := NewSwotParser()

	analyses := []domain.SwotAnalysis{
		{ID: "swot_1", Title: "First"},
		{ID: "swot_2", Title: "Second"},
	}

	found := parser.FindByID(analyses, "swot_2")
	if found == nil || found.Title != "Second" {
		t.Error("Failed to find swot_2")
	}

	notFound := parser.FindByID(analyses, "swot_99")
	if notFound != nil {
		t.Error("Should not find non-existent analysis")
	}
}

func TestSwotParserEmptySubsections(t *testing.T) {
	parser := NewSwotParser()

	lines := []string{
		"<!-- SWOT Analysis -->",
		"# SWOT Analysis",
		"",
		"## Minimal Analysis",
		"Date: 2026-02-12",
		"### Strengths",
		"### Weaknesses",
		"### Opportunities",
		"### Threats",
	}

	analyses := parser.Parse(lines)

	if len(analyses) != 1 {
		t.Fatalf("Expected 1 analysis, got %d", len(analyses))
	}

	swot := analyses[0]
	if len(swot.Strengths) != 0 {
		t.Errorf("Expected 0 strengths, got %d", len(swot.Strengths))
	}
	if len(swot.Weaknesses) != 0 {
		t.Errorf("Expected 0 weaknesses, got %d", len(swot.Weaknesses))
	}
}

func TestSwotParserEmpty(t *testing.T) {
	parser := NewSwotParser()

	lines := []string{
		"<!-- SWOT Analysis -->",
		"# SWOT Analysis",
	}

	analyses := parser.Parse(lines)

	if len(analyses) != 0 {
		t.Errorf("Expected 0 analyses, got %d", len(analyses))
	}
}

func TestSwotParserGenerateID(t *testing.T) {
	parser := NewSwotParser()

	// GenerateID uses random hex, just verify it returns something
	id := parser.GenerateID(nil)
	if id == "" {
		t.Error("GenerateID should return a non-empty ID")
	}
}
