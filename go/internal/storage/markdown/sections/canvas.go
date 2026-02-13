package sections

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// CanvasParser handles parsing and serializing StickyNotes from markdown
type CanvasParser struct {
	idPattern     *regexp.Regexp
	headerPattern *regexp.Regexp
	configParser  *ConfigParser
}

// NewCanvasParser creates a new Canvas parser
func NewCanvasParser() *CanvasParser {
	return &CanvasParser{
		idPattern:     regexp.MustCompile(`<!-- id: (sticky_note_\d+) -->`),
		headerPattern: regexp.MustCompile(`^## .+?\s*\{(.+)\}$`),
		configParser:  NewConfigParser(),
	}
}

// Parse extracts StickyNotes from lines
// Assumes lines are already extracted for this section
func (p *CanvasParser) Parse(lines []string) []domain.StickyNote {
	var notes []domain.StickyNote
	var current *domain.StickyNote
	var contentLines []string
	var configStr string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# Canvas") || trimmed == "<!-- Canvas -->" {
			continue
		}

		// Check for section boundary
		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Canvas") {
			if current != nil {
				current.Content = strings.TrimSpace(strings.Join(contentLines, "\n"))
				notes = append(notes, *current)
			}
			break
		}

		// Check for section boundary comments
		if regexp.MustCompile(`<!-- (Board|Notes|Goals|Mindmap|Configurations|C4 Architecture) -->`).MatchString(trimmed) {
			if current != nil {
				current.Content = strings.TrimSpace(strings.Join(contentLines, "\n"))
				notes = append(notes, *current)
			}
			break
		}

		// Sticky note header
		if strings.HasPrefix(trimmed, "## ") {
			if current != nil {
				current.Content = strings.TrimSpace(strings.Join(contentLines, "\n"))
				notes = append(notes, *current)
			}

			// Extract config from header if present
			configStr = ""
			if match := p.headerPattern.FindStringSubmatch(trimmed); len(match) > 0 {
				configStr = match[1]
			}

			config := p.configParser.ParseConfigString(configStr)
			x, y := p.configParser.ParsePosition(config["position"])
			width, height := p.configParser.ParseSize(config["size"])

			current = &domain.StickyNote{
				ID:      p.generateStickyNoteID(notes),
				Content: "",
				Color:   config["color"],
				Position: domain.Position{
					X: x,
					Y: y,
				},
				Size: domain.Size{
					Width:  width,
					Height: height,
				},
			}
			if current.Color == "" {
				current.Color = "yellow"
			}
			contentLines = []string{}
			continue
		}

		if current == nil {
			continue
		}

		// Check for ID comment
		if match := p.idPattern.FindStringSubmatch(trimmed); len(match) > 0 {
			current.ID = match[1]
			continue
		}

		// Check for config in content (legacy format)
		if strings.Contains(line, "{") && strings.Contains(line, "color:") {
			// Extract config from line
			configMatch := regexp.MustCompile(`\{(.+)\}\s*$`).FindStringSubmatch(line)
			if len(configMatch) > 0 {
				cfg := p.configParser.ParseConfigString(configMatch[1])
				if cfg["color"] != "" {
					current.Color = cfg["color"]
				}
				if cfg["position"] != "" {
					current.Position.X, current.Position.Y = p.configParser.ParsePosition(cfg["position"])
				}
				if cfg["size"] != "" {
					current.Size.Width, current.Size.Height = p.configParser.ParseSize(cfg["size"])
				}
				// Remove config from line
				line = regexp.MustCompile(`\s*\{.+\}\s*$`).ReplaceAllString(line, "")
				if strings.TrimSpace(line) != "" {
					contentLines = append(contentLines, line)
				}
				continue
			}
		}

		// Content line
		contentLines = append(contentLines, line)
	}

	// Don't forget last note
	if current != nil {
		current.Content = strings.TrimSpace(strings.Join(contentLines, "\n"))
		notes = append(notes, *current)
	}

	return notes
}

// Serialize converts StickyNotes to markdown
func (p *CanvasParser) Serialize(notes []domain.StickyNote) string {
	var sb strings.Builder

	sb.WriteString("<!-- Canvas -->\n")
	sb.WriteString("# Canvas\n\n")

	for _, note := range notes {
		sb.WriteString(fmt.Sprintf("## Sticky note {color: %s; position: {x: %.0f, y: %.0f}; size: {width: %.0f, height: %.0f}}\n\n",
			note.Color, note.Position.X, note.Position.Y, note.Size.Width, note.Size.Height))
		sb.WriteString(fmt.Sprintf("<!-- id: %s -->\n", note.ID))
		sb.WriteString(note.Content)
		sb.WriteString("\n\n")
	}

	return sb.String()
}

// FindByID finds a StickyNote by ID
func (p *CanvasParser) FindByID(notes []domain.StickyNote, id string) *domain.StickyNote {
	for i := range notes {
		if notes[i].ID == id {
			return &notes[i]
		}
	}
	return nil
}

// GenerateID creates a unique StickyNote ID
func (p *CanvasParser) GenerateID(notes []domain.StickyNote) string {
	return p.generateStickyNoteID(notes)
}

func (p *CanvasParser) generateStickyNoteID(notes []domain.StickyNote) string {
	maxID := 0
	for _, note := range notes {
		if strings.HasPrefix(note.ID, "sticky_note_") {
			var id int
			fmt.Sscanf(note.ID, "sticky_note_%d", &id)
			if id > maxID {
				maxID = id
			}
		}
	}
	return fmt.Sprintf("sticky_note_%d", maxID+1)
}
