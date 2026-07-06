---
id: task_api_rate_limit
completed: false
revision: 2
updated_at: "2026-05-14T21:22:55.615Z"
due_date: 2026-05-02
assignee: bob
milestone: v2.0.0
planned_start: 2026-04-14
project: MD Planner
priority: 3
effort: 32
tags: [api, performance, backend]
order: 50
time_entries:
  - id: te_rl_1
    date: 2026-04-15
    hours: 4
    person: bob
    description: Sliding window algorithm + tests
  - id: te_rl_2
    date: 2026-04-17
    hours: 2
    person: bob
    description: Redis-backed counters
  - id: te_rl_3
    date: 2026-04-21
    hours: 3
    person: bob
    description: Rate limit headers + 429 responses
created_at: "2026-05-23T21:39:24.719Z"
---

# API Rate Limiting

Add per-user rate limiting on all public API routes.
- Sliding window algorithm, configurable per route
- 429 response with Retry-After header
- Redis-backed counters for multi-instance support
- Rate limit headers on every response