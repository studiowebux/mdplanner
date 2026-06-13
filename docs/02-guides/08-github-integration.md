---
title: GitHub Integration
---

# GitHub Integration

MD Planner integrates with GitHub for repository summaries, issue and pull
request management, and PR merging.

## Setup

1. Generate a GitHub Personal Access Token (PAT) with `repo` scope
2. In MD Planner, navigate to Settings > Integrations
3. Paste the PAT and save

When `MDPLANNER_SECRET_KEY` is set, the token is encrypted with AES-256-GCM
before being stored in `project.md`. Without the key, it is stored in plaintext.

For security, the stored token is **never sent back to the browser or API** —
the Settings form and the `GET /api/v1/settings` response only expose a
presence flag (`hasGithubToken` / `hasCloudflareToken`), not the value. The
token field shows a masked placeholder when a token is already set. Leaving it
blank on save keeps the existing token; type a new value to replace it, or use
the **Clear** button to remove it.

## Generate a secret key

```bash
openssl rand -hex 32
# Paste the output into your .env as: MDPLANNER_SECRET_KEY=<output>
```

## Cloudflare integration

The DNS Tracker can sync domain expiry and DNS records from Cloudflare
Registrar. Navigate to Settings > Cloudflare and paste your API token.

```yaml
# Docker (deploy/.env)
MDPLANNER_SECRET_KEY=<your-hex-key>
```

## MCP tools

The GitHub integration is also available via MCP:

| Tool                     | Description                       |
| ------------------------ | --------------------------------- |
| `github_list_repos`      | List repositories                 |
| `github_get_repo`        | Get repository summary            |
| `github_get_issue`       | Get issue details                 |
| `github_create_issue`    | Create issue                      |
| `github_set_issue_state` | Open or close issue               |
| `github_list_issues`     | List issues (state, assignee)     |
| `github_get_pr`          | Get pull request details          |
| `github_list_prs`        | List pull requests (state filter) |
| `github_merge_pr`        | Merge a pull request              |

## GitHub View

The GitHub view in the UI displays all portfolio projects linked to a GitHub
repository. Each repo row is expandable to show open issues and pull requests
inline. Issues assigned to you are highlighted. Open PRs have a merge button.

Query parameters for list endpoints:

- `GET .../issues?state=open|closed|all&assignee=<login>`
- `GET .../pulls?state=open|closed|all`
- `PUT .../pulls/:n/merge` body: `{ "merge_method": "squash"|"merge"|"rebase" }`
