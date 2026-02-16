# MD Planner

Markdown-based project management with directory storage.

## Links

Bug Tracker: [GitHub Issues](https://github.com/studiowebux/mdplanner/issues)

## About

MD Planner is a task management system that uses a directory of markdown files
as the database. Each entity (task, note, goal) is a separate `.md` file with
YAML frontmatter. No external database required. Human-readable. Git-friendly.

Views: Summary, List, Board (kanban), Timeline (Gantt), Notes, Goals,
Milestones, Ideas, Canvas, Mindmap, C4 Architecture, SWOT, Risk Analysis, Lean
Canvas, Business Model, Capacity Planning, Strategic Levels, Billing, CRM.

## Installation

Requires [Deno](https://deno.land/).

```bash
git clone https://github.com/studiowebux/mdplanner.git
cd mdplanner
deno task dev
```

Open `http://localhost:8003`

## Usage

```bash
# Development server
deno task dev

# Production server
deno task start

# Custom project directory
deno task dev ./my-project
```

## Project Structure

```
my-project/
  project.md          # Config: name, start date, assignees, tags
  board/
    backlog/          # Tasks by section
      task_1.md
    todo/
    in_progress/
    done/
  notes/
    note_1.md
  goals/
    goal_1.md
  milestones/
  ideas/
  canvas/
  mindmaps/
  c4/
  swot/
  risk/
  capacity/
  billing/
    customers/
    rates/
    quotes/
    invoices/
  crm/
    companies/
    contacts/
    deals/
```

## File Format

Task (`board/todo/task_1.md`):

```markdown
---
id: task_1
completed: false
tag: [Bug, Backend]
priority: 1
assignee: Alice
due_date: 2026-03-01
effort: 3
blocked_by: [task_2]
milestone: milestone_v1
---

# Task Title

Description here.

## Subtasks

- [ ] (subtask_1) First subtask
- [x] (subtask_2) Completed subtask
```

Note (`notes/note_1.md`):

```markdown
---
id: note_1
mode: enhanced
---

# Meeting Notes

Content with full markdown support.
```

Goal (`goals/goal_1.md`):

```markdown
---
id: goal_1
type: project
kpi: Ship MVP
start: 2026-01-01
end: 2026-06-01
status: on-track
---

# Launch Product

Goal description.
```

## API

REST API at `/api/*`. Full CRUD for all entities.

```
GET/POST       /api/tasks
PUT/DELETE     /api/tasks/:id
PATCH          /api/tasks/:id/move

GET/POST       /api/notes
PUT/DELETE     /api/notes/:id

GET/POST       /api/goals
PUT/DELETE     /api/goals/:id

# Similar patterns for: milestones, ideas, canvas, mindmaps,
# c4, swot, risk-analysis, lean-canvas, business-model,
# capacity, strategic-levels, billing, crm
```

## Contributing

Fork, branch, PR. Run `deno task dev` to test.

## License

MIT

## Contact

Studio Webux: [studiowebux.com](https://studiowebux.com)
