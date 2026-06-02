---
id: note_coding_standards
created_at: "2025-11-01T09:00:00Z"
updated_at: "2026-02-15T14:00:00Z"
revision: 5
mode: simple
tags: [mdplanner/notes]
---

# Coding Standards

## General
- No lazy imports (`await import()`)
- No inline styles — use CSS classes
- No hardcoded px/rem/color — use CSS vars
- No TODOs in committed code

## Naming
- Domain CSS files: plural (`notes.css`, `tasks.css`)
- Form container ID: `#<domain>-form-container`
- State keys: stateKeys array must include every toolbar query param

## Error handling
- Copy error block from nearest sibling in same package
- Validate at system boundaries only (user input, external APIs)

## Testing
- Run `deno task test` before every commit
- Pre-commit hook enforces it automatically
