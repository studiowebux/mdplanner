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
} from "../types/github.types.ts";

const GITHUB_API = "https://api.github.com";

export class GitHubProvider {
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
    // deno-lint-ignore no-explicit-any
    const data = await this.ghGet("/user") as any;
    return { login: data.login };
  }

  // ---------------------------------------------------------------------------
  // Repos
  // ---------------------------------------------------------------------------

  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    // deno-lint-ignore no-explicit-any
    const [data, prs] = await Promise.all([
      this.ghGet(`/repos/${owner}/${repo}`) as Promise<any>,
      this.ghGet(
        `/repos/${owner}/${repo}/pulls?state=open&per_page=100`,
      ) as Promise<any[]>,
    ]);

    return {
      owner,
      repo,
      stars: data.stargazers_count ?? 0,
      openIssues: data.open_issues_count ?? 0,
      openPRs: Array.isArray(prs) ? prs.length : 0,
      lastCommitAt: data.pushed_at ?? null,
      license: data.license?.spdx_id ?? null,
      htmlUrl: data.html_url,
    };
  }

  async listRepos(query?: string): Promise<GitHubRepoSummary[]> {
    // deno-lint-ignore no-explicit-any
    const data = await this.ghGet(
      "/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator",
    ) as any[];

    const repos: { full_name: string; description: string | null }[] =
      data ?? [];

    const q = query?.toLowerCase().trim();
    const filtered = q
      ? repos.filter((r) => r.full_name.toLowerCase().includes(q))
      : repos;

    return filtered.map((r) => ({
      fullName: r.full_name,
      description: r.description ?? "",
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
    // deno-lint-ignore no-explicit-any
    const data = await this.ghGet(
      `/repos/${owner}/${repo}/issues/${number}`,
    ) as any;
    return mapIssue(data);
  }

  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
  ): Promise<GitHubCreatedIssue> {
    // deno-lint-ignore no-explicit-any
    const data = await this.ghPost(`/repos/${owner}/${repo}/issues`, {
      title,
      body,
    }) as any;
    return { number: data.number, htmlUrl: data.html_url };
  }

  async setIssueState(
    owner: string,
    repo: string,
    number: number,
    state: GitHubIssueState,
  ): Promise<GitHubIssue> {
    // deno-lint-ignore no-explicit-any
    const data = await this.ghPatch(
      `/repos/${owner}/${repo}/issues/${number}`,
      { state },
    ) as any;
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
    // deno-lint-ignore no-explicit-any
    const data = await this.ghGet(path) as any[];
    // GitHub issues endpoint includes PRs — filter them out
    return (data ?? [])
      .filter((d) => !d.pull_request)
      .map(mapIssue);
  }

  // ---------------------------------------------------------------------------
  // Pull Requests
  // ---------------------------------------------------------------------------

  async getPR(owner: string, repo: string, number: number): Promise<GitHubPR> {
    // deno-lint-ignore no-explicit-any
    const data = await this.ghGet(
      `/repos/${owner}/${repo}/pulls/${number}`,
    ) as any;
    return mapPR(data);
  }

  async listPRs(
    owner: string,
    repo: string,
    state: GitHubPRState = "open",
  ): Promise<GitHubPR[]> {
    // deno-lint-ignore no-explicit-any
    const data = await this.ghGet(
      `/repos/${owner}/${repo}/pulls?state=${state}&per_page=100&sort=created&direction=desc`,
    ) as any[];
    return (data ?? []).map(mapPR);
  }

  async mergePR(
    owner: string,
    repo: string,
    number: number,
    mergeMethod: GitHubMergeMethod = "squash",
  ): Promise<GitHubMergeResult> {
    // deno-lint-ignore no-explicit-any
    const data = await this.ghPut(
      `/repos/${owner}/${repo}/pulls/${number}/merge`,
      { merge_method: mergeMethod },
    ) as any;
    return {
      sha: data.sha ?? "",
      merged: data.merged === true,
      message: data.message ?? "",
    };
  }

  // ---------------------------------------------------------------------------
  // Milestones
  // ---------------------------------------------------------------------------

  async listMilestones(
    owner: string,
    repo: string,
  ): Promise<GitHubMilestone[]> {
    // deno-lint-ignore no-explicit-any
    const data = await this.ghGet(
      `/repos/${owner}/${repo}/milestones?state=open&per_page=50`,
    ) as any[];
    return (data ?? []).map((m) => ({
      number: m.number,
      title: m.title,
      openIssues: m.open_issues,
      closedIssues: m.closed_issues,
      htmlUrl: m.html_url,
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
      // deno-lint-ignore no-explicit-any
      const data = await this.ghGet(
        `/repos/${owner}/${repo}/releases/latest`,
      ) as any;
      return {
        tagName: data.tag_name,
        name: data.name ?? null,
        publishedAt: data.published_at ?? null,
        htmlUrl: data.html_url,
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
    // deno-lint-ignore no-explicit-any
    const data = await this.ghGet(
      `/repos/${owner}/${repo}/actions/workflows?per_page=100`,
    ) as any;
    // deno-lint-ignore no-explicit-any
    const workflows: any[] = data?.workflows ?? [];
    return workflows.map((w) => ({
      id: w.id,
      name: w.name,
      path: w.path,
      state: w.state,
      htmlUrl: w.html_url,
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
    // deno-lint-ignore no-explicit-any
    const data = await this.ghGet(
      `/repos/${owner}/${repo}/actions/runs?${params}`,
    ) as any;
    // deno-lint-ignore no-explicit-any
    const runs: any[] = data?.workflow_runs ?? [];
    return {
      runs: runs.map(mapWorkflowRun),
      totalCount: data?.total_count ?? 0,
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

// deno-lint-ignore no-explicit-any
function mapIssue(d: any): GitHubIssue {
  return {
    number: d.number,
    title: d.title,
    state: d.state === "closed" ? "closed" : "open",
    labels: Array.isArray(d.labels)
      ? d.labels.map((l: { name?: string }) =>
        typeof l === "string" ? l : l.name ?? ""
      )
      : [],
    assignee: d.assignee?.login ?? null,
    createdAt: d.created_at,
    htmlUrl: d.html_url,
  };
}

// deno-lint-ignore no-explicit-any
function mapPR(d: any): GitHubPR {
  return {
    number: d.number,
    title: d.title,
    state: d.state === "closed" ? "closed" : "open",
    merged: d.merged === true || d.merged_at !== null,
    assignee: d.assignee?.login ?? null,
    headBranch: d.head?.ref ?? "",
    createdAt: d.created_at,
    reviewDecision: null,
    htmlUrl: d.html_url,
  };
}

// deno-lint-ignore no-explicit-any
function mapWorkflowRun(r: any): GitHubWorkflowRun {
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    conclusion: r.conclusion ?? null,
    headBranch: r.head_branch,
    event: r.event,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    htmlUrl: r.html_url,
  };
}
