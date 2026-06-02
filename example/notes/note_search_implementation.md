---
id: note_search_implementation
created_at: "2026-03-05T11:00:00Z"
updated_at: "2026-03-28T14:00:00Z"
revision: 3
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# Search Implementation Notes

## Architecture
FTS5 external content tables in SQLite cache.
`SearchResult` + `SearchOptions` types in `v2/types/search.types.ts`.

## Rebuild trigger
`rebuildFts()` runs after every `fullSync()`.
External content FTS5 tables go stale after bulk INSERT OR REPLACE.

## Search snippets
FTS5 snippets contain raw markdown — MUST escape HTML before rendering.
Preserve only `<mark>` tags for highlighting.

## Search modal
ESC: `<input type="search">` captures ESC natively to clear value.
Needs explicit `Escape` key handler in JS to close modal entirely.

## Domains indexed
tasks, notes, meetings, people, swot, briefs, retrospectives, companies, contacts, portfolio, moscow, eisenhower.
