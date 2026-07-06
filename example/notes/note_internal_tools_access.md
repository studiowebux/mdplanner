---
id: note_internal_tools_access
created_at: "2026-04-08T15:00:00Z"
updated_at: "2026-04-15T17:25:00Z"
revision: 2
mode: simple
project: Internal Tools
tags: [mdplanner/notes]
---

# Internal Tools — Access Policy

## Principles
- Least privilege by default; elevate per task, not per person.
- Every admin action is logged with the actor identity.

## Roles
- **Viewer** — read-only dashboards.
- **Operator** — run jobs, no config changes.
- **Admin** — config + user management.

## Review
Access is reviewed quarterly. Stale operator grants are the most common
finding — revoke on role change, not just on departure.
