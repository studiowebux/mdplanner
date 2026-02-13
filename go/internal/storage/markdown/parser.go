package markdown

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/studiowebux/mdplanner/internal/domain"
	"github.com/studiowebux/mdplanner/internal/storage/markdown/sections"
)

// Parser is the main markdown storage implementation
type Parser struct {
	dataDir       string
	activeFile    string
	reader        *Reader
	writer        *Writer
	configParser  *sections.ConfigParser
	taskParser    *sections.TaskParser
	fileLock      *FileLock
	backupManager *BackupManager

	// Section parsers
	notesParser         *sections.NotesParser
	goalsParser         *sections.GoalsParser
	milestonesParser    *sections.MilestonesParser
	ideasParser         *sections.IdeasParser
	retroParser         *sections.RetrospectiveParser
	canvasParser        *sections.CanvasParser
	mindmapParser       *sections.MindmapParser
	c4Parser            *sections.C4Parser
	swotParser          *sections.SwotParser
	riskParser          *sections.RiskParser
	leanParser          *sections.LeanParser
	bmcParser           *sections.BusinessModelParser
	pvbParser           *sections.ProjectValueParser
	briefParser         *sections.BriefParser
	capacityParser      *sections.CapacityParser
	strategyParser      *sections.StrategyParser
	customersParser     *sections.CustomersParser
	billingParser       *sections.BillingParser
	timeTrackingParser  *sections.TimeTrackingParser
}

// NewParser creates a new markdown parser
func NewParser(dataDir string, backupDir string, maxBackups int) *Parser {
	fileLock := NewFileLock()
	backupManager := NewBackupManager(backupDir, maxBackups)

	return &Parser{
		dataDir:       dataDir,
		reader:        NewReader(),
		writer:        NewWriter(fileLock, backupManager),
		configParser:  sections.NewConfigParser(),
		taskParser:    sections.NewTaskParser(),
		fileLock:      fileLock,
		backupManager: backupManager,

		// Initialize section parsers
		notesParser:         sections.NewNotesParser(),
		goalsParser:         sections.NewGoalsParser(),
		milestonesParser:    sections.NewMilestonesParser(),
		ideasParser:         sections.NewIdeasParser(),
		retroParser:         sections.NewRetrospectiveParser(),
		canvasParser:        sections.NewCanvasParser(),
		mindmapParser:       sections.NewMindmapParser(),
		c4Parser:            sections.NewC4Parser(),
		swotParser:          sections.NewSwotParser(),
		riskParser:          sections.NewRiskParser(),
		leanParser:          sections.NewLeanParser(),
		bmcParser:           sections.NewBusinessModelParser(),
		pvbParser:           sections.NewProjectValueParser(),
		briefParser:         sections.NewBriefParser(),
		capacityParser:      sections.NewCapacityParser(),
		strategyParser:      sections.NewStrategyParser(),
		customersParser:     sections.NewCustomersParser(),
		billingParser:       sections.NewBillingParser(),
		timeTrackingParser:  sections.NewTimeTrackingParser(),
	}
}

// filePath returns the full path to the active markdown file
func (p *Parser) filePath() string {
	return filepath.Join(p.dataDir, p.activeFile)
}

// ScanProjects finds all markdown files in the data directory
func (p *Parser) ScanProjects(ctx context.Context) ([]domain.ProjectMeta, error) {
	pattern := filepath.Join(p.dataDir, "*.md")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return nil, fmt.Errorf("glob markdown files: %w", err)
	}

	var projects []domain.ProjectMeta
	for _, match := range matches {
		filename := filepath.Base(match)

		// Skip backup files
		if strings.Contains(filename, "_backup_") {
			continue
		}

		// Read project name from file
		lines, err := p.reader.ReadFile(match)
		if err != nil {
			continue
		}

		name, _ := p.reader.GetProjectNameAndDescription(lines)
		if name == "" {
			name = strings.TrimSuffix(filename, ".md")
		}

		// Get modification time
		info, _ := os.Stat(match)
		var lastUpdated string
		if info != nil {
			lastUpdated = info.ModTime().Format(time.RFC3339)
		}

		projects = append(projects, domain.ProjectMeta{
			Filename:    filename,
			Name:        name,
			LastUpdated: lastUpdated,
		})
	}

	return projects, nil
}

// SwitchProject changes the active project
func (p *Parser) SwitchProject(ctx context.Context, filename string) error {
	// Verify file exists
	path := filepath.Join(p.dataDir, filename)
	if _, err := os.Stat(path); err != nil {
		return fmt.Errorf("project not found: %s", filename)
	}
	p.activeFile = filename
	return nil
}

// CreateProject creates a new project file
func (p *Parser) CreateProject(ctx context.Context, name string) (string, error) {
	// Generate filename from name
	filename := strings.ToLower(strings.ReplaceAll(name, " ", "-")) + ".md"
	path := filepath.Join(p.dataDir, filename)

	// Check if exists
	if _, err := os.Stat(path); err == nil {
		return "", fmt.Errorf("project already exists: %s", filename)
	}

	// Create initial content
	content := fmt.Sprintf(`# %s

Project description here.

<!-- Configurations -->
# Configurations

Start Date: %s
Working Days: 5

Assignees:

Tags:

<!-- Board -->
# Board

## Todo

## In Progress

## Done

`, name, time.Now().Format("2006-01-02"))

	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		return "", fmt.Errorf("create project file: %w", err)
	}

	p.activeFile = filename
	return filename, nil
}

// GetActiveProject returns the active project filename
func (p *Parser) GetActiveProject(ctx context.Context) (string, error) {
	return p.activeFile, nil
}

// ReadProjectInfo reads project metadata
func (p *Parser) ReadProjectInfo(ctx context.Context) (*domain.ProjectInfo, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}

	name, description := p.reader.GetProjectNameAndDescription(lines)

	info := &domain.ProjectInfo{
		Name:        name,
		Description: description,
	}

	// TODO: Parse status, links, etc. from config section

	return info, nil
}

// ReadProjectConfig reads project configuration
func (p *Parser) ReadProjectConfig(ctx context.Context) (*domain.ProjectConfig, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}

	sectionLines := p.reader.ExtractSection(lines, MarkerConfigurations)
	if sectionLines == nil {
		return &domain.ProjectConfig{}, nil
	}

	config := &domain.ProjectConfig{}

	var currentList *[]string
	for _, line := range sectionLines {
		trimmed := strings.TrimSpace(line)

		// Skip headers and empty lines
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}

		// Key-value pairs
		if strings.Contains(trimmed, ":") && !strings.HasPrefix(trimmed, "-") {
			parts := strings.SplitN(trimmed, ":", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				value := strings.TrimSpace(parts[1])

				switch key {
				case "Start Date":
					config.StartDate = value
				case "Working Days":
					config.WorkingDays = p.configParser.ParseInt(value, 5)
				case "Custom Schedule":
					config.CustomSchedule = p.configParser.ParseArray(value)
				case "Assignees":
					currentList = &config.Assignees
				case "Tags":
					currentList = &config.Tags
				}
			}
		}

		// List items
		if strings.HasPrefix(trimmed, "-") && currentList != nil {
			item := strings.TrimSpace(strings.TrimPrefix(trimmed, "-"))
			if item != "" {
				*currentList = append(*currentList, item)
			}
		}
	}

	return config, nil
}

// SaveProjectConfig saves project configuration
func (p *Parser) SaveProjectConfig(ctx context.Context, config domain.ProjectConfig) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}

	// Build new config section
	var sb strings.Builder
	sb.WriteString("<!-- Configurations -->\n")
	sb.WriteString("# Configurations\n\n")

	if config.StartDate != "" {
		sb.WriteString("Start Date: " + config.StartDate + "\n")
	}
	if config.WorkingDays > 0 {
		sb.WriteString(fmt.Sprintf("Working Days: %d\n", config.WorkingDays))
	}
	if len(config.CustomSchedule) > 0 {
		sb.WriteString("Custom Schedule: " + strings.Join(config.CustomSchedule, ", ") + "\n")
	}

	sb.WriteString("\nAssignees:\n")
	for _, a := range config.Assignees {
		sb.WriteString("- " + a + "\n")
	}

	sb.WriteString("\nTags:\n")
	for _, t := range config.Tags {
		sb.WriteString("- " + t + "\n")
	}

	// Replace section in file
	newContent := p.replaceSection(lines, MarkerConfigurations, sb.String())
	return p.writer.WriteFile(p.filePath(), newContent)
}

// GetSections returns available board sections
func (p *Parser) GetSections(ctx context.Context) ([]string, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}

	boardLines := p.reader.ExtractSection(lines, MarkerBoard)
	if boardLines == nil {
		return []string{"Todo", "In Progress", "Done"}, nil
	}

	var sections []string
	for _, line := range boardLines {
		if strings.HasPrefix(strings.TrimSpace(line), "## ") {
			section := strings.TrimPrefix(strings.TrimSpace(line), "## ")
			sections = append(sections, section)
		}
	}

	if len(sections) == 0 {
		return []string{"Todo", "In Progress", "Done"}, nil
	}

	return sections, nil
}

// ReadTasks reads all tasks from the board section
func (p *Parser) ReadTasks(ctx context.Context) ([]domain.Task, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}

	boardLines := p.reader.ExtractSection(lines, MarkerBoard)
	if boardLines == nil {
		return nil, nil
	}

	tasksBySection, _ := p.taskParser.Parse(boardLines)
	return sections.FlattenTasks(tasksBySection), nil
}

// WriteTasks writes all tasks to the board section
func (p *Parser) WriteTasks(ctx context.Context, tasks []domain.Task) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}

	// Group tasks by section
	tasksBySection := make(map[string][]domain.Task)
	var sectionOrder []string

	for _, task := range tasks {
		if _, exists := tasksBySection[task.Section]; !exists {
			sectionOrder = append(sectionOrder, task.Section)
		}
		// Only add root tasks (non-children)
		if task.ParentID == "" {
			tasksBySection[task.Section] = append(tasksBySection[task.Section], task)
		}
	}

	newContent := p.taskParser.Serialize(tasksBySection, sectionOrder)
	fullContent := p.replaceSection(lines, MarkerBoard, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

// GetTask returns a specific task by ID
func (p *Parser) GetTask(ctx context.Context, id string) (*domain.Task, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}

	boardLines := p.reader.ExtractSection(lines, MarkerBoard)
	if boardLines == nil {
		return nil, fmt.Errorf("task not found: %s", id)
	}

	tasksBySection, _ := p.taskParser.Parse(boardLines)
	task := sections.FindTaskByID(tasksBySection, id)
	if task == nil {
		return nil, fmt.Errorf("task not found: %s", id)
	}

	return task, nil
}

// CreateTask creates a new task
func (p *Parser) CreateTask(ctx context.Context, task domain.Task) (string, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return "", err
	}

	boardLines := p.reader.ExtractSection(lines, MarkerBoard)
	tasksBySection, sectionOrder := p.taskParser.Parse(boardLines)

	// Generate ID if not provided
	if task.ID == "" {
		task.ID = sections.GenerateTaskID(tasksBySection)
	}

	// Add to section
	if task.Section == "" {
		task.Section = "Todo"
	}
	if _, exists := tasksBySection[task.Section]; !exists {
		sectionOrder = append(sectionOrder, task.Section)
	}
	tasksBySection[task.Section] = append(tasksBySection[task.Section], task)

	newContent := p.taskParser.Serialize(tasksBySection, sectionOrder)
	fullContent := p.replaceSection(lines, MarkerBoard, newContent)
	if err := p.writer.WriteFile(p.filePath(), fullContent); err != nil {
		return "", err
	}

	return task.ID, nil
}

// UpdateTask updates an existing task
func (p *Parser) UpdateTask(ctx context.Context, id string, task domain.Task) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}

	boardLines := p.reader.ExtractSection(lines, MarkerBoard)
	tasksBySection, sectionOrder := p.taskParser.Parse(boardLines)

	// Find and update task
	found := false
	for section, tasks := range tasksBySection {
		for i, t := range tasks {
			if t.ID == id {
				task.ID = id // Preserve ID
				tasksBySection[section][i] = task
				found = true
				break
			}
			// Check children
			if updateInChildren(&tasksBySection[section][i].Children, id, task) {
				found = true
				break
			}
		}
		if found {
			break
		}
	}

	if !found {
		return fmt.Errorf("task not found: %s", id)
	}

	newContent := p.taskParser.Serialize(tasksBySection, sectionOrder)
	fullContent := p.replaceSection(lines, MarkerBoard, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func updateInChildren(children *[]domain.Task, id string, task domain.Task) bool {
	for i, child := range *children {
		if child.ID == id {
			task.ID = id
			(*children)[i] = task
			return true
		}
		if updateInChildren(&(*children)[i].Children, id, task) {
			return true
		}
	}
	return false
}

// DeleteTask removes a task
func (p *Parser) DeleteTask(ctx context.Context, id string) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}

	boardLines := p.reader.ExtractSection(lines, MarkerBoard)
	tasksBySection, sectionOrder := p.taskParser.Parse(boardLines)

	// Find and delete task
	found := false
	for section, tasks := range tasksBySection {
		for i, t := range tasks {
			if t.ID == id {
				tasksBySection[section] = append(tasks[:i], tasks[i+1:]...)
				found = true
				break
			}
			if deleteInChildren(&tasksBySection[section][i].Children, id) {
				found = true
				break
			}
		}
		if found {
			break
		}
	}

	if !found {
		return fmt.Errorf("task not found: %s", id)
	}

	newContent := p.taskParser.Serialize(tasksBySection, sectionOrder)
	fullContent := p.replaceSection(lines, MarkerBoard, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func deleteInChildren(children *[]domain.Task, id string) bool {
	for i, child := range *children {
		if child.ID == id {
			*children = append((*children)[:i], (*children)[i+1:]...)
			return true
		}
		if deleteInChildren(&(*children)[i].Children, id) {
			return true
		}
	}
	return false
}

// MoveTask moves a task to a different section
func (p *Parser) MoveTask(ctx context.Context, id string, section string) error {
	task, err := p.GetTask(ctx, id)
	if err != nil {
		return err
	}

	task.Section = section
	return p.UpdateTask(ctx, id, *task)
}

// replaceSection replaces a section in the markdown file
func (p *Parser) replaceSection(lines []string, marker string, newContent string) string {
	start, end, found := p.reader.FindSectionBounds(lines, marker)

	var result strings.Builder

	if !found {
		// Section doesn't exist, append at end
		result.WriteString(strings.Join(lines, "\n"))
		result.WriteString("\n\n")
		result.WriteString(newContent)
	} else {
		// Replace existing section
		for i := 0; i < start-1; i++ { // -1 to exclude the marker line
			result.WriteString(lines[i])
			result.WriteString("\n")
		}
		result.WriteString(newContent)
		if end < len(lines) {
			for i := end; i < len(lines); i++ {
				result.WriteString(lines[i])
				if i < len(lines)-1 {
					result.WriteString("\n")
				}
			}
		}
	}

	return result.String()
}

// Implement remaining storage interface methods as stubs
// These will be implemented in Phase 3

func (p *Parser) ReadNotes(ctx context.Context) ([]domain.Note, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerNotes)
	if sectionLines == nil {
		return []domain.Note{}, nil
	}
	return p.notesParser.Parse(sectionLines), nil
}

func (p *Parser) CreateNote(ctx context.Context, note domain.Note) (string, error) {
	notes, err := p.ReadNotes(ctx)
	if err != nil {
		return "", err
	}
	if note.ID == "" {
		note.ID = p.notesParser.GenerateID(notes)
	}
	now := time.Now().Format(time.RFC3339)
	if note.CreatedAt == "" {
		note.CreatedAt = now
	}
	note.UpdatedAt = now
	note.Revision = 1
	notes = append(notes, note)

	return note.ID, p.saveNotes(ctx, notes)
}

func (p *Parser) UpdateNote(ctx context.Context, id string, note domain.Note) error {
	notes, err := p.ReadNotes(ctx)
	if err != nil {
		return err
	}
	for i, n := range notes {
		if n.ID == id {
			note.ID = id
			note.CreatedAt = n.CreatedAt
			note.UpdatedAt = time.Now().Format(time.RFC3339)
			note.Revision = n.Revision + 1
			notes[i] = note
			return p.saveNotes(ctx, notes)
		}
	}
	return fmt.Errorf("note not found: %s", id)
}

func (p *Parser) DeleteNote(ctx context.Context, id string) error {
	notes, err := p.ReadNotes(ctx)
	if err != nil {
		return err
	}
	for i, n := range notes {
		if n.ID == id {
			notes = append(notes[:i], notes[i+1:]...)
			return p.saveNotes(ctx, notes)
		}
	}
	return fmt.Errorf("note not found: %s", id)
}

func (p *Parser) saveNotes(ctx context.Context, notes []domain.Note) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.notesParser.Serialize(notes)
	fullContent := p.replaceSection(lines, MarkerNotes, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadGoals(ctx context.Context) ([]domain.Goal, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerGoals)
	if sectionLines == nil {
		return []domain.Goal{}, nil
	}
	return p.goalsParser.Parse(sectionLines), nil
}

func (p *Parser) CreateGoal(ctx context.Context, goal domain.Goal) (string, error) {
	goals, err := p.ReadGoals(ctx)
	if err != nil {
		return "", err
	}
	if goal.ID == "" {
		goal.ID = p.goalsParser.GenerateID(goals)
	}
	goals = append(goals, goal)
	return goal.ID, p.saveGoals(ctx, goals)
}

func (p *Parser) UpdateGoal(ctx context.Context, id string, goal domain.Goal) error {
	goals, err := p.ReadGoals(ctx)
	if err != nil {
		return err
	}
	for i, g := range goals {
		if g.ID == id {
			goal.ID = id
			goals[i] = goal
			return p.saveGoals(ctx, goals)
		}
	}
	return fmt.Errorf("goal not found: %s", id)
}

func (p *Parser) DeleteGoal(ctx context.Context, id string) error {
	goals, err := p.ReadGoals(ctx)
	if err != nil {
		return err
	}
	for i, g := range goals {
		if g.ID == id {
			goals = append(goals[:i], goals[i+1:]...)
			return p.saveGoals(ctx, goals)
		}
	}
	return fmt.Errorf("goal not found: %s", id)
}

func (p *Parser) saveGoals(ctx context.Context, goals []domain.Goal) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.goalsParser.Serialize(goals)
	fullContent := p.replaceSection(lines, MarkerGoals, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadMilestones(ctx context.Context) ([]domain.Milestone, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerMilestones)
	if sectionLines == nil {
		return []domain.Milestone{}, nil
	}
	return p.milestonesParser.Parse(sectionLines), nil
}

func (p *Parser) CreateMilestone(ctx context.Context, milestone domain.Milestone) (string, error) {
	milestones, err := p.ReadMilestones(ctx)
	if err != nil {
		return "", err
	}
	if milestone.ID == "" {
		milestone.ID = p.milestonesParser.GenerateID(milestones)
	}
	milestones = append(milestones, milestone)
	return milestone.ID, p.saveMilestones(ctx, milestones)
}

func (p *Parser) UpdateMilestone(ctx context.Context, id string, milestone domain.Milestone) error {
	milestones, err := p.ReadMilestones(ctx)
	if err != nil {
		return err
	}
	for i, m := range milestones {
		if m.ID == id {
			milestone.ID = id
			milestones[i] = milestone
			return p.saveMilestones(ctx, milestones)
		}
	}
	return fmt.Errorf("milestone not found: %s", id)
}

func (p *Parser) DeleteMilestone(ctx context.Context, id string) error {
	milestones, err := p.ReadMilestones(ctx)
	if err != nil {
		return err
	}
	for i, m := range milestones {
		if m.ID == id {
			milestones = append(milestones[:i], milestones[i+1:]...)
			return p.saveMilestones(ctx, milestones)
		}
	}
	return fmt.Errorf("milestone not found: %s", id)
}

func (p *Parser) saveMilestones(ctx context.Context, milestones []domain.Milestone) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.milestonesParser.Serialize(milestones)
	fullContent := p.replaceSection(lines, MarkerMilestones, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadIdeas(ctx context.Context) ([]domain.Idea, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerIdeas)
	if sectionLines == nil {
		return []domain.Idea{}, nil
	}
	return p.ideasParser.Parse(sectionLines), nil
}

func (p *Parser) ReadIdeasWithBacklinks(ctx context.Context) ([]domain.IdeaWithBacklinks, error) {
	ideas, err := p.ReadIdeas(ctx)
	if err != nil {
		return nil, err
	}
	return p.ideasParser.ComputeBacklinks(ideas), nil
}

func (p *Parser) CreateIdea(ctx context.Context, idea domain.Idea) (string, error) {
	ideas, err := p.ReadIdeas(ctx)
	if err != nil {
		return "", err
	}
	if idea.ID == "" {
		idea.ID = p.ideasParser.GenerateID(ideas)
	}
	ideas = append(ideas, idea)
	return idea.ID, p.saveIdeas(ctx, ideas)
}

func (p *Parser) UpdateIdea(ctx context.Context, id string, idea domain.Idea) error {
	ideas, err := p.ReadIdeas(ctx)
	if err != nil {
		return err
	}
	for i, item := range ideas {
		if item.ID == id {
			idea.ID = id
			ideas[i] = idea
			return p.saveIdeas(ctx, ideas)
		}
	}
	return fmt.Errorf("idea not found: %s", id)
}

func (p *Parser) DeleteIdea(ctx context.Context, id string) error {
	ideas, err := p.ReadIdeas(ctx)
	if err != nil {
		return err
	}
	for i, item := range ideas {
		if item.ID == id {
			ideas = append(ideas[:i], ideas[i+1:]...)
			return p.saveIdeas(ctx, ideas)
		}
	}
	return fmt.Errorf("idea not found: %s", id)
}

func (p *Parser) saveIdeas(ctx context.Context, ideas []domain.Idea) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.ideasParser.Serialize(ideas)
	fullContent := p.replaceSection(lines, MarkerIdeas, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadRetrospectives(ctx context.Context) ([]domain.Retrospective, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerRetrospectives)
	if sectionLines == nil {
		return []domain.Retrospective{}, nil
	}
	return p.retroParser.Parse(sectionLines), nil
}

func (p *Parser) CreateRetrospective(ctx context.Context, retro domain.Retrospective) (string, error) {
	retros, err := p.ReadRetrospectives(ctx)
	if err != nil {
		return "", err
	}
	if retro.ID == "" {
		retro.ID = p.retroParser.GenerateID()
	}
	retros = append(retros, retro)
	return retro.ID, p.saveRetrospectives(ctx, retros)
}

func (p *Parser) UpdateRetrospective(ctx context.Context, id string, retro domain.Retrospective) error {
	retros, err := p.ReadRetrospectives(ctx)
	if err != nil {
		return err
	}
	for i, r := range retros {
		if r.ID == id {
			retro.ID = id
			retros[i] = retro
			return p.saveRetrospectives(ctx, retros)
		}
	}
	return fmt.Errorf("retrospective not found: %s", id)
}

func (p *Parser) DeleteRetrospective(ctx context.Context, id string) error {
	retros, err := p.ReadRetrospectives(ctx)
	if err != nil {
		return err
	}
	for i, r := range retros {
		if r.ID == id {
			retros = append(retros[:i], retros[i+1:]...)
			return p.saveRetrospectives(ctx, retros)
		}
	}
	return fmt.Errorf("retrospective not found: %s", id)
}

func (p *Parser) saveRetrospectives(ctx context.Context, retros []domain.Retrospective) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.retroParser.Serialize(retros)
	fullContent := p.replaceSection(lines, MarkerRetrospectives, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadStickyNotes(ctx context.Context) ([]domain.StickyNote, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerCanvas)
	if sectionLines == nil {
		return []domain.StickyNote{}, nil
	}
	return p.canvasParser.Parse(sectionLines), nil
}

func (p *Parser) CreateStickyNote(ctx context.Context, note domain.StickyNote) (string, error) {
	notes, err := p.ReadStickyNotes(ctx)
	if err != nil {
		return "", err
	}
	if note.ID == "" {
		note.ID = p.canvasParser.GenerateID(notes)
	}
	notes = append(notes, note)
	return note.ID, p.saveStickyNotes(ctx, notes)
}

func (p *Parser) UpdateStickyNote(ctx context.Context, id string, note domain.StickyNote) error {
	notes, err := p.ReadStickyNotes(ctx)
	if err != nil {
		return err
	}
	for i, n := range notes {
		if n.ID == id {
			note.ID = id
			notes[i] = note
			return p.saveStickyNotes(ctx, notes)
		}
	}
	return fmt.Errorf("sticky note not found: %s", id)
}

func (p *Parser) DeleteStickyNote(ctx context.Context, id string) error {
	notes, err := p.ReadStickyNotes(ctx)
	if err != nil {
		return err
	}
	for i, n := range notes {
		if n.ID == id {
			notes = append(notes[:i], notes[i+1:]...)
			return p.saveStickyNotes(ctx, notes)
		}
	}
	return fmt.Errorf("sticky note not found: %s", id)
}

func (p *Parser) saveStickyNotes(ctx context.Context, notes []domain.StickyNote) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.canvasParser.Serialize(notes)
	fullContent := p.replaceSection(lines, MarkerCanvas, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadMindmaps(ctx context.Context) ([]domain.Mindmap, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerMindmap)
	if sectionLines == nil {
		return []domain.Mindmap{}, nil
	}
	return p.mindmapParser.Parse(sectionLines), nil
}

func (p *Parser) CreateMindmap(ctx context.Context, mindmap domain.Mindmap) (string, error) {
	mindmaps, err := p.ReadMindmaps(ctx)
	if err != nil {
		return "", err
	}
	if mindmap.ID == "" {
		mindmap.ID = p.mindmapParser.GenerateID(mindmaps)
	}
	mindmaps = append(mindmaps, mindmap)
	return mindmap.ID, p.saveMindmaps(ctx, mindmaps)
}

func (p *Parser) UpdateMindmap(ctx context.Context, id string, mindmap domain.Mindmap) error {
	mindmaps, err := p.ReadMindmaps(ctx)
	if err != nil {
		return err
	}
	for i, m := range mindmaps {
		if m.ID == id {
			mindmap.ID = id
			mindmaps[i] = mindmap
			return p.saveMindmaps(ctx, mindmaps)
		}
	}
	return fmt.Errorf("mindmap not found: %s", id)
}

func (p *Parser) DeleteMindmap(ctx context.Context, id string) error {
	mindmaps, err := p.ReadMindmaps(ctx)
	if err != nil {
		return err
	}
	for i, m := range mindmaps {
		if m.ID == id {
			mindmaps = append(mindmaps[:i], mindmaps[i+1:]...)
			return p.saveMindmaps(ctx, mindmaps)
		}
	}
	return fmt.Errorf("mindmap not found: %s", id)
}

func (p *Parser) saveMindmaps(ctx context.Context, mindmaps []domain.Mindmap) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.mindmapParser.Serialize(mindmaps)
	fullContent := p.replaceSection(lines, MarkerMindmap, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadC4Components(ctx context.Context) ([]domain.C4Component, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerC4Architecture)
	if sectionLines == nil {
		return []domain.C4Component{}, nil
	}
	return p.c4Parser.Parse(sectionLines), nil
}

func (p *Parser) SaveC4Components(ctx context.Context, components []domain.C4Component) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.c4Parser.Serialize(components)
	fullContent := p.replaceSection(lines, MarkerC4Architecture, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadSwotAnalyses(ctx context.Context) ([]domain.SwotAnalysis, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerSwotAnalysis)
	if sectionLines == nil {
		return []domain.SwotAnalysis{}, nil
	}
	return p.swotParser.Parse(sectionLines), nil
}

func (p *Parser) CreateSwotAnalysis(ctx context.Context, swot domain.SwotAnalysis) (string, error) {
	items, err := p.ReadSwotAnalyses(ctx)
	if err != nil {
		return "", err
	}
	if swot.ID == "" {
		swot.ID = p.swotParser.GenerateID(items)
	}
	items = append(items, swot)
	return swot.ID, p.saveSwotAnalyses(ctx, items)
}

func (p *Parser) UpdateSwotAnalysis(ctx context.Context, id string, swot domain.SwotAnalysis) error {
	items, err := p.ReadSwotAnalyses(ctx)
	if err != nil {
		return err
	}
	for i, item := range items {
		if item.ID == id {
			swot.ID = id
			items[i] = swot
			return p.saveSwotAnalyses(ctx, items)
		}
	}
	return fmt.Errorf("swot analysis not found: %s", id)
}

func (p *Parser) DeleteSwotAnalysis(ctx context.Context, id string) error {
	items, err := p.ReadSwotAnalyses(ctx)
	if err != nil {
		return err
	}
	for i, item := range items {
		if item.ID == id {
			items = append(items[:i], items[i+1:]...)
			return p.saveSwotAnalyses(ctx, items)
		}
	}
	return fmt.Errorf("swot analysis not found: %s", id)
}

func (p *Parser) saveSwotAnalyses(ctx context.Context, items []domain.SwotAnalysis) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.swotParser.Serialize(items)
	fullContent := p.replaceSection(lines, MarkerSwotAnalysis, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadRiskAnalyses(ctx context.Context) ([]domain.RiskAnalysis, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerRiskAnalysis)
	if sectionLines == nil {
		return []domain.RiskAnalysis{}, nil
	}
	return p.riskParser.Parse(sectionLines), nil
}

func (p *Parser) CreateRiskAnalysis(ctx context.Context, risk domain.RiskAnalysis) (string, error) {
	items, err := p.ReadRiskAnalyses(ctx)
	if err != nil {
		return "", err
	}
	if risk.ID == "" {
		risk.ID = p.riskParser.GenerateID()
	}
	items = append(items, risk)
	return risk.ID, p.saveRiskAnalyses(ctx, items)
}

func (p *Parser) UpdateRiskAnalysis(ctx context.Context, id string, risk domain.RiskAnalysis) error {
	items, err := p.ReadRiskAnalyses(ctx)
	if err != nil {
		return err
	}
	for i, item := range items {
		if item.ID == id {
			risk.ID = id
			items[i] = risk
			return p.saveRiskAnalyses(ctx, items)
		}
	}
	return fmt.Errorf("risk analysis not found: %s", id)
}

func (p *Parser) DeleteRiskAnalysis(ctx context.Context, id string) error {
	items, err := p.ReadRiskAnalyses(ctx)
	if err != nil {
		return err
	}
	for i, item := range items {
		if item.ID == id {
			items = append(items[:i], items[i+1:]...)
			return p.saveRiskAnalyses(ctx, items)
		}
	}
	return fmt.Errorf("risk analysis not found: %s", id)
}

func (p *Parser) saveRiskAnalyses(ctx context.Context, items []domain.RiskAnalysis) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.riskParser.Serialize(items)
	fullContent := p.replaceSection(lines, MarkerRiskAnalysis, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadLeanCanvases(ctx context.Context) ([]domain.LeanCanvas, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerLeanCanvas)
	if sectionLines == nil {
		return []domain.LeanCanvas{}, nil
	}
	return p.leanParser.Parse(sectionLines), nil
}

func (p *Parser) CreateLeanCanvas(ctx context.Context, canvas domain.LeanCanvas) (string, error) {
	items, err := p.ReadLeanCanvases(ctx)
	if err != nil {
		return "", err
	}
	if canvas.ID == "" {
		canvas.ID = p.leanParser.GenerateID()
	}
	items = append(items, canvas)
	return canvas.ID, p.saveLeanCanvases(ctx, items)
}

func (p *Parser) UpdateLeanCanvas(ctx context.Context, id string, canvas domain.LeanCanvas) error {
	items, err := p.ReadLeanCanvases(ctx)
	if err != nil {
		return err
	}
	for i, item := range items {
		if item.ID == id {
			canvas.ID = id
			items[i] = canvas
			return p.saveLeanCanvases(ctx, items)
		}
	}
	return fmt.Errorf("lean canvas not found: %s", id)
}

func (p *Parser) DeleteLeanCanvas(ctx context.Context, id string) error {
	items, err := p.ReadLeanCanvases(ctx)
	if err != nil {
		return err
	}
	for i, item := range items {
		if item.ID == id {
			items = append(items[:i], items[i+1:]...)
			return p.saveLeanCanvases(ctx, items)
		}
	}
	return fmt.Errorf("lean canvas not found: %s", id)
}

func (p *Parser) saveLeanCanvases(ctx context.Context, items []domain.LeanCanvas) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.leanParser.Serialize(items)
	fullContent := p.replaceSection(lines, MarkerLeanCanvas, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadBusinessModelCanvases(ctx context.Context) ([]domain.BusinessModelCanvas, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerBusinessModelCanvas)
	if sectionLines == nil {
		return []domain.BusinessModelCanvas{}, nil
	}
	return p.bmcParser.Parse(sectionLines), nil
}

func (p *Parser) CreateBusinessModelCanvas(ctx context.Context, canvas domain.BusinessModelCanvas) (string, error) {
	items, err := p.ReadBusinessModelCanvases(ctx)
	if err != nil {
		return "", err
	}
	if canvas.ID == "" {
		canvas.ID = p.bmcParser.GenerateID()
	}
	items = append(items, canvas)
	return canvas.ID, p.saveBusinessModelCanvases(ctx, items)
}

func (p *Parser) UpdateBusinessModelCanvas(ctx context.Context, id string, canvas domain.BusinessModelCanvas) error {
	items, err := p.ReadBusinessModelCanvases(ctx)
	if err != nil {
		return err
	}
	for i, item := range items {
		if item.ID == id {
			canvas.ID = id
			items[i] = canvas
			return p.saveBusinessModelCanvases(ctx, items)
		}
	}
	return fmt.Errorf("business model canvas not found: %s", id)
}

func (p *Parser) DeleteBusinessModelCanvas(ctx context.Context, id string) error {
	items, err := p.ReadBusinessModelCanvases(ctx)
	if err != nil {
		return err
	}
	for i, item := range items {
		if item.ID == id {
			items = append(items[:i], items[i+1:]...)
			return p.saveBusinessModelCanvases(ctx, items)
		}
	}
	return fmt.Errorf("business model canvas not found: %s", id)
}

func (p *Parser) saveBusinessModelCanvases(ctx context.Context, items []domain.BusinessModelCanvas) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.bmcParser.Serialize(items)
	fullContent := p.replaceSection(lines, MarkerBusinessModelCanvas, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadProjectValueBoards(ctx context.Context) ([]domain.ProjectValueBoard, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerProjectValueBoard)
	if sectionLines == nil {
		return []domain.ProjectValueBoard{}, nil
	}
	return p.pvbParser.Parse(sectionLines), nil
}

func (p *Parser) CreateProjectValueBoard(ctx context.Context, board domain.ProjectValueBoard) (string, error) {
	items, err := p.ReadProjectValueBoards(ctx)
	if err != nil {
		return "", err
	}
	if board.ID == "" {
		board.ID = p.pvbParser.GenerateID()
	}
	items = append(items, board)
	return board.ID, p.saveProjectValueBoards(ctx, items)
}

func (p *Parser) UpdateProjectValueBoard(ctx context.Context, id string, board domain.ProjectValueBoard) error {
	items, err := p.ReadProjectValueBoards(ctx)
	if err != nil {
		return err
	}
	for i, item := range items {
		if item.ID == id {
			board.ID = id
			items[i] = board
			return p.saveProjectValueBoards(ctx, items)
		}
	}
	return fmt.Errorf("project value board not found: %s", id)
}

func (p *Parser) DeleteProjectValueBoard(ctx context.Context, id string) error {
	items, err := p.ReadProjectValueBoards(ctx)
	if err != nil {
		return err
	}
	for i, item := range items {
		if item.ID == id {
			items = append(items[:i], items[i+1:]...)
			return p.saveProjectValueBoards(ctx, items)
		}
	}
	return fmt.Errorf("project value board not found: %s", id)
}

func (p *Parser) saveProjectValueBoards(ctx context.Context, items []domain.ProjectValueBoard) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.pvbParser.Serialize(items)
	fullContent := p.replaceSection(lines, MarkerProjectValueBoard, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadBriefs(ctx context.Context) ([]domain.Brief, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerBrief)
	if sectionLines == nil {
		return []domain.Brief{}, nil
	}
	return p.briefParser.Parse(sectionLines), nil
}

func (p *Parser) CreateBrief(ctx context.Context, brief domain.Brief) (string, error) {
	items, err := p.ReadBriefs(ctx)
	if err != nil {
		return "", err
	}
	if brief.ID == "" {
		brief.ID = p.briefParser.GenerateID()
	}
	items = append(items, brief)
	return brief.ID, p.saveBriefs(ctx, items)
}

func (p *Parser) UpdateBrief(ctx context.Context, id string, brief domain.Brief) error {
	items, err := p.ReadBriefs(ctx)
	if err != nil {
		return err
	}
	for i, item := range items {
		if item.ID == id {
			brief.ID = id
			items[i] = brief
			return p.saveBriefs(ctx, items)
		}
	}
	return fmt.Errorf("brief not found: %s", id)
}

func (p *Parser) DeleteBrief(ctx context.Context, id string) error {
	items, err := p.ReadBriefs(ctx)
	if err != nil {
		return err
	}
	for i, item := range items {
		if item.ID == id {
			items = append(items[:i], items[i+1:]...)
			return p.saveBriefs(ctx, items)
		}
	}
	return fmt.Errorf("brief not found: %s", id)
}

func (p *Parser) saveBriefs(ctx context.Context, items []domain.Brief) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.briefParser.Serialize(items)
	fullContent := p.replaceSection(lines, MarkerBrief, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadCapacityPlans(ctx context.Context) ([]domain.CapacityPlan, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerCapacityPlanning)
	if sectionLines == nil {
		return []domain.CapacityPlan{}, nil
	}
	return p.capacityParser.Parse(sectionLines), nil
}

func (p *Parser) CreateCapacityPlan(ctx context.Context, plan domain.CapacityPlan) (string, error) {
	plans, err := p.ReadCapacityPlans(ctx)
	if err != nil {
		return "", err
	}
	if plan.ID == "" {
		plan.ID = p.capacityParser.GenerateID()
	}
	plans = append(plans, plan)
	return plan.ID, p.saveCapacityPlans(ctx, plans)
}

func (p *Parser) UpdateCapacityPlan(ctx context.Context, id string, plan domain.CapacityPlan) error {
	plans, err := p.ReadCapacityPlans(ctx)
	if err != nil {
		return err
	}
	for i, item := range plans {
		if item.ID == id {
			plan.ID = id
			plans[i] = plan
			return p.saveCapacityPlans(ctx, plans)
		}
	}
	return fmt.Errorf("capacity plan not found: %s", id)
}

func (p *Parser) DeleteCapacityPlan(ctx context.Context, id string) error {
	plans, err := p.ReadCapacityPlans(ctx)
	if err != nil {
		return err
	}
	for i, item := range plans {
		if item.ID == id {
			plans = append(plans[:i], plans[i+1:]...)
			return p.saveCapacityPlans(ctx, plans)
		}
	}
	return fmt.Errorf("capacity plan not found: %s", id)
}

func (p *Parser) AddTeamMember(ctx context.Context, planID string, member domain.TeamMember) (string, error) {
	plans, err := p.ReadCapacityPlans(ctx)
	if err != nil {
		return "", err
	}
	for i, plan := range plans {
		if plan.ID == planID {
			if member.ID == "" {
				member.ID = p.capacityParser.GenerateID()
			}
			plans[i].TeamMembers = append(plans[i].TeamMembers, member)
			return member.ID, p.saveCapacityPlans(ctx, plans)
		}
	}
	return "", fmt.Errorf("capacity plan not found: %s", planID)
}

func (p *Parser) UpdateTeamMember(ctx context.Context, planID, memberID string, member domain.TeamMember) error {
	plans, err := p.ReadCapacityPlans(ctx)
	if err != nil {
		return err
	}
	for i, plan := range plans {
		if plan.ID == planID {
			for j, m := range plan.TeamMembers {
				if m.ID == memberID {
					member.ID = memberID
					plans[i].TeamMembers[j] = member
					return p.saveCapacityPlans(ctx, plans)
				}
			}
			return fmt.Errorf("team member not found: %s", memberID)
		}
	}
	return fmt.Errorf("capacity plan not found: %s", planID)
}

func (p *Parser) DeleteTeamMember(ctx context.Context, planID, memberID string) error {
	plans, err := p.ReadCapacityPlans(ctx)
	if err != nil {
		return err
	}
	for i, plan := range plans {
		if plan.ID == planID {
			for j, m := range plan.TeamMembers {
				if m.ID == memberID {
					plans[i].TeamMembers = append(plan.TeamMembers[:j], plan.TeamMembers[j+1:]...)
					return p.saveCapacityPlans(ctx, plans)
				}
			}
			return fmt.Errorf("team member not found: %s", memberID)
		}
	}
	return fmt.Errorf("capacity plan not found: %s", planID)
}

func (p *Parser) AddAllocation(ctx context.Context, planID string, alloc domain.WeeklyAllocation) (string, error) {
	plans, err := p.ReadCapacityPlans(ctx)
	if err != nil {
		return "", err
	}
	for i, plan := range plans {
		if plan.ID == planID {
			if alloc.ID == "" {
				alloc.ID = p.capacityParser.GenerateID()
			}
			plans[i].Allocations = append(plans[i].Allocations, alloc)
			return alloc.ID, p.saveCapacityPlans(ctx, plans)
		}
	}
	return "", fmt.Errorf("capacity plan not found: %s", planID)
}

func (p *Parser) UpdateAllocation(ctx context.Context, planID, allocID string, alloc domain.WeeklyAllocation) error {
	plans, err := p.ReadCapacityPlans(ctx)
	if err != nil {
		return err
	}
	for i, plan := range plans {
		if plan.ID == planID {
			for j, a := range plan.Allocations {
				if a.ID == allocID {
					alloc.ID = allocID
					plans[i].Allocations[j] = alloc
					return p.saveCapacityPlans(ctx, plans)
				}
			}
			return fmt.Errorf("allocation not found: %s", allocID)
		}
	}
	return fmt.Errorf("capacity plan not found: %s", planID)
}

func (p *Parser) DeleteAllocation(ctx context.Context, planID, allocID string) error {
	plans, err := p.ReadCapacityPlans(ctx)
	if err != nil {
		return err
	}
	for i, plan := range plans {
		if plan.ID == planID {
			for j, a := range plan.Allocations {
				if a.ID == allocID {
					plans[i].Allocations = append(plan.Allocations[:j], plan.Allocations[j+1:]...)
					return p.saveCapacityPlans(ctx, plans)
				}
			}
			return fmt.Errorf("allocation not found: %s", allocID)
		}
	}
	return fmt.Errorf("capacity plan not found: %s", planID)
}

func (p *Parser) saveCapacityPlans(ctx context.Context, plans []domain.CapacityPlan) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.capacityParser.Serialize(plans)
	fullContent := p.replaceSection(lines, MarkerCapacityPlanning, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadStrategicBuilders(ctx context.Context) ([]domain.StrategicLevelsBuilder, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerStrategicLevels)
	if sectionLines == nil {
		return []domain.StrategicLevelsBuilder{}, nil
	}
	return p.strategyParser.Parse(sectionLines), nil
}

func (p *Parser) CreateStrategicBuilder(ctx context.Context, builder domain.StrategicLevelsBuilder) (string, error) {
	builders, err := p.ReadStrategicBuilders(ctx)
	if err != nil {
		return "", err
	}
	if builder.ID == "" {
		builder.ID = p.strategyParser.GenerateID()
	}
	builders = append(builders, builder)
	return builder.ID, p.saveStrategicBuilders(ctx, builders)
}

func (p *Parser) UpdateStrategicBuilder(ctx context.Context, id string, builder domain.StrategicLevelsBuilder) error {
	builders, err := p.ReadStrategicBuilders(ctx)
	if err != nil {
		return err
	}
	for i, item := range builders {
		if item.ID == id {
			builder.ID = id
			builders[i] = builder
			return p.saveStrategicBuilders(ctx, builders)
		}
	}
	return fmt.Errorf("strategic builder not found: %s", id)
}

func (p *Parser) DeleteStrategicBuilder(ctx context.Context, id string) error {
	builders, err := p.ReadStrategicBuilders(ctx)
	if err != nil {
		return err
	}
	for i, item := range builders {
		if item.ID == id {
			builders = append(builders[:i], builders[i+1:]...)
			return p.saveStrategicBuilders(ctx, builders)
		}
	}
	return fmt.Errorf("strategic builder not found: %s", id)
}

func (p *Parser) AddStrategicLevel(ctx context.Context, builderID string, level domain.StrategicLevel) (string, error) {
	builders, err := p.ReadStrategicBuilders(ctx)
	if err != nil {
		return "", err
	}
	for i, builder := range builders {
		if builder.ID == builderID {
			if level.ID == "" {
				level.ID = p.strategyParser.GenerateID()
			}
			builders[i].Levels = append(builders[i].Levels, level)
			return level.ID, p.saveStrategicBuilders(ctx, builders)
		}
	}
	return "", fmt.Errorf("strategic builder not found: %s", builderID)
}

func (p *Parser) UpdateStrategicLevel(ctx context.Context, builderID, levelID string, level domain.StrategicLevel) error {
	builders, err := p.ReadStrategicBuilders(ctx)
	if err != nil {
		return err
	}
	for i, builder := range builders {
		if builder.ID == builderID {
			for j, l := range builder.Levels {
				if l.ID == levelID {
					level.ID = levelID
					builders[i].Levels[j] = level
					return p.saveStrategicBuilders(ctx, builders)
				}
			}
			return fmt.Errorf("strategic level not found: %s", levelID)
		}
	}
	return fmt.Errorf("strategic builder not found: %s", builderID)
}

func (p *Parser) DeleteStrategicLevel(ctx context.Context, builderID, levelID string) error {
	builders, err := p.ReadStrategicBuilders(ctx)
	if err != nil {
		return err
	}
	for i, builder := range builders {
		if builder.ID == builderID {
			for j, l := range builder.Levels {
				if l.ID == levelID {
					builders[i].Levels = append(builder.Levels[:j], builder.Levels[j+1:]...)
					return p.saveStrategicBuilders(ctx, builders)
				}
			}
			return fmt.Errorf("strategic level not found: %s", levelID)
		}
	}
	return fmt.Errorf("strategic builder not found: %s", builderID)
}

func (p *Parser) saveStrategicBuilders(ctx context.Context, builders []domain.StrategicLevelsBuilder) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.strategyParser.Serialize(builders)
	fullContent := p.replaceSection(lines, MarkerStrategicLevels, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadCustomers(ctx context.Context) ([]domain.Customer, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerCustomers)
	if sectionLines == nil {
		return []domain.Customer{}, nil
	}
	return p.customersParser.Parse(sectionLines), nil
}

func (p *Parser) CreateCustomer(ctx context.Context, customer domain.Customer) (string, error) {
	customers, err := p.ReadCustomers(ctx)
	if err != nil {
		return "", err
	}
	if customer.ID == "" {
		customer.ID = p.customersParser.GenerateID()
	}
	customers = append(customers, customer)
	return customer.ID, p.saveCustomers(ctx, customers)
}

func (p *Parser) UpdateCustomer(ctx context.Context, id string, customer domain.Customer) error {
	customers, err := p.ReadCustomers(ctx)
	if err != nil {
		return err
	}
	for i, c := range customers {
		if c.ID == id {
			customer.ID = id
			customers[i] = customer
			return p.saveCustomers(ctx, customers)
		}
	}
	return fmt.Errorf("customer not found: %s", id)
}

func (p *Parser) DeleteCustomer(ctx context.Context, id string) error {
	customers, err := p.ReadCustomers(ctx)
	if err != nil {
		return err
	}
	for i, c := range customers {
		if c.ID == id {
			customers = append(customers[:i], customers[i+1:]...)
			return p.saveCustomers(ctx, customers)
		}
	}
	return fmt.Errorf("customer not found: %s", id)
}

func (p *Parser) saveCustomers(ctx context.Context, customers []domain.Customer) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.customersParser.Serialize(customers)
	fullContent := p.replaceSection(lines, MarkerCustomers, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) readBillingData(ctx context.Context) (sections.BillingData, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return sections.BillingData{}, err
	}
	return p.billingParser.Parse(lines), nil
}

func (p *Parser) saveBillingData(ctx context.Context, data sections.BillingData) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.billingParser.Serialize(data)
	// Use a combined billing marker
	fullContent := p.replaceSection(lines, "<!-- Billing -->", newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}

func (p *Parser) ReadBillingRates(ctx context.Context) ([]domain.BillingRate, error) {
	data, err := p.readBillingData(ctx)
	if err != nil {
		return nil, err
	}
	return data.Rates, nil
}

func (p *Parser) CreateBillingRate(ctx context.Context, rate domain.BillingRate) (string, error) {
	data, err := p.readBillingData(ctx)
	if err != nil {
		return "", err
	}
	if rate.ID == "" {
		rate.ID = p.billingParser.GenerateID()
	}
	data.Rates = append(data.Rates, rate)
	return rate.ID, p.saveBillingData(ctx, data)
}

func (p *Parser) UpdateBillingRate(ctx context.Context, id string, rate domain.BillingRate) error {
	data, err := p.readBillingData(ctx)
	if err != nil {
		return err
	}
	for i, r := range data.Rates {
		if r.ID == id {
			rate.ID = id
			data.Rates[i] = rate
			return p.saveBillingData(ctx, data)
		}
	}
	return fmt.Errorf("billing rate not found: %s", id)
}

func (p *Parser) DeleteBillingRate(ctx context.Context, id string) error {
	data, err := p.readBillingData(ctx)
	if err != nil {
		return err
	}
	for i, r := range data.Rates {
		if r.ID == id {
			data.Rates = append(data.Rates[:i], data.Rates[i+1:]...)
			return p.saveBillingData(ctx, data)
		}
	}
	return fmt.Errorf("billing rate not found: %s", id)
}

func (p *Parser) ReadQuotes(ctx context.Context) ([]domain.Quote, error) {
	data, err := p.readBillingData(ctx)
	if err != nil {
		return nil, err
	}
	return data.Quotes, nil
}

func (p *Parser) CreateQuote(ctx context.Context, quote domain.Quote) (string, error) {
	data, err := p.readBillingData(ctx)
	if err != nil {
		return "", err
	}
	if quote.ID == "" {
		quote.ID = p.billingParser.GenerateID()
	}
	if quote.Number == "" {
		quote.Number = fmt.Sprintf("Q-%04d", len(data.Quotes)+1)
	}
	if quote.Created == "" {
		quote.Created = time.Now().Format(time.RFC3339)
	}
	data.Quotes = append(data.Quotes, quote)
	return quote.ID, p.saveBillingData(ctx, data)
}

func (p *Parser) UpdateQuote(ctx context.Context, id string, quote domain.Quote) error {
	data, err := p.readBillingData(ctx)
	if err != nil {
		return err
	}
	for i, q := range data.Quotes {
		if q.ID == id {
			quote.ID = id
			if quote.Created == "" {
				quote.Created = q.Created
			}
			data.Quotes[i] = quote
			return p.saveBillingData(ctx, data)
		}
	}
	return fmt.Errorf("quote not found: %s", id)
}

func (p *Parser) DeleteQuote(ctx context.Context, id string) error {
	data, err := p.readBillingData(ctx)
	if err != nil {
		return err
	}
	for i, q := range data.Quotes {
		if q.ID == id {
			data.Quotes = append(data.Quotes[:i], data.Quotes[i+1:]...)
			return p.saveBillingData(ctx, data)
		}
	}
	return fmt.Errorf("quote not found: %s", id)
}

func (p *Parser) GetNextQuoteNumber(ctx context.Context) (string, error) {
	data, err := p.readBillingData(ctx)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("Q-%04d", len(data.Quotes)+1), nil
}

func (p *Parser) ReadInvoices(ctx context.Context) ([]domain.Invoice, error) {
	data, err := p.readBillingData(ctx)
	if err != nil {
		return nil, err
	}
	return data.Invoices, nil
}

func (p *Parser) CreateInvoice(ctx context.Context, invoice domain.Invoice) (string, error) {
	data, err := p.readBillingData(ctx)
	if err != nil {
		return "", err
	}
	if invoice.ID == "" {
		invoice.ID = p.billingParser.GenerateID()
	}
	if invoice.Number == "" {
		invoice.Number = fmt.Sprintf("INV-%04d", len(data.Invoices)+1)
	}
	if invoice.Created == "" {
		invoice.Created = time.Now().Format(time.RFC3339)
	}
	data.Invoices = append(data.Invoices, invoice)
	return invoice.ID, p.saveBillingData(ctx, data)
}

func (p *Parser) UpdateInvoice(ctx context.Context, id string, invoice domain.Invoice) error {
	data, err := p.readBillingData(ctx)
	if err != nil {
		return err
	}
	for i, inv := range data.Invoices {
		if inv.ID == id {
			invoice.ID = id
			if invoice.Created == "" {
				invoice.Created = inv.Created
			}
			data.Invoices[i] = invoice
			return p.saveBillingData(ctx, data)
		}
	}
	return fmt.Errorf("invoice not found: %s", id)
}

func (p *Parser) DeleteInvoice(ctx context.Context, id string) error {
	data, err := p.readBillingData(ctx)
	if err != nil {
		return err
	}
	for i, inv := range data.Invoices {
		if inv.ID == id {
			data.Invoices = append(data.Invoices[:i], data.Invoices[i+1:]...)
			return p.saveBillingData(ctx, data)
		}
	}
	return fmt.Errorf("invoice not found: %s", id)
}

func (p *Parser) GetNextInvoiceNumber(ctx context.Context) (string, error) {
	data, err := p.readBillingData(ctx)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("INV-%04d", len(data.Invoices)+1), nil
}

func (p *Parser) ReadPayments(ctx context.Context) ([]domain.Payment, error) {
	data, err := p.readBillingData(ctx)
	if err != nil {
		return nil, err
	}
	return data.Payments, nil
}

func (p *Parser) CreatePayment(ctx context.Context, payment domain.Payment) (string, error) {
	data, err := p.readBillingData(ctx)
	if err != nil {
		return "", err
	}
	if payment.ID == "" {
		payment.ID = p.billingParser.GenerateID()
	}
	if payment.Date == "" {
		payment.Date = time.Now().Format("2006-01-02")
	}
	data.Payments = append(data.Payments, payment)

	// Update invoice paid amount
	for i, inv := range data.Invoices {
		if inv.ID == payment.InvoiceID {
			data.Invoices[i].PaidAmount += payment.Amount
			if data.Invoices[i].PaidAmount >= data.Invoices[i].Total {
				data.Invoices[i].Status = "paid"
				data.Invoices[i].PaidAt = payment.Date
			} else {
				data.Invoices[i].Status = "partial"
			}
			break
		}
	}

	return payment.ID, p.saveBillingData(ctx, data)
}

func (p *Parser) ReadTimeEntries(ctx context.Context) (map[string][]domain.TimeEntry, error) {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return nil, err
	}
	sectionLines := p.reader.ExtractSection(lines, MarkerTimeTracking)
	if sectionLines == nil {
		return make(map[string][]domain.TimeEntry), nil
	}
	data := p.timeTrackingParser.Parse(sectionLines)
	return map[string][]domain.TimeEntry(data), nil
}

func (p *Parser) GetTimeEntriesForTask(ctx context.Context, taskID string) ([]domain.TimeEntry, error) {
	entries, err := p.ReadTimeEntries(ctx)
	if err != nil {
		return nil, err
	}
	return entries[taskID], nil
}

func (p *Parser) AddTimeEntry(ctx context.Context, taskID string, entry domain.TimeEntry) (string, error) {
	entries, err := p.ReadTimeEntries(ctx)
	if err != nil {
		return "", err
	}
	if entry.ID == "" {
		entry.ID = p.timeTrackingParser.GenerateID()
	}
	if entry.Date == "" {
		entry.Date = time.Now().Format("2006-01-02")
	}
	entries[taskID] = append(entries[taskID], entry)
	return entry.ID, p.saveTimeEntries(ctx, entries)
}

func (p *Parser) DeleteTimeEntry(ctx context.Context, taskID, entryID string) error {
	entries, err := p.ReadTimeEntries(ctx)
	if err != nil {
		return err
	}
	taskEntries, ok := entries[taskID]
	if !ok {
		return fmt.Errorf("task not found: %s", taskID)
	}
	for i, e := range taskEntries {
		if e.ID == entryID {
			entries[taskID] = append(taskEntries[:i], taskEntries[i+1:]...)
			return p.saveTimeEntries(ctx, entries)
		}
	}
	return fmt.Errorf("time entry not found: %s", entryID)
}

func (p *Parser) saveTimeEntries(ctx context.Context, entries map[string][]domain.TimeEntry) error {
	lines, err := p.reader.ReadFile(p.filePath())
	if err != nil {
		return err
	}
	newContent := p.timeTrackingParser.Serialize(sections.TimeTrackingData(entries))
	fullContent := p.replaceSection(lines, MarkerTimeTracking, newContent)
	return p.writer.WriteFile(p.filePath(), fullContent)
}
