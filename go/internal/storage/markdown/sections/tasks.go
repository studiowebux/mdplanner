package sections

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/studiowebux/mdplanner/internal/domain"
)

// TaskParser handles parsing and serializing tasks from markdown
type TaskParser struct {
	configParser *ConfigParser
	taskPattern  *regexp.Regexp
}

// NewTaskParser creates a new task parser
func NewTaskParser() *TaskParser {
	// Pattern: - [x] (task-id) Task title {config}
	// Groups: 1=indent, 2=checkbox (space or x), 3=id (optional), 4=title, 5=config (optional)
	pattern := regexp.MustCompile(`^(\s*)- \[([ x])\] (?:\(([^)]+)\))?\s*(.+?)(?:\s*\{([^}]+)\})?$`)

	return &TaskParser{
		configParser: NewConfigParser(),
		taskPattern:  pattern,
	}
}

// Parse extracts tasks from board section lines
// Returns tasks grouped by section and the next line index
func (p *TaskParser) Parse(lines []string) (map[string][]domain.Task, []string) {
	tasksBySection := make(map[string][]domain.Task)
	var sectionOrder []string
	currentSection := ""

	i := 0
	for i < len(lines) {
		line := lines[i]
		trimmed := strings.TrimSpace(line)

		// Skip empty lines
		if trimmed == "" {
			i++
			continue
		}

		// Section header (## Section Name)
		if strings.HasPrefix(trimmed, "## ") {
			currentSection = strings.TrimPrefix(trimmed, "## ")
			if _, exists := tasksBySection[currentSection]; !exists {
				sectionOrder = append(sectionOrder, currentSection)
				tasksBySection[currentSection] = []domain.Task{}
			}
			i++
			continue
		}

		// Skip the "# Board" header
		if trimmed == "# Board" {
			i++
			continue
		}

		// Task line
		if p.taskPattern.MatchString(line) {
			task, nextIdx := p.parseTask(lines, i, currentSection, 0)
			if task != nil {
				tasksBySection[currentSection] = append(tasksBySection[currentSection], *task)
			}
			i = nextIdx
			continue
		}

		i++
	}

	return tasksBySection, sectionOrder
}

// parseTask parses a single task and its children recursively
func (p *TaskParser) parseTask(lines []string, startIdx int, section string, parentIndent int) (*domain.Task, int) {
	if startIdx >= len(lines) {
		return nil, startIdx
	}

	line := lines[startIdx]
	match := p.taskPattern.FindStringSubmatch(line)
	if match == nil {
		return nil, startIdx + 1
	}

	indent := len(match[1])

	// If this task has less or equal indent than parent, it's not a child
	if parentIndent > 0 && indent <= parentIndent {
		return nil, startIdx
	}

	task := &domain.Task{
		ID:        match[3],
		Title:     strings.TrimSpace(match[4]),
		Completed: match[2] == "x",
		Section:   section,
		Config:    p.parseTaskConfig(match[5]),
	}

	// Generate ID if missing
	if task.ID == "" {
		task.ID = fmt.Sprintf("task_%d", startIdx)
	}

	i := startIdx + 1

	// Parse description and children
	for i < len(lines) {
		nextLine := lines[i]
		nextTrimmed := strings.TrimSpace(nextLine)

		// Empty line - continue
		if nextTrimmed == "" {
			i++
			continue
		}

		// New section - stop
		if strings.HasPrefix(nextTrimmed, "## ") {
			break
		}

		nextIndent := countIndent(nextLine)

		// Same or less indent - not our content
		if nextIndent <= indent {
			break
		}

		// Check if it's a child task
		if p.taskPattern.MatchString(nextLine) {
			child, nextIdx := p.parseTask(lines, i, section, indent)
			if child != nil {
				child.ParentID = task.ID
				task.Children = append(task.Children, *child)
			}
			i = nextIdx
			continue
		}

		// Description line
		task.Description = append(task.Description, nextTrimmed)
		i++
	}

	return task, i
}

// parseTaskConfig parses task config string into TaskConfig
func (p *TaskParser) parseTaskConfig(configStr string) domain.TaskConfig {
	config := domain.TaskConfig{}
	if configStr == "" {
		return config
	}

	parsed := p.configParser.ParseConfigString(configStr)

	if v, ok := parsed["tag"]; ok {
		config.Tag = p.configParser.ParseArray(v)
	}
	if v, ok := parsed["due_date"]; ok {
		config.DueDate = v
	}
	if v, ok := parsed["assignee"]; ok {
		config.Assignee = v
	}
	if v, ok := parsed["priority"]; ok {
		config.Priority = p.configParser.ParseInt(v, 0)
	}
	if v, ok := parsed["effort"]; ok {
		config.Effort = p.configParser.ParseInt(v, 0)
	}
	if v, ok := parsed["blocked_by"]; ok {
		config.BlockedBy = p.configParser.ParseArray(v)
	}
	if v, ok := parsed["milestone"]; ok {
		config.Milestone = v
	}
	if v, ok := parsed["planned_start"]; ok {
		config.PlannedStart = v
	}
	if v, ok := parsed["planned_end"]; ok {
		config.PlannedEnd = v
	}

	return config
}

// Serialize converts tasks to markdown format
func (p *TaskParser) Serialize(tasksBySection map[string][]domain.Task, sectionOrder []string) string {
	var sb strings.Builder

	sb.WriteString("<!-- Board -->\n")
	sb.WriteString("# Board\n\n")

	for _, section := range sectionOrder {
		tasks := tasksBySection[section]
		sb.WriteString("## " + section + "\n\n")
		for _, task := range tasks {
			p.serializeTask(&sb, task, 0)
		}
		sb.WriteString("\n")
	}

	return sb.String()
}

// serializeTask writes a single task and its children
func (p *TaskParser) serializeTask(sb *strings.Builder, task domain.Task, indent int) {
	indentStr := strings.Repeat("  ", indent)
	checkbox := " "
	if task.Completed {
		checkbox = "x"
	}

	// Build task line
	sb.WriteString(indentStr)
	sb.WriteString("- [")
	sb.WriteString(checkbox)
	sb.WriteString("] ")

	if task.ID != "" {
		sb.WriteString("(")
		sb.WriteString(task.ID)
		sb.WriteString(") ")
	}

	sb.WriteString(task.Title)

	// Serialize config
	configStr := p.serializeTaskConfig(task.Config)
	if configStr != "" {
		sb.WriteString(" ")
		sb.WriteString(configStr)
	}

	sb.WriteString("\n")

	// Description lines
	for _, desc := range task.Description {
		sb.WriteString(indentStr)
		sb.WriteString("  ")
		sb.WriteString(desc)
		sb.WriteString("\n")
	}

	// Children
	for _, child := range task.Children {
		p.serializeTask(sb, child, indent+1)
	}
}

// serializeTaskConfig converts TaskConfig to string
func (p *TaskParser) serializeTaskConfig(config domain.TaskConfig) string {
	parts := []string{}

	if len(config.Tag) > 0 {
		parts = append(parts, "tag: "+p.configParser.SerializeArray(config.Tag))
	}
	if config.DueDate != "" {
		parts = append(parts, "due_date: "+config.DueDate)
	}
	if config.Assignee != "" {
		parts = append(parts, "assignee: "+config.Assignee)
	}
	if config.Priority > 0 {
		parts = append(parts, fmt.Sprintf("priority: %d", config.Priority))
	}
	if config.Effort > 0 {
		parts = append(parts, fmt.Sprintf("effort: %d", config.Effort))
	}
	if len(config.BlockedBy) > 0 {
		parts = append(parts, "blocked_by: "+p.configParser.SerializeArray(config.BlockedBy))
	}
	if config.Milestone != "" {
		parts = append(parts, "milestone: "+config.Milestone)
	}
	if config.PlannedStart != "" {
		parts = append(parts, "planned_start: "+config.PlannedStart)
	}
	if config.PlannedEnd != "" {
		parts = append(parts, "planned_end: "+config.PlannedEnd)
	}

	if len(parts) == 0 {
		return ""
	}

	return "{" + strings.Join(parts, "; ") + "}"
}

// countIndent counts leading spaces
func countIndent(line string) int {
	count := 0
	for _, ch := range line {
		if ch == ' ' {
			count++
		} else if ch == '\t' {
			count += 2
		} else {
			break
		}
	}
	return count
}

// FlattenTasks converts hierarchical tasks to flat list
func FlattenTasks(tasksBySection map[string][]domain.Task) []domain.Task {
	var result []domain.Task
	for _, tasks := range tasksBySection {
		for _, task := range tasks {
			flattenTask(&result, task)
		}
	}
	return result
}

func flattenTask(result *[]domain.Task, task domain.Task) {
	flat := task
	flat.Children = nil
	*result = append(*result, flat)
	for _, child := range task.Children {
		flattenTask(result, child)
	}
}

// FindTaskByID finds a task by ID in hierarchical structure
func FindTaskByID(tasksBySection map[string][]domain.Task, id string) *domain.Task {
	for _, tasks := range tasksBySection {
		if task := findInTasks(tasks, id); task != nil {
			return task
		}
	}
	return nil
}

func findInTasks(tasks []domain.Task, id string) *domain.Task {
	for i := range tasks {
		if tasks[i].ID == id {
			return &tasks[i]
		}
		if found := findInTasks(tasks[i].Children, id); found != nil {
			return found
		}
	}
	return nil
}

// GenerateTaskID generates a unique task ID
func GenerateTaskID(tasksBySection map[string][]domain.Task) string {
	maxID := 0
	for _, tasks := range tasksBySection {
		findMaxID(tasks, &maxID)
	}
	return fmt.Sprintf("%d", maxID+1)
}

func findMaxID(tasks []domain.Task, maxID *int) {
	for _, task := range tasks {
		// Try to parse as number
		var id int
		if _, err := fmt.Sscanf(task.ID, "%d", &id); err == nil {
			if id > *maxID {
				*maxID = id
			}
		}
		findMaxID(task.Children, maxID)
	}
}
