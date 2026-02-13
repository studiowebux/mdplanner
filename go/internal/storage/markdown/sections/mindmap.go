package sections

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// MindmapParser handles parsing and serializing Mindmaps from markdown
type MindmapParser struct {
	idPattern   *regexp.Regexp
	listPattern *regexp.Regexp
}

// NewMindmapParser creates a new Mindmap parser
func NewMindmapParser() *MindmapParser {
	return &MindmapParser{
		idPattern:   regexp.MustCompile(`<!-- id: (mindmap_\d+) -->`),
		listPattern: regexp.MustCompile(`^[-*+]\s+(.+)$`),
	}
}

// Parse extracts Mindmaps from lines
// Assumes lines are already extracted for this section
func (p *MindmapParser) Parse(lines []string) []domain.Mindmap {
	var mindmaps []domain.Mindmap
	var current *domain.Mindmap
	var nodes []domain.MindmapNode

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# Mindmap") || trimmed == "<!-- Mindmap -->" {
			continue
		}

		// Check for section boundary
		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Mindmap") {
			if current != nil && current.Title != "" {
				current.Nodes = p.buildTree(nodes)
				mindmaps = append(mindmaps, *current)
			}
			break
		}

		// Check for section boundary comments
		if regexp.MustCompile(`<!-- (Board|Notes|Goals|Canvas|Configurations|C4 Architecture) -->`).MatchString(trimmed) {
			if current != nil && current.Title != "" {
				current.Nodes = p.buildTree(nodes)
				mindmaps = append(mindmaps, *current)
			}
			break
		}

		// Mindmap title
		if strings.HasPrefix(trimmed, "## ") {
			if current != nil && current.Title != "" {
				current.Nodes = p.buildTree(nodes)
				mindmaps = append(mindmaps, *current)
			}
			current = &domain.Mindmap{
				ID:    p.generateMindmapID(mindmaps),
				Title: strings.TrimPrefix(trimmed, "## "),
				Nodes: []domain.MindmapNode{},
			}
			nodes = []domain.MindmapNode{}
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

		// Parse list items
		if match := p.listPattern.FindStringSubmatch(trimmed); len(match) > 0 {
			// Calculate level based on leading spaces (2 spaces per level)
			leadingSpaces := len(line) - len(strings.TrimLeft(line, " \t"))
			level := leadingSpaces / 2

			node := domain.MindmapNode{
				ID:       fmt.Sprintf("%s_node_%d", current.ID, len(nodes)+1),
				Text:     match[1],
				Level:    level,
				Children: []domain.MindmapNode{},
			}
			nodes = append(nodes, node)
		}
	}

	// Don't forget last mindmap
	if current != nil && current.Title != "" {
		current.Nodes = p.buildTree(nodes)
		mindmaps = append(mindmaps, *current)
	}

	return mindmaps
}

// buildTree converts flat node list to hierarchical structure
func (p *MindmapParser) buildTree(nodes []domain.MindmapNode) []domain.MindmapNode {
	if len(nodes) == 0 {
		return []domain.MindmapNode{}
	}

	// Build parent-child relationships
	for i := range nodes {
		if nodes[i].Level > 0 {
			// Find parent (closest preceding node with level - 1)
			for j := i - 1; j >= 0; j-- {
				if nodes[j].Level == nodes[i].Level-1 {
					nodes[i].Parent = nodes[j].ID
					break
				}
			}
		}
	}

	// Build tree structure - collect root nodes and their children recursively
	var result []domain.MindmapNode
	for i := range nodes {
		if nodes[i].Level == 0 {
			rootNode := p.collectChildren(&nodes[i], nodes)
			result = append(result, rootNode)
		}
	}

	return result
}

func (p *MindmapParser) collectChildren(parent *domain.MindmapNode, allNodes []domain.MindmapNode) domain.MindmapNode {
	result := *parent
	result.Children = []domain.MindmapNode{}

	for i := range allNodes {
		if allNodes[i].Parent == parent.ID {
			child := p.collectChildren(&allNodes[i], allNodes)
			result.Children = append(result.Children, child)
		}
	}

	return result
}

// Serialize converts Mindmaps to markdown
func (p *MindmapParser) Serialize(mindmaps []domain.Mindmap) string {
	var sb strings.Builder

	sb.WriteString("<!-- Mindmap -->\n")
	sb.WriteString("# Mindmap\n\n")

	for _, mindmap := range mindmaps {
		sb.WriteString(fmt.Sprintf("## %s\n\n", mindmap.Title))
		sb.WriteString(fmt.Sprintf("<!-- id: %s -->\n\n", mindmap.ID))

		// Write nodes as nested list
		for _, node := range mindmap.Nodes {
			p.serializeNode(&sb, node, 0)
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

func (p *MindmapParser) serializeNode(sb *strings.Builder, node domain.MindmapNode, level int) {
	indent := strings.Repeat("  ", level)
	sb.WriteString(fmt.Sprintf("%s- %s\n", indent, node.Text))
	for _, child := range node.Children {
		p.serializeNode(sb, child, level+1)
	}
}

// FindByID finds a Mindmap by ID
func (p *MindmapParser) FindByID(mindmaps []domain.Mindmap, id string) *domain.Mindmap {
	for i := range mindmaps {
		if mindmaps[i].ID == id {
			return &mindmaps[i]
		}
	}
	return nil
}

// GenerateID creates a unique Mindmap ID
func (p *MindmapParser) GenerateID(mindmaps []domain.Mindmap) string {
	return p.generateMindmapID(mindmaps)
}

func (p *MindmapParser) generateMindmapID(mindmaps []domain.Mindmap) string {
	maxID := 0
	for _, mindmap := range mindmaps {
		if strings.HasPrefix(mindmap.ID, "mindmap_") {
			var id int
			fmt.Sscanf(mindmap.ID, "mindmap_%d", &id)
			if id > maxID {
				maxID = id
			}
		}
	}
	return fmt.Sprintf("mindmap_%d", maxID+1)
}
