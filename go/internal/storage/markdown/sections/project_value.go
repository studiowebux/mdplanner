package sections

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// ProjectValueParser handles parsing and serializing Project Value Boards from markdown
type ProjectValueParser struct {
	idPattern  *regexp.Regexp
	sectionMap map[string]string
}

// NewProjectValueParser creates a new Project Value Board parser
func NewProjectValueParser() *ProjectValueParser {
	return &ProjectValueParser{
		idPattern: regexp.MustCompile(`<!-- id: ([^ ]+)`),
		sectionMap: map[string]string{
			"### Customer Segments": "customerSegments",
			"### Problem":           "problem",
			"### Solution":          "solution",
			"### Benefit":           "benefit",
		},
	}
}

// Parse extracts Project Value Boards from lines
// Assumes lines are already extracted for this section
func (p *ProjectValueParser) Parse(lines []string) []domain.ProjectValueBoard {
	var boards []domain.ProjectValueBoard
	var current *domain.ProjectValueBoard
	var currentSubsection string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# Project Value Board") || trimmed == "<!-- Project Value Board -->" {
			continue
		}

		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Project Value Board") {
			if current != nil && current.Title != "" {
				boards = append(boards, *current)
			}
			break
		}

		if strings.HasPrefix(trimmed, "## ") {
			if current != nil && current.Title != "" {
				boards = append(boards, *current)
			}
			current = &domain.ProjectValueBoard{
				ID:               generateID(),
				Title:            strings.TrimPrefix(trimmed, "## "),
				Date:             time.Now().Format("2006-01-02"),
				CustomerSegments: []string{},
				Problem:          []string{},
				Solution:         []string{},
				Benefit:          []string{},
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

		if strings.HasPrefix(trimmed, "<!-- id:") {
			if match := p.idPattern.FindStringSubmatch(trimmed); len(match) > 1 {
				current.ID = match[1]
			}
			continue
		}

		// Check for section headers
		for header, key := range p.sectionMap {
			if trimmed == header {
				currentSubsection = key
				break
			}
		}

		if strings.HasPrefix(trimmed, "- ") && currentSubsection != "" {
			item := strings.TrimPrefix(trimmed, "- ")
			if item != "" {
				switch currentSubsection {
				case "customerSegments":
					current.CustomerSegments = append(current.CustomerSegments, item)
				case "problem":
					current.Problem = append(current.Problem, item)
				case "solution":
					current.Solution = append(current.Solution, item)
				case "benefit":
					current.Benefit = append(current.Benefit, item)
				}
			}
		}
	}

	if current != nil && current.Title != "" {
		boards = append(boards, *current)
	}

	return boards
}

// Serialize converts Project Value Boards to markdown
func (p *ProjectValueParser) Serialize(boards []domain.ProjectValueBoard) string {
	var sb strings.Builder

	sb.WriteString("<!-- Project Value Board -->\n")
	sb.WriteString("# Project Value Board\n\n")

	sections := []struct {
		header string
		getter func(*domain.ProjectValueBoard) []string
	}{
		{"Customer Segments", func(b *domain.ProjectValueBoard) []string { return b.CustomerSegments }},
		{"Problem", func(b *domain.ProjectValueBoard) []string { return b.Problem }},
		{"Solution", func(b *domain.ProjectValueBoard) []string { return b.Solution }},
		{"Benefit", func(b *domain.ProjectValueBoard) []string { return b.Benefit }},
	}

	for _, board := range boards {
		sb.WriteString(fmt.Sprintf("## %s\n", board.Title))
		sb.WriteString(fmt.Sprintf("<!-- id: %s -->\n", board.ID))
		sb.WriteString(fmt.Sprintf("Date: %s\n\n", board.Date))

		for _, sec := range sections {
			sb.WriteString(fmt.Sprintf("### %s\n", sec.header))
			for _, item := range sec.getter(&board) {
				sb.WriteString(fmt.Sprintf("- %s\n", item))
			}
			sb.WriteString("\n")
		}
	}

	return sb.String()
}

// FindByID finds a Project Value Board by ID
func (p *ProjectValueParser) FindByID(boards []domain.ProjectValueBoard, id string) *domain.ProjectValueBoard {
	for i := range boards {
		if boards[i].ID == id {
			return &boards[i]
		}
	}
	return nil
}

// GenerateID creates a unique Project Value Board ID
func (p *ProjectValueParser) GenerateID() string {
	return generateID()
}
