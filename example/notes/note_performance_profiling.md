---
id: note_performance_profiling
created_at: "2026-02-14T15:00:00Z"
updated_at: "2026-03-10T11:00:00Z"
revision: 3
mode: simple
project: Infrastructure
tags: [mdplanner/notes]
---

# Performance Profiling Notes

## Bottlenecks found
1. `list()` on notes reads all 600+ files on every request
2. No caching layer in v2 yet (v1 had SQLite cache)
3. `extractFilterOptions` runs after every list — O(n) extra pass

## Mitigations in place
- SQLite FTS5 cache in v1, pending port to v2
- Pagination cuts initial render from 600 → 50 items
- SSE-driven refresh avoids polling

## Next steps
- Port CacheDatabase + sync to v2
- Add ETag / 304 for static assets
- Profile `applyFilters` with 1000 items
