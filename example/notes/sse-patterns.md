---
id: note_sse_patterns
created_at: "2026-01-30T11:00:00Z"
updated_at: "2026-02-25T09:00:00Z"
revision: 3
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# SSE Patterns

## Event bus
Single shared `EventSource` in `sse-bus.js`.
Domain scripts subscribe via `window.sseBus.on(eventName, handler)`.

## Event naming
Dot-separated: `milestone.created`, `note.updated`, `task.deleted`.
Never colons — htmx SSE ext conflicts.

## Publish
```typescript
publish("note.created"); // no payload — client fetches filtered view
```

## Client-side handler
```javascript
window.sseBus.on("note.created", () => {
  // htmx handles the re-fetch via hx-trigger="sse:note.created"
});
```

## htmx integration
`hx-trigger="sse:note.created, sse:note.updated, sse:note.deleted"` on `<main>`.
