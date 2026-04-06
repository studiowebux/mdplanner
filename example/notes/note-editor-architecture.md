---
id: note_note_editor_architecture
created_at: "2026-02-20T14:00:00Z"
updated_at: "2026-03-20T11:00:00Z"
revision: 4
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# Note Editor Architecture

## Block types
- `paragraph` — plain markdown text
- `section` — named section with sub-blocks (tabs, timeline, split-view)

## Parser
All notes parse as `enhanced` mode.
Simple notes become a single paragraph block.
Raw markdown textareas for section sub-blocks.

## Inline edit
Title and project use htmx inline edit: `hx-swap="outerHTML"`.
`disableFieldSwaps()` sets `hx-swap="none"` during editing to prevent page wipe.

## Shared components
`note-blocks.tsx` exports `ParagraphBlock`, `SectionBlock`, `NoteBlocks`.
Used by both detail view and preview sidenav.

## Tab switching
Event delegation on `document click` (no init needed).
CSS `.tab-panel.is-hidden` overrides `display:flex`.
