// GitHub service — wraps GitHubProvider.
// Token from project config, repo from portfolio item (passed by caller).

import { GitHubProvider } from "../providers/github.ts";
import { GiteaProvider } from "../providers/gitea.ts";
import type { ProjectService } from "./project.service.ts";
import type { IGitProvider, VcsProvider } from "../types/github.types.ts";
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

/** GitHub REST API client (no repository): wraps repos, issues, PRs, milestones, releases, and Actions workflow runs (list/cancel/rerun/dispatch). */
export class GitHubService {
  constructor(private projectService: ProjectService) {}

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private async resolve(
    githubRepo: string,
    choice?: VcsProvider | null,
  ): Promise<{ provider: IGitProvider; owner: string; repo: string }> {
    const provider = await this.provider(choice);
    const slash = githubRepo.indexOf("/");
    if (slash === -1) {
      throw new Error(
        `GITHUB_REPO_INVALID: expected "owner/repo", got "${githubRepo}"`,
      );
    }
    return {
      provider,
      owner: githubRepo.slice(0, slash),
      repo: githubRepo.slice(slash + 1),
    };
  }

  /**
   * Resolve the effective VCS provider for a per-project choice. When an item
   * names its host (`vcsProvider`), honor it. When it doesn't, default to
   * GitHub — Gitea is opt-in per item, so configuring Gitea never reroutes
   * unset items and both providers coexist across the portfolio.
   */
  private resolveChoice(
    choice?: VcsProvider | null,
  ): VcsProvider {
    return choice ?? "github";
  }

  /**
   * Human-readable name of the VCS provider for a given per-project choice.
   * Used to label the VCS view/section (which is otherwise hardcoded to
   * "GitHub").
   */
  activeProviderName(
    choice?: VcsProvider | null,
  ): "GitHub" | "Gitea" {
    return this.resolveChoice(choice) === "gitea" ? "Gitea" : "GitHub";
  }

  private async provider(choice?: VcsProvider | null): Promise<IGitProvider> {
    const config = await this.projectService.getConfig();
    // Both implement IGitProvider, so every downstream method, REST route, and
    // MCP tool works unchanged against either backend. The host is a per-item
    // property (portfolio item `vcsProvider`); absent → GitHub default
    // (see resolveChoice).
    if (this.resolveChoice(choice) === "gitea") {
      // baseUrl falls back to "" when a project picks Gitea but it isn't
      // configured — provider calls then fail with a clear Gitea API error.
      return new GiteaProvider(config.giteaBaseUrl ?? "", config.giteaToken);
    }
    return new GitHubProvider(config.githubToken);
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  async getAuthenticatedUser(choice?: VcsProvider | null): Promise<GitHubUser> {
    return (await this.provider(choice)).getAuthenticatedUser();
  }

  // ---------------------------------------------------------------------------
  // Repos
  // ---------------------------------------------------------------------------

  async getRepo(
    githubRepo: string,
    choice?: VcsProvider | null,
  ): Promise<GitHubRepo> {
    const { provider, owner, repo } = await this.resolve(githubRepo, choice);
    return provider.getRepo(owner, repo);
  }

  async listRepos(
    query?: string,
    choice?: VcsProvider | null,
  ): Promise<GitHubRepoSummary[]> {
    return (await this.provider(choice)).listRepos(query);
  }

  // ---------------------------------------------------------------------------
  // Issues
  // ---------------------------------------------------------------------------

  async getIssue(
    githubRepo: string,
    number: number,
    choice?: VcsProvider | null,
  ): Promise<GitHubIssue> {
    const { provider, owner, repo } = await this.resolve(githubRepo, choice);
    return provider.getIssue(owner, repo, number);
  }

  async createIssue(
    githubRepo: string,
    title: string,
    body: string,
    choice?: VcsProvider | null,
  ): Promise<GitHubCreatedIssue> {
    const { provider, owner, repo } = await this.resolve(githubRepo, choice);
    return provider.createIssue(owner, repo, title, body);
  }

  async setIssueState(
    githubRepo: string,
    number: number,
    state: GitHubIssueState,
    choice?: VcsProvider | null,
  ): Promise<GitHubIssue> {
    const { provider, owner, repo } = await this.resolve(githubRepo, choice);
    return provider.setIssueState(owner, repo, number, state);
  }

  async listIssues(
    githubRepo: string,
    state: GitHubIssueState | "all" = "open",
    assignee?: string,
    choice?: VcsProvider | null,
  ): Promise<GitHubIssue[]> {
    const { provider, owner, repo } = await this.resolve(githubRepo, choice);
    return provider.listIssues(owner, repo, state, assignee);
  }

  // ---------------------------------------------------------------------------
  // Pull Requests
  // ---------------------------------------------------------------------------

  async getPR(
    githubRepo: string,
    number: number,
    choice?: VcsProvider | null,
  ): Promise<GitHubPR> {
    const { provider, owner, repo } = await this.resolve(githubRepo, choice);
    return provider.getPR(owner, repo, number);
  }

  async listPRs(
    githubRepo: string,
    state: GitHubPRState = "open",
    choice?: VcsProvider | null,
  ): Promise<GitHubPR[]> {
    const { provider, owner, repo } = await this.resolve(githubRepo, choice);
    return provider.listPRs(owner, repo, state);
  }

  async mergePR(
    githubRepo: string,
    number: number,
    mergeMethod: GitHubMergeMethod = "squash",
    choice?: VcsProvider | null,
  ): Promise<GitHubMergeResult> {
    const { provider, owner, repo } = await this.resolve(githubRepo, choice);
    return provider.mergePR(owner, repo, number, mergeMethod);
  }

  // ---------------------------------------------------------------------------
  // Milestones
  // ---------------------------------------------------------------------------

  async listMilestones(
    githubRepo: string,
    choice?: VcsProvider | null,
  ): Promise<GitHubMilestone[]> {
    const { provider, owner, repo } = await this.resolve(githubRepo, choice);
    return provider.listMilestones(owner, repo);
  }

  // ---------------------------------------------------------------------------
  // Releases
  // ---------------------------------------------------------------------------

  async getLatestRelease(
    githubRepo: string,
    choice?: VcsProvider | null,
  ): Promise<GitHubRelease | null> {
    const { provider, owner, repo } = await this.resolve(githubRepo, choice);
    return provider.getLatestRelease(owner, repo);
  }

  // ---------------------------------------------------------------------------
  // Actions — Workflows
  // ---------------------------------------------------------------------------

  async listWorkflows(
    githubRepo: string,
    choice?: VcsProvider | null,
  ): Promise<GitHubWorkflow[]> {
    const { provider, owner, repo } = await this.resolve(githubRepo, choice);
    return provider.listWorkflows(owner, repo);
  }

  // ---------------------------------------------------------------------------
  // Actions — Workflow Runs
  // ---------------------------------------------------------------------------

  async listWorkflowRuns(
    githubRepo: string,
    options: {
      page?: number;
      perPage?: number;
      status?: string;
      branch?: string;
      event?: string;
    } = {},
    choice?: VcsProvider | null,
  ): Promise<{ runs: GitHubWorkflowRun[]; totalCount: number }> {
    const { provider, owner, repo } = await this.resolve(githubRepo, choice);
    return provider.listWorkflowRuns(owner, repo, options);
  }

  async cancelRun(
    githubRepo: string,
    runId: number,
    choice?: VcsProvider | null,
  ): Promise<void> {
    const { provider, owner, repo } = await this.resolve(githubRepo, choice);
    return provider.cancelRun(owner, repo, runId);
  }

  async rerunRun(
    githubRepo: string,
    runId: number,
    choice?: VcsProvider | null,
  ): Promise<void> {
    const { provider, owner, repo } = await this.resolve(githubRepo, choice);
    return provider.rerunRun(owner, repo, runId);
  }

  async rerunFailedJobs(
    githubRepo: string,
    runId: number,
    choice?: VcsProvider | null,
  ): Promise<void> {
    const { provider, owner, repo } = await this.resolve(githubRepo, choice);
    return provider.rerunFailedJobs(owner, repo, runId);
  }

  async triggerWorkflowDispatch(
    githubRepo: string,
    workflowId: number | string,
    ref: string,
    inputs?: Record<string, string>,
    choice?: VcsProvider | null,
  ): Promise<void> {
    const { provider, owner, repo } = await this.resolve(githubRepo, choice);
    return provider.triggerWorkflowDispatch(
      owner,
      repo,
      workflowId,
      ref,
      inputs,
    );
  }
}
