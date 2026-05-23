---
id: task_search
completed: false
revision: 7
updated_at: "2026-05-14T21:22:55.614Z"
due_date: 2026-04-05
assignee: diana
milestone: Public Beta
planned_start: 2026-03-28
planned_end: 2026-04-05
project: TaskFlow Platform
priority: 1
effort: 8
order: 20
tags: [search, fts]
blocked_by: [task_crud]
time_entries:
  - id: te_search_1
    date: 2026-03-30
    hours: 6
    person: diana
    description: FTS5 schema + indexer
  - id: te_search_2
    date: 2026-04-02
    hours: 4
    person: diana
    description: Command palette UI
  - id: te_search_3
    date: 2026-04-04
    hours: 3
    person: diana
    description: Highlighting + recent searches
---

# Global Search

Implement full-text search across tasks, projects, and comments.
- SQLite FTS5 for local search
- Task titles and descriptions
- Project names
- Comments
- Command palette (Cmd+K)
- Search results with highlighting
- Recent searches