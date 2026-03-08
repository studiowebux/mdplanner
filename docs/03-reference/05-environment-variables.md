---
title: Environment Variables
---

# Environment Variables

All environment variables use the `MDPLANNER_` prefix. CLI flags take precedence
when both are set.

| Variable                        | CLI equivalent              | Default     | Description                                                |
| ------------------------------- | --------------------------- | ----------- | ---------------------------------------------------------- |
| `MDPLANNER_PORT`                | `--port`                    | `8003`      | HTTP server port                                           |
| `MDPLANNER_CACHE`               | `--cache`                   | disabled    | Set to `1` to enable SQLite cache                          |
| `MDPLANNER_READ_ONLY`           | `--read-only`               | disabled    | Set to `1` to block all write operations                   |
| `MDPLANNER_API_TOKEN`           | `--api-token`               | —           | Session token for REST API and UI authentication           |
| `MDPLANNER_MCP_TOKEN`           | `--mcp-token`               | —           | Bearer token for `/mcp` endpoint                           |
| `MDPLANNER_WEBDAV`              | `--webdav`                  | disabled    | Set to `1` to enable WebDAV endpoint                       |
| `MDPLANNER_WEBDAV_USER`         | `--webdav-user`             | —           | WebDAV basic auth username                                 |
| `MDPLANNER_WEBDAV_PASS`         | `--webdav-pass`             | —           | WebDAV basic auth password                                 |
| `MDPLANNER_BACKUP_DIR`          | `--backup-dir`              | —           | Directory where scheduled backups are written              |
| `MDPLANNER_BACKUP_INTERVAL`     | `--backup-interval`         | —           | Backup frequency in hours (requires `MDPLANNER_BACKUP_DIR`) |
| `MDPLANNER_BACKUP_PUBLIC_KEY`   | `--backup-public-key`       | —           | RSA-OAEP-4096 public key hex for encrypted backups         |
| `MDPLANNER_SECRET_KEY`          | _(env only)_                | —           | 32-byte hex key for AES-256-GCM integration secret encryption |
| `MDPLANNER_BRAINS_CONFIG`       | `--brains-config`           | —           | Path to `brains.json` for Brain Manager UI                 |
| `MDPLANNER_CORS_ORIGIN`         | `--cors-origin`             | allow all   | Restrict CORS to a specific origin                         |
| `MDPLANNER_MAX_BODY_SIZE`       | `--max-body-size`           | `10`        | Max request body size in MB                                |
| `MDPLANNER_RATE_LIMIT`          | `--rate-limit`              | `200`       | Max requests per minute per IP                             |
| `MDPLANNER_CLAUDE_DIR`          | `--claude-dir`              | `~/.claude` | Claude config directory path                               |

## Notes

`MDPLANNER_SECRET_KEY` has no CLI flag equivalent. It encrypts integration
tokens (Cloudflare API token, GitHub PAT) stored in `project.md` using
AES-256-GCM. Generate with:

```bash
mdplanner keygen-secret
```

Boolean flags (`CACHE`, `READ_ONLY`, `WEBDAV`) are enabled by setting to any
non-empty value. The convention is `1`.
