---
id: note_hono_jsx_gotchas
created_at: "2026-01-28T14:00:00Z"
updated_at: "2026-03-10T09:00:00Z"
revision: 5
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# Hono JSX Gotchas

## Attribute names
Lowercase HTML names, not React camelCase.
`class` not `className`, `for` not `htmlFor`.

## Event attributes
`hx-on--click` (double-dash), not `hx-on:click`.
JSX attribute parsing drops colons — double-dash is safe.

## Scripts in `<head>`
Must use `DOMContentLoaded` or `readyState` check.
Don't call init functions immediately at parse time.

## Fragments
`<></>` is valid but lint warns on single-child useless fragments.
Return `null` instead of `<></>` for empty output.

## Spreading spread objects
`{...{ "hx-swap-oob": "true" }}` works for non-identifier attribute names.
