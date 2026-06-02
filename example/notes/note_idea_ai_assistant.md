---
id: note_idea_ai_assistant
created_at: "2025-10-15T08:00:00Z"
updated_at: "2026-01-10T12:00:00Z"
revision: 2
mode: simple
tags: [mdplanner/notes]
---

# Idea: AI Assistant Integration

## Concept
Embed Claude directly in the planner as a context-aware assistant.
It can see your tasks, notes, goals, and milestones.

## Use cases
- "What should I work on today?"
- "Summarize this week's progress"
- "Draft a retrospective from my completed tasks"

## Implementation sketch
- MCP server already exposes all data
- Claude Code brain protocol is the reference implementation
- Could expose a `/assistant` endpoint backed by Anthropic API

## Risks
- API costs at scale
- Context window limits with large task lists
