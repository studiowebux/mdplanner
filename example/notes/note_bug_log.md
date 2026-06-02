---
id: note_bug_log
created_at: "2026-01-01T09:00:00Z"
updated_at: "2026-04-01T15:00:00Z"
revision: 18
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# Bug Log

## Open
- Search snippets render raw markdown — need HTML escape (preserve `<mark>`)
- Column toggle state lost after SSE refresh

## Fixed
- CSP: timeline nonce style tags blocked on htmx swap — use data attrs
- cache upsert: `json()` helper needed to prevent `[object Object]` serialization
- `v1 findById` falls back to full scan for slug filenames
- `hideCompleted` must be in stateKeys or toggle never reads from query params
- Note title: `hx-swap="none"` during edit to prevent page wipe
- Search modal: `<input type="search">` captures ESC natively, needs explicit handler
