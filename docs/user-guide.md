---
title: MD Planner User Guide
description: Comprehensive guide for using MD Planner, a markdown-based project management tool with multi-project support, kanban boards, timelines, and strategic planning features.
tags:
  - project-management
  - markdown
  - task-tracking
  - planning
  - kanban
---

# MD Planner User Guide

MD Planner is a markdown-based project management tool that stores all data in human-readable files. No database required.

## Core Concepts

### Markdown Storage

All project data lives in a single markdown file. Tasks, notes, goals, and configurations are stored as structured markdown sections. Files are version-controllable, searchable, and portable.

### Multi-Project Management

Load multiple markdown files as separate projects. Switch between projects via dropdown in the header. Each project maintains independent tasks, goals, and configurations.

### Data Safety

**Automatic backups**: Timestamped backups created before each save operation.

**Atomic writes**: Temp file + rename pattern prevents corruption during writes.

**Write locking**: Prevents race conditions when multiple operations modify the file.

**Hash-based deduplication**: Identical backups are not stored twice.

**Configurable retention**: Control backup count via `MD_PLANNER_MAX_BACKUPS` environment variable (default: 10).

## Views

### Summary

Project overview dashboard displaying:

- Project metadata (status, start date, last updated)
- Task statistics (total, completed, pending, late)
- Due date breakdown (today, late, upcoming)
- Section progress visualization
- Recent activity

**Access**: Click "Summary" in navigation bar.

### List

Filterable task list with drag-and-drop reordering.

**Features**:
- Filter by section, assignee, tag, priority, milestone
- Search by title or description
- Drag tasks to reorder within sections
- Inline task editing
- Bulk operations

**Access**: Click "List" in navigation bar.

### Board

Kanban-style board with customizable sections.

**Default sections**: Ideas, Todo, In Progress, Done

**Features**:
- Drag tasks between sections
- Visual priority badges (1-5)
- Color-coded assignee labels
- Due date indicators
- Dependency warnings
- Quick task creation per section

**Board Templates**:
- **SWOT Analysis**: 2x2 grid (Strengths, Weaknesses, Opportunities, Threats)
- **Risk Analysis**: 2x2 impact/probability matrix
- **Lean Canvas**: 12-section startup planning board
- **Business Model Canvas**: 9-section business model
- **Project Value Board**: Customer Segments, Problem, Solution, Benefit
- **Brief**: 11-section RACI-based project brief

**Access**: Click "Board" in navigation bar.

### Timeline

Gantt-style schedule visualization.

**Calculation based on**:
- Task effort estimates (days)
- Dependencies (blocked_by relationships)
- Project start date
- Working days configuration

**Features**:
- Automatic scheduling with dependency resolution
- Due date verification
- Critical path highlighting
- Timeline zoom controls

**Access**: Click "Timeline" in navigation bar.

### Notes

Tabbed note interface with simple and enhanced modes.

**Modes**:
- **Simple**: Basic tabbed editing with markdown support
- **Enhanced**: Split-view, timeline view, advanced formatting

**Features**:
- Sequential IDs (note_1, note_2, etc.)
- Click-to-edit inline editing
- Auto-save (1-second debounce)
- Full markdown rendering
- Headers within note content supported
- Horizontal tab scrolling for many notes

**Access**: Click "Notes" in navigation bar.

### Goals

Track enterprise and project goals with KPIs.

**Goal Types**:
- **Enterprise**: Company-wide strategic goals
- **Project**: Initiative-specific objectives

**Attributes**:
- KPI definition
- Start/end dates
- Status (planning, on-track, at-risk, late, success, failed)
- Detailed description

**Features**:
- Filter by type and status
- Visual status indicators
- Progress tracking
- Sequential IDs (goal_1, goal_2, etc.)

**Access**: Click "Goals" in navigation bar.

### Ideas

Idea collection with Zettelkasten-style linking.

**Workflow**: new → considering → planned | rejected

**Features**:
- Category organization
- Status tracking
- Link related ideas via IDs
- Computed backlinks (automatically shows which ideas reference current idea)
- Interactive navigation between linked ideas
- Creation timestamps

**Access**: Click "Ideas" in navigation bar.

### Milestones

Track target dates and milestone status.

**Attributes**:
- Target date
- Status (open, completed)
- Description
- Linked tasks

**Features**:
- Task assignment to milestones
- Progress visualization
- Timeline integration

**Access**: Click "Milestones" in navigation bar.

### Retrospectives

Continue/Stop/Start format retrospectives.

**Structure**:
- **Continue**: What's working
- **Stop**: What to eliminate
- **Start**: What to implement

**Attributes**:
- Date
- Status (open, closed)
- Per-section bullet lists

**Access**: Click "Retrospectives" in navigation bar.

### Canvas

Visual brainstorming with draggable sticky notes.

**Features**:
- Drag to reposition
- Color coding (yellow, pink, green, blue, purple, orange)
- Resizable notes
- Auto-save position and content
- CSV export

**Access**: Click "Canvas" in navigation bar.

### Mindmap

Hierarchical idea organization with tree visualization.

**Layouts**:
- Horizontal (left-to-right)
- Vertical (top-to-bottom)

**Features**:
- Interactive editor with toolbar
- Live preview
- Keyboard shortcuts (Tab/Shift+Tab indent, Enter sibling, Alt+Up/Down move)
- Zoom controls
- Export to CSV

**Access**: Click "Mindmap" in navigation bar.

### C4 Architecture

Context, Container, Component, Code diagrams with drill-down navigation.

**Levels**:
- Context (system landscape)
- Container (application breakdown)
- Component (detailed architecture)
- Code (implementation details)

**Features**:
- Visual diagram view
- List view toggle
- Drill-down navigation
- Component relationships
- Connection labels

**Access**: Click "C4 Architecture" in navigation bar.

### Strategic Levels

Vision-to-tactics hierarchy builder.

**Hierarchy**: Vision → Mission → Goals → Objectives → Strategies → Tactics

**Views**:
- **Tree**: Hierarchical display with expandable nodes
- **Pyramid**: Centered pyramid visualization

**Features**:
- Parent-child relationships
- Task/milestone linking
- Progress rollup (computed from children and linked items)
- Delete protection (warns when level has children)

**Access**: Click "Strategic Levels" in navigation bar.

### Capacity Planning

Team member allocation and utilization tracking.

**Components**:
- **Team Members**: Availability (hours/day, working days)
- **Weekly Allocations**: Hours assigned per member per week
- **Utilization**: Available vs allocated vs actual hours

**Features**:
- Color-coded grid (green <80%, yellow 80-100%, red >100%)
- Auto-assignment algorithm (suggests allocations based on capacity and priority)
- Budget tracking
- Utilization visualization

**Access**: Click "Capacity Planning" in navigation bar.

### Billing

Customer management, quotes, invoices, and payment tracking.

**Modules**:
- **Customers**: Contact info, company details, billing address
- **Billing Rates**: Hourly rates per assignee
- **Quotes**: Draft/send/accept workflow with line items
- **Invoices**: Generate from quotes or time entries
- **Payments**: Record with method and reference

**Features**:
- Quote-to-invoice conversion
- Payment tracking per invoice
- Outstanding/overdue/paid summaries
- Tax rate configuration
- Time entry integration

**Access**: Click "Billing" in navigation bar.

## Task Management

### Task Attributes

| Attribute | Description | Format |
|-----------|-------------|--------|
| `id` | Unique identifier | `task-1`, `subtask-1` |
| `title` | Task name | Plain text |
| `section` | Board column | Todo, In Progress, Done, custom |
| `completed` | Completion status | Boolean checkbox |
| `priority` | Importance (1=highest) | 1-5 |
| `assignee` | Responsible person | Team member name |
| `due_date` | Deadline | `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM` |
| `effort` | Estimate in days | Integer |
| `tags` | Categories | Array: `[Bug, Feature]` |
| `blocked_by` | Dependencies | Array: `[task-1, task-2]` |
| `milestone` | Linked milestone | Milestone name |
| `description` | Details | Markdown text |

### Task Operations

**Create**: Click "+ Task" button or use inline creation in Board view.

**Edit**: Click task to open editor modal. Modify attributes and description.

**Move**: Drag task to different section (Board/List views).

**Delete**: Click delete icon in task editor.

**Share**: Use URL format `#task=task-id` to link directly to a task.

### Subtasks

Nested task hierarchies for breaking down work.

**Format**:
```markdown
- [ ] (task-1) Parent task
  - [ ] (subtask-1) Child task
  - [ ] (subtask-2) Another child task
```

**Features**:
- Unlimited nesting depth
- Independent completion tracking
- Inherits parent section by default

### Dependencies

Define task relationships using `blocked_by` attribute.

**Syntax**: `{blocked_by: [task-1, task-2]}`

**Behavior**:
- Timeline view respects dependencies for scheduling
- Visual indicators show blocked tasks
- Dependency validation prevents circular references

### Time Tracking

Log time entries per task with assignee and notes.

**Format**: `YYYY-MM-DD: 2h by John - Description`

**Features**:
- Per-task time entries
- Assignee attribution
- Description/notes
- Integration with billing rates for invoicing

**Access**: Via Time Tracking view or task detail modal.

## Tools

### Pomodoro Timer

Configurable focus timer with work/break cycles.

**Features**:
- Customizable duration
- Audio notifications
- Session tracking

**Access**: Click timer icon in header.

### Dark Mode

System preference detection with manual toggle.

**Toggle**: Click moon/sun icon in header.

**Behavior**: Persists across sessions, applies to all views and components.

### Import/Export

#### CSV Import

**Supported**: Tasks only (canvas/mindmap import not available).

**Format**:
```csv
ID,Title,Section,Completed,Priority,Assignee,Due Date,Effort,Tags,Blocked By,Milestone,Description
task1,Setup,Todo,FALSE,1,Alice,2025-08-20,2,"Backend, Infra","","Sprint 1","Install tools"
```

**Process**:
1. Click import/export icon (⬇⬆) in header
2. Select "Import Tasks CSV"
3. Choose file
4. System validates format, checks for duplicates by title
5. New tasks appended to Todo section

**Access**: Header → Import/Export icon → Import Tasks CSV.

#### CSV Export

**Available for**: Tasks, canvas sticky notes, mindmaps.

**Tasks Export**:
- Full metadata (all attributes)
- Complete descriptions
- Preserves IDs, dependencies, assignments

**Canvas/Mindmap Export**: Via API endpoints (`/api/export/csv/canvas`, `/api/export/csv/mindmaps`).

**Access**: Header → Import/Export icon → Export Tasks CSV.

#### PDF Reports

Single-page project overview for printing/sharing.

**Includes**:
- Project statistics
- Task breakdown by section
- Goals tracking
- Milestone status
- Section progress visualization

**Access**: Header → Import/Export icon → Export PDF Report.

### Version Checker

Displays update badge when new version available.

**Behavior**: Automatic check on page load, shows notification badge if update detected.

## Configuration

### Project Configuration

Stored in `# Configurations` section of markdown file.

**Attributes**:

| Setting | Description | Format |
|---------|-------------|--------|
| `Start Date` | Project start for timeline calculations | `YYYY-MM-DD` |
| `Working Days` | Days per week | 5, 6, or 7 |
| `Assignees` | Team members | Bulleted list |
| `Tags` | Available tags | Bulleted list |
| `Status` | Project status | active, on-track, at-risk, late, completed |

**Edit**: Configuration view provides UI for updating all settings.

**Access**: Click "Config" in navigation bar.

### Custom Board Sections

Define custom sections beyond default (Ideas, Todo, In Progress, Done).

**Format**: Create new `## Section Name` heading under `# Board` in markdown file.

**Behavior**: UI dynamically displays all sections, supports drag-and-drop between custom sections.

### Working Days Schedule

Select specific days of the week for timeline calculations.

**Options**: 5-day (Mon-Fri), 6-day, 7-day, or custom day selection.

**Impact**: Affects effort-to-calendar-day conversion in Timeline view.

## Markdown File Structure

### Required Sections

```markdown
# Project Name

Project description

<!-- Configurations -->
# Configurations

Start Date: 2026-01-15
Working Days: 5

Assignees:
- Alice Smith

Tags:
- Bug

<!-- Board -->
# Board

## Todo

- [ ] (task-1) Task title {tag: [Bug]; priority: 1; assignee: Alice}
  Task description
```

### Section Boundaries

HTML comments mark section boundaries:
- `<!-- Configurations -->`
- `<!-- Notes -->`
- `<!-- Goals -->`
- `<!-- Canvas -->`
- `<!-- Mindmap -->`
- `<!-- Board -->`
- `<!-- Milestones -->`
- `<!-- Ideas -->`
- `<!-- Retrospectives -->`
- `<!-- SWOT Analysis -->`
- `<!-- Risk Analysis -->`
- `<!-- Lean Canvas -->`
- `<!-- Business Model Canvas -->`
- `<!-- Project Value Board -->`
- `<!-- Brief -->`
- `<!-- C4 Architecture -->`
- `<!-- Time Tracking -->`
- `<!-- Capacity Planning -->`
- `<!-- Strategic Levels -->`
- `<!-- Billing -->`

**Purpose**: Prevents content from leaking between sections. System automatically maintains boundaries during file operations.

### Task Format

```markdown
- [ ] (task-id) Task Title {tag: [Bug, Feature]; priority: 1; assignee: Alice Smith; due_date: 2026-01-20; effort: 3; blocked_by: [task-1]; milestone: Sprint 1}
  Detailed task description in markdown.
  Can span multiple lines.
```

### Note Format

```markdown
## Note Title

<!-- id: note_1 -->
Note content with full markdown support.

# Headers within notes work
## Subsections too
- Lists
- Code blocks
```

### Goal Format

```markdown
## Goal Title {type: enterprise; kpi: 25% increase in revenue; start: 2026-01-01; end: 2026-12-31; status: on-track}

<!-- id: goal_1 -->
Goal description and success criteria.
```

### Canvas Sticky Note Format

```markdown
## Sticky Note Title {color: yellow; position: {x: 200, y: 150}; size: {width: 250, height: 180}}

<!-- id: sticky_note_1 -->
```

### Mindmap Format

```markdown
## Mindmap Title

<!-- id: mindmap_1 -->

- Root Node
  - Child 1
    - Grandchild
  - Child 2
```

### Milestone Format

```markdown
## Milestone Name
<!-- id: milestone_1 -->
Target: 2026-03-01
Status: open
Description of milestone deliverables.
```

### Idea Format

```markdown
## Idea Title
<!-- id: idea_1 -->
<!-- links: idea_2,idea_3 -->
Status: considering
Category: Feature
Created: 2026-02-12
Idea description and rationale.
```

## Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `Tab` | Indent node | Mindmap editor |
| `Shift+Tab` | Outdent node | Mindmap editor |
| `Enter` | New sibling node | Mindmap editor |
| `Alt+Up` | Move node up | Mindmap editor |
| `Alt+Down` | Move node down | Mindmap editor |
| `ESC` | Close modal | All modals |
| `F5` | Refresh (preserves view) | All views |

## Troubleshooting

### Content Leaking Between Sections

**Symptom**: Note content appears in other sections or parsing fails.

**Solution**:
1. Verify section boundary comments are present
2. System auto-regenerates boundaries on save, but manual edits may remove them
3. Ensure note IDs follow format `<!-- id: note_\d+ -->`

### CSV Import Issues

**No tasks imported**:
- Check CSV format matches specification
- Verify UTF-8 encoding
- Tasks with duplicate titles are skipped
- Assignees must exist in project configuration

**Data not appearing**:
- Force refresh browser (Ctrl+F5 / Cmd+Shift+R)
- Check Todo section (default import location)
- Verify you're in Board or List view

### CSV Export Issues

**Empty export**:
- Confirm tasks exist in project
- Check browser download/popup settings
- Verify browser can write to Downloads folder

### PDF Report Issues

**Popup blocked**: Allow popups for application domain.

**Layout problems**: Report optimized for single page. Complex projects may require scrolling.

### Timeline Calculation Issues

**Tasks not scheduled**:
- Verify task has effort estimate
- Check dependencies are valid (no circular references)
- Confirm project start date is set

**Incorrect dates**:
- Review working days configuration
- Check dependency chain for blocking tasks
- Validate effort estimates are integers

## API Reference

All operations accessible via REST API for automation and integration.

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tasks` | GET | Retrieve all tasks |
| `/api/tasks` | POST | Create task |
| `/api/tasks/:id` | PUT | Update task |
| `/api/tasks/:id` | DELETE | Delete task |
| `/api/tasks/:id/move` | PATCH | Move task to section |
| `/api/export/csv/tasks` | GET | Export tasks as CSV |
| `/api/import/csv/tasks` | POST | Import tasks from CSV |
| `/api/export/pdf/report` | GET | Generate PDF report |
| `/api/notes` | GET, POST, PUT, DELETE | Notes CRUD |
| `/api/goals` | GET, POST, PUT, DELETE | Goals CRUD |
| `/api/canvas/sticky_notes` | GET, POST, PUT, DELETE | Canvas CRUD |
| `/api/mindmaps` | GET, POST, PUT, DELETE | Mindmaps CRUD |
| `/api/milestones` | GET, POST, PUT, DELETE | Milestones CRUD |
| `/api/ideas` | GET, POST, PUT, DELETE | Ideas CRUD |
| `/api/retrospectives` | GET, POST, PUT, DELETE | Retrospectives CRUD |
| `/api/time-entries/:taskId` | GET, POST, DELETE | Time tracking |
| `/api/capacity` | GET, POST, PUT, DELETE | Capacity planning |
| `/api/customers` | GET, POST, PUT, DELETE | Customer management |
| `/api/quotes` | GET, POST, PUT, DELETE | Quote management |
| `/api/invoices` | GET, POST, PUT, DELETE | Invoice management |
| `/api/projects` | GET | List all projects |
| `/api/projects/switch` | POST | Switch active project |
| `/api/project/config` | GET, POST | Get/update configuration |

Full API documentation available in README.md.

## Advanced Features

### Zettelkasten Linking

Link related ideas using `<!-- links: idea_id1,idea_id2 -->` syntax.

**Backlinks**: Automatically computed. Shows which ideas reference current idea.

**Navigation**: Click linked/backlinked idea to navigate directly.

**Use case**: Build knowledge graph of related concepts, features, or decisions.

### Dependency Management

Chain tasks using `blocked_by` attribute.

**Validation**: System prevents circular dependencies.

**Timeline impact**: Dependent tasks automatically scheduled after blockers complete.

**Visual indicators**: Board/List views show dependency warnings.

### Progress Rollup

Strategic Levels automatically calculates progress from:
- Child levels
- Linked tasks
- Linked milestones

**Calculation**: Percentage based on completion status of all connected items.

**Display**: Visual progress bars in Tree and Pyramid views.

### Auto-Assignment Algorithm

Capacity Planning suggests task allocations.

**Input**:
- Team member availability (hours/day, working days)
- Task effort estimates
- Task priorities

**Output**: Suggested weekly allocations maximizing utilization while respecting capacity.

**Application**: Review suggestions, modify if needed, apply to create allocations.

### Quote-to-Invoice Conversion

Generate invoices from accepted quotes with one click.

**Process**:
1. Create quote with line items
2. Mark as sent
3. Mark as accepted
4. Click "Convert to Invoice"
5. System creates invoice with same line items, customer, and totals

**Time Entry Integration**: Alternatively, generate invoices from logged time entries using billing rates.

## Best Practices

**Markdown files**: Use version control (Git) for history and collaboration.

**Backups**: Export CSV regularly or rely on automatic backup system.

**Dependencies**: Avoid deep dependency chains (>3 levels) to prevent scheduling complexity.

**Tags**: Define tags in project configuration before using on tasks for consistency.

**Milestones**: Link tasks to milestones for better progress tracking and reporting.

**Capacity planning**: Update allocations weekly to reflect actual work patterns.

**Strategic alignment**: Link tasks to strategic levels to maintain goal visibility.

**Documentation**: Use Notes view for project documentation, meeting notes, and decision logs.

## Environment Configuration

Set environment variables for customization:

```bash
# Backup retention (default: 10)
export MD_PLANNER_MAX_BACKUPS=20

# Backup directory (default: ./backups)
export MD_PLANNER_BACKUP_DIR="/path/to/backups"
```

## Use Cases

**Solo developers**: Manage personal projects with minimal overhead.

**Small teams**: Coordinate work without complex tool setup.

**Consultants**: Track billable hours, generate quotes/invoices.

**Startups**: Strategic planning (Lean Canvas, Business Model Canvas, Strategic Levels).

**Product teams**: Roadmap planning with Ideas, Goals, and Milestones.

**Enterprise**: Capacity planning, C4 architecture diagrams, multi-project tracking.
