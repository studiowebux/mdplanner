---
id: task_search
completed: false
tag: [feature, enhancement]
priority: 1
effort: 8
assignee: diana
due_date: 2026-02-22
milestone: milestone_beta
---

# Global Search

Implement full-text search across tasks, projects, and comments.

## Technical Approach
- PostgreSQL full-text search for MVP
- Consider Elasticsearch/Meilisearch for scale

## Search Scope
- Task titles and descriptions
- Project names
- Comments
- File names

## UI
- Command palette (Cmd+K)
- Search results with highlighting
- Recent searches
