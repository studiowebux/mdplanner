---
id: task_auth_refactor
completed: false
revision: 1
assignee: alice
milestone: v2.0.0
planned_start: 2026-04-07
due_date: 2026-04-25
project: MD Planner
priority: 2
effort: 40
tags: [auth, security, backend]
updated_at: "2026-04-07T08:00:00.000Z"
---

# Auth Refactor

Replace session tokens with short-lived JWTs and refresh token rotation.
- Audit all auth middleware
- Implement refresh token endpoint
- Migrate existing sessions on startup
- Update integration tests
