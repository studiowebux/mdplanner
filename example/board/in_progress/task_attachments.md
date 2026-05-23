---
id: task_attachments
completed: false
revision: 4
updated_at: "2026-05-14T21:22:55.616Z"
due_date: 2026-03-25
assignee: agent_claude
milestone: Public Beta
planned_start: 2026-03-12
planned_end: 2026-03-22
project: Analytics Dashboard
claimed_by: agent_claude
claimed_at: "2026-03-12T08:00:00.000Z"
priority: 2
effort: 6
order: 40
tags: [storage, uploads]
blocked_by: [task_crud]
time_entries:
  - id: te_att_1
    date: 2026-03-13
    hours: 4
    person: agent_claude
    description: S3 backend + signed URL flow
  - id: te_att_2
    date: 2026-03-16
    hours: 5
    person: agent_claude
    description: Drag-and-drop upload + progress UI
  - id: te_att_3
    date: 2026-03-19
    hours: 2
    person: agent_claude
    description: Image preview thumbnails
---

# File Attachments

Allow users to attach files to tasks and comments.
- Max 25MB per file
- Image preview thumbnails
- Drag and drop upload
- Progress indicator
- S3-compatible storage backend
- Signed URLs for secure access