---
id: task_email
completed: true
completedAt: 2026-03-15
updatedAt: "2026-03-15T18:42:54.223Z"
revision: 2
due_date: 2026-03-01
assignee: charlie
priority: 1
effort: 8
milestone: Public Beta
order: 0
---

# Email Notifications

Implement email notification system for task updates and mentions.
- Task assigned to you
- Task status changed
- Mentioned in comment
- Daily digest (optional)
- Use AWS SES for sending
- React Email for templates
- Queue with Redis/BullMQ