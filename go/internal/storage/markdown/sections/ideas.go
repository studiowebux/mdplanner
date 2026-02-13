package sections

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// IdeasParser handles parsing and serializing Ideas from markdown
type IdeasParser struct {
	idPattern     *regexp.Regexp
	headerPattern *regexp.Regexp
	configParser  *ConfigParser
}

// NewIdeasParser creates a new Ideas parser
func NewIdeasParser() *IdeasParser {
	return &IdeasParser{
		idPattern:     regexp.MustCompile(`<!-- id: (idea_\d+) -->`),
		headerPattern: regexp.MustCompile(`^## (.+?)\s*\{(.+)\}$`),
		configParser:  NewConfigParser(),
	}
}

// Parse extracts Ideas from lines
// Assumes lines are already extracted for this section
func (p *IdeasParser) Parse(lines []string) []domain.Idea {
	var ideas []domain.Idea
	var current *domain.Idea
	var descriptionLines []string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# Ideas") || trimmed == "<!-- Ideas -->" {
			continue
		}

		// Check for section boundary
		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Ideas") {
			if current != nil && current.Title != "" {
				current.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
				ideas = append(ideas, *current)
			}
			break
		}

		// Check for section boundary comments
		if regexp.MustCompile(`<!-- (Board|Notes|Goals|Canvas|Mindmap|Configurations|Milestones) -->`).MatchString(trimmed) {
			if current != nil && current.Title != "" {
				current.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
				ideas = append(ideas, *current)
			}
			break
		}

		// Idea header with config
		if match := p.headerPattern.FindStringSubmatch(trimmed); len(match) > 0 {
			if current != nil && current.Title != "" {
				current.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
				ideas = append(ideas, *current)
			}

			config := p.configParser.ParseConfigString(match[2])
			links := p.configParser.ParseArray(config["links"])

			current = &domain.Idea{
				ID:       p.generateIdeaID(ideas),
				Title:    match[1],
				Status:   config["status"],
				Category: config["category"],
				Created:  config["created"],
				Links:    links,
			}
			if current.Status == "" {
				current.Status = "new"
			}
			if current.Created == "" {
				current.Created = time.Now().Format("2006-01-02")
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

	// Don't forget last idea
	if current != nil && current.Title != "" {
		current.Description = strings.TrimSpace(strings.Join(descriptionLines, "\n"))
		ideas = append(ideas, *current)
	}

	return ideas
}

// Serialize converts Ideas to markdown
func (p *IdeasParser) Serialize(ideas []domain.Idea) string {
	var sb strings.Builder

	sb.WriteString("<!-- Ideas -->\n")
	sb.WriteString("# Ideas\n\n")

	for _, idea := range ideas {
		linksStr := ""
		if len(idea.Links) > 0 {
			linksStr = fmt.Sprintf("; links: [%s]", strings.Join(idea.Links, ", "))
		}

		sb.WriteString(fmt.Sprintf("## %s {status: %s; category: %s; created: %s%s}\n\n",
			idea.Title, idea.Status, idea.Category, idea.Created, linksStr))
		sb.WriteString(fmt.Sprintf("<!-- id: %s -->\n", idea.ID))
		if idea.Description != "" {
			sb.WriteString(idea.Description)
			sb.WriteString("\n")
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

// FindByID finds an Idea by ID
func (p *IdeasParser) FindByID(ideas []domain.Idea, id string) *domain.Idea {
	for i := range ideas {
		if ideas[i].ID == id {
			return &ideas[i]
		}
	}
	return nil
}

// GenerateID creates a unique Idea ID
func (p *IdeasParser) GenerateID(ideas []domain.Idea) string {
	return p.generateIdeaID(ideas)
}

// ComputeBacklinks computes backlinks for all ideas
func (p *IdeasParser) ComputeBacklinks(ideas []domain.Idea) []domain.IdeaWithBacklinks {
	result := make([]domain.IdeaWithBacklinks, len(ideas))

	// Initialize with empty backlinks
	for i := range ideas {
		result[i] = domain.IdeaWithBacklinks{
			Idea:      ideas[i],
			Backlinks: []string{},
		}
	}

	// Compute backlinks
	for _, idea := range ideas {
		for _, linkedID := range idea.Links {
			for i := range result {
				if result[i].ID == linkedID {
					result[i].Backlinks = append(result[i].Backlinks, idea.ID)
					break
				}
			}
		}
	}

	return result
}

func (p *IdeasParser) generateIdeaID(ideas []domain.Idea) string {
	maxID := 0
	for _, idea := range ideas {
		if strings.HasPrefix(idea.ID, "idea_") {
			var id int
			fmt.Sscanf(idea.ID, "idea_%d", &id)
			if id > maxID {
				maxID = id
			}
		}
	}
	return fmt.Sprintf("idea_%d", maxID+1)
}
