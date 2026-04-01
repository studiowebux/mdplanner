---
title: Directory Schema
---

# Directory Schema

Every entity is a markdown file with YAML frontmatter. The directory name
determines the entity type. The file name is arbitrary but conventionally uses
the entity type as a prefix (e.g., `task_auth.md`).

## Tasks

Directory: `board/{section}/`

The subdirectory name is the task's section (status column).

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
project: "My Project"
---

# Implement Authentication

Task description in markdown.
```

## Notes

Directory: `notes/`

```yaml
---
id: note_architecture
created: "2026-01-05T10:00:00Z"
updated: "2026-02-16T02:39:51.384Z"
revision: 7
mode: simple
---

# Architecture Overview

Note content. Enhanced mode supports custom tab sections with
`<!-- Custom Section: Name -->` delimiters.
```

## Goals

Directory: `goals/`

```yaml
---
id: goal_revenue
type: enterprise
kpi: "25% revenue increase"
start: 2026-01-01
end: 2026-12-31
status: on-track
---

# Revenue Target

Goal description.
```

Status values: `planning`, `on-track`, `at-risk`, `late`, `success`, `failed`.

Type values: `enterprise`, `project`.

## Milestones

Directory: `milestones/`

```yaml
---
id: milestone_beta
title: Beta Launch
target_date: 2026-04-01
status: open
---

# Beta Launch

Deliverables and acceptance criteria.
```

Status values: `open`, `completed`.

## Ideas

Directory: `ideas/`

```yaml
---
id: idea_templates
title: Project Templates
status: approved
category: feature
created: 2026-01-15
links: [idea_ai, idea_onboarding]
---

# Project Templates

Description and rationale.
```

Status values: `new`, `considering`, `planned`, `rejected`, `approved`.

## People

Directory: `people/`

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

## Retrospectives

Directory: `retrospectives/`

```yaml
---
id: retro_q1
date: 2026-03-31
status: open
continue:
  - Weekly syncs
stop:
  - Scope creep
start:
  - Daily standups
---

# Q1 Retrospective
```

## MoSCoW

Directory: `moscow/`

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

## Eisenhower

Directory: `eisenhower/`

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

## Mindmaps

Directory: `mindmaps/`

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

Indented markdown lists define the tree structure.

## Portfolio

Directory: `portfolio/`

```yaml
---
id: portfolio_alpha
name: Project Alpha
status: active
startDate: 2026-01-01
endDate: 2026-06-30
budget: 150000
spent: 45000
team: [person_alice, person_bob]
---

# Project Alpha

Project description.
```

Status values: `active`, `completed`, `on-hold`, `cancelled`.

## Capacity Plans

Directory: `capacity/`

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

## Other Entities

The following entities follow the same pattern of YAML frontmatter + markdown
body in their respective directories:

| Entity          | Directory          |
| --------------- | ------------------ |
| Canvas          | `canvas/`          |
| C4 Architecture | `c4/`              |
| SWOT            | `swot/`            |
| Risk Analysis   | `risk/`            |
| Lean Canvas     | `leancanvas/`      |
| Business Model  | `businessmodel/`   |
| Project Value   | `projectvalue/`    |
| Brief           | `brief/`           |
| Strategic Levels| `strategiclevels/` |
| Billing         | `billing/`         |

## Customers

Directory: `billing/customers/`

```yaml
---
id: customer_agency
name: DevAgency Inc
email: accounts@devagency.com
phone: "+1-555-0300"
company: DevAgency Inc
billingAddress:
  street: 789 Agency Way
  city: New York
  state: NY
  postalCode: "10001"
  country: USA
created_at: 2026-02-10
---

# DevAgency Inc

## Notes

Quarterly invoicing, NET 30 terms.
```

Fields: `id`, `name`, `email`, `phone`, `company`, `billingAddress` (nested
object with `street`, `city`, `state`, `postalCode`, `country`),
`created_at`, `updated_at`.

## Billing Rates

Directory: `billing/rates/`

```yaml
---
id: rate_standard
name: Standard Rate
unit: h
rate: 150
currency: CAD
isDefault: true
created_at: 2026-02-10
---

# Standard Rate

## Notes

Default consulting/support rate.
```

Fields: `id`, `name`, `unit` (`h`, `d`, `unit`, `mo`, `fixed`), `rate`
(number), `currency` (ISO 4217, optional), `assignee` (person ID, optional),
`isDefault` (boolean), `created_at`, `updated_at`.

| CRM             | `crm/`             |
| Time Tracking   | `timetracking/`    |
| Meetings        | `meetings/`        |
| Journal         | `journal/`         |
| Onboarding      | `onboarding/`      |
| Finances        | `finances/`        |
| Habits          | `habits/`          |
| Fishbone        | `fishbone/`        |
| Marketing Plans | `marketing-plans/` |
| DNS             | `dns/`             |
| Fundraising     | `fundraising/`     |
