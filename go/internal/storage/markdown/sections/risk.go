package sections

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// RiskParser handles parsing and serializing Risk analyses from markdown
type RiskParser struct {
	idPattern *regexp.Regexp
}

// NewRiskParser creates a new Risk parser
func NewRiskParser() *RiskParser {
	return &RiskParser{
		idPattern: regexp.MustCompile(`<!-- id: ([^ ]+)`),
	}
}

// Parse extracts Risk analyses from lines
// Assumes lines are already extracted for this section
func (p *RiskParser) Parse(lines []string) []domain.RiskAnalysis {
	var analyses []domain.RiskAnalysis
	var current *domain.RiskAnalysis
	var currentSubsection string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# Risk Analysis") || trimmed == "<!-- Risk Analysis -->" {
			continue
		}

		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Risk Analysis") {
			if current != nil && current.Title != "" {
				analyses = append(analyses, *current)
			}
			break
		}

		if strings.HasPrefix(trimmed, "## ") {
			if current != nil && current.Title != "" {
				analyses = append(analyses, *current)
			}
			current = &domain.RiskAnalysis{
				ID:                 generateID(),
				Title:              strings.TrimPrefix(trimmed, "## "),
				Date:               time.Now().Format("2006-01-02"),
				HighImpactHighProb: []string{},
				HighImpactLowProb:  []string{},
				LowImpactHighProb:  []string{},
				LowImpactLowProb:   []string{},
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

		switch trimmed {
		case "### High Impact / High Probability":
			currentSubsection = "highImpactHighProb"
			continue
		case "### High Impact / Low Probability":
			currentSubsection = "highImpactLowProb"
			continue
		case "### Low Impact / High Probability":
			currentSubsection = "lowImpactHighProb"
			continue
		case "### Low Impact / Low Probability":
			currentSubsection = "lowImpactLowProb"
			continue
		}

		if strings.HasPrefix(trimmed, "- ") && currentSubsection != "" {
			item := strings.TrimPrefix(trimmed, "- ")
			if item != "" {
				switch currentSubsection {
				case "highImpactHighProb":
					current.HighImpactHighProb = append(current.HighImpactHighProb, item)
				case "highImpactLowProb":
					current.HighImpactLowProb = append(current.HighImpactLowProb, item)
				case "lowImpactHighProb":
					current.LowImpactHighProb = append(current.LowImpactHighProb, item)
				case "lowImpactLowProb":
					current.LowImpactLowProb = append(current.LowImpactLowProb, item)
				}
			}
		}
	}

	if current != nil && current.Title != "" {
		analyses = append(analyses, *current)
	}

	return analyses
}

// Serialize converts Risk analyses to markdown
func (p *RiskParser) Serialize(analyses []domain.RiskAnalysis) string {
	var sb strings.Builder

	sb.WriteString("<!-- Risk Analysis -->\n")
	sb.WriteString("# Risk Analysis\n\n")

	for _, risk := range analyses {
		sb.WriteString(fmt.Sprintf("## %s\n", risk.Title))
		sb.WriteString(fmt.Sprintf("<!-- id: %s -->\n", risk.ID))
		sb.WriteString(fmt.Sprintf("Date: %s\n\n", risk.Date))

		sb.WriteString("### High Impact / High Probability\n")
		for _, item := range risk.HighImpactHighProb {
			sb.WriteString(fmt.Sprintf("- %s\n", item))
		}
		sb.WriteString("\n")

		sb.WriteString("### High Impact / Low Probability\n")
		for _, item := range risk.HighImpactLowProb {
			sb.WriteString(fmt.Sprintf("- %s\n", item))
		}
		sb.WriteString("\n")

		sb.WriteString("### Low Impact / High Probability\n")
		for _, item := range risk.LowImpactHighProb {
			sb.WriteString(fmt.Sprintf("- %s\n", item))
		}
		sb.WriteString("\n")

		sb.WriteString("### Low Impact / Low Probability\n")
		for _, item := range risk.LowImpactLowProb {
			sb.WriteString(fmt.Sprintf("- %s\n", item))
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

// FindByID finds a Risk analysis by ID
func (p *RiskParser) FindByID(analyses []domain.RiskAnalysis, id string) *domain.RiskAnalysis {
	for i := range analyses {
		if analyses[i].ID == id {
			return &analyses[i]
		}
	}
	return nil
}

// GenerateID creates a unique Risk analysis ID
func (p *RiskParser) GenerateID() string {
	return generateID()
}
