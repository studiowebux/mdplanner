---
id: note_research_deno_kv
created_at: "2025-09-01T10:00:00Z"
updated_at: "2025-11-15T14:00:00Z"
revision: 2
mode: simple
tags: [mdplanner/notes]
---

# Research: Deno KV as Storage Backend

## What it is
Built-in key-value store in Deno. ACID transactions, watch() for reactive updates.

## Pros
- No SQLite dependency
- Native Deno, zero setup
- `watch()` could replace SSE polling

## Cons
- Not portable — Deno Deploy only (or self-hosted with sqlite backing)
- No full-text search without external index
- Harder to inspect/debug than flat files

## Verdict
Stick with file-based storage for v2. Revisit for v3 if scale demands it.
