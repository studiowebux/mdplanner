---
id: note_htmx_patterns
created_at: "2026-01-20T13:00:00Z"
updated_at: "2026-03-18T10:00:00Z"
revision: 6
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# htmx Patterns Reference

## Event handling
Use `hx-on--click` (double-dash), NOT `hx-on:click` — JSX drops colons.

## Lifecycle hooks
Use `htmx:afterSettle` not `afterSwap` for DOM measurement.
`afterSwap` fires before browser layout.

## OOB swaps
Fragment responses include count span + view toggle with `hx-swap-oob="true"`.

## SSE events
Dot-separated names: `milestone.created` not `milestone:created`.
htmx SSE ext conflicts with colons in event names.

## Forms
- Server-rendered via `hx-get`
- Submit via `hx-post` with `hx-swap="none"`
- `HX-Trigger` header for toast + sidenav close

## e.target vs e.detail.target
htmx 2.x afterSwap: `e.target` = triggering element, `e.detail.target` = swap target.
Always use `e.detail.target` for DOM queries on swapped content.
