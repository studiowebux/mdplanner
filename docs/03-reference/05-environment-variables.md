---
title: Environment Variables
---

# Environment Variables

All v2 runtime configuration is done via environment variables. There are no CLI flags.

| Variable               | Default | Required | Description                                                                       |
| ---------------------- | ------- | -------- | --------------------------------------------------------------------------------- |
| `PROJECT_DIR`          | —       | Yes      | Absolute path to the project data directory.                                      |
| `PORT`                 | `8003`  | No       | HTTP port the server listens on.                                                  |
| `CACHE`                | `true`  | No       | Set to `false` to disable the SQLite FTS cache. Full-text search requires `true`. |
| `MCP_TOKEN`            | —       | No       | Bearer token for MCP API requests (`Authorization: Bearer <token>`). Leave empty to disable auth. |
| `MDPLANNER_SECRET_KEY` | —       | No       | AES-256-GCM key for encrypting integration secrets stored in `project.md`.        |
| `WEBDAV`               | —       | No       | Set to `true` to mount `PROJECT_DIR` as a WebDAV volume at `/webdav/`. Requires `WEBDAV_USER` and `WEBDAV_PASS`. |
| `WEBDAV_USER`          | —       | If `WEBDAV` | Basic-Auth username for the WebDAV endpoint.                                  |
| `WEBDAV_PASS`          | —       | If `WEBDAV` | Basic-Auth password for the WebDAV endpoint.                                  |

## Generating a secret key

```bash
openssl rand -hex 32
```

Paste the output into your `.env` or service config as `MDPLANNER_SECRET_KEY=<output>`.

Without this key, integration tokens (Cloudflare API key, GitHub PAT) are stored
in plaintext in `project.md`. Acceptable for local single-user installs; always
set the key for shared or networked deployments.

## Migration from v1

v1 had 15 `MDPLANNER_*` env vars. v2 has 5 (4 named above plus `PORT`). The
remainder were renamed or removed.

### Renamed

| v1                     | v2            |
| ---------------------- | ------------- |
| `MDPLANNER_PORT`       | `PORT`        |
| `MDPLANNER_CACHE`      | `CACHE`       |
| `MDPLANNER_MCP_TOKEN`  | `MCP_TOKEN`   |
| `MDPLANNER_WEBDAV`     | `WEBDAV`      |
| `MDPLANNER_WEBDAV_USER`| `WEBDAV_USER` |
| `MDPLANNER_WEBDAV_PASS`| `WEBDAV_PASS` |

`MDPLANNER_SECRET_KEY` is unchanged.

### Removed (no v2 equivalent)

- `MDPLANNER_READ_ONLY`
- `MDPLANNER_BACKUP_DIR`
- `MDPLANNER_BACKUP_INTERVAL`
- `MDPLANNER_BACKUP_PUBLIC_KEY`
- `MDPLANNER_CERVEAU_DIR`
- `MDPLANNER_CORS_ORIGIN`
- `MDPLANNER_API_TOKEN`
- `MDPLANNER_MAX_BODY_SIZE`
- `MDPLANNER_RATE_LIMIT`

## WebDAV

Setting `WEBDAV=true` mounts `PROJECT_DIR` as a WebDAV volume at `/webdav/`.
Basic Auth credentials (`WEBDAV_USER` + `WEBDAV_PASS`) are required when
enabled — the server refuses to start without them. Useful for Obsidian
remote vaults, macOS Finder, and Windows Explorer.

Limitation: WebDAV writes go directly to disk and bypass the v2 repository
layer + SQLite FTS cache. Full-text search and the entity cache will lag
after a DAV write until the next sync. Use the WebDAV endpoint for
file-level access; use the HTTP API / UI for entity-level edits.
