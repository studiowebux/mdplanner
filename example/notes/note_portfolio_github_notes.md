---
id: note_portfolio_github_notes
created_at: "2026-03-22T10:00:00Z"
updated_at: "2026-03-25T15:00:00Z"
revision: 2
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# Portfolio GitHub Integration Notes

## Architecture decision
`githubRepo` is per portfolio item, not per project.
`githubToken` is per project (in `project.md` frontmatter).

## IGitProvider interface
`GitHubProvider` implements it. Future: GitLab, Gitea.
Swap provider in `singletons/services.ts`.

## API routes
Nested under portfolio: `/api/v1/portfolio/:id/github/*`
`resolveRepo` helper in `helpers.ts` extracts githubRepo from item.

## Pipelines
`GITHUB_PIPELINES_PER_PAGE = 10` (configurable via `project.md`).
Filters: status/branch/event use native GitHub API params.
`q` (name search) is local-only filter.
