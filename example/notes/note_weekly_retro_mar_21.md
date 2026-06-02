---
id: note_weekly_retro_mar_21
created_at: "2026-03-21T17:00:00Z"
updated_at: "2026-03-21T18:00:00Z"
revision: 1
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# Weekly Retro — March 21

## What went well
- Domain factory cut boilerplate by ~70%
- createActionBtns extracted from 18 files
- SSE refresh works reliably without page reload

## What didn't go well
- CSP nonce issue with htmx timeline swap took 2 hours
- Timeline nonce'd style tags fail on fragment swaps — use data attrs + JS

## Improvements for next week
- Write architecture note for timeline pattern
- Add pagination before notes list grows unmanageable
