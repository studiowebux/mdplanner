# Docker Deployment

## Quick start

```bash
mkdir mdplanner && cd mdplanner
curl -fsSLO https://raw.githubusercontent.com/studiowebux/mdplanner/main/deploy/quick-start/docker-compose.yml
docker compose up -d
```

Open `http://localhost:8003`. Project files persist in `./data/`.

Image:
[`ghcr.io/studiowebux/mdplanner`](https://github.com/studiowebux/mdplanner/pkgs/container/mdplanner)
— multi-platform (amd64, arm64), tagged per release and `latest`.

## Configuration

Edit `docker-compose.yml` or create a `.env` file next to it.

| Variable                      | Default  | Description                                  |
| ----------------------------- | -------- | -------------------------------------------- |
| Port mapping                  | 8003     | Change `ports` in `docker-compose.yml`       |
| Data path                     | `./data` | Host directory for project files             |
| `MDPLANNER_CACHE`             | disabled | Set to `1` to enable SQLite cache            |
| `MDPLANNER_API_TOKEN`         | —        | Session token for REST API authentication    |
| `MDPLANNER_MCP_TOKEN`         | —        | Bearer token for `/mcp` endpoint             |
| `MDPLANNER_WEBDAV`            | disabled | Set to `1` to enable WebDAV                  |
| `MDPLANNER_WEBDAV_USER`       | —        | WebDAV basic auth username                   |
| `MDPLANNER_WEBDAV_PASS`       | —        | WebDAV basic auth password                   |
| `MDPLANNER_READ_ONLY`         | disabled | Set to `1` for public demo mode              |
| `MDPLANNER_SECRET_KEY`        | —        | 32-byte hex key for integration encryption   |
| `MDPLANNER_CORS_ORIGIN`       | —        | Restrict CORS to a specific origin           |
| `MDPLANNER_RATE_LIMIT`        | `200`    | Max requests per minute per IP               |
| `MDPLANNER_MAX_BODY_SIZE`     | `10`     | Max request body in MB                       |

See [Environment Variables](../03-reference/05-environment-variables.md) for the
full list.

## Enabling SQLite cache

Override the command in `docker-compose.yml`:

```yaml
services:
  mdplanner:
    image: ghcr.io/studiowebux/mdplanner:latest
    ports:
      - "8003:8003"
    volumes:
      - ./data:/data
    environment:
      - MDPLANNER_CACHE=1
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO", "/dev/null", "http://127.0.0.1:8003/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
```

## Initialize a project directory

```bash
mkdir -p data
docker run --rm -v "$(pwd)/data:/data" ghcr.io/studiowebux/mdplanner:latest init /data
```

## Management

```bash
docker compose up -d      # Start in background
docker compose down       # Stop
docker compose logs -f    # Follow logs
docker compose pull       # Update image
```

## Healthcheck

The compose file includes a healthcheck hitting `/api/health`. This endpoint
returns status, version, uptime, and cache info without requiring authentication.
