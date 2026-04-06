---
id: note_database_schema_notes
created_at: "2025-11-20T10:00:00Z"
updated_at: "2026-02-10T08:45:00Z"
revision: 4
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# Database Schema Notes

## File-based storage
All entities stored as markdown with YAML frontmatter.
Directory layout: `example/<domain>/<slug>.md`

## ID format
`<prefix>_<timestamp>_<random4>`
e.g. `note_1773100964617_v2ges4`

## Frontmatter fields (all entities)
- `id` — unique identifier
- `created_at` / `updated_at` — ISO 8601
- `revision` — integer, incremented on every update

## FTS5
SQLite FTS5 cache rebuilt after every `fullSync()`.
External content tables — go stale after bulk INSERT OR REPLACE.
