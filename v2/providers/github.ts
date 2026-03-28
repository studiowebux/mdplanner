/**
 * GitHub REST API v3 provider.
 * Pattern: Provider pattern — HTTP client using a Personal Access Token.
 *
 * Rate limits: 5000 req/hr with authenticated PAT.
 *
 * Auth:
 *   Authorization: Bearer <token>
 *   Accept: application/vnd.github+json
 *   X-GitHub-Api-Version: 2022-11-28
 */

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

const GITHUB_API = "https://api.github.com";

export class GitHubProvider implements IGitProvider {
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  private get headers(): HeadersInit {
    const h: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  private async ghGet(path: string): Promise<unknown> {
    const res = await fetch(`${GITHUB_API}${path}`, { headers: this.headers });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`GitHub API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  private async ghPost(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${GITHUB_API}${path}`, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`GitHub API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  /** POST to endpoints that return 201/202/204 with no body. */
  private async ghPostEmpty(path: string, body?: unknown): Promise<void> {
    const res = await fetch(`${GITHUB_API}${path}`, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`GitHub API error ${res.status}: ${text}`);
    }
    await res.body?.cancel();
  }

  private async ghPatch(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${GITHUB_API}${path}`, {
      method: "PATCH",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`GitHub API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  private async ghPut(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${GITHUB_API}${path}`, {
      method: "PUT",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`GitHub API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  async getAuthenticatedUser(): Promise<GitHubUser> {
    const data = await this.ghGet("/user") as GhJson;
    return { login: String(data.login ?? "") };
  }

  // ---------------------------------------------------------------------------
  // Repos
  // ---------------------------------------------------------------------------

  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const [data, prs] = await Promise.all([
      this.ghGet(`/repos/${owner}/${repo}`) as Promise<GhJson>,
      this.ghGet(
        `/repos/${owner}/${repo}/pulls?state=open&per_page=100`,
      ) as Promise<GhJson[]>,
    ]);

    const license = data.license as GhJson | null;
    return {
      owner,
      repo,
      stars: Number(data.stargazers_count ?? 0),
      openIssues: Number(data.open_issues_count ?? 0),
      openPRs: Array.isArray(prs) ? prs.length : 0,
      lastCommitAt: data.pushed_at ? String(data.pushed_at) : null,
      license: license ? String(license.spdx_id ?? "") || null : null,
      htmlUrl: String(data.html_url ?? ""),
    };
  }

  async listRepos(query?: string): Promise<GitHubRepoSummary[]> {
    const data = await this.ghGet(
      "/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator",
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
    const data = await this.ghGet(
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
    const data = await this.ghPost(`/repos/${owner}/${repo}/issues`, {
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
    const data = await this.ghPatch(
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
      `/repos/${owner}/${repo}/issues?state=${state}&per_page=100&sort=created&direction=desc`;
    if (assignee) path += `&assignee=${encodeURIComponent(assignee)}`;
    const data = await this.ghGet(path) as GhJson[];
    // GitHub issues endpoint includes PRs — filter them out
    return (data ?? [])
      .filter((d) => !d.pull_request)
      .map(mapIssue);
  }

  // ---------------------------------------------------------------------------
  // Pull Requests
  // ---------------------------------------------------------------------------

  async getPR(owner: string, repo: string, number: number): Promise<GitHubPR> {
    const data = await this.ghGet(
      `/repos/${owner}/${repo}/pulls/${number}`,
    ) as GhJson;
    return mapPR(data);
  }

  async listPRs(
    owner: string,
    repo: string,
    state: GitHubPRState = "open",
  ): Promise<GitHubPR[]> {
    const data = await this.ghGet(
      `/repos/${owner}/${repo}/pulls?state=${state}&per_page=100&sort=created&direction=desc`,
    ) as GhJson[];
    return (data ?? []).map(mapPR);
  }

  async mergePR(
    owner: string,
    repo: string,
    number: number,
    mergeMethod: GitHubMergeMethod = "squash",
  ): Promise<GitHubMergeResult> {
    const data = await this.ghPut(
      `/repos/${owner}/${repo}/pulls/${number}/merge`,
      { merge_method: mergeMethod },
    ) as GhJson;
    return {
      sha: String(data.sha ?? ""),
      merged: data.merged === true,
      message: String(data.message ?? ""),
    };
  }

  // ---------------------------------------------------------------------------
  // Milestones
  // ---------------------------------------------------------------------------

  async listMilestones(
    owner: string,
    repo: string,
  ): Promise<GitHubMilestone[]> {
    const data = await this.ghGet(
      `/repos/${owner}/${repo}/milestones?state=open&per_page=50`,
    ) as GhJson[];
    const milestones = Array.isArray(data) ? data : [];
    return milestones.map((m) => ({
      number: Number(m.number),
      title: String(m.title ?? ""),
      openIssues: Number(m.open_issues ?? 0),
      closedIssues: Number(m.closed_issues ?? 0),
      htmlUrl: String(m.html_url ?? ""),
    }));
  }

  // ---------------------------------------------------------------------------
  // Releases
  // ---------------------------------------------------------------------------

  async getLatestRelease(
    owner: string,
    repo: string,
  ): Promise<GitHubRelease | null> {
    try {
      const data = await this.ghGet(
        `/repos/${owner}/${repo}/releases/latest`,
      ) as GhJson;
      return {
        tagName: String(data.tag_name ?? ""),
        name: data.name ? String(data.name) : null,
        publishedAt: data.published_at ? String(data.published_at) : null,
        htmlUrl: String(data.html_url ?? ""),
      };
    } catch {
      // 404 means no releases exist
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Actions — Workflows
  // ---------------------------------------------------------------------------

  async listWorkflows(
    owner: string,
    repo: string,
  ): Promise<GitHubWorkflow[]> {
    const data = await this.ghGet(
      `/repos/${owner}/${repo}/actions/workflows?per_page=100`,
    ) as GhJson;
    const raw = data?.workflows;
    const workflows: GhJson[] = Array.isArray(raw) ? raw : [];
    return workflows.map((w): GitHubWorkflow => ({
      id: Number(w.id),
      name: String(w.name ?? ""),
      path: String(w.path ?? ""),
      state: String(w.state ?? "") as GitHubWorkflow["state"],
      htmlUrl: String(w.html_url ?? ""),
    }));
  }

  // ---------------------------------------------------------------------------
  // Actions — Workflow Runs
  // ---------------------------------------------------------------------------

  async listWorkflowRuns(
    owner: string,
    repo: string,
    options: {
      page?: number;
      perPage?: number;
      status?: string;
      branch?: string;
      event?: string;
    } = {},
  ): Promise<{ runs: GitHubWorkflowRun[]; totalCount: number }> {
    const params = new URLSearchParams();
    params.set("per_page", String(options.perPage ?? 20));
    params.set("page", String(options.page ?? 1));
    if (options.status) params.set("status", options.status);
    if (options.branch) params.set("branch", options.branch);
    if (options.event) params.set("event", options.event);
    const data = await this.ghGet(
      `/repos/${owner}/${repo}/actions/runs?${params}`,
    ) as GhJson;
    const rawRuns = data?.workflow_runs;
    const runs: GhJson[] = Array.isArray(rawRuns) ? rawRuns : [];
    return {
      runs: runs.map(mapWorkflowRun),
      totalCount: Number(data?.total_count ?? 0),
    };
  }

  async cancelRun(
    owner: string,
    repo: string,
    runId: number,
  ): Promise<void> {
    await this.ghPostEmpty(
      `/repos/${owner}/${repo}/actions/runs/${runId}/cancel`,
    );
  }

  async rerunRun(
    owner: string,
    repo: string,
    runId: number,
  ): Promise<void> {
    await this.ghPostEmpty(
      `/repos/${owner}/${repo}/actions/runs/${runId}/rerun`,
    );
  }

  async rerunFailedJobs(
    owner: string,
    repo: string,
    runId: number,
  ): Promise<void> {
    await this.ghPostEmpty(
      `/repos/${owner}/${repo}/actions/runs/${runId}/rerun-failed-jobs`,
    );
  }

  async triggerWorkflowDispatch(
    owner: string,
    repo: string,
    workflowId: number | string,
    ref: string,
    inputs?: Record<string, string>,
  ): Promise<void> {
    await this.ghPostEmpty(
      `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
      { ref, inputs: inputs ?? {} },
    );
  }
}

// ---------------------------------------------------------------------------
// Mappers — keep field mapping in one place
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
  const head = d.head as GhJson | null;
  return {
    number: Number(d.number),
    title: String(d.title ?? ""),
    state: d.state === "closed" ? "closed" : "open",
    merged: d.merged === true || d.merged_at !== null,
    assignee: assignee ? String(assignee.login ?? "") : null,
    headBranch: head ? String(head.ref ?? "") : "",
    createdAt: String(d.created_at ?? ""),
    reviewDecision: null,
    htmlUrl: String(d.html_url ?? ""),
  };
}

function mapWorkflowRun(r: GhJson): GitHubWorkflowRun {
  return {
    id: Number(r.id),
    name: String(r.name ?? ""),
    status: String(r.status ?? "") as GitHubWorkflowRun["status"],
    conclusion:
      (r.conclusion ? String(r.conclusion) : null) as GitHubWorkflowRun[
        "conclusion"
      ],
    headBranch: String(r.head_branch ?? ""),
    event: String(r.event ?? ""),
    createdAt: String(r.created_at ?? ""),
    updatedAt: String(r.updated_at ?? ""),
    htmlUrl: String(r.html_url ?? ""),
  };
}
