package sections

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// TimeTrackingParser handles parsing and serializing Time Entries from markdown
type TimeTrackingParser struct {
	idPattern    *regexp.Regexp
	configParser *ConfigParser
}

// NewTimeTrackingParser creates a new Time Tracking parser
func NewTimeTrackingParser() *TimeTrackingParser {
	return &TimeTrackingParser{
		idPattern:    regexp.MustCompile(`<!-- id: ([^ ]+) -->`),
		configParser: NewConfigParser(),
	}
}

// TimeTrackingData holds time entries organized by task ID
type TimeTrackingData map[string][]domain.TimeEntry

// Parse extracts Time Entries from lines
// Assumes lines are already extracted for this section
func (p *TimeTrackingParser) Parse(lines []string) TimeTrackingData {
	data := make(TimeTrackingData)

	var currentTaskID string

	for i := 0; i < len(lines); i++ {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip section headers if present
		if strings.HasPrefix(trimmed, "# Time Tracking") || trimmed == "<!-- Time Tracking -->" {
			continue
		}

		// Check for section boundary
		if strings.HasPrefix(trimmed, "# ") && !strings.HasPrefix(trimmed, "# Time Tracking") {
			break
		}

		// Task header: ## Task: task_id
		if strings.HasPrefix(trimmed, "## Task: ") {
			currentTaskID = strings.TrimPrefix(trimmed, "## Task: ")
			if _, exists := data[currentTaskID]; !exists {
				data[currentTaskID] = []domain.TimeEntry{}
			}
			continue
		}

		// Time entry: - {id: xxx; date: 2024-01-01; hours: 2.5; person: John; description: Working on feature}
		if currentTaskID != "" && strings.HasPrefix(trimmed, "- {") && strings.HasSuffix(trimmed, "}") {
			configStr := trimmed[3 : len(trimmed)-1]
			config := p.configParser.ParseConfigString(configStr)

			entry := domain.TimeEntry{
				ID:          config["id"],
				Date:        config["date"],
				Hours:       p.configParser.ParseFloat(config["hours"], 0),
				Person:      config["person"],
				Description: config["description"],
			}
			if entry.ID == "" {
				entry.ID = generateID()
			}
			if entry.Date == "" {
				entry.Date = time.Now().Format("2006-01-02")
			}

			data[currentTaskID] = append(data[currentTaskID], entry)
		}
	}

	return data
}

// Serialize converts TimeTrackingData to markdown
func (p *TimeTrackingParser) Serialize(data TimeTrackingData) string {
	var sb strings.Builder

	sb.WriteString("<!-- Time Tracking -->\n")
	sb.WriteString("# Time Tracking\n\n")

	for taskID, entries := range data {
		if len(entries) == 0 {
			continue
		}

		sb.WriteString(fmt.Sprintf("## Task: %s\n", taskID))

		for _, entry := range entries {
			sb.WriteString(fmt.Sprintf("- {id: %s; date: %s; hours: %.2f",
				entry.ID, entry.Date, entry.Hours))
			if entry.Person != "" {
				sb.WriteString(fmt.Sprintf("; person: %s", entry.Person))
			}
			if entry.Description != "" {
				sb.WriteString(fmt.Sprintf("; description: %s", entry.Description))
			}
			sb.WriteString("}\n")
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

// GetEntriesForTask gets time entries for a specific task
func (p *TimeTrackingParser) GetEntriesForTask(data TimeTrackingData, taskID string) []domain.TimeEntry {
	if entries, exists := data[taskID]; exists {
		return entries
	}
	return []domain.TimeEntry{}
}

// AddEntry adds a time entry for a task
func (p *TimeTrackingParser) AddEntry(data TimeTrackingData, taskID string, entry domain.TimeEntry) TimeTrackingData {
	if entry.ID == "" {
		entry.ID = generateID()
	}
	if entry.Date == "" {
		entry.Date = time.Now().Format("2006-01-02")
	}

	if _, exists := data[taskID]; !exists {
		data[taskID] = []domain.TimeEntry{}
	}
	data[taskID] = append(data[taskID], entry)
	return data
}

// UpdateEntry updates a time entry
func (p *TimeTrackingParser) UpdateEntry(data TimeTrackingData, taskID, entryID string, updates domain.TimeEntry) TimeTrackingData {
	if entries, exists := data[taskID]; exists {
		for i := range entries {
			if entries[i].ID == entryID {
				if updates.Date != "" {
					entries[i].Date = updates.Date
				}
				if updates.Hours > 0 {
					entries[i].Hours = updates.Hours
				}
				if updates.Person != "" {
					entries[i].Person = updates.Person
				}
				if updates.Description != "" {
					entries[i].Description = updates.Description
				}
				break
			}
		}
	}
	return data
}

// DeleteEntry deletes a time entry
func (p *TimeTrackingParser) DeleteEntry(data TimeTrackingData, taskID, entryID string) TimeTrackingData {
	if entries, exists := data[taskID]; exists {
		newEntries := make([]domain.TimeEntry, 0, len(entries))
		for _, entry := range entries {
			if entry.ID != entryID {
				newEntries = append(newEntries, entry)
			}
		}
		data[taskID] = newEntries
	}
	return data
}

// GetTotalHoursForTask calculates total hours for a task
func (p *TimeTrackingParser) GetTotalHoursForTask(data TimeTrackingData, taskID string) float64 {
	total := 0.0
	if entries, exists := data[taskID]; exists {
		for _, entry := range entries {
			total += entry.Hours
		}
	}
	return total
}

// GenerateID creates a unique Time Entry ID
func (p *TimeTrackingParser) GenerateID() string {
	return generateID()
}
