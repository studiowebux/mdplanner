---
id: note_deployment_environments
created_at: "2025-12-20T10:00:00Z"
updated_at: "2026-03-01T11:00:00Z"
revision: 3
mode: simple
project: Infrastructure
tags: [mdplanner/notes]
---

# Deployment Environments

## Local dev
`deno task dev:v2` — hot reload, example/ data directory.
Port 8003 — same as production to avoid config divergence.

## Staging
Docker container, same image as production.
Mounted volume: `./example/` (read/write for testing).
URL: `http://staging.local:8003`

## Production
Docker Compose on home server.
`example/` on NAS mount (persistent storage).
Nginx reverse proxy → HTTPS termination.

## Environment variables
```
MDPLANNER_DATA_DIR=/data
MDPLANNER_SECRET_KEY=...
GITHUB_TOKEN=...  # optional
```
