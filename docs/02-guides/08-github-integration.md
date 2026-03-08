# GitHub Integration

MD Planner integrates with GitHub for repository summaries and issue management.

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

| Tool                     | Description              |
| ------------------------ | ------------------------ |
| `github_list_repos`      | List repositories        |
| `github_get_repo`        | Get repository summary   |
| `github_get_issue`       | Get issue details        |
| `github_create_issue`    | Create issue             |
| `github_set_issue_state` | Open or close issue      |
| `github_get_pr`          | Get pull request details |

## REST API

| Method | Path                             | Description      |
| ------ | -------------------------------- | ---------------- |
| `GET`  | `/api/integrations/github/repos` | List repos       |
| `GET`  | `/api/integrations/github/repos/:id` | Get repo     |
| `GET`  | `/api/integrations/github/issues` | List issues     |
| `POST` | `/api/integrations/github/issues` | Create issue    |
