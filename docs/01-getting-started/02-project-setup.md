---
title: Project Setup
---

# Project Setup

## Start a project

v2 has no CLI. Create a project directory manually and add a `project.md` file,
or use the bundled `./example` directory as a starting point.

```bash
# Clone and run against the bundled example directory
git clone https://github.com/studiowebux/mdplanner.git
cd mdplanner
deno task dev:v2

# To use a custom project directory, set PROJECT_DIR and run deno directly
PROJECT_DIR=/path/to/my-project \
  deno run --allow-net --allow-read --allow-write --allow-env --watch v2/bin.ts
```

The server reads and writes markdown files in the given directory. No
initialization command is required — place a `project.md` file in the directory
and all subdirectories will be created on first write.

## Directory layout

Each project is a directory. Each entity is one `.md` file with YAML
frontmatter.

```text
my-project/
  project.md
  board/
    todo/
      task_1771807748170_5wtz.md
    in_progress/
      task_1771807748171_a3bc.md
    done/
      task_1771807748172_x9qr.md
  notes/
    note_1771807748173_m2kp.md
  goals/
    goal_1771807748174_j7ys.md
  ideas/
    idea_1771807748175_p4lw.md
  milestones/
    milestone_1771807748176_c8nz.md
  people/
    person_1771807748177_d6rx.md
  moscow/
    moscow_1771807748178_b1qt.md
  eisenhower/
    eisenhower_1771807748179_v5hm.md
  portfolio/
    portfolio_1771807748180_g3fk.md
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
  - task
  - note
  - goal
  - milestone
  - idea
  - brainstorm
  - brainstorm_template
  - reflection
  - reflection_template
  - retrospective
  - sticky_note
  - mindmap
  - c4_component
  - swot
  - risk
  - safe
  - lean_canvas
  - business_model
  - project_value
  - brief
  - capacity_plan
  - strategic_builder
  - customer
  - rate
  - quote
  - invoice
  - company
  - contact
  - deal
  - portfolio
  - person
  - meeting
  - moscow
  - eisenhower
  - safe_agreement
  - investor
  - onboarding
  - onboarding_template
  - finance
  - payment
  - time_entry
  - vacation
  - journal
  - habit
  - dns_domain
  - fishbone
  - marketing_plan
  - analytics
  - github
  - upload
  - dashboard
  - me
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

Feature keys: `task`, `note`, `goal`, `milestone`, `idea`, `brainstorm`,
`brainstorm_template`, `reflection`, `reflection_template`, `retrospective`,
`sticky_note`, `mindmap`, `c4_component`, `swot`, `risk`, `safe`, `lean_canvas`,
`business_model`, `project_value`, `brief`, `capacity_plan`, `strategic_builder`,
`customer`, `rate`, `quote`, `invoice`, `company`, `contact`, `deal`, `portfolio`,
`person`, `meeting`, `moscow`, `eisenhower`, `safe_agreement`, `investor`,
`onboarding`, `onboarding_template`, `finance`, `payment`, `time_entry`,
`vacation`, `journal`, `habit`, `dns_domain`, `fishbone`, `marketing_plan`,
`analytics`, `github`, `upload`, `dashboard`, `me`.
