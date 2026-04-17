---
id: note_auth_design
created_at: "2025-10-01T09:00:00Z"
updated_at: "2026-01-05T11:00:00Z"
revision: 3
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# Auth Design Notes

## Current state
No auth — single-user, self-hosted only.

## Planned approach (v3)
- Session-based auth (not JWT) — simpler, server-side logout
- Hono middleware: check session cookie on every request
- Argon2id for password hashing

## Multi-user considerations
- All file paths scoped to user ID
- Separate SQLite cache per user
- Shared static assets

## Decision
Defer auth until after public beta. Ship fast, add auth when first external user requests it.
