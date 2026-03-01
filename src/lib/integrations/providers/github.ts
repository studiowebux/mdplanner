/**
 * GitHub REST API v3 provider.
 * Pattern: Provider pattern — implements GitHubProvider using a Personal Access Token.
 *
 * Rate limits:
 *   5000 req/hr with authenticated PAT — fine for a local tool.
 *
 * Auth:
 *   Authorization: Bearer <token>
 *   Accept: application/vnd.github+json
 */

import type {
  GitHubCreatedIssue,
  GitHubIssue,
  GitHubProvider,
  GitHubRepo,
  GitHubUser,
} from "./github-provider.ts";

const GITHUB_API = "https://api.github.com";

export class GitHubApiProvider implements GitHubProvider {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async ghGet(path: string): Promise<unknown> {
    const res = await fetch(`${GITHUB_API}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`GitHub API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  private async ghPost(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${GITHUB_API}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`GitHub API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  async getAuthenticatedUser(): Promise<GitHubUser> {
    // deno-lint-ignore no-explicit-any
    const data = await this.ghGet("/user") as any;
    return { login: data.login };
  }

  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    // deno-lint-ignore no-explicit-any
    const data = await this.ghGet(`/repos/${owner}/${repo}`) as any;

    return {
      owner,
      repo,
      stars: data.stargazers_count ?? 0,
      openIssues: data.open_issues_count ?? 0,
      lastCommitAt: data.pushed_at ?? null,
      license: data.license?.spdx_id ?? null,
      htmlUrl: data.html_url,
    };
  }

  async getIssue(
    owner: string,
    repo: string,
    number: number,
  ): Promise<GitHubIssue> {
    // deno-lint-ignore no-explicit-any
    const data = await this.ghGet(
      `/repos/${owner}/${repo}/issues/${number}`,
    ) as any;

    return {
      number: data.number,
      title: data.title,
      state: data.state === "closed" ? "closed" : "open",
      htmlUrl: data.html_url,
    };
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

    return {
      number: data.number,
      htmlUrl: data.html_url,
    };
  }
}
