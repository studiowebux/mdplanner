---
id: note_api_design
created_at: "2026-01-10T09:00:00Z"
updated_at: "2026-03-15T18:39:30.063Z"
revision: 3
mode: simple
tags: [mdplanner/notes]
---

# API Design Guidelines

## REST Conventions

- Use plural nouns for resources: `/tasks`, `/projects`, `/users`
- Nest related resources: `/projects/:id/tasks`
- Use query params for filtering: `/tasks?status=open&assignee=alice`
- Return 201 for creates, 200 for updates, 204 for deletes

## Authentication

All endpoints require Bearer token except:

- POST /auth/login
- POST /auth/register
- POST /auth/refresh

## Rate Limiting

- 100 requests/minute for free tier
- 1000 requests/minute for paid plans
- 429 response with Retry-After header

## Error Format

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid task status",
  "details": { "field": "status", "allowed": ["open", "in_progress", "done"] }
}
```

## Versioning

API versioned via URL prefix: `/api/v1/`, `/api/v2/`