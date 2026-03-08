---
title: Project Setup
---

# Project Setup

## Initialize a project

```bash
mdplanner init ./my-project
mdplanner ./my-project
```

`init` creates `project.md` and all standard subdirectories.

## Directory layout

Each project is a directory. Each entity is one `.md` file with YAML
frontmatter.

```text
my-project/
  project.md
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

## project.md

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

## Feature visibility

Omit a feature from the `features` array to hide it from the navigation. To show
all views, include all feature keys or omit the `features` key entirely.

Feature visibility can also be toggled at runtime from Settings > Feature
Visibility in the web UI.

Feature keys: `tasks`, `notes`, `goals`, `ideas`, `milestones`,
`retrospectives`, `canvas`, `mindmap`, `c4`, `swot`, `risk`, `leancanvas`,
`businessmodel`, `projectvalue`, `brief`, `strategiclevels`, `capacity`,
`billing`, `crm`, `timetracking`, `portfolio`, `orgchart`, `people`, `moscow`,
`eisenhower`, `ideas-sorter`, `meetings`, `journal`, `habits`, `analytics`,
`dns`, `fishbone`, `marketing-plans`, `fundraising`, `onboarding`,
`ai-chat`, `uploads`, `backup`, `github`, `kpis`.
