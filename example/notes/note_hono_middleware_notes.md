---
id: note_hono_middleware_notes
created_at: "2026-01-18T14:00:00Z"
updated_at: "2026-02-28T10:00:00Z"
revision: 3
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# Hono Middleware Notes

## Order matters
Middleware runs in registration order. Always register:
1. Logger
2. CSP / nonce
3. Cookie parser
4. Route handlers

## AppVariables
Type-safe context variables via `c.set()` / `c.get()`.
Defined in `v2/types/app.ts` as `AppVariables`.

## nonce middleware
Generates UUID per request, stores in `c.set("nonce", ...)`.
Passed to `MainLayout` for `<script nonce={nonce}>` tags.

## viewProps helper
Extracts `path`, `nonce`, `theme`, `uiState` from context.
Pass as spread to all page components: `{...viewProps(c, "/notes")}`.
