package sections

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// C4Parser handles parsing and serializing C4 Architecture components from markdown
type C4Parser struct {
	idPattern     *regexp.Regexp
	headerPattern *regexp.Regexp
	configParser  *ConfigParser
}

// NewC4Parser creates a new C4 Architecture parser
func NewC4Parser() *C4Parser {
	return &C4Parser{
		idPattern:     regexp.MustCompile(`<!-- id: ([^ ]+) -->`),
		headerPattern: regexp.MustCompile(`^## (.+?)\s*\{(.+)\}$`),
		configParser:  NewConfigParser(),
	}
}

// Parse extracts C4 Components from lines
// Assumes lines are already extracted for this section
func (p *C4Parser) Parse(lines []string) []domain.C4Component {
	var components []domain.C4Component
	var current *domain.C4Component
	var descriptionLines []string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# C4 Architecture") || trimmed == "<!-- C4 Architecture -->" {
			continue
		}

		// Check for section boundary
		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# C4 Architecture") {
			if current != nil && current.Name != "" {
				current.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
				components = append(components, *current)
			}
			break
		}

		// Check for section boundary comments
		if regexp.MustCompile(`<!-- (Board|Notes|Goals|Canvas|Mindmap|Configurations) -->`).MatchString(trimmed) {
			if current != nil && current.Name != "" {
				current.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
				components = append(components, *current)
			}
			break
		}

		// Component header with config
		if match := p.headerPattern.FindStringSubmatch(trimmed); len(match) > 0 {
			if current != nil && current.Name != "" {
				current.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
				components = append(components, *current)
			}

			config := p.configParser.ParseConfigString(match[2])
			x, y := p.configParser.ParsePosition(config["position"])

			current = &domain.C4Component{
				ID:          generateID(),
				Name:        match[1],
				Level:       config["level"],
				Type:        config["type"],
				Technology:  config["technology"],
				Position:    domain.Position{X: x, Y: y},
				Connections: p.parseConnections(config["connections"]),
				Children:    p.configParser.ParseArray(config["children"]),
				Parent:      config["parent"],
			}
			if current.Level == "" {
				current.Level = "context"
			}
			if current.Type == "" {
				current.Type = "System"
			}
			descriptionLines = []string{}
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

		// Description line
		if trimmed != "" || len(descriptionLines) > 0 {
			descriptionLines = append(descriptionLines, trimmed)
		}
	}

	// Don't forget last component
	if current != nil && current.Name != "" {
		current.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
		components = append(components, *current)
	}

	return components
}

// parseConnections parses connections array from string
// Format: [{target: id1, label: label1}, {target: id2, label: label2}]
func (p *C4Parser) parseConnections(connStr string) []domain.C4Connection {
	var connections []domain.C4Connection

	connStr = strings.TrimSpace(connStr)
	if connStr == "" || connStr == "[]" {
		return connections
	}

	// Remove outer brackets
	if strings.HasPrefix(connStr, "[") && strings.HasSuffix(connStr, "]") {
		connStr = connStr[1 : len(connStr)-1]
	}

	// Simple parsing: split by }, {
	parts := strings.Split(connStr, "}, {")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		part = strings.TrimPrefix(part, "{")
		part = strings.TrimSuffix(part, "}")

		config := p.configParser.ParseConfigString(part)
		if config["target"] != "" {
			connections = append(connections, domain.C4Connection{
				Target: config["target"],
				Label:  config["label"],
			})
		}
	}

	return connections
}

// Serialize converts C4 Components to markdown
func (p *C4Parser) Serialize(components []domain.C4Component) string {
	var sb strings.Builder

	sb.WriteString("<!-- C4 Architecture -->\n")
	sb.WriteString("# C4 Architecture\n\n")

	for _, comp := range components {
		sb.WriteString(fmt.Sprintf("## %s {level: %s; type: %s", comp.Name, comp.Level, comp.Type))

		if comp.Technology != "" {
			sb.WriteString(fmt.Sprintf("; technology: %s", comp.Technology))
		}

		sb.WriteString(fmt.Sprintf("; position: {x: %.0f, y: %.0f}", comp.Position.X, comp.Position.Y))

		if len(comp.Connections) > 0 {
			connStrs := make([]string, len(comp.Connections))
			for i, conn := range comp.Connections {
				connStrs[i] = fmt.Sprintf("{target: %s, label: %s}", conn.Target, conn.Label)
			}
			sb.WriteString(fmt.Sprintf("; connections: [%s]", strings.Join(connStrs, ", ")))
		}

		if len(comp.Children) > 0 {
			sb.WriteString(fmt.Sprintf("; children: [%s]", strings.Join(comp.Children, ", ")))
		}

		if comp.Parent != "" {
			sb.WriteString(fmt.Sprintf("; parent: %s", comp.Parent))
		}

		sb.WriteString("}\n\n")
		sb.WriteString(fmt.Sprintf("<!-- id: %s -->\n", comp.ID))

		if comp.Description != "" {
			sb.WriteString(comp.Description)
			sb.WriteString("\n")
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

// FindByID finds a C4 Component by ID
func (p *C4Parser) FindByID(components []domain.C4Component, id string) *domain.C4Component {
	for i := range components {
		if components[i].ID == id {
			return &components[i]
		}
	}
	return nil
}

// GenerateID creates a unique C4 Component ID
func (p *C4Parser) GenerateID() string {
	return generateID()
}
