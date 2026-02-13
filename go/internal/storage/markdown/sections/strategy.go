package sections

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// StrategyParser handles parsing and serializing Strategic Levels from markdown
type StrategyParser struct {
	idPattern     *regexp.Regexp
	headerPattern *regexp.Regexp
	levelPattern  *regexp.Regexp
	configParser  *ConfigParser
}

// NewStrategyParser creates a new Strategy parser
func NewStrategyParser() *StrategyParser {
	return &StrategyParser{
		idPattern:     regexp.MustCompile(`<!-- id: ([^ ]+) -->`),
		headerPattern: regexp.MustCompile(`^## (.+?)\s*\{(.+)\}$`),
		levelPattern:  regexp.MustCompile(`^### \[([^\]]+)\] (.+?)\s*(?:\{(.+)\})?$`),
		configParser:  NewConfigParser(),
	}
}

// Parse extracts Strategic Levels Builders from lines
// Assumes lines are already extracted for this section
func (p *StrategyParser) Parse(lines []string) []domain.StrategicLevelsBuilder {
	var builders []domain.StrategicLevelsBuilder
	var current *domain.StrategicLevelsBuilder
	var currentLevel *domain.StrategicLevel
	var descriptionLines []string
	levelOrder := 0

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# Strategic Levels") || trimmed == "<!-- Strategic Levels -->" {
			continue
		}

		// Check for section boundary
		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Strategic Levels") {
			if currentLevel != nil && currentLevel.Title != "" {
				currentLevel.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
				current.Levels = append(current.Levels, *currentLevel)
			}
			if current != nil && current.Title != "" {
				builders = append(builders, *current)
			}
			break
		}

		// Builder header
		if match := p.headerPattern.FindStringSubmatch(trimmed); len(match) > 0 {
			// Save current level and builder
			if currentLevel != nil && currentLevel.Title != "" {
				currentLevel.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
				current.Levels = append(current.Levels, *currentLevel)
			}
			if current != nil && current.Title != "" {
				builders = append(builders, *current)
			}

			config := p.configParser.ParseConfigString(match[2])
			current = &domain.StrategicLevelsBuilder{
				ID:     generateID(),
				Title:  match[1],
				Date:   config["date"],
				Levels: []domain.StrategicLevel{},
			}
			if current.Date == "" {
				current.Date = time.Now().Format("2006-01-02")
			}
			currentLevel = nil
			descriptionLines = []string{}
			levelOrder = 0
			continue
		}

		if current == nil {
			continue
		}

		// Check for builder ID comment
		if match := p.idPattern.FindStringSubmatch(trimmed); len(match) > 0 {
			if currentLevel != nil {
				currentLevel.ID = match[1]
			} else {
				current.ID = match[1]
			}
			continue
		}

		// Level header: ### [vision] Title {config}
		if match := p.levelPattern.FindStringSubmatch(trimmed); len(match) > 0 {
			// Save previous level
			if currentLevel != nil && currentLevel.Title != "" {
				currentLevel.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
				current.Levels = append(current.Levels, *currentLevel)
			}

			config := p.configParser.ParseConfigString(match[3])
			currentLevel = &domain.StrategicLevel{
				ID:               generateID(),
				Title:            match[2],
				Level:            match[1],
				ParentID:         config["parentId"],
				Order:            levelOrder,
				LinkedTasks:      p.configParser.ParseArray(config["linkedTasks"]),
				LinkedMilestones: p.configParser.ParseArray(config["linkedMilestones"]),
			}
			descriptionLines = []string{}
			levelOrder++
			continue
		}

		// Description line for current level
		if currentLevel != nil && (trimmed != "" || len(descriptionLines) > 0) {
			descriptionLines = append(descriptionLines, trimmed)
		}
	}

	// Don't forget last level and builder
	if currentLevel != nil && currentLevel.Title != "" {
		currentLevel.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
		current.Levels = append(current.Levels, *currentLevel)
	}
	if current != nil && current.Title != "" {
		builders = append(builders, *current)
	}

	return builders
}

// Serialize converts Strategic Levels Builders to markdown
func (p *StrategyParser) Serialize(builders []domain.StrategicLevelsBuilder) string {
	var sb strings.Builder

	sb.WriteString("<!-- Strategic Levels -->\n")
	sb.WriteString("# Strategic Levels\n\n")

	for _, builder := range builders {
		sb.WriteString(fmt.Sprintf("## %s {date: %s}\n\n", builder.Title, builder.Date))
		sb.WriteString(fmt.Sprintf("<!-- id: %s -->\n\n", builder.ID))

		for _, level := range builder.Levels {
			// ### [vision] Title {parentId: xxx; linkedTasks: [1, 2]; linkedMilestones: [m1]}
			sb.WriteString(fmt.Sprintf("### [%s] %s", level.Level, level.Title))

			configParts := []string{}
			if level.ParentID != "" {
				configParts = append(configParts, fmt.Sprintf("parentId: %s", level.ParentID))
			}
			if len(level.LinkedTasks) > 0 {
				configParts = append(configParts, fmt.Sprintf("linkedTasks: [%s]", strings.Join(level.LinkedTasks, ", ")))
			}
			if len(level.LinkedMilestones) > 0 {
				configParts = append(configParts, fmt.Sprintf("linkedMilestones: [%s]", strings.Join(level.LinkedMilestones, ", ")))
			}

			if len(configParts) > 0 {
				sb.WriteString(fmt.Sprintf(" {%s}", strings.Join(configParts, "; ")))
			}
			sb.WriteString("\n")

			sb.WriteString(fmt.Sprintf("<!-- id: %s -->\n", level.ID))

			if level.Description != "" {
				sb.WriteString(level.Description)
				sb.WriteString("\n")
			}
			sb.WriteString("\n")
		}
	}

	return sb.String()
}

// FindByID finds a Strategic Levels Builder by ID
func (p *StrategyParser) FindByID(builders []domain.StrategicLevelsBuilder, id string) *domain.StrategicLevelsBuilder {
	for i := range builders {
		if builders[i].ID == id {
			return &builders[i]
		}
	}
	return nil
}

// FindLevelByID finds a Strategic Level by ID within all builders
func (p *StrategyParser) FindLevelByID(builders []domain.StrategicLevelsBuilder, id string) (*domain.StrategicLevel, *domain.StrategicLevelsBuilder) {
	for i := range builders {
		for j := range builders[i].Levels {
			if builders[i].Levels[j].ID == id {
				return &builders[i].Levels[j], &builders[i]
			}
		}
	}
	return nil, nil
}

// GenerateID creates a unique Strategic Levels Builder ID
func (p *StrategyParser) GenerateID() string {
	return generateID()
}
