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

## Gitea integration

MD Planner supports [Gitea](https://about.gitea.com/) as a drop-in alternative
to GitHub. Gitea mirrors GitHub's REST API, so the same repository summaries,
issues, pull requests, milestones, releases, and Actions all work against a
self-hosted Gitea instance.

### Setup

1. In Gitea, generate a Personal Access Token under
   **Settings → Applications** (repo read/write scope).
2. In MD Planner, navigate to **Settings → Project**.
3. Set **Gitea base URL** to your instance, e.g. `https://gitea.example.com`
   (the `/api/v1` suffix is added automatically).
4. Paste the token into **Gitea token (PAT)** and save.

### Per-project hosting

Hosting is a property of **each portfolio item**, not a global switch. Every
portfolio item has a **Repo host** select (`GitHub` | `Gitea`) next to its
**Repo (owner/repo)** field. With both GitHub and Gitea configured, a
GitHub-hosted project and a Gitea-hosted project work **side by side** — each
repository summary, issue/PR action, and `github_*` MCP tool targets the host
named on that item.

When an item leaves **Repo host** unset, it falls back to the configured
provider (Gitea if its base URL + token are set, otherwise GitHub) — so
existing single-host setups keep working without touching every item.

There is no separate set of Gitea tools or routes: both back ends implement the
same provider interface, so the existing GitHub view, REST routes, and MCP
tools serve either host's data unchanged. MCP tools also accept an optional
`provider` argument (`github` | `gitea`) to target a host explicitly.

The Gitea token follows the same security model as the GitHub token: encrypted
at rest with `MDPLANNER_SECRET_KEY`, never echoed to the browser (only a
`hasGiteaToken` presence flag), masked placeholder when set, blank-keeps /
typed-replaces / **Clear**-removes.

> CI note: Gitea does not expose a GitHub-style workflow-run REST API, so the
> CI/workflow-runs panel stays empty for Gitea repos. CI for a Gitea repo is
> driven by an external engine — see **Woodpecker CI integration** below.

## Woodpecker CI integration

CI is separate from the VCS host. When you run [Woodpecker CI](https://woodpecker-ci.org/),
MD Planner reads pipeline (build) status from the Woodpecker server regardless
of whether the repo is hosted on GitHub or Gitea.

### Setup

1. In Woodpecker, generate a Personal Access Token from your profile settings.
2. In MD Planner, navigate to **Settings → Project**.
3. Set **CI server URL** to your Woodpecker server, e.g. `https://ci.example.com`
   (the `/api` suffix is added automatically).
4. Paste the token into **CI token (PAT)** and save.

A repository's `owner/repo` slug is resolved to a Woodpecker repo id via
`/repos/lookup/{owner}/{repo}`, then pipelines are read from
`/repos/{id}/pipelines`. The CI token follows the same security model as the
other tokens: encrypted at rest with `MDPLANNER_SECRET_KEY`, never echoed to the
browser (only a `hasWoodpeckerToken` presence flag), masked placeholder when
set, blank-keeps / typed-replaces / **Clear**-removes.

The labels are generic (**CI server URL** / **CI token**) — Woodpecker is the
current backend, but the field naming does not assume it.

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

Woodpecker CI exposes its own tools:

| Tool                        | Description                                  |
| --------------------------- | -------------------------------------------- |
| `woodpecker_list_repos`     | List CI repositories                         |
| `woodpecker_list_pipelines` | List recent pipelines (latest CI status)     |
| `woodpecker_get_pipeline`   | Get a pipeline by number, or `latest`        |

## GitHub View

The GitHub view in the UI displays all portfolio projects linked to a GitHub
repository. Each repo row is expandable to show open issues and pull requests
inline. Issues assigned to you are highlighted. Open PRs have a merge button.

Query parameters for list endpoints:

- `GET .../issues?state=open|closed|all&assignee=<login>`
- `GET .../pulls?state=open|closed|all`
- `PUT .../pulls/:n/merge` body: `{ "merge_method": "squash"|"merge"|"rebase" }`

## Generic "Git" / "CI" labels

Because repository hosting is chosen per portfolio item (GitHub or Gitea) and
CI runs on a separate engine (Woodpecker), provider-agnostic surfaces use the
generic labels **Git** and **CI** rather than a vendor name. The sidebar entry,
the repository summary at `/github`, and the task detail repository section all
read "Git"; pipeline status reads "CI". Provider **selectors** (when choosing a
host) and the **token/base-URL** settings fields still name the specific vendor.

## CI status badge

When Woodpecker is configured, each repository card — the Git summary at
`/github` and the Git card on a portfolio detail page — shows the latest
pipeline status as a colored **CI** badge (green success, red
failure/error/killed, amber running/pending) linking to the pipeline. Repos not
registered in Woodpecker simply show no badge.

## My Work — Git card

The **My Work** page (`/me`) includes a lazy-loaded **Git** card that
aggregates, across every configured portfolio repository (GitHub and Gitea) plus
Woodpecker CI:

- your open pull requests,
- pull requests requesting your review,
- issues assigned to you,
- CI pipelines needing attention.

"You" is resolved per provider from the configured token's authenticated user
(`getAuthenticatedUser`), so no separate username mapping is required. A failure
on any single repository is skipped so it never stalls the card.
