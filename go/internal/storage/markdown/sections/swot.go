package sections

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// SwotParser handles parsing and serializing SWOT analyses from markdown
type SwotParser struct {
	idPattern *regexp.Regexp
}

// NewSwotParser creates a new SWOT parser
func NewSwotParser() *SwotParser {
	return &SwotParser{
		idPattern: regexp.MustCompile(`<!-- id: ([^ ]+)`),
	}
}

// Parse extracts SWOT analyses from lines
// Assumes lines are already extracted for this section
func (p *SwotParser) Parse(lines []string) []domain.SwotAnalysis {
	var analyses []domain.SwotAnalysis
	var current *domain.SwotAnalysis
	var currentSubsection string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# SWOT Analysis") || trimmed == "<!-- SWOT Analysis -->" {
			continue
		}

		// Check for section end (next major section)
		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# SWOT Analysis") {
			if current != nil && current.Title != "" {
				analyses = append(analyses, *current)
			}
			break
		}

		// Entry header
		if strings.HasPrefix(trimmed, "## ") {
			if current != nil && current.Title != "" {
				analyses = append(analyses, *current)
			}
			current = &domain.SwotAnalysis{
				ID:            generateID(),
				Title:         strings.TrimPrefix(trimmed, "## "),
				Date:          time.Now().Format("2006-01-02"),
				Strengths:     []string{},
				Weaknesses:    []string{},
				Opportunities: []string{},
				Threats:       []string{},
			}
			currentSubsection = ""
			continue
		}

		if current == nil {
			continue
		}

		// Parse metadata
		if strings.HasPrefix(trimmed, "Date:") {
			current.Date = strings.TrimSpace(strings.TrimPrefix(trimmed, "Date:"))
			continue
		}

		if strings.HasPrefix(trimmed, "<!-- id:") {
			if match := p.idPattern.FindStringSubmatch(trimmed); len(match) > 1 {
				current.ID = match[1]
			}
			continue
		}

		// Subsection headers
		switch trimmed {
		case "### Strengths":
			currentSubsection = "strengths"
			continue
		case "### Weaknesses":
			currentSubsection = "weaknesses"
			continue
		case "### Opportunities":
			currentSubsection = "opportunities"
			continue
		case "### Threats":
			currentSubsection = "threats"
			continue
		}

		// List items
		if strings.HasPrefix(trimmed, "- ") && currentSubsection != "" {
			item := strings.TrimPrefix(trimmed, "- ")
			if item != "" {
				switch currentSubsection {
				case "strengths":
					current.Strengths = append(current.Strengths, item)
				case "weaknesses":
					current.Weaknesses = append(current.Weaknesses, item)
				case "opportunities":
					current.Opportunities = append(current.Opportunities, item)
				case "threats":
					current.Threats = append(current.Threats, item)
				}
			}
		}
	}

	// Don't forget last entry
	if current != nil && current.Title != "" {
		analyses = append(analyses, *current)
	}

	return analyses
}

// Serialize converts SWOT analyses to markdown
func (p *SwotParser) Serialize(analyses []domain.SwotAnalysis) string {
	var sb strings.Builder

	sb.WriteString("<!-- SWOT Analysis -->\n")
	sb.WriteString("# SWOT Analysis\n\n")

	for _, swot := range analyses {
		sb.WriteString(fmt.Sprintf("## %s\n", swot.Title))
		sb.WriteString(fmt.Sprintf("<!-- id: %s -->\n", swot.ID))
		sb.WriteString(fmt.Sprintf("Date: %s\n\n", swot.Date))

		sb.WriteString("### Strengths\n")
		for _, item := range swot.Strengths {
			sb.WriteString(fmt.Sprintf("- %s\n", item))
		}
		sb.WriteString("\n")

		sb.WriteString("### Weaknesses\n")
		for _, item := range swot.Weaknesses {
			sb.WriteString(fmt.Sprintf("- %s\n", item))
		}
		sb.WriteString("\n")

		sb.WriteString("### Opportunities\n")
		for _, item := range swot.Opportunities {
			sb.WriteString(fmt.Sprintf("- %s\n", item))
		}
		sb.WriteString("\n")

		sb.WriteString("### Threats\n")
		for _, item := range swot.Threats {
			sb.WriteString(fmt.Sprintf("- %s\n", item))
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

// FindByID finds a SWOT analysis by ID
func (p *SwotParser) FindByID(analyses []domain.SwotAnalysis, id string) *domain.SwotAnalysis {
	for i := range analyses {
		if analyses[i].ID == id {
			return &analyses[i]
		}
	}
	return nil
}

// GenerateID creates a unique SWOT analysis ID
func (p *SwotParser) GenerateID(analyses []domain.SwotAnalysis) string {
	return generateID()
}
