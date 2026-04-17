---
id: note_mobile_responsive_audit
created_at: "2026-03-05T10:00:00Z"
updated_at: "2026-03-05T12:00:00Z"
revision: 1
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# Mobile Responsive Audit

## Breakpoints in use
- `@media (max-width: 768px)` — sidebar collapse, grid to 1-col

## Issues found
- Data table horizontal scroll missing on narrow screens
- Sidenav overlay z-index conflict on iOS Safari
- Font size too small at 375px width

## Fixes needed
- Add `overflow-x: auto` wrapper on `.data-table-wrapper`
- Increase touch targets to 44px minimum
- Test on real device (not just DevTools)

## Status: not started
