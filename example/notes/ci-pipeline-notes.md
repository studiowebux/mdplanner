---
id: note_ci_pipeline_notes
created_at: "2026-01-12T13:00:00Z"
updated_at: "2026-02-20T10:00:00Z"
revision: 3
mode: simple
project: Infrastructure
tags: [mdplanner/notes]
---

# CI Pipeline Notes

## Current: pre-commit hooks only
No remote CI yet. All checks run locally on commit:
1. Secret scan
2. `deno fmt --check`
3. `deno lint`
4. `deno check v2/bin.ts`
5. `deno task test`

## Planned: GitHub Actions
```yaml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: denoland/setup-deno@v1
      - run: deno task test
      - run: deno lint
      - run: deno fmt --check
```

## Docker image build
Build + push to GHCR on tag push only (`v*.*.*`).
