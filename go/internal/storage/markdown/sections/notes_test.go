package sections

import (
	"strings"
	"testing"

	"github.com/studiowebux/mdplanner/internal/domain"
)

func TestNotesParserBasic(t *testing.T) {
	parser := NewNotesParser()

	lines := []string{
		"<!-- Notes -->",
		"# Notes",
		"",
		"## First Note",
		"",
		"This is the content of the first note.",
	}

	notes := parser.Parse(lines)

	if len(notes) != 1 {
		t.Fatalf("Expected 1 note, got %d", len(notes))
	}

	note := notes[0]
	if note.Title != "First Note" {
		t.Errorf("Expected title 'First Note', got '%s'", note.Title)
	}
	if !strings.Contains(note.Content, "first note") {
		t.Errorf("Expected content to contain 'first note', got '%s'", note.Content)
	}
}

func TestNotesParserWithMetadata(t *testing.T) {
	parser := NewNotesParser()

	lines := []string{
		"<!-- Notes -->",
		"# Notes",
		"",
		"## Test Note",
		"",
		"<!-- id: note_5 | created: 2026-01-01T00:00:00Z | updated: 2026-02-01T00:00:00Z | rev: 3 -->",
		"Note content here.",
	}

	notes := parser.Parse(lines)

	if len(notes) != 1 {
		t.Fatalf("Expected 1 note, got %d", len(notes))
	}

	note := notes[0]
	if note.ID != "note_5" {
		t.Errorf("Expected ID 'note_5', got '%s'", note.ID)
	}
	if note.CreatedAt != "2026-01-01T00:00:00Z" {
		t.Errorf("Expected CreatedAt '2026-01-01T00:00:00Z', got '%s'", note.CreatedAt)
	}
	if note.Revision != 3 {
		t.Errorf("Expected Revision 3, got %d", note.Revision)
	}
}

func TestNotesParserMultiple(t *testing.T) {
	parser := NewNotesParser()

	lines := []string{
		"<!-- Notes -->",
		"# Notes",
		"",
		"## Note One",
		"",
		"Content one.",
		"",
		"## Note Two",
		"",
		"Content two.",
	}

	notes := parser.Parse(lines)

	if len(notes) != 2 {
		t.Fatalf("Expected 2 notes, got %d", len(notes))
	}

	if notes[0].Title != "Note One" {
		t.Errorf("Expected first note 'Note One', got '%s'", notes[0].Title)
	}
	if notes[1].Title != "Note Two" {
		t.Errorf("Expected second note 'Note Two', got '%s'", notes[1].Title)
	}
}

func TestNotesParserMultilineContent(t *testing.T) {
	parser := NewNotesParser()

	lines := []string{
		"<!-- Notes -->",
		"# Notes",
		"",
		"## My Note",
		"",
		"Line 1 of content.",
		"Line 2 of content.",
		"",
		"Line 3 after blank.",
	}

	notes := parser.Parse(lines)

	if len(notes) != 1 {
		t.Fatalf("Expected 1 note, got %d", len(notes))
	}
	if !strings.Contains(notes[0].Content, "Line 1") {
		t.Error("Content should contain Line 1")
	}
	if !strings.Contains(notes[0].Content, "Line 3") {
		t.Error("Content should contain Line 3")
	}
}

func TestNotesParserRoundTrip(t *testing.T) {
	parser := NewNotesParser()

	original := []domain.Note{
		{
			ID:        "note_1",
			Title:     "Test Note",
			Content:   "This is test content.\n\nWith multiple lines.",
			CreatedAt: "2026-01-01T00:00:00Z",
			UpdatedAt: "2026-02-01T00:00:00Z",
			Revision:  2,
		},
	}

	// Serialize
	serialized := parser.Serialize(original)

	// Parse back
	lines := strings.Split(serialized, "\n")
	parsed := parser.Parse(lines)

	if len(parsed) != 1 {
		t.Fatalf("Expected 1 note after round-trip, got %d", len(parsed))
	}

	note := parsed[0]
	if note.ID != "note_1" {
		t.Errorf("ID mismatch: got '%s'", note.ID)
	}
	if note.Title != "Test Note" {
		t.Errorf("Title mismatch: got '%s'", note.Title)
	}
	if note.Revision != 2 {
		t.Errorf("Revision mismatch: got %d", note.Revision)
	}
}

func TestNotesParserFindByID(t *testing.T) {
	parser := NewNotesParser()

	notes := []domain.Note{
		{ID: "note_1", Title: "First"},
		{ID: "note_2", Title: "Second"},
		{ID: "note_3", Title: "Third"},
	}

	found := parser.FindByID(notes, "note_2")
	if found == nil || found.Title != "Second" {
		t.Error("Failed to find note_2")
	}

	notFound := parser.FindByID(notes, "note_99")
	if notFound != nil {
		t.Error("Should not find non-existent note")
	}
}

func TestNotesParserGenerateID(t *testing.T) {
	parser := NewNotesParser()

	notes := []domain.Note{
		{ID: "note_1"},
		{ID: "note_5"},
		{ID: "note_3"},
	}

	newID := parser.GenerateID(notes)
	if newID != "note_6" {
		t.Errorf("Expected 'note_6', got '%s'", newID)
	}
}

func TestNotesParserEmpty(t *testing.T) {
	parser := NewNotesParser()

	lines := []string{
		"<!-- Notes -->",
		"# Notes",
	}

	notes := parser.Parse(lines)

	if len(notes) != 0 {
		t.Errorf("Expected 0 notes, got %d", len(notes))
	}
}
