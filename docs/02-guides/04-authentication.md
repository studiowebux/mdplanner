# Authentication

MD Planner supports two independent authentication mechanisms.

## API token (REST API and UI)

Protect the web UI and REST API with `--api-token`:

```bash
mdplanner --api-token mysecrettoken ./my-project
```

When configured:

- The web UI shows a login modal on first access
- Session cookies are set after successful login
- SSE connections use the session cookie
- `/api/health`, `/api/version`, and `/api/auth/*` are always public
- Programmatic access uses `Authorization: Bearer <token>` header

```bash
# Programmatic access
curl -H "Authorization: Bearer mysecrettoken" http://localhost:8003/api/tasks
```

## MCP token

Protect the `/mcp` endpoint separately with `--mcp-token`:

```bash
mdplanner --mcp-token mcptoken ./my-project
```

MCP clients send the token as a Bearer header. See
[MCP Integration](05-mcp-integration.md) for client configuration.

## CORS restriction

Restrict cross-origin requests to a specific domain:

```bash
mdplanner --cors-origin https://example.com ./my-project
```

When `--api-token` is set, CORS credentials are automatically enabled.

## Rate limiting

Per-IP rate limiting with a sliding window (default: 200 requests per minute):

```bash
mdplanner --rate-limit 100 ./my-project
```

Rate-limited responses return `429 Too Many Requests` with a `Retry-After`
header. SSE connections and OPTIONS preflight are excluded.

Response headers on every request:

- `X-RateLimit-Limit` — configured maximum
- `X-RateLimit-Remaining` — remaining requests in the current window

## Request body limits

Default maximum request body: 10 MB. Override with:

```bash
mdplanner --max-body-size 50 ./my-project
```

Oversized requests return `413 Payload Too Large`.

## Read-only mode

Block all write operations (POST, PUT, DELETE, PATCH):

```bash
mdplanner --read-only ./my-project
```

Returns `405 Method Not Allowed` for any mutation attempt.

## Docker

Set tokens via environment variables:

```yaml
environment:
  - MDPLANNER_API_TOKEN=mysecrettoken
  - MDPLANNER_MCP_TOKEN=mcptoken
  - MDPLANNER_CORS_ORIGIN=https://example.com
  - MDPLANNER_RATE_LIMIT=100
```
