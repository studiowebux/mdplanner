---
title: Authentication
---

# Authentication

MD Planner v2 uses two independent mechanisms: identity guard for browser UI
access, and an MCP token for programmatic/agent access.

## Identity guard (UI)

All browser requests to the web UI require an identity to be selected. Anonymous
users are redirected to `/identity`, where they choose a person from the project
registry. The selection is stored in a session cookie.

This is trust-based — no password is required. It is designed for small,
trusted teams on a private network. Do not expose MD Planner to the public
internet without an additional access layer (VPN, reverse proxy with auth, etc.).

## MCP token

Protect the `/mcp` endpoint with a bearer token:

```bash
# Set via environment variable
MCP_TOKEN=mysecrettoken deno task dev:v2
```

MCP clients send the token as a `Authorization: Bearer <token>` header. See
[MCP Integration](05-mcp-integration.md) for client configuration.

## Integration secret encryption

Integration tokens (Cloudflare API key, GitHub PAT) are stored in `project.md`.
Set `MDPLANNER_SECRET_KEY` to encrypt them at rest with AES-256-GCM:

```bash
# Generate a key
openssl rand -hex 32

# Set via environment variable
MDPLANNER_SECRET_KEY=<hex-key> deno task dev:v2 ./my-project
```

Without this key, tokens are stored in plaintext in `project.md`. Acceptable for
local single-user installs; always set the key for shared or networked
deployments.

## What is not in v2 (yet)

The following v1 features are not implemented in v2:

- `--api-token` / `MDPLANNER_API_TOKEN` — REST API session token
- `--rate-limit` — per-IP rate limiting
- `--cors-origin` — CORS restriction
- `--read-only` — read-only mode
- `--max-body-size` — request body size limit
