---
id: task_auth_refactor
completed: false
revision: 2
updated_at: "2026-05-14T20:43:02.943Z"
due_date: 2026-04-25
assignee: alice
milestone: v2.0.0
planned_start: 2026-04-07
project: MD Planner
priority: 2
effort: 40
tags: [auth, security, backend]
---

# Auth Refactor

Replace session tokens with short-lived JWTs and refresh token rotation.
- Audit all auth middleware
- Implement refresh token endpoint
- Migrate existing sessions on startup
- Update integration tests