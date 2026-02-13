package sections

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// RetrospectiveParser handles parsing and serializing Retrospectives from markdown
type RetrospectiveParser struct {
	idPattern *regexp.Regexp
}

// NewRetrospectiveParser creates a new Retrospective parser
func NewRetrospectiveParser() *RetrospectiveParser {
	return &RetrospectiveParser{
		idPattern: regexp.MustCompile(`<!-- id: ([^ ]+)`),
	}
}

// Parse extracts Retrospectives from lines
// Assumes lines are already extracted for this section
func (p *RetrospectiveParser) Parse(lines []string) []domain.Retrospective {
	var retrospectives []domain.Retrospective
	var current *domain.Retrospective
	var currentSubsection string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# Retrospectives") || trimmed == "<!-- Retrospectives -->" {
			continue
		}

		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Retrospectives") {
			if current != nil && current.Title != "" {
				retrospectives = append(retrospectives, *current)
			}
			break
		}

		if strings.HasPrefix(trimmed, "## ") {
			if current != nil && current.Title != "" {
				retrospectives = append(retrospectives, *current)
			}
			current = &domain.Retrospective{
				ID:       generateID(),
				Title:    strings.TrimPrefix(trimmed, "## "),
				Date:     time.Now().Format("2006-01-02"),
				Status:   "open",
				Continue: []string{},
				Stop:     []string{},
				Start:    []string{},
			}
			currentSubsection = ""
			continue
		}

		if current == nil {
			continue
		}

		if strings.HasPrefix(trimmed, "Date:") {
			current.Date = strings.TrimSpace(strings.TrimPrefix(trimmed, "Date:"))
			continue
		}

		if strings.HasPrefix(trimmed, "Status:") {
			current.Status = strings.TrimSpace(strings.TrimPrefix(trimmed, "Status:"))
			continue
		}

		if strings.HasPrefix(trimmed, "<!-- id:") {
			if match := p.idPattern.FindStringSubmatch(trimmed); len(match) > 1 {
				current.ID = match[1]
			}
			continue
		}

		switch trimmed {
		case "### Continue":
			currentSubsection = "continue"
			continue
		case "### Stop":
			currentSubsection = "stop"
			continue
		case "### Start":
			currentSubsection = "start"
			continue
		}

		if strings.HasPrefix(trimmed, "- ") && currentSubsection != "" {
			item := strings.TrimPrefix(trimmed, "- ")
			if item != "" {
				switch currentSubsection {
				case "continue":
					current.Continue = append(current.Continue, item)
				case "stop":
					current.Stop = append(current.Stop, item)
				case "start":
					current.Start = append(current.Start, item)
				}
			}
		}
	}

	if current != nil && current.Title != "" {
		retrospectives = append(retrospectives, *current)
	}

	return retrospectives
}

// Serialize converts Retrospectives to markdown
func (p *RetrospectiveParser) Serialize(retrospectives []domain.Retrospective) string {
	var sb strings.Builder

	sb.WriteString("<!-- Retrospectives -->\n")
	sb.WriteString("# Retrospectives\n\n")

	for _, retro := range retrospectives {
		sb.WriteString(fmt.Sprintf("## %s\n", retro.Title))
		sb.WriteString(fmt.Sprintf("<!-- id: %s -->\n", retro.ID))
		sb.WriteString(fmt.Sprintf("Date: %s\n", retro.Date))
		sb.WriteString(fmt.Sprintf("Status: %s\n\n", retro.Status))

		sb.WriteString("### Continue\n")
		for _, item := range retro.Continue {
			sb.WriteString(fmt.Sprintf("- %s\n", item))
		}
		sb.WriteString("\n")

		sb.WriteString("### Stop\n")
		for _, item := range retro.Stop {
			sb.WriteString(fmt.Sprintf("- %s\n", item))
		}
		sb.WriteString("\n")

		sb.WriteString("### Start\n")
		for _, item := range retro.Start {
			sb.WriteString(fmt.Sprintf("- %s\n", item))
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

// FindByID finds a Retrospective by ID
func (p *RetrospectiveParser) FindByID(retrospectives []domain.Retrospective, id string) *domain.Retrospective {
	for i := range retrospectives {
		if retrospectives[i].ID == id {
			return &retrospectives[i]
		}
	}
	return nil
}

// GenerateID creates a unique Retrospective ID
func (p *RetrospectiveParser) GenerateID() string {
	return generateID()
}
