package sections

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// GoalsParser handles parsing and serializing Goals from markdown
type GoalsParser struct {
	idPattern     *regexp.Regexp
	headerPattern *regexp.Regexp
	configParser  *ConfigParser
}

// NewGoalsParser creates a new Goals parser
func NewGoalsParser() *GoalsParser {
	return &GoalsParser{
		idPattern:     regexp.MustCompile(`<!-- id: (goal_\d+) -->`),
		headerPattern: regexp.MustCompile(`^## (.+?)\s*\{(.+)\}$`),
		configParser:  NewConfigParser(),
	}
}

// Parse extracts Goals from lines
// Assumes lines are already extracted for this section
func (p *GoalsParser) Parse(lines []string) []domain.Goal {
	var goals []domain.Goal
	var current *domain.Goal
	var descriptionLines []string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# Goals") || trimmed == "<!-- Goals -->" {
			continue
		}

		// Check for section boundary
		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Goals") {
			if current != nil && current.Title != "" {
				current.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
				goals = append(goals, *current)
			}
			break
		}

		// Check for section boundary comments
		if regexp.MustCompile(`<!-- (Board|Notes|Configurations|Canvas|Mindmap) -->`).MatchString(trimmed) {
			if current != nil && current.Title != "" {
				current.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
				goals = append(goals, *current)
			}
			break
		}

		// Goal header with config
		if match := p.headerPattern.FindStringSubmatch(trimmed); len(match) > 0 {
			if current != nil && current.Title != "" {
				current.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
				goals = append(goals, *current)
			}

			config := p.configParser.ParseConfigString(match[2])
			current = &domain.Goal{
				ID:        p.generateGoalID(goals),
				Title:     match[1],
				Type:      config["type"],
				KPI:       config["kpi"],
				StartDate: config["start"],
				EndDate:   config["end"],
				Status:    config["status"],
			}
			if current.Type == "" {
				current.Type = "project"
			}
			if current.Status == "" {
				current.Status = "planning"
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

		// Description line (skip empty lines at start)
		if trimmed != "" || len(descriptionLines) > 0 {
			descriptionLines = append(descriptionLines, trimmed)
		}
	}

	// Don't forget last goal
	if current != nil && current.Title != "" {
		current.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
		goals = append(goals, *current)
	}

	return goals
}

// Serialize converts Goals to markdown
func (p *GoalsParser) Serialize(goals []domain.Goal) string {
	var sb strings.Builder

	sb.WriteString("<!-- Goals -->\n")
	sb.WriteString("# Goals\n\n")

	for _, goal := range goals {
		sb.WriteString(fmt.Sprintf("## %s {type: %s; kpi: %s; start: %s; end: %s; status: %s}\n\n",
			goal.Title, goal.Type, goal.KPI, goal.StartDate, goal.EndDate, goal.Status))
		sb.WriteString(fmt.Sprintf("<!-- id: %s -->\n", goal.ID))
		if goal.Description != "" {
			sb.WriteString(goal.Description)
			sb.WriteString("\n")
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

// FindByID finds a Goal by ID
func (p *GoalsParser) FindByID(goals []domain.Goal, id string) *domain.Goal {
	for i := range goals {
		if goals[i].ID == id {
			return &goals[i]
		}
	}
	return nil
}

// GenerateID creates a unique Goal ID
func (p *GoalsParser) GenerateID(goals []domain.Goal) string {
	return p.generateGoalID(goals)
}

func (p *GoalsParser) generateGoalID(goals []domain.Goal) string {
	maxID := 0
	for _, goal := range goals {
		if strings.HasPrefix(goal.ID, "goal_") {
			var id int
			fmt.Sscanf(goal.ID, "goal_%d", &id)
			if id > maxID {
				maxID = id
			}
		}
	}
	return fmt.Sprintf("goal_%d", maxID+1)
}
