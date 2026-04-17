---
id: note_css_architecture_decisions
created_at: "2026-02-01T11:00:00Z"
updated_at: "2026-03-14T09:00:00Z"
revision: 3
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# CSS Architecture Decisions

## Methodology
- BEM for domain-specific: `.goal-card__progress`
- Shared non-BEM for cross-domain: `.badge`, `.priority--N`

## File layout
- `variables.css` — all 345 CSS vars (light/dark/yellow/minimal themes)
- `base.css` — minimal reset
- `shell.css` — app shell grid, sidebar, topbar
- `components.css` — shared UI components
- `views/<domain>.css` — per-view styles, all CSS vars

## Rules
- Zero hardcoded px/rem/color in view CSS
- No inline styles — use `.is-hidden` class
- All vars must come from `variables.css`
