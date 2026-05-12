---
id: task_api_rate_limit
completed: false
revision: 1
assignee: bob
milestone: v2.0.0
planned_start: 2026-04-14
due_date: 2026-05-02
project: MD Planner
priority: 3
effort: 32
tags: [api, performance, backend]
updated_at: "2026-04-14T08:00:00.000Z"
---

# API Rate Limiting

Add per-user rate limiting on all public API routes.
- Sliding window algorithm, configurable per route
- 429 response with Retry-After header
- Redis-backed counters for multi-instance support
- Rate limit headers on every response
