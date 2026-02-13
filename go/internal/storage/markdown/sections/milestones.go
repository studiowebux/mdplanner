package sections

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// MilestonesParser handles parsing and serializing Milestones from markdown
type MilestonesParser struct {
	idPattern     *regexp.Regexp
	headerPattern *regexp.Regexp
	configParser  *ConfigParser
}

// NewMilestonesParser creates a new Milestones parser
func NewMilestonesParser() *MilestonesParser {
	return &MilestonesParser{
		idPattern:     regexp.MustCompile(`<!-- id: (milestone_\d+) -->`),
		headerPattern: regexp.MustCompile(`^## (.+?)\s*\{(.+)\}$`),
		configParser:  NewConfigParser(),
	}
}

// Parse extracts Milestones from lines
// Assumes lines are already extracted for this section
func (p *MilestonesParser) Parse(lines []string) []domain.Milestone {
	var milestones []domain.Milestone
	var current *domain.Milestone
	var descriptionLines []string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# Milestones") || trimmed == "<!-- Milestones -->" {
			continue
		}

		// Check for section boundary
		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Milestones") {
			if current != nil && current.Name != "" {
				current.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
				milestones = append(milestones, *current)
			}
			break
		}

		// Check for section boundary comments
		if regexp.MustCompile(`<!-- (Board|Notes|Goals|Canvas|Mindmap|Configurations) -->`).MatchString(trimmed) {
			if current != nil && current.Name != "" {
				current.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
				milestones = append(milestones, *current)
			}
			break
		}

		// Milestone header with config
		if match := p.headerPattern.FindStringSubmatch(trimmed); len(match) > 0 {
			if current != nil && current.Name != "" {
				current.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
				milestones = append(milestones, *current)
			}

			config := p.configParser.ParseConfigString(match[2])
			current = &domain.Milestone{
				ID:     p.generateMilestoneID(milestones),
				Name:   match[1],
				Target: config["target"],
				Status: config["status"],
			}
			if current.Status == "" {
				current.Status = "open"
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

	// Don't forget last milestone
	if current != nil && current.Name != "" {
		current.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
		milestones = append(milestones, *current)
	}

	return milestones
}

// Serialize converts Milestones to markdown
func (p *MilestonesParser) Serialize(milestones []domain.Milestone) string {
	var sb strings.Builder

	sb.WriteString("<!-- Milestones -->\n")
	sb.WriteString("# Milestones\n\n")

	for _, milestone := range milestones {
		sb.WriteString(fmt.Sprintf("## %s {target: %s; status: %s}\n\n",
			milestone.Name, milestone.Target, milestone.Status))
		sb.WriteString(fmt.Sprintf("<!-- id: %s -->\n", milestone.ID))
		if milestone.Description != "" {
			sb.WriteString(milestone.Description)
			sb.WriteString("\n")
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

// FindByID finds a Milestone by ID
func (p *MilestonesParser) FindByID(milestones []domain.Milestone, id string) *domain.Milestone {
	for i := range milestones {
		if milestones[i].ID == id {
			return &milestones[i]
		}
	}
	return nil
}

// GenerateID creates a unique Milestone ID
func (p *MilestonesParser) GenerateID(milestones []domain.Milestone) string {
	return p.generateMilestoneID(milestones)
}

func (p *MilestonesParser) generateMilestoneID(milestones []domain.Milestone) string {
	maxID := 0
	for _, milestone := range milestones {
		if strings.HasPrefix(milestone.ID, "milestone_") {
			var id int
			fmt.Sscanf(milestone.ID, "milestone_%d", &id)
			if id > maxID {
				maxID = id
			}
		}
	}
	return fmt.Sprintf("milestone_%d", maxID+1)
}
