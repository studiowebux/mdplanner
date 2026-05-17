---
title: Running v2
---

# Running v2

MD Planner v2 has no compiled binary or CLI. It runs with Deno.

## Deno tasks

| Task              | Description              |
| ----------------- | ------------------------ |
| `deno task dev:v2`| Start the v2 server      |
| `deno task test`  | Run the test suite       |
| `deno task fmt`   | Format all source files  |

```bash
# Start against ./example (hardcoded in the deno task)
deno task dev:v2
```

Open `http://localhost:8003`.

## Project directory

`deno task dev:v2` hardcodes `./example` as the project directory — you cannot
pass a different path as an argument to the task. To use a custom directory, set
`PROJECT_DIR` and run deno directly:

```bash
PROJECT_DIR=/path/to/my-project \
  deno run --allow-net --allow-read --allow-write --allow-env --watch v2/bin.ts
```

Or set it as an environment variable before running the task (but the task still
passes `./example` as `Deno.args[0]`, which takes precedence over `PROJECT_DIR`).
Run deno directly when you need a custom path.

If the directory does not contain a `project.md` file the server still starts —
create `project.md` to enable project metadata and feature visibility settings.

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
