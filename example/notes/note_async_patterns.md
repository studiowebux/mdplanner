---
id: note_async_patterns
created_at: "2026-01-15T11:00:00Z"
updated_at: "2026-02-20T13:00:00Z"
revision: 3
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# Async Patterns in v2

## Promise.all for parallel fetches
```typescript
const [notes, projects] = await Promise.all([
  getNoteService().list(),
  getPortfolioService().list(),
]);
```

## Error handling
```typescript
const result = await someOperation().catch((err) => {
  logger.error("operation failed", { err });
  return null;
});
```

## Avoid
- Long async chains without error handling
- `await` inside loops (use `Promise.all`)
- Unhandled promise rejections

## Service pattern
All services return `null` (not throw) for not-found.
Throw only for truly exceptional conditions (disk full, etc.).
