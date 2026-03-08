# CLI Reference

```text
mdplanner [OPTIONS] <project-directory>
mdplanner init <directory>
mdplanner keygen
mdplanner keygen-secret
```

## Commands

| Command         | Description                                          |
| --------------- | ---------------------------------------------------- |
| `<directory>`   | Start the server with the given project directory    |
| `init <dir>`    | Scaffold a new project directory with `project.md`   |
| `keygen`        | Generate RSA-4096 key pair for encrypted backups     |
| `keygen-secret` | Generate 32-byte hex key for integration secret encryption |

## Options

| Flag                          | Env var                       | Default  | Description                                          |
| ----------------------------- | ----------------------------- | -------- | ---------------------------------------------------- |
| `-p, --port <port>`           | `MDPLANNER_PORT`              | `8003`   | HTTP server port                                     |
| `-c, --cache`                 | `MDPLANNER_CACHE`             | disabled | Enable SQLite cache for FTS and fast queries         |
| `--read-only`                 | `MDPLANNER_READ_ONLY`         | disabled | Block all mutations (public demo mode)               |
| `--api-token <tok>`           | `MDPLANNER_API_TOKEN`         | —        | Protect REST API and UI with cookie-based auth       |
| `--mcp-token <tok>`           | `MDPLANNER_MCP_TOKEN`         | —        | Protect `/mcp` endpoint with bearer token            |
| `--webdav`                    | `MDPLANNER_WEBDAV`            | disabled | Enable WebDAV server at `/webdav`                    |
| `--webdav-user <u>`           | `MDPLANNER_WEBDAV_USER`       | —        | WebDAV basic auth username                           |
| `--webdav-pass <p>`           | `MDPLANNER_WEBDAV_PASS`       | —        | WebDAV basic auth password                           |
| `--backup-dir <path>`         | `MDPLANNER_BACKUP_DIR`        | —        | Directory for automated backups                      |
| `--backup-interval <hrs>`     | `MDPLANNER_BACKUP_INTERVAL`   | —        | Backup frequency in hours (requires `--backup-dir`)  |
| `--backup-public-key <hex>`   | `MDPLANNER_BACKUP_PUBLIC_KEY` | —        | RSA public key hex for encrypted backups             |
| `--brains-config <path>`      | `MDPLANNER_BRAINS_CONFIG`     | —        | Path to `brains.json` for Brain Manager UI           |
| `--cors-origin <origin>`      | `MDPLANNER_CORS_ORIGIN`       | allow all | Restrict CORS to this origin                        |
| `--max-body-size <MB>`        | `MDPLANNER_MAX_BODY_SIZE`     | `10`     | Max request body in MB                               |
| `--rate-limit <n>`            | `MDPLANNER_RATE_LIMIT`        | `200`    | Max requests per minute per IP                       |
| `--claude-dir <path>`         | `MDPLANNER_CLAUDE_DIR`        | `~/.claude` | Claude config directory                           |
| `-h, --help`                  | —                             | —        | Show help message                                    |

Environment variables are fallbacks. CLI flags take precedence.

## Examples

```bash
# Basic usage
mdplanner ./my-project

# With SQLite cache and custom port
mdplanner --port 8080 --cache ./my-project

# With authentication
mdplanner --api-token mysecrettoken --mcp-token mcptoken ./my-project

# Read-only demo mode
mdplanner --read-only ./my-project

# With WebDAV
mdplanner --webdav --webdav-user admin --webdav-pass secret ./my-project

# With automated encrypted backups every 24 hours
mdplanner \
  --backup-dir /var/backups/myproject \
  --backup-interval 24 \
  --backup-public-key <public-key-hex> \
  ./my-project

# With CORS restriction and rate limiting
mdplanner --cors-origin https://example.com --rate-limit 100 ./my-project
```
