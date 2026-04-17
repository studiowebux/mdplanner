---
id: note_api_rate_limiting
created_at: "2026-01-10T14:00:00Z"
updated_at: "2026-03-20T11:00:00Z"
revision: 2
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# API Rate Limiting Notes

## GitHub API limits
- Unauthenticated: 60 req/hr per IP
- Authenticated (PAT): 5000 req/hr
- GraphQL: 5000 pts/hr

## Current implementation
`GITHUB_TOKEN` env var — optional for public repos.
Defined per project in `project.md` frontmatter.

## Strategy
Cache GitHub pipeline responses in memory for 60s.
Show stale indicator if cache is older than 5 min.

## Future
Add Redis cache layer if pipeline data becomes a bottleneck.
