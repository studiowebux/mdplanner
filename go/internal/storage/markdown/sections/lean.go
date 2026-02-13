package sections

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// LeanParser handles parsing and serializing Lean Canvases from markdown
type LeanParser struct {
	idPattern  *regexp.Regexp
	sectionMap map[string]string
}

// NewLeanParser creates a new Lean Canvas parser
func NewLeanParser() *LeanParser {
	return &LeanParser{
		idPattern: regexp.MustCompile(`<!-- id: ([^ ]+)`),
		sectionMap: map[string]string{
			"### Problem":               "problem",
			"### Solution":              "solution",
			"### Unique Value Proposition": "uniqueValueProp",
			"### Unfair Advantage":      "unfairAdvantage",
			"### Customer Segments":     "customerSegments",
			"### Existing Alternatives": "existingAlternatives",
			"### Key Metrics":           "keyMetrics",
			"### High-Level Concept":    "highLevelConcept",
			"### Channels":              "channels",
			"### Early Adopters":        "earlyAdopters",
			"### Cost Structure":        "costStructure",
			"### Revenue Streams":       "revenueStreams",
		},
	}
}

// Parse extracts Lean Canvases from lines
// Assumes lines are already extracted for this section
func (p *LeanParser) Parse(lines []string) []domain.LeanCanvas {
	var canvases []domain.LeanCanvas
	var current *domain.LeanCanvas
	var currentSubsection string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# Lean Canvas") || trimmed == "<!-- Lean Canvas -->" {
			continue
		}

		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Lean Canvas") {
			if current != nil && current.Title != "" {
				canvases = append(canvases, *current)
			}
			break
		}

		if strings.HasPrefix(trimmed, "## ") {
			if current != nil && current.Title != "" {
				canvases = append(canvases, *current)
			}
			current = &domain.LeanCanvas{
				ID:                   generateID(),
				Title:                strings.TrimPrefix(trimmed, "## "),
				Date:                 time.Now().Format("2006-01-02"),
				Problem:              []string{},
				Solution:             []string{},
				UniqueValueProp:      []string{},
				UnfairAdvantage:      []string{},
				CustomerSegments:     []string{},
				ExistingAlternatives: []string{},
				KeyMetrics:           []string{},
				HighLevelConcept:     []string{},
				Channels:             []string{},
				EarlyAdopters:        []string{},
				CostStructure:        []string{},
				RevenueStreams:       []string{},
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
		canvases = append(canvases, *current)
	}

	return canvases
}

func (p *LeanParser) addToSection(canvas *domain.LeanCanvas, section, item string) {
	switch section {
	case "problem":
		canvas.Problem = append(canvas.Problem, item)
	case "solution":
		canvas.Solution = append(canvas.Solution, item)
	case "uniqueValueProp":
		canvas.UniqueValueProp = append(canvas.UniqueValueProp, item)
	case "unfairAdvantage":
		canvas.UnfairAdvantage = append(canvas.UnfairAdvantage, item)
	case "customerSegments":
		canvas.CustomerSegments = append(canvas.CustomerSegments, item)
	case "existingAlternatives":
		canvas.ExistingAlternatives = append(canvas.ExistingAlternatives, item)
	case "keyMetrics":
		canvas.KeyMetrics = append(canvas.KeyMetrics, item)
	case "highLevelConcept":
		canvas.HighLevelConcept = append(canvas.HighLevelConcept, item)
	case "channels":
		canvas.Channels = append(canvas.Channels, item)
	case "earlyAdopters":
		canvas.EarlyAdopters = append(canvas.EarlyAdopters, item)
	case "costStructure":
		canvas.CostStructure = append(canvas.CostStructure, item)
	case "revenueStreams":
		canvas.RevenueStreams = append(canvas.RevenueStreams, item)
	}
}

// Serialize converts Lean Canvases to markdown
func (p *LeanParser) Serialize(canvases []domain.LeanCanvas) string {
	var sb strings.Builder

	sb.WriteString("<!-- Lean Canvas -->\n")
	sb.WriteString("# Lean Canvas\n\n")

	sections := []struct {
		header string
		getter func(*domain.LeanCanvas) []string
	}{
		{"Problem", func(c *domain.LeanCanvas) []string { return c.Problem }},
		{"Solution", func(c *domain.LeanCanvas) []string { return c.Solution }},
		{"Unique Value Proposition", func(c *domain.LeanCanvas) []string { return c.UniqueValueProp }},
		{"Unfair Advantage", func(c *domain.LeanCanvas) []string { return c.UnfairAdvantage }},
		{"Customer Segments", func(c *domain.LeanCanvas) []string { return c.CustomerSegments }},
		{"Existing Alternatives", func(c *domain.LeanCanvas) []string { return c.ExistingAlternatives }},
		{"Key Metrics", func(c *domain.LeanCanvas) []string { return c.KeyMetrics }},
		{"High-Level Concept", func(c *domain.LeanCanvas) []string { return c.HighLevelConcept }},
		{"Channels", func(c *domain.LeanCanvas) []string { return c.Channels }},
		{"Early Adopters", func(c *domain.LeanCanvas) []string { return c.EarlyAdopters }},
		{"Cost Structure", func(c *domain.LeanCanvas) []string { return c.CostStructure }},
		{"Revenue Streams", func(c *domain.LeanCanvas) []string { return c.RevenueStreams }},
	}

	for _, canvas := range canvases {
		sb.WriteString(fmt.Sprintf("## %s\n", canvas.Title))
		sb.WriteString(fmt.Sprintf("<!-- id: %s -->\n", canvas.ID))
		sb.WriteString(fmt.Sprintf("Date: %s\n\n", canvas.Date))

		for _, sec := range sections {
			sb.WriteString(fmt.Sprintf("### %s\n", sec.header))
			for _, item := range sec.getter(&canvas) {
				sb.WriteString(fmt.Sprintf("- %s\n", item))
			}
			sb.WriteString("\n")
		}
	}

	return sb.String()
}

// FindByID finds a Lean Canvas by ID
func (p *LeanParser) FindByID(canvases []domain.LeanCanvas, id string) *domain.LeanCanvas {
	for i := range canvases {
		if canvases[i].ID == id {
			return &canvases[i]
		}
	}
	return nil
}

// GenerateID creates a unique Lean Canvas ID
func (p *LeanParser) GenerateID() string {
	return generateID()
}
