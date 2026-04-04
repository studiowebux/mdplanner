---
id: task_auth
completed: true
completed_at: "2026-02-05T10:30:00.000Z"
updated_at: "2026-02-05T10:30:00.000Z"
revision: 4
due_date: 2026-02-10
assignee: bob
priority: 1
effort: 12
milestone: Alpha Release
project: TaskFlow Platform
order: 1
planned_start: 2026-01-20
planned_end: 2026-02-05
tags: [security, auth]
blocked_by: [task_project_structure]
---

# Authentication System

Implement JWT-based authentication with refresh token rotation.
- Access token (15min) + refresh token (7d)
- httpOnly cookie storage for refresh
- JWKS endpoint for key rotation
- Login, logout, token refresh endpoints
- Auth middleware for protected routes
