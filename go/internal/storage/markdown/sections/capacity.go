package sections

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// CapacityParser handles parsing and serializing Capacity Plans from markdown
type CapacityParser struct {
	idPattern     *regexp.Regexp
	headerPattern *regexp.Regexp
	configParser  *ConfigParser
}

// NewCapacityParser creates a new Capacity parser
func NewCapacityParser() *CapacityParser {
	return &CapacityParser{
		idPattern:     regexp.MustCompile(`<!-- id: ([^ ]+) -->`),
		headerPattern: regexp.MustCompile(`^## (.+?)\s*\{(.+)\}$`),
		configParser:  NewConfigParser(),
	}
}

// Parse extracts Capacity Plans from lines
// Assumes lines are already extracted for this section
func (p *CapacityParser) Parse(lines []string) []domain.CapacityPlan {
	var plans []domain.CapacityPlan
	var current *domain.CapacityPlan
	var currentSubsection string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# Capacity Planning") || trimmed == "<!-- Capacity Planning -->" {
			continue
		}

		// Check for section boundary
		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Capacity Planning") {
			if current != nil && current.Title != "" {
				plans = append(plans, *current)
			}
			break
		}

		// Plan header with config
		if match := p.headerPattern.FindStringSubmatch(trimmed); len(match) > 0 {
			if current != nil && current.Title != "" {
				plans = append(plans, *current)
			}

			config := p.configParser.ParseConfigString(match[2])
			current = &domain.CapacityPlan{
				ID:          generateID(),
				Title:       match[1],
				Date:        config["date"],
				BudgetHours: p.configParser.ParseFloat(config["budget"], 0),
				TeamMembers: []domain.TeamMember{},
				Allocations: []domain.WeeklyAllocation{},
			}
			if current.Date == "" {
				current.Date = time.Now().Format("2006-01-02")
			}
			currentSubsection = ""
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

		// Subsection headers
		switch trimmed {
		case "### Team Members":
			currentSubsection = "members"
			continue
		case "### Allocations":
			currentSubsection = "allocations"
			continue
		}

		// Parse team member
		if currentSubsection == "members" && strings.HasPrefix(trimmed, "- ") {
			memberLine := strings.TrimPrefix(trimmed, "- ")
			// Format: Name {role: Developer; hoursPerDay: 8; workingDays: [Mon, Tue, Wed, Thu, Fri]}
			memberMatch := regexp.MustCompile(`^(.+?)\s*\{(.+)\}$`).FindStringSubmatch(memberLine)
			if len(memberMatch) > 0 {
				config := p.configParser.ParseConfigString(memberMatch[2])
				member := domain.TeamMember{
					ID:          generateID(),
					Name:        memberMatch[1],
					Role:        config["role"],
					HoursPerDay: p.configParser.ParseFloat(config["hoursPerDay"], 8),
					WorkingDays: p.configParser.ParseArray(config["workingDays"]),
				}
				if len(member.WorkingDays) == 0 {
					member.WorkingDays = []string{"Mon", "Tue", "Wed", "Thu", "Fri"}
				}
				current.TeamMembers = append(current.TeamMembers, member)
			}
			continue
		}

		// Parse allocation
		if currentSubsection == "allocations" && strings.HasPrefix(trimmed, "- ") {
			allocLine := strings.TrimPrefix(trimmed, "- ")
			// Format: {memberId: xxx; weekStart: 2024-01-01; allocatedHours: 40; targetType: task; targetId: 123; notes: Working on feature}
			allocMatch := regexp.MustCompile(`^\{(.+)\}$`).FindStringSubmatch(allocLine)
			if len(allocMatch) > 0 {
				config := p.configParser.ParseConfigString(allocMatch[1])
				alloc := domain.WeeklyAllocation{
					ID:             generateID(),
					MemberID:       config["memberId"],
					WeekStart:      config["weekStart"],
					AllocatedHours: p.configParser.ParseFloat(config["allocatedHours"], 0),
					TargetType:     config["targetType"],
					TargetID:       config["targetId"],
					Notes:          config["notes"],
				}
				current.Allocations = append(current.Allocations, alloc)
			}
			continue
		}
	}

	// Don't forget last plan
	if current != nil && current.Title != "" {
		plans = append(plans, *current)
	}

	return plans
}

// Serialize converts Capacity Plans to markdown
func (p *CapacityParser) Serialize(plans []domain.CapacityPlan) string {
	var sb strings.Builder

	sb.WriteString("<!-- Capacity Planning -->\n")
	sb.WriteString("# Capacity Planning\n\n")

	for _, plan := range plans {
		sb.WriteString(fmt.Sprintf("## %s {date: %s; budget: %.0f}\n\n",
			plan.Title, plan.Date, plan.BudgetHours))
		sb.WriteString(fmt.Sprintf("<!-- id: %s -->\n\n", plan.ID))

		// Team Members
		sb.WriteString("### Team Members\n")
		for _, member := range plan.TeamMembers {
			sb.WriteString(fmt.Sprintf("- %s {role: %s; hoursPerDay: %.0f; workingDays: [%s]}\n",
				member.Name, member.Role, member.HoursPerDay, strings.Join(member.WorkingDays, ", ")))
		}
		sb.WriteString("\n")

		// Allocations
		sb.WriteString("### Allocations\n")
		for _, alloc := range plan.Allocations {
			sb.WriteString(fmt.Sprintf("- {memberId: %s; weekStart: %s; allocatedHours: %.0f; targetType: %s",
				alloc.MemberID, alloc.WeekStart, alloc.AllocatedHours, alloc.TargetType))
			if alloc.TargetID != "" {
				sb.WriteString(fmt.Sprintf("; targetId: %s", alloc.TargetID))
			}
			if alloc.Notes != "" {
				sb.WriteString(fmt.Sprintf("; notes: %s", alloc.Notes))
			}
			sb.WriteString("}\n")
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

// FindByID finds a Capacity Plan by ID
func (p *CapacityParser) FindByID(plans []domain.CapacityPlan, id string) *domain.CapacityPlan {
	for i := range plans {
		if plans[i].ID == id {
			return &plans[i]
		}
	}
	return nil
}

// GenerateID creates a unique Capacity Plan ID
func (p *CapacityParser) GenerateID() string {
	return generateID()
}
