---
title: Docker Deployment
---

# Docker Deployment

## Quick start

```bash
git clone https://github.com/studiowebux/mdplanner.git
cd mdplanner
cp deploy/.env.example deploy/.env
# Edit deploy/.env — set PROJECT_DIR and MDPLANNER_SECRET_KEY at minimum
docker compose -f deploy/docker-compose.yml up -d
```

Open `http://localhost:8080` (through Caddy) or `http://localhost:8003`
(mdplanner direct). Project files persist in the `mdplanner-data` Docker volume.

Image:
[`ghcr.io/studiowebux/mdplanner`](https://github.com/studiowebux/mdplanner/pkgs/container/mdplanner)
— multi-platform (amd64, arm64), tagged per release and `latest`.

## Configuration

Copy `deploy/.env.example` to `deploy/.env` and edit before starting.

| Variable               | Default | Required | Description                                                                 |
| ---------------------- | ------- | -------- | --------------------------------------------------------------------------- |
| `PROJECT_DIR`          | —       | Yes      | Absolute path to the data directory inside the container (use `/data`).     |
| `PORT`                 | `8003`  | No       | HTTP port the server listens on inside the container.                       |
| `CACHE`                | `true`  | No       | Set to `false` to disable the SQLite FTS cache. Full-text search needs `true`. |
| `MCP_TOKEN`            | —       | No       | Bearer token for MCP API requests. Leave empty to disable auth.             |
| `MDPLANNER_SECRET_KEY` | —       | No       | AES-256-GCM key for encrypting integration secrets stored in `project.md`.  |

Generate a secret key:

```bash
openssl rand -hex 32
```

## Management

```bash
docker compose -f deploy/docker-compose.yml up -d      # Start in background
docker compose -f deploy/docker-compose.yml down       # Stop
docker compose -f deploy/docker-compose.yml logs -f    # Follow logs
docker compose -f deploy/docker-compose.yml pull       # Update image
```

## Healthcheck

The compose file includes a healthcheck hitting `/api/health`. This endpoint
returns status, version, uptime, and cache info without requiring authentication.
