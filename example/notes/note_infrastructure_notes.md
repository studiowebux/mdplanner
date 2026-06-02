---
id: note_infrastructure_notes
created_at: "2025-12-15T09:00:00Z"
updated_at: "2026-03-01T11:00:00Z"
revision: 3
mode: simple
project: Infrastructure
tags: [mdplanner/notes]
---

# Infrastructure Notes

## Current setup
- Self-hosted on home server (192.168.20.x)
- Docker Compose — MDPlanner + MCP server containers
- Nginx reverse proxy with Let's Encrypt

## Ports
- 8003 — MDPlanner HTTP API
- 8004 — MCP server

## Backup strategy
- Nightly rsync of `example/` directory to NAS
- Git remote on GitHub as secondary backup

## Monitoring
- None currently (TODO: add uptime check)
- Logs via `docker compose logs -f`
