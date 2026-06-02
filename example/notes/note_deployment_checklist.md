---
id: note_deployment_checklist
created_at: "2025-12-01T09:00:00Z"
updated_at: "2026-03-20T16:00:00Z"
revision: 5
mode: simple
project: Infrastructure
tags: [mdplanner/notes]
---

# Deployment Checklist

## Pre-deploy
- [ ] All milestone tasks Pending Review or Done
- [ ] Version bumped in `src/lib/version.ts`
- [ ] `deno task test` passes
- [ ] `deno fmt --check` passes
- [ ] `deno lint` clean

## Deploy
- [ ] `git tag vX.Y.Z`
- [ ] `git push origin vX.Y.Z`
- [ ] Docker image built and pushed
- [ ] `docker compose pull && docker compose up -d`

## Post-deploy
- [ ] Smoke test: create a note, task, goal
- [ ] Check SSE events firing
- [ ] Verify MCP server responds
