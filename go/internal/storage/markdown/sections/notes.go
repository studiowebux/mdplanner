package sections

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// NotesParser handles parsing and serializing Notes from markdown
type NotesParser struct {
	idPattern       *regexp.Regexp
	metadataPattern *regexp.Regexp
}

// NewNotesParser creates a new Notes parser
func NewNotesParser() *NotesParser {
	return &NotesParser{
		idPattern:       regexp.MustCompile(`<!-- id: (note_\d+) -->`),
		metadataPattern: regexp.MustCompile(`<!-- id: (note_\d+) \| created: ([^|]+) \| updated: ([^|]+) \| rev: (\d+) -->`),
	}
}

// Parse extracts Notes from lines
// Assumes lines are already extracted for this section (no section header expected)
func (p *NotesParser) Parse(lines []string) []domain.Note {
	var notes []domain.Note
	var current *domain.Note
	var contentLines []string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present (for backwards compatibility)
		if strings.HasPrefix(trimmed, "# Notes") || trimmed == "<!-- Notes -->" {
			continue
		}

		// Check for next major section (shouldn't happen with proper extraction)
		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Notes") {
			if current != nil && current.Title != "" {
				current.Content = strings.TrimSpace(strings.Join(contentLines, "\n"))
				notes = append(notes, *current)
			}
			break
		}

		// Check for section boundary comments
		if regexp.MustCompile(`<!-- (Board|Goals|Configurations|Canvas|Mindmap) -->`).MatchString(trimmed) {
			if current != nil && current.Title != "" {
				current.Content = strings.TrimSpace(strings.Join(contentLines, "\n"))
				notes = append(notes, *current)
			}
			break
		}

		// Note header
		if strings.HasPrefix(trimmed, "## ") {
			if current != nil && current.Title != "" {
				current.Content = strings.TrimSpace(strings.Join(contentLines, "\n"))
				notes = append(notes, *current)
			}
			now := time.Now().Format(time.RFC3339)
			current = &domain.Note{
				ID:        p.generateNoteID(notes),
				Title:     strings.TrimPrefix(trimmed, "## "),
				Content:   "",
				CreatedAt: now,
				UpdatedAt: now,
				Revision:  1,
				Mode:      "simple",
			}
			contentLines = []string{}
			continue
		}

		if current == nil {
			continue
		}

		// Check for metadata comment (new format)
		if match := p.metadataPattern.FindStringSubmatch(trimmed); len(match) > 0 {
			current.ID = match[1]
			current.CreatedAt = strings.TrimSpace(match[2])
			current.UpdatedAt = strings.TrimSpace(match[3])
			if rev := parseInt(match[4], 1); rev > 0 {
				current.Revision = rev
			}
			continue
		}

		// Check for old ID format
		if match := p.idPattern.FindStringSubmatch(trimmed); len(match) > 0 {
			current.ID = match[1]
			continue
		}

		// Content line
		contentLines = append(contentLines, line)
	}

	// Don't forget last note
	if current != nil && current.Title != "" {
		current.Content = strings.TrimSpace(strings.Join(contentLines, "\n"))
		notes = append(notes, *current)
	}

	return notes
}

// Serialize converts Notes to markdown
func (p *NotesParser) Serialize(notes []domain.Note) string {
	var sb strings.Builder

	sb.WriteString("<!-- Notes -->\n")
	sb.WriteString("# Notes\n\n")

	for _, note := range notes {
		sb.WriteString(fmt.Sprintf("## %s\n\n", note.Title))
		sb.WriteString(fmt.Sprintf("<!-- id: %s | created: %s | updated: %s | rev: %d -->\n",
			note.ID, note.CreatedAt, note.UpdatedAt, note.Revision))
		sb.WriteString(note.Content)
		sb.WriteString("\n\n")
	}

	return sb.String()
}

// FindByID finds a Note by ID
func (p *NotesParser) FindByID(notes []domain.Note, id string) *domain.Note {
	for i := range notes {
		if notes[i].ID == id {
			return &notes[i]
		}
	}
	return nil
}

// GenerateID creates a unique Note ID
func (p *NotesParser) GenerateID(notes []domain.Note) string {
	return p.generateNoteID(notes)
}

func (p *NotesParser) generateNoteID(notes []domain.Note) string {
	maxID := 0
	for _, note := range notes {
		if strings.HasPrefix(note.ID, "note_") {
			var id int
			fmt.Sscanf(note.ID, "note_%d", &id)
			if id > maxID {
				maxID = id
			}
		}
	}
	return fmt.Sprintf("note_%d", maxID+1)
}

func parseInt(s string, defaultVal int) int {
	var v int
	if _, err := fmt.Sscanf(s, "%d", &v); err == nil {
		return v
	}
	return defaultVal
}
