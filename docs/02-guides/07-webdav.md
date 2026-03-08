---
title: WebDAV
---

# WebDAV

MD Planner exposes the project directory over WebDAV at `/webdav`. This allows
editing markdown files with any WebDAV-compatible application (Obsidian,
Neovim + netRW, Finder, etc.).

## Enable WebDAV

```bash
mdplanner --webdav ./my-project
```

With basic auth:

```bash
mdplanner --webdav --webdav-user admin --webdav-pass secret ./my-project
```

Both `--webdav-user` and `--webdav-pass` are required when using authentication.

## Docker

```yaml
environment:
  - MDPLANNER_WEBDAV=1
  - MDPLANNER_WEBDAV_USER=admin
  - MDPLANNER_WEBDAV_PASS=secret
```

## Mount in Finder (macOS)

1. Finder > Go > Connect to Server
2. Enter `http://localhost:8003/webdav`
3. Enter credentials if configured

## Mount in Linux

```bash
# Using davfs2
sudo mount -t davfs http://localhost:8003/webdav /mnt/mdplanner
```

## Usage with editors

Any editor that supports file system access can edit the markdown files directly.
Changes are picked up by the server through file system watching. SSE events
notify connected web UI clients of external changes.
