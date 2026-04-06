---
id: note_deno_tips
created_at: "2025-07-15T11:00:00Z"
updated_at: "2026-01-20T14:00:00Z"
revision: 5
mode: simple
tags: [mdplanner/notes]
---

# Deno Tips & Gotchas

## Imports
Use import maps in `deno.json` — no `node_modules`.
Top-level imports only — no `await import()` (lazy imports are banned).

## Formatting
`deno fmt` excludes `*.md` files — configured in `deno.json fmt.exclude`.

## Permissions
Always declare needed permissions in `deno.json` tasks.
`--allow-read --allow-write --allow-env` for most server tasks.

## JSX
`.tsx` extension required for JSX files.
Hono JSX uses lowercase HTML attributes, not React camelCase.

## Testing
`deno test` supports parallel test files by default.
Use `--allow-read --allow-write --allow-env` for integration tests.
