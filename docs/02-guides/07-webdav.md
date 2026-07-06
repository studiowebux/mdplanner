---
title: WebDAV
---

# WebDAV

MD Planner can expose `PROJECT_DIR` as a WebDAV volume at `/webdav/`, letting
Obsidian, macOS Finder, Windows Explorer, davfs2, Neovim + netrw, or `curl`
read and write Markdown files directly over HTTP. The server implements
RFC 4918 Class 1/2/3 (locks, properties, atomic writes, range requests, ETags).

## Enabling

WebDAV is off by default. Set three environment variables to enable it:

| Variable      | Required | Description                                  |
| ------------- | -------- | -------------------------------------------- |
| `WEBDAV`      | Yes      | Set to `true` to mount the endpoint.         |
| `WEBDAV_USER` | Yes      | Basic-Auth username (no fallback).           |
| `WEBDAV_PASS` | Yes      | Basic-Auth password (no fallback).           |

If `WEBDAV=true` but either credential is empty, the server fails to start with
an explicit error. There is no anonymous mode.

```bash
WEBDAV=true \
WEBDAV_USER=obsidian \
WEBDAV_PASS=changeme \
deno task dev:v2
```

In Docker, set the same three keys in your `.env` next to
`deploy/docker-compose.yml` and start the stack:

```bash
echo 'WEBDAV=true'           >> deploy/.env
echo 'WEBDAV_USER=obsidian'  >> deploy/.env
echo 'WEBDAV_PASS=changeme'  >> deploy/.env
docker compose -f deploy/docker-compose.yml up -d
```

## Mounting from a client

### Obsidian (Remote Save plugin)

1. Install the **Remote Save** community plugin (or any WebDAV-compatible
   sync plugin).
2. Open Settings → Remote Save → WebDAV.
3. URL: `http://<host>:8003/webdav/`
4. Username / password: the values from `WEBDAV_USER` / `WEBDAV_PASS`.
5. Choose the vault root that maps to `PROJECT_DIR`.

### macOS Finder

`⌘K` (Go → Connect to Server) → `http://<host>:8003/webdav/` → enter the
Basic-Auth credentials when prompted.

### curl smoke test

```bash
# List the project root (PROPFIND, depth 1)
curl -u obsidian:changeme \
     -X PROPFIND \
     -H 'Depth: 1' \
     http://localhost:8003/webdav/

# Read a file
curl -u obsidian:changeme http://localhost:8003/webdav/notes/welcome.md

# Write a file
curl -u obsidian:changeme \
     -X PUT \
     --data-binary @local.md \
     http://localhost:8003/webdav/notes/welcome.md
```

## Limitations

- **Bypasses the v2 repository layer.** WebDAV writes go straight to disk.
  The SQLite FTS cache and any in-process derived state are not updated until
  the next full sync — full-text search can lag after a DAV write.
- **No frontmatter validation.** Direct writes are not parsed; malformed
  frontmatter is persisted as-is and only surfaces when the file is read back
  through the v2 repository.
- **No conflict handling beyond ETags.** Concurrent writers relying on If-Match
  / If-None-Match work; two clients overwriting without conditional headers
  will silently clobber.
- **Same trust model as cookie identity.** Basic Auth over plain HTTP is
  acceptable on a trusted LAN; put a TLS-terminating reverse proxy in front
  for anything else.

## Migration from v1

The v1 environment variables are no longer recognised. Rename them before
upgrading:

| v1 name                  | v2 name       |
| ------------------------ | ------------- |
| `MDPLANNER_WEBDAV`       | `WEBDAV`      |
| `MDPLANNER_WEBDAV_USER`  | `WEBDAV_USER` |
| `MDPLANNER_WEBDAV_PASS`  | `WEBDAV_PASS` |

v1 also accepted `MDPLANNER_WEBDAV=1` as truthy. v2 reads the literal string
`true` only — any other value leaves the endpoint disabled.
