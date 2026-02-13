package sections

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// BriefParser handles parsing and serializing Briefs from markdown
type BriefParser struct {
	idPattern  *regexp.Regexp
	sectionMap map[string]string
}

// NewBriefParser creates a new Brief parser
func NewBriefParser() *BriefParser {
	return &BriefParser{
		idPattern: regexp.MustCompile(`<!-- id: ([^ ]+)`),
		sectionMap: map[string]string{
			"### Summary":             "summary",
			"### Mission":             "mission",
			"### Responsible":         "responsible",
			"### Accountable":         "accountable",
			"### Consulted":           "consulted",
			"### Informed":            "informed",
			"### High Level Budget":   "highLevelBudget",
			"### High Level Timeline": "highLevelTimeline",
			"### Culture":             "culture",
			"### Change Capacity":     "changeCapacity",
			"### Guiding Principles":  "guidingPrinciples",
		},
	}
}

// Parse extracts Briefs from lines
// Assumes lines are already extracted for this section
func (p *BriefParser) Parse(lines []string) []domain.Brief {
	var briefs []domain.Brief
	var current *domain.Brief
	var currentSubsection string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# Brief") || trimmed == "<!-- Brief -->" {
			continue
		}

		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Brief") {
			if current != nil && current.Title != "" {
				briefs = append(briefs, *current)
			}
			break
		}

		if strings.HasPrefix(trimmed, "## ") {
			if current != nil && current.Title != "" {
				briefs = append(briefs, *current)
			}
			current = &domain.Brief{
				ID:                generateID(),
				Title:             strings.TrimPrefix(trimmed, "## "),
				Date:              time.Now().Format("2006-01-02"),
				Summary:           []string{},
				Mission:           []string{},
				Responsible:       []string{},
				Accountable:       []string{},
				Consulted:         []string{},
				Informed:          []string{},
				HighLevelBudget:   []string{},
				HighLevelTimeline: []string{},
				Culture:           []string{},
				ChangeCapacity:    []string{},
				GuidingPrinciples: []string{},
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
				p.addToSection(current, currentSubsection, item)
			}
		}
	}

	if current != nil && current.Title != "" {
		briefs = append(briefs, *current)
	}

	return briefs
}

func (p *BriefParser) addToSection(brief *domain.Brief, section, item string) {
	switch section {
	case "summary":
		brief.Summary = append(brief.Summary, item)
	case "mission":
		brief.Mission = append(brief.Mission, item)
	case "responsible":
		brief.Responsible = append(brief.Responsible, item)
	case "accountable":
		brief.Accountable = append(brief.Accountable, item)
	case "consulted":
		brief.Consulted = append(brief.Consulted, item)
	case "informed":
		brief.Informed = append(brief.Informed, item)
	case "highLevelBudget":
		brief.HighLevelBudget = append(brief.HighLevelBudget, item)
	case "highLevelTimeline":
		brief.HighLevelTimeline = append(brief.HighLevelTimeline, item)
	case "culture":
		brief.Culture = append(brief.Culture, item)
	case "changeCapacity":
		brief.ChangeCapacity = append(brief.ChangeCapacity, item)
	case "guidingPrinciples":
		brief.GuidingPrinciples = append(brief.GuidingPrinciples, item)
	}
}

// Serialize converts Briefs to markdown
func (p *BriefParser) Serialize(briefs []domain.Brief) string {
	var sb strings.Builder

	sb.WriteString("<!-- Brief -->\n")
	sb.WriteString("# Brief\n\n")

	sections := []struct {
		header string
		getter func(*domain.Brief) []string
	}{
		{"Summary", func(b *domain.Brief) []string { return b.Summary }},
		{"Mission", func(b *domain.Brief) []string { return b.Mission }},
		{"Responsible", func(b *domain.Brief) []string { return b.Responsible }},
		{"Accountable", func(b *domain.Brief) []string { return b.Accountable }},
		{"Consulted", func(b *domain.Brief) []string { return b.Consulted }},
		{"Informed", func(b *domain.Brief) []string { return b.Informed }},
		{"High Level Budget", func(b *domain.Brief) []string { return b.HighLevelBudget }},
		{"High Level Timeline", func(b *domain.Brief) []string { return b.HighLevelTimeline }},
		{"Culture", func(b *domain.Brief) []string { return b.Culture }},
		{"Change Capacity", func(b *domain.Brief) []string { return b.ChangeCapacity }},
		{"Guiding Principles", func(b *domain.Brief) []string { return b.GuidingPrinciples }},
	}

	for _, brief := range briefs {
		sb.WriteString(fmt.Sprintf("## %s\n", brief.Title))
		sb.WriteString(fmt.Sprintf("<!-- id: %s -->\n", brief.ID))
		sb.WriteString(fmt.Sprintf("Date: %s\n\n", brief.Date))

		for _, sec := range sections {
			sb.WriteString(fmt.Sprintf("### %s\n", sec.header))
			for _, item := range sec.getter(&brief) {
				sb.WriteString(fmt.Sprintf("- %s\n", item))
			}
			sb.WriteString("\n")
		}
	}

	return sb.String()
}

// FindByID finds a Brief by ID
func (p *BriefParser) FindByID(briefs []domain.Brief, id string) *domain.Brief {
	for i := range briefs {
		if briefs[i].ID == id {
			return &briefs[i]
		}
	}
	return nil
}

// GenerateID creates a unique Brief ID
func (p *BriefParser) GenerateID() string {
	return generateID()
}
