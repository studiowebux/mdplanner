---
title: MD Planner User Guide
description: Reference guide for MD Planner — markdown-based project management with directory storage.
---

# MD Planner User Guide

MD Planner stores all project data as markdown files in a directory. No external
database required. Human-readable, git-trackable, portable.

## Core Concepts

### Directory Storage

Each project is a directory. Each entity (task, note, goal, etc.) is one `.md`
file with YAML frontmatter. The directory structure mirrors the entity type:

```
my-project/
  project.md          # Project config (required)
  board/
    todo/
      task_auth.md
    in_progress/
      task_search.md
    done/
      task_cicd.md
  notes/
    note_architecture.md
  goals/
    mvp-launch.md
  ideas/
    idea_templates.md
  milestones/
    milestone_beta.md
  people/
    alice.md
  moscow/
    sprint1.md
  eisenhower/
    q1.md
  portfolio/
    project_alpha.md
  ...
```

### project.md

Every project directory must contain `project.md`. This file provides metadata
and controls which views are enabled.

```yaml
---
start_date: 2026-01-01
working_days_per_week: 5
working_days: [Mon, Tue, Wed, Thu, Fri]
assignees: [alice, bob, charlie]
tags: [feature, bug, docs]
status: active
features:
  - tasks
  - notes
  - goals
  - ideas
  - milestones
  - retrospectives
  - canvas
  - mindmap
  - c4
  - swot
  - risk
  - leancanvas
  - businessmodel
  - projectvalue
  - brief
  - strategiclevels
  - capacity
  - billing
  - crm
  - timetracking
  - portfolio
  - orgchart
  - people
  - moscow
  - eisenhower
  - ideas-sorter
links:
  - title: Repository
    url: "https://github.com/org/repo"
---

# Project Name

Project description.
```

Omit a feature from the `features` array to hide it from the navigation.

## Getting Started

### Initialize a project

```bash
mdplanner init ./my-project
mdplanner ./my-project
```

`init` creates `project.md` and all standard subdirectories. Open
`http://localhost:8003`.

### Docker

```bash
mkdir -p data
docker run --rm -v "$(pwd)/data:/data" $(docker build -q .) init /data
docker compose up -d
```

See `deploy/README.md` for full Docker and systemd instructions.

## Views

### Tasks (Board)

Kanban board. Tasks live in `board/{status}/task_name.md`.

```yaml
---
id: task_auth
completed: false
tag: [feature, security]
due_date: 2026-03-01
assignee: alice
priority: 1
effort: 5
milestone: milestone_beta
blocked_by: [task_database]
planned_start: 2026-02-20
planned_end: 2026-02-25
order: 0
---

# Implement Authentication

JWT-based auth with refresh tokens.
```

Directory structure determines status column:

```
board/
  todo/
  in_progress/
  done/
  backlog/       # custom sections work too
```

### Notes

Tabbed markdown editor. Each note is `notes/note_name.md`.

```yaml
---
id: note_architecture
created: "2026-01-05T10:00:00Z"
updated: "2026-02-16T02:39:51.384Z"
revision: 7
mode: simple    # or: enhanced
---

# Architecture Overview

Full markdown supported. Custom tab sections available in enhanced mode.
```

Enhanced mode supports custom tab sections with `<!-- Custom Section: Name -->`
delimiters.

### Goals

Track enterprise and project goals. Each goal is `goals/goal_name.md`.

```yaml
---
id: goal_revenue
type: enterprise   # or: project
kpi: "25% revenue increase"
start: 2026-01-01
end: 2026-12-31
status: on-track   # planning | on-track | at-risk | late | success | failed
---

# Revenue Target

Goal description and success criteria.
```

### Ideas

Idea collection with Zettelkasten linking. Each idea is `ideas/idea_name.md`.

```yaml
---
id: idea_templates
title: Project Templates
status: approved    # new | considering | planned | rejected | approved
category: feature
created: 2026-01-15
links: [idea_ai, idea_onboarding]
---

# Project Templates

Description and rationale.
```

### Milestones

Track target dates. Each milestone is `milestones/milestone_name.md`.

```yaml
---
id: milestone_beta
title: Beta Launch
target_date: 2026-04-01
status: open    # open | completed
---

# Beta Launch

Deliverables and acceptance criteria.
```

### Retrospectives

Continue/Stop/Start format. Each retro is `retrospectives/retro_name.md`.

```yaml
---
id: retro_q1
date: 2026-03-31
status: open    # open | closed
continue:
  - Weekly syncs
stop:
  - Scope creep
start:
  - Daily standups
---

# Q1 Retrospective
```

### Canvas

Draggable sticky notes. Each canvas is `canvas/canvas_name.md` with sticky note
files nested inside.

### Mindmap

Hierarchical tree visualization. Each mindmap is `mindmaps/mindmap_name.md`.

```yaml
---
id: mindmap_product
---

# Product Features

- Core
  - Auth
  - Tasks
- Integrations
  - Slack
  - GitHub
```

### C4 Architecture

Context/Container/Component/Code diagrams. Files in `c4/`.

### People

Shared registry of team members. Each person is `people/person_name.md`.

```yaml
---
id: person_alice
name: Alice Smith
title: Engineering Lead
email: alice@company.com
phone: "+1 555 0100"
departments: [Engineering, Leadership]
reportsTo: person_ceo
role: developer
hoursPerDay: 8
workingDays: [Mon, Tue, Wed, Thu, Fri]
startDate: 2024-01-15
---

# Alice Smith
```

People referenced by ID across capacity planning, org chart, and portfolio
views.

### Org Chart

Visual hierarchy built from `people/` directory using `reportsTo` relationships.

### Capacity Planning

Team allocation tracking. Plans stored in `capacity/`.

```yaml
---
id: capacity_q1
weekStart: 2026-01-06
allocations:
  - personId: person_alice
    hours: 32
  - personId: person_bob
    hours: 24
---
```

### Portfolio

Project portfolio view. Each item is `portfolio/project_name.md`.

```yaml
---
id: portfolio_alpha
name: Project Alpha
status: active    # active | completed | on-hold | cancelled
startDate: 2026-01-01
endDate: 2026-06-30
budget: 150000
spent: 45000
team: [person_alice, person_bob]
---

# Project Alpha

Project description and objectives.
```

### MoSCoW

Prioritization analysis. Each analysis is `moscow/analysis_name.md`.

```yaml
---
id: moscow_sprint1
date: 2026-02-22
must: [User authentication, Core API]
should: [Dashboard, Notifications]
could: [Dark mode, Export]
wont: [Mobile app]
---

# Sprint 1 Priorities
```

### Eisenhower Matrix

Urgency/importance quadrant. Each matrix is `eisenhower/matrix_name.md`.

```yaml
---
id: eisenhower_q1
date: 2026-02-22
urgentImportant: [Fix production bug, Deploy hotfix]
notUrgentImportant: [Plan architecture, Write tests]
urgentNotImportant: [Reply to emails, Schedule meetings]
notUrgentNotImportant: [Reorganize docs, Update profiles]
---

# Q1 Priorities
```

### Idea Sorter

Sortable/filterable table over the `ideas/` directory. Uses the idea frontmatter
fields: `priority`, `startDate`, `endDate`, `resources`, `subtasks`.

### Strategic Levels

Vision-to-tactics hierarchy. Files in `strategiclevels/`.

### Billing

Customer management, quotes, invoices. Customers in `billing/customers/`,
quotes in `billing/quotes/`, invoices in `billing/invoices/`.

### CRM

Contact and deal management. Companies in `crm/companies/`, contacts in
`crm/contacts/`, deals in `crm/deals/`, interactions in `crm/interactions/`.

### Time Tracking

Log time against tasks. Entries in `timetracking/`.

### Lean Canvas, Business Model Canvas, SWOT, Risk, Project Value, Brief

Strategic planning boards. Files in their respective directories
(`leancanvas/`, `businessmodel/`, `swot/`, `risk/`, `projectvalue/`, `brief/`).

## CLI Reference

```
mdplanner [OPTIONS] <project-directory>
mdplanner init <directory>

Commands:
  init <directory>       Scaffold a new project directory

Options:
  -p, --port <port>      Server port (default: 8003)
  -c, --cache            Enable SQLite cache for fast queries and search
  -h, --help             Show help

Examples:
  mdplanner init ./my-project
  mdplanner ./my-project
  mdplanner --port 8080 --cache ./my-project
```

## SQLite Cache

Optional performance layer. Enable with `--cache`.

```bash
mdplanner --cache ./my-project
```

Creates `.mdplanner.db` in the project directory. Add to `.gitignore`. Markdown
files remain the source of truth — cache is rebuildable at any time.

### Search API

```
GET /api/search?q=<query>&types=task,note,goal,idea&limit=50
POST /api/search/rebuild
GET  /api/search/status
```

## API Reference

All data operations are available via REST. Base URL: `http://localhost:8003/api`

| Endpoint                          | Methods              | Resource              |
| --------------------------------- | -------------------- | --------------------- |
| `/tasks`                          | GET, POST, PUT, DELETE | Tasks               |
| `/tasks/:id/move`                 | PATCH                | Move task to section  |
| `/notes`                          | GET, POST, PUT, DELETE | Notes               |
| `/goals`                          | GET, POST, PUT, DELETE | Goals               |
| `/ideas`                          | GET, POST, PUT, DELETE | Ideas               |
| `/milestones`                     | GET, POST, PUT, DELETE | Milestones          |
| `/retrospectives`                 | GET, POST, PUT, DELETE | Retrospectives      |
| `/canvas/sticky_notes`            | GET, POST, PUT, DELETE | Canvas              |
| `/mindmaps`                       | GET, POST, PUT, DELETE | Mindmaps            |
| `/capacity`                       | GET, POST, PUT, DELETE | Capacity plans      |
| `/people`                         | GET, POST, PUT, DELETE | People registry     |
| `/portfolio`                      | GET, POST, PUT, DELETE | Portfolio projects  |
| `/moscow`                         | GET, POST, PUT, DELETE | MoSCoW analyses     |
| `/eisenhower`                     | GET, POST, PUT, DELETE | Eisenhower matrices |
| `/billing/customers`              | GET, POST, PUT, DELETE | Customers           |
| `/billing/quotes`                 | GET, POST, PUT, DELETE | Quotes              |
| `/billing/invoices`               | GET, POST, PUT, DELETE | Invoices            |
| `/crm/companies`                  | GET, POST, PUT, DELETE | CRM companies       |
| `/crm/contacts`                   | GET, POST, PUT, DELETE | CRM contacts        |
| `/crm/deals`                      | GET, POST, PUT, DELETE | CRM deals           |
| `/time-entries/:taskId`           | GET, POST, DELETE    | Time entries          |
| `/project/config`                 | GET, PUT             | Project config        |
| `/search`                         | GET                  | Full-text search      |
| `/export/csv/tasks`               | GET                  | CSV export            |
| `/import/csv/tasks`               | POST                 | CSV import            |

## Feature Visibility

Control which views appear in the navigation via `project.md` frontmatter:

```yaml
features:
  - tasks
  - notes
  - goals
```

Any view not listed is hidden. To show all views, include all feature keys or
omit the `features` key entirely.

Feature keys: `tasks`, `notes`, `goals`, `ideas`, `milestones`,
`retrospectives`, `canvas`, `mindmap`, `c4`, `swot`, `risk`, `leancanvas`,
`businessmodel`, `projectvalue`, `brief`, `strategiclevels`, `capacity`,
`billing`, `crm`, `timetracking`, `portfolio`, `orgchart`, `people`, `moscow`,
`eisenhower`, `ideas-sorter`.

## Mobile Support

Most views work on mobile. Three views require a wide viewport and show a
notice on screens narrower than 768px instead of a broken layout:

| View | Mobile | Notes |
| --------- | ------ | ----- |
| Tasks (board) | Supported | Columns scroll horizontally |
| Tasks (list) | Supported | Touch drag to change section |
| Notes | Supported | |
| Goals | Supported | |
| Ideas | Supported | |
| Idea sorter | Supported | Table scrolls horizontally |
| Milestones | Supported | |
| Retrospectives | Supported | |
| MoSCoW | Supported | Stacks to 1 column below 36rem |
| Eisenhower | Supported | |
| People | Supported | Single column below 768px |
| Org chart | Supported | |
| Portfolio | Supported | |
| Billing | Supported | Card layout stacks |
| CRM | Supported | Card layout stacks |
| Capacity | Supported | |
| Strategic levels | Supported | |
| C4 Architecture | Supported | |
| Canvas | Not supported | Free-drag interaction requires pointer precision |
| Mindmap | Not supported | Keyboard-centric editing (Tab, Shift+Tab, Alt+arrows) |
| Timeline | Not supported | Gantt chart requires wide viewport by design |
