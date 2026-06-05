---
id: note_analytics_dashboard_metrics
created_at: "2026-04-02T09:30:00Z"
updated_at: "2026-04-18T11:15:00Z"
revision: 2
mode: simple
project: Analytics Dashboard
tags: [mdplanner/notes]
---

# Dashboard Metrics — Definitions

## Core metrics
- **Active projects** — portfolio items not archived and not in `done`.
- **Cycle time** — median days from `in_progress` to `done` per task.
- **Throughput** — tasks moved to `done` per week.

## Data sources
All metrics are computed from the markdown store at request time — no
pre-aggregation. The analytics service reads tasks, milestones and time
entries directly.

## Open questions
- [ ] Should cycle time exclude weekends?
- [ ] Per-person throughput, or team-only?
