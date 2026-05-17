---
title: Running v2
---

# Running v2

MD Planner v2 has no compiled binary or CLI. It runs with Deno.

## Deno tasks

| Task                       | Description                                   |
| -------------------------- | --------------------------------------------- |
| `deno task dev:v2 [dir]`   | Start the v2 server (default: `./example`)    |
| `deno task test`           | Run the test suite                            |
| `deno task fmt`            | Format all source files                       |

```bash
# Start against the example project directory
deno task dev:v2 ./example

# Start against your own project directory
deno task dev:v2 /path/to/my-project
```

Open `http://localhost:8003`.

## Project directory

The directory passed to `deno task dev:v2` (or set via `PROJECT_DIR`) is the
root of all project data. If the directory does not contain a `project.md` file,
the server still starts — create `project.md` to enable project metadata and
feature visibility settings.

Defaults to `./example` when no argument is given.

## Environment variables

All runtime configuration is done via environment variables.

| Variable               | Default | Required | Description                                                                 |
| ---------------------- | ------- | -------- | --------------------------------------------------------------------------- |
| `PROJECT_DIR`          | —       | Yes      | Absolute path to the project data directory.                                |
| `PORT`                 | `8003`  | No       | HTTP port the server listens on.                                            |
| `CACHE`                | `true`  | No       | Set to `false` to disable the SQLite FTS cache. Full-text search needs `true`. |
| `MCP_TOKEN`            | —       | No       | Bearer token for MCP API requests. Leave empty to disable auth.             |
| `MDPLANNER_SECRET_KEY` | —       | No       | AES-256-GCM key for encrypting integration secrets in `project.md`.         |

Generate a secret key:

```bash
openssl rand -hex 32
```

Example with env vars inline:

```bash
PROJECT_DIR=/path/to/my-project PORT=8080 MCP_TOKEN=secret deno task dev:v2
```

For Docker deployment see [Docker Deployment](../02-guides/01-docker-deployment.md).
For systemd deployment see [systemd Deployment](../02-guides/02-systemd-deployment.md).
