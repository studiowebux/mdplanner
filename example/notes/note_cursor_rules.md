---
id: note_cursor_rules
created_at: "2025-11-15T10:00:00Z"
updated_at: "2026-02-01T09:00:00Z"
revision: 4
mode: simple
tags: [mdplanner/notes]
---

# Cursor / Editor Rules

## File naming
- Components: PascalCase (`NoteCard.tsx`)
- Utilities: kebab-case (`form-parser.ts`)
- Routes: `routes.ts` or `routes.tsx`
- Constants: `constants.ts` or `constants.tsx`

## Import order
1. External packages
2. Internal absolute (`../utils/...`)
3. Relative (`./constants.ts`)

## Max line length
100 characters. `deno fmt` enforces this automatically.

## Comments
Only where logic isn't self-evident.
No JSDoc on private functions — they're readable from code.
No TODO comments — create a task instead.
