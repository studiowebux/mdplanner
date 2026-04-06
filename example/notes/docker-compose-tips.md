---
id: note_docker_compose_tips
created_at: "2025-08-20T10:00:00Z"
updated_at: "2026-01-25T09:00:00Z"
revision: 4
mode: simple
project: Infrastructure
tags: [mdplanner/notes]
---

# Docker Compose Tips

## Watch mode
`docker compose watch` — rebuilds on file change during development.

## Health checks
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8003/health"]
  interval: 30s
  retries: 3
```

## Secrets
Use `secrets:` block, not environment variables for sensitive values.

## Useful commands
```bash
docker compose logs -f --tail 100
docker compose exec app sh
docker compose pull && docker compose up -d
docker system prune -f  # clean up dangling images
```
