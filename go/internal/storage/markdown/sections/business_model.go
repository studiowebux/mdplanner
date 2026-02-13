package sections

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// BusinessModelParser handles parsing and serializing Business Model Canvases from markdown
type BusinessModelParser struct {
	idPattern  *regexp.Regexp
	sectionMap map[string]string
}

// NewBusinessModelParser creates a new Business Model Canvas parser
func NewBusinessModelParser() *BusinessModelParser {
	return &BusinessModelParser{
		idPattern: regexp.MustCompile(`<!-- id: ([^ ]+)`),
		sectionMap: map[string]string{
			"### Key Partners":           "keyPartners",
			"### Key Activities":         "keyActivities",
			"### Key Resources":          "keyResources",
			"### Value Proposition":      "valueProposition",
			"### Customer Relationships": "customerRelationships",
			"### Channels":               "channels",
			"### Customer Segments":      "customerSegments",
			"### Cost Structure":         "costStructure",
			"### Revenue Streams":        "revenueStreams",
		},
	}
}

// Parse extracts Business Model Canvases from lines
// Assumes lines are already extracted for this section
func (p *BusinessModelParser) Parse(lines []string) []domain.BusinessModelCanvas {
	var canvases []domain.BusinessModelCanvas
	var current *domain.BusinessModelCanvas
	var currentSubsection string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# Business Model Canvas") || trimmed == "<!-- Business Model Canvas -->" {
			continue
		}

		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Business Model Canvas") {
			if current != nil && current.Title != "" {
				canvases = append(canvases, *current)
			}
			break
		}

		if strings.HasPrefix(trimmed, "## ") {
			if current != nil && current.Title != "" {
				canvases = append(canvases, *current)
			}
			current = &domain.BusinessModelCanvas{
				ID:                    generateID(),
				Title:                 strings.TrimPrefix(trimmed, "## "),
				Date:                  time.Now().Format("2006-01-02"),
				KeyPartners:           []string{},
				KeyActivities:         []string{},
				KeyResources:          []string{},
				ValueProposition:      []string{},
				CustomerRelationships: []string{},
				Channels:              []string{},
				CustomerSegments:      []string{},
				CostStructure:         []string{},
				RevenueStreams:        []string{},
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

func (p *BusinessModelParser) addToSection(canvas *domain.BusinessModelCanvas, section, item string) {
	switch section {
	case "keyPartners":
		canvas.KeyPartners = append(canvas.KeyPartners, item)
	case "keyActivities":
		canvas.KeyActivities = append(canvas.KeyActivities, item)
	case "keyResources":
		canvas.KeyResources = append(canvas.KeyResources, item)
	case "valueProposition":
		canvas.ValueProposition = append(canvas.ValueProposition, item)
	case "customerRelationships":
		canvas.CustomerRelationships = append(canvas.CustomerRelationships, item)
	case "channels":
		canvas.Channels = append(canvas.Channels, item)
	case "customerSegments":
		canvas.CustomerSegments = append(canvas.CustomerSegments, item)
	case "costStructure":
		canvas.CostStructure = append(canvas.CostStructure, item)
	case "revenueStreams":
		canvas.RevenueStreams = append(canvas.RevenueStreams, item)
	}
}

// Serialize converts Business Model Canvases to markdown
func (p *BusinessModelParser) Serialize(canvases []domain.BusinessModelCanvas) string {
	var sb strings.Builder

	sb.WriteString("<!-- Business Model Canvas -->\n")
	sb.WriteString("# Business Model Canvas\n\n")

	sections := []struct {
		header string
		getter func(*domain.BusinessModelCanvas) []string
	}{
		{"Key Partners", func(c *domain.BusinessModelCanvas) []string { return c.KeyPartners }},
		{"Key Activities", func(c *domain.BusinessModelCanvas) []string { return c.KeyActivities }},
		{"Key Resources", func(c *domain.BusinessModelCanvas) []string { return c.KeyResources }},
		{"Value Proposition", func(c *domain.BusinessModelCanvas) []string { return c.ValueProposition }},
		{"Customer Relationships", func(c *domain.BusinessModelCanvas) []string { return c.CustomerRelationships }},
		{"Channels", func(c *domain.BusinessModelCanvas) []string { return c.Channels }},
		{"Customer Segments", func(c *domain.BusinessModelCanvas) []string { return c.CustomerSegments }},
		{"Cost Structure", func(c *domain.BusinessModelCanvas) []string { return c.CostStructure }},
		{"Revenue Streams", func(c *domain.BusinessModelCanvas) []string { return c.RevenueStreams }},
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

// FindByID finds a Business Model Canvas by ID
func (p *BusinessModelParser) FindByID(canvases []domain.BusinessModelCanvas, id string) *domain.BusinessModelCanvas {
	for i := range canvases {
		if canvases[i].ID == id {
			return &canvases[i]
		}
	}
	return nil
}

// GenerateID creates a unique Business Model Canvas ID
func (p *BusinessModelParser) GenerateID() string {
	return generateID()
}
