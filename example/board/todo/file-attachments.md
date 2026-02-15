---
id: task_attachments
completed: false
tag: [feature]
priority: 2
effort: 6
assignee: bob
due_date: 2026-02-28
milestone: milestone_beta
---

# File Attachments

Allow users to attach files to tasks and comments.

## Requirements
- Max 25MB per file
- Image preview thumbnails
- Drag and drop upload
- Progress indicator

## Storage
- S3 for files
- CloudFront for delivery
- Signed URLs for security
