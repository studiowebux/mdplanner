---
id: task_webhook_integration
completed: false
updated_at: "2026-03-19T15:30:00.000Z"
revision: 2
due_date: 2026-03-22
assignee: agent_claude
priority: 2
effort: 5
milestone: Public Beta
project: API Gateway
order: 1
planned_start: 2026-03-14
planned_end: 2026-03-19
tags: [integrations, webhooks, api]
time_entries:
  - id: te_wh_1
    date: 2026-03-14
    hours: 4
    person: agent_claude
    description: Registration endpoint + persistence
  - id: te_wh_2
    date: 2026-03-16
    hours: 3
    person: agent_claude
    description: HMAC signature + delivery worker
  - id: te_wh_3
    date: 2026-03-18
    hours: 2
    person: agent_claude
    description: Retry policy + delivery log
created_at: "2026-05-23T21:39:25.174Z"
---

# Webhook Integration

Allow external services to subscribe to task events via webhooks.
- Webhook registration endpoint
- Event types: task.created, task.updated, task.deleted, task.moved
- HMAC signature verification
- Retry with exponential backoff
- Delivery log with status tracking
