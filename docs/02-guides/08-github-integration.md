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

## Generate a secret key

```bash
mdplanner keygen-secret
# Set as MDPLANNER_SECRET_KEY environment variable
```

## Cloudflare integration

The DNS Tracker can sync domain expiry and DNS records from Cloudflare
Registrar. Navigate to Settings > Cloudflare and paste your API token.

```yaml
# Docker
environment:
  - MDPLANNER_SECRET_KEY=${MDPLANNER_SECRET_KEY}
```

```bash
# Generate a key and add to .env
echo "MDPLANNER_SECRET_KEY=$(mdplanner keygen-secret)" >> .env
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

## REST API

| Method  | Path                                                     | Description      |
| ------- | -------------------------------------------------------- | ---------------- |
| `GET`   | `/api/integrations/github/repos`                         | List repos       |
| `GET`   | `/api/integrations/github/repo/:owner/:repo`             | Get repo summary |
| `GET`   | `/api/integrations/github/repo/:owner/:repo/issues`      | List issues      |
| `GET`   | `/api/integrations/github/repo/:owner/:repo/issues/:n`   | Get issue        |
| `POST`  | `/api/integrations/github/repo/:owner/:repo/issues`      | Create issue     |
| `PATCH` | `/api/integrations/github/repo/:owner/:repo/issues/:n`   | Close/reopen     |
| `GET`   | `/api/integrations/github/repo/:owner/:repo/pulls`       | List PRs         |
| `GET`   | `/api/integrations/github/repo/:owner/:repo/pulls/:n`    | Get PR           |
| `PUT`   | `/api/integrations/github/repo/:owner/:repo/pulls/:n/merge` | Merge PR      |
| `GET`   | `/api/integrations/github/repo/:owner/:repo/releases/latest` | Latest release |
| `GET`   | `/api/integrations/github/repo/:owner/:repo/milestones`  | List milestones  |
| `GET`   | `/api/integrations/github/repo/:owner/:repo/actions/runs` | Workflow runs   |

## GitHub View

The GitHub view in the UI displays all portfolio projects linked to a GitHub
repository. Each repo row is expandable to show open issues and pull requests
inline. Issues assigned to you are highlighted. Open PRs have a merge button.

Query parameters for list endpoints:

- `GET .../issues?state=open|closed|all&assignee=<login>`
- `GET .../pulls?state=open|closed|all`
- `PUT .../pulls/:n/merge` body: `{ "merge_method": "squash"|"merge"|"rebase" }`
