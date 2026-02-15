---
id: task_email
completed: false
tag: [feature]
priority: 1
effort: 8
assignee: charlie
due_date: 2026-03-01
milestone: milestone_beta
---

# Email Notifications

Implement email notification system for task updates and mentions.

## Notification Types
- Task assigned to you
- Task status changed
- Mentioned in comment
- Daily digest (optional)

## Technical
- Use AWS SES for sending
- React Email for templates
- Queue with Redis/BullMQ
