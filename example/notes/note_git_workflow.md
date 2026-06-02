---
id: note_git_workflow
created_at: "2026-01-08T10:00:00Z"
updated_at: "2026-02-20T09:00:00Z"
revision: 3
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# Git Workflow

## Branch naming
`<type>/<short-description>` — e.g. `feat/v0.39.0-view-partials`

## Commit format
`<type>: <subject>` enforced by commit-validator hook.
Types: feat, fix, refactor, chore, docs, test

## Flow
1. Create feature branch from main
2. Work → build verify → commit
3. Push branch
4. PR via `gh pr create`
5. Owner reviews → merge → delete branch

## Never
- Commit directly to main
- Skip hooks with `--no-verify`
- Force push main
