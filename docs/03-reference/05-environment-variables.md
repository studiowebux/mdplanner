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

## Generating a secret key

```bash
openssl rand -hex 32
```

Paste the output into your `.env` or service config as `MDPLANNER_SECRET_KEY=<output>`.

Without this key, integration tokens (Cloudflare API key, GitHub PAT) are stored
in plaintext in `project.md`. Acceptable for local single-user installs; always
set the key for shared or networked deployments.
