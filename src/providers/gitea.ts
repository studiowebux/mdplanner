/**
 * Gitea REST API provider.
 * Pattern: Provider pattern — HTTP client using a Personal Access Token.
 *
 * Gitea intentionally mirrors GitHub's REST API v1, so this implements the same
 * IGitProvider interface as GitHubProvider. Key differences vs GitHub:
 *   - Base URL is the self-hosted instance, e.g. `https://gitea.example.com`,
 *     with the API mounted under `/api/v1`.
 *   - Auth header is `Authorization: token <value>` (GitHub uses `Bearer`).
 *   - No `/releases/latest` shortcut — fetch `/releases` and take the first.
 *
 * Response field names match GitHub (tag_name, published_at, html_url, ...), so
 * the same mappers apply.
 */

import { log } from "../singletons/logger.ts";
import type {
  GhJson,
  GitHubCreatedIssue,
  GitHubIssue,
  GitHubIssueState,
  GitHubMergeMethod,
  GitHubMergeResult,
  GitHubMilestone,
  GitHubPR,
  GitHubPRState,
  GitHubRelease,
  GitHubRepo,
  GitHubRepoSummary,
  GitHubUser,
  GitHubWorkflow,
  GitHubWorkflowRun,
  IGitProvider,
} from "../types/github.types.ts";

/**
 * Normalize a configured Gitea base URL to its `/api/v1` API root.
 * Accepts `https://gitea.example.com`, a trailing slash, or an already
 * `/api/v1`-suffixed URL.
 */
export function giteaApiBase(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

/** Gitea provider (IGitProvider): repos, issues, PRs, milestones, releases, and Actions via the Gitea REST API. */
export class GiteaProvider implements IGitProvider {
  private apiBase: string;
  private token?: string;

  constructor(baseUrl: string, token?: string) {
    this.apiBase = giteaApiBase(baseUrl);
    this.token = token;
  }

  private get headers(): HeadersInit {
    const h: Record<string, string> = {
      Accept: "application/json",
    };
    if (this.token) h.Authorization = `token ${this.token}`;
    return h;
  }

  private async giGet(path: string): Promise<unknown> {
    const res = await fetch(`${this.apiBase}${path}`, {
      headers: this.headers,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Gitea API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  private async giPost(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${this.apiBase}${path}`, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Gitea API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  /** POST to endpoints that return 201/202/204 with no body. */
  private async giPostEmpty(path: string, body?: unknown): Promise<void> {
    const res = await fetch(`${this.apiBase}${path}`, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Gitea API error ${res.status}: ${text}`);
    }
    await res.body?.cancel();
  }

  private async giPatch(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${this.apiBase}${path}`, {
      method: "PATCH",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Gitea API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  private async giPut(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${this.apiBase}${path}`, {
      method: "PUT",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Gitea API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  async getAuthenticatedUser(): Promise<GitHubUser> {
    const data = await this.giGet("/user") as GhJson;
    return { login: String(data.login ?? "") };
  }

  // ---------------------------------------------------------------------------
  // Repos
  // ---------------------------------------------------------------------------

  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const [data, prs] = await Promise.all([
      this.giGet(`/repos/${owner}/${repo}`) as Promise<GhJson>,
      this.giGet(
        `/repos/${owner}/${repo}/pulls?state=open&limit=100`,
      ) as Promise<GhJson[]>,
    ]);

    return {
      owner,
      repo,
      stars: Number(data.stars_count ?? data.stargazers_count ?? 0),
      openIssues: Number(data.open_issues_count ?? 0),
      openPRs: Array.isArray(prs) ? prs.length : 0,
      lastCommitAt: data.updated_at ? String(data.updated_at) : null,
      license: null,
      htmlUrl: String(data.html_url ?? ""),
    };
  }

  async listRepos(query?: string): Promise<GitHubRepoSummary[]> {
    const data = await this.giGet(
      "/user/repos?limit=100",
    ) as GhJson[];

    const repos = Array.isArray(data) ? data : [];

    const q = query?.toLowerCase().trim();
    const filtered = q
      ? repos.filter((r) => String(r.full_name ?? "").toLowerCase().includes(q))
      : repos;

    return filtered.map((r) => ({
      fullName: String(r.full_name ?? ""),
      description: r.description ? String(r.description) : "",
    }));
  }

  // ---------------------------------------------------------------------------
  // Issues
  // ---------------------------------------------------------------------------

  async getIssue(
    owner: string,
    repo: string,
    number: number,
  ): Promise<GitHubIssue> {
    const data = await this.giGet(
      `/repos/${owner}/${repo}/issues/${number}`,
    ) as GhJson;
    return mapIssue(data);
  }

  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
  ): Promise<GitHubCreatedIssue> {
    const data = await this.giPost(`/repos/${owner}/${repo}/issues`, {
      title,
      body,
    }) as GhJson;
    return {
      number: Number(data.number),
      htmlUrl: String(data.html_url ?? ""),
    };
  }

  async setIssueState(
    owner: string,
    repo: string,
    number: number,
    state: GitHubIssueState,
  ): Promise<GitHubIssue> {
    const data = await this.giPatch(
      `/repos/${owner}/${repo}/issues/${number}`,
      { state },
    ) as GhJson;
    return mapIssue(data);
  }

  async listIssues(
    owner: string,
    repo: string,
    state: GitHubIssueState | "all" = "open",
    assignee?: string,
  ): Promise<GitHubIssue[]> {
    let path =
      `/repos/${owner}/${repo}/issues?state=${state}&type=issues&limit=100`;
    if (assignee) path += `&assignee=${encodeURIComponent(assignee)}`;
    const data = await this.giGet(path) as GhJson[];
    // Gitea's `type=issues` already excludes PRs; guard anyway.
    return (data ?? [])
      .filter((d) => !d.pull_request)
      .map(mapIssue);
  }

  // ---------------------------------------------------------------------------
  // Pull Requests
  // ---------------------------------------------------------------------------

  async getPR(owner: string, repo: string, number: number): Promise<GitHubPR> {
    const data = await this.giGet(
      `/repos/${owner}/${repo}/pulls/${number}`,
    ) as GhJson;
    return mapPR(data);
  }

  async listPRs(
    owner: string,
    repo: string,
    state: GitHubPRState = "open",
  ): Promise<GitHubPR[]> {
    const data = await this.giGet(
      `/repos/${owner}/${repo}/pulls?state=${state}&limit=100`,
    ) as GhJson[];
    return (data ?? []).map(mapPR);
  }

  async mergePR(
    owner: string,
    repo: string,
    number: number,
    mergeMethod: GitHubMergeMethod = "squash",
  ): Promise<GitHubMergeResult> {
    // Gitea returns 200/empty on success and an error body otherwise.
    const res = await fetch(
      `${this.apiBase}/repos/${owner}/${repo}/pulls/${number}/merge`,
      {
        method: "POST",
        headers: { ...this.headers, "Content-Type": "application/json" },
        body: JSON.stringify({ Do: mergeMethod }),
      },
    );
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return { sha: "", merged: false, message: text || res.statusText };
    }
    return { sha: "", merged: true, message: "" };
  }

  // ---------------------------------------------------------------------------
  // Milestones
  // ---------------------------------------------------------------------------

  async listMilestones(
    owner: string,
    repo: string,
  ): Promise<GitHubMilestone[]> {
    const data = await this.giGet(
      `/repos/${owner}/${repo}/milestones?state=open&limit=50`,
    ) as GhJson[];
    const milestones = Array.isArray(data) ? data : [];
    return milestones.map((m) => ({
      number: Number(m.id),
      title: String(m.title ?? ""),
      openIssues: Number(m.open_issues ?? 0),
      closedIssues: Number(m.closed_issues ?? 0),
      htmlUrl: String(m.html_url ?? ""),
    }));
  }

  // ---------------------------------------------------------------------------
  // Releases — Gitea has no /releases/latest shortcut; take the first.
  // ---------------------------------------------------------------------------

  async getLatestRelease(
    owner: string,
    repo: string,
  ): Promise<GitHubRelease | null> {
    try {
      const data = await this.giGet(
        `/repos/${owner}/${repo}/releases?limit=1`,
      ) as GhJson[];
      const latest = Array.isArray(data) ? data[0] : undefined;
      if (!latest) return null;
      return {
        tagName: String(latest.tag_name ?? ""),
        name: latest.name ? String(latest.name) : null,
        publishedAt: latest.published_at ? String(latest.published_at) : null,
        htmlUrl: String(latest.html_url ?? ""),
      };
    } catch (err) {
      log.warn("[gitea] latest release fetch failed:", err);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Actions / workflow runs — UNSUPPORTED via this provider.
  //
  // Gitea's REST API does NOT expose GitHub-style workflow-run endpoints
  // (`/actions/runs`, cancel/rerun/dispatch return 404). CI for a Gitea repo is
  // typically driven by an external engine (Woodpecker, Drone, Concourse, Gitea
  // Actions runners, etc.) through its own integration — not this VCS provider.
  // Rather than fire 404s, the read methods return empty so the CI section of
  // the VCS view simply shows nothing, and the mutating methods fail with a
  // clear message.
  // ---------------------------------------------------------------------------

  listWorkflows(): Promise<GitHubWorkflow[]> {
    return Promise.resolve([]);
  }

  listWorkflowRuns(): Promise<
    { runs: GitHubWorkflowRun[]; totalCount: number }
  > {
    return Promise.resolve({ runs: [], totalCount: 0 });
  }

  cancelRun(): Promise<void> {
    return Promise.reject(new Error(GITEA_ACTIONS_UNSUPPORTED));
  }

  rerunRun(): Promise<void> {
    return Promise.reject(new Error(GITEA_ACTIONS_UNSUPPORTED));
  }

  rerunFailedJobs(): Promise<void> {
    return Promise.reject(new Error(GITEA_ACTIONS_UNSUPPORTED));
  }

  triggerWorkflowDispatch(): Promise<void> {
    return Promise.reject(new Error(GITEA_ACTIONS_UNSUPPORTED));
  }
}

const GITEA_ACTIONS_UNSUPPORTED =
  "Gitea does not expose a workflow-run REST API. CI run control is handled " +
  "by your external CI provider, not this VCS integration.";

// ---------------------------------------------------------------------------
// Mappers — Gitea response field names mirror GitHub.
// ---------------------------------------------------------------------------

function mapIssue(d: GhJson): GitHubIssue {
  const assignee = d.assignee as GhJson | null;
  return {
    number: Number(d.number),
    title: String(d.title ?? ""),
    state: d.state === "closed" ? "closed" : "open",
    labels: Array.isArray(d.labels)
      ? (d.labels as GhJson[]).map((l) =>
        typeof l === "string" ? l : String((l as GhJson).name ?? "")
      )
      : [],
    assignee: assignee ? String(assignee.login ?? "") : null,
    createdAt: String(d.created_at ?? ""),
    htmlUrl: String(d.html_url ?? ""),
  };
}

function mapPR(d: GhJson): GitHubPR {
  const assignee = d.assignee as GhJson | null;
  const author = d.user as GhJson | null;
  const head = d.head as GhJson | null;
  const reviewers = Array.isArray(d.requested_reviewers)
    ? (d.requested_reviewers as GhJson[]).map((r) => String(r.login ?? ""))
      .filter((l) => l.length > 0)
    : [];
  return {
    number: Number(d.number),
    title: String(d.title ?? ""),
    state: d.state === "closed" ? "closed" : "open",
    merged: d.merged === true || d.merged_at !== null,
    author: author ? String(author.login ?? "") : null,
    assignee: assignee ? String(assignee.login ?? "") : null,
    requestedReviewers: reviewers,
    headBranch: head ? String(head.ref ?? "") : "",
    createdAt: String(d.created_at ?? ""),
    reviewDecision: null,
    htmlUrl: String(d.html_url ?? ""),
  };
}
