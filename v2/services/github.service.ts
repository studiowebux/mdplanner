// GitHub service — wraps GitHubProvider, auto-injects owner/repo from project config.
// Reads config on every call so token/repo changes in settings take effect immediately.

import { GitHubProvider } from "../providers/github.ts";
import type { ProjectService } from "./project.service.ts";
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

export class GitHubService {
  constructor(private projectService: ProjectService) {}

  // ---------------------------------------------------------------------------
  // Internal — resolve provider + owner/repo from current project config
  // ---------------------------------------------------------------------------

  private async resolve(): Promise<
    { provider: GitHubProvider; owner: string; repo: string }
  > {
    const config = await this.projectService.getConfig();
    if (!config.githubToken) {
      throw new Error(
        "GITHUB_TOKEN_NOT_CONFIGURED: set a GitHub PAT in Settings > Project",
      );
    }
    if (!config.githubRepo) {
      throw new Error(
        "GITHUB_REPO_NOT_CONFIGURED: set a GitHub repository in Settings > Project",
      );
    }
    const slash = config.githubRepo.indexOf("/");
    if (slash === -1) {
      throw new Error(
        `GITHUB_REPO_INVALID: expected "owner/repo", got "${config.githubRepo}"`,
      );
    }
    const owner = config.githubRepo.slice(0, slash);
    const repo = config.githubRepo.slice(slash + 1);
    return { provider: new GitHubProvider(config.githubToken), owner, repo };
  }

  private async provider(): Promise<GitHubProvider> {
    const config = await this.projectService.getConfig();
    if (!config.githubToken) {
      throw new Error(
        "GITHUB_TOKEN_NOT_CONFIGURED: set a GitHub PAT in Settings > Project",
      );
    }
    return new GitHubProvider(config.githubToken);
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  async getAuthenticatedUser(): Promise<GitHubUser> {
    return (await this.provider()).getAuthenticatedUser();
  }

  // ---------------------------------------------------------------------------
  // Repos
  // ---------------------------------------------------------------------------

  async getRepo(): Promise<GitHubRepo> {
    const { provider, owner, repo } = await this.resolve();
    return provider.getRepo(owner, repo);
  }

  async listRepos(query?: string): Promise<GitHubRepoSummary[]> {
    return (await this.provider()).listRepos(query);
  }

  // ---------------------------------------------------------------------------
  // Issues
  // ---------------------------------------------------------------------------

  async getIssue(number: number): Promise<GitHubIssue> {
    const { provider, owner, repo } = await this.resolve();
    return provider.getIssue(owner, repo, number);
  }

  async createIssue(
    title: string,
    body: string,
  ): Promise<GitHubCreatedIssue> {
    const { provider, owner, repo } = await this.resolve();
    return provider.createIssue(owner, repo, title, body);
  }

  async setIssueState(
    number: number,
    state: GitHubIssueState,
  ): Promise<GitHubIssue> {
    const { provider, owner, repo } = await this.resolve();
    return provider.setIssueState(owner, repo, number, state);
  }

  async listIssues(
    state: GitHubIssueState | "all" = "open",
    assignee?: string,
  ): Promise<GitHubIssue[]> {
    const { provider, owner, repo } = await this.resolve();
    return provider.listIssues(owner, repo, state, assignee);
  }

  // ---------------------------------------------------------------------------
  // Pull Requests
  // ---------------------------------------------------------------------------

  async getPR(number: number): Promise<GitHubPR> {
    const { provider, owner, repo } = await this.resolve();
    return provider.getPR(owner, repo, number);
  }

  async listPRs(state: GitHubPRState = "open"): Promise<GitHubPR[]> {
    const { provider, owner, repo } = await this.resolve();
    return provider.listPRs(owner, repo, state);
  }

  async mergePR(
    number: number,
    mergeMethod: GitHubMergeMethod = "squash",
  ): Promise<GitHubMergeResult> {
    const { provider, owner, repo } = await this.resolve();
    return provider.mergePR(owner, repo, number, mergeMethod);
  }

  // ---------------------------------------------------------------------------
  // Milestones
  // ---------------------------------------------------------------------------

  async listMilestones(): Promise<GitHubMilestone[]> {
    const { provider, owner, repo } = await this.resolve();
    return provider.listMilestones(owner, repo);
  }

  // ---------------------------------------------------------------------------
  // Releases
  // ---------------------------------------------------------------------------

  async getLatestRelease(): Promise<GitHubRelease | null> {
    const { provider, owner, repo } = await this.resolve();
    return provider.getLatestRelease(owner, repo);
  }

  // ---------------------------------------------------------------------------
  // Actions — Workflows
  // ---------------------------------------------------------------------------

  async listWorkflows(): Promise<GitHubWorkflow[]> {
    const { provider, owner, repo } = await this.resolve();
    return provider.listWorkflows(owner, repo);
  }

  // ---------------------------------------------------------------------------
  // Actions — Workflow Runs
  // ---------------------------------------------------------------------------

  async listWorkflowRuns(): Promise<GitHubWorkflowRun[]> {
    const { provider, owner, repo } = await this.resolve();
    return provider.listWorkflowRuns(owner, repo);
  }

  async cancelRun(runId: number): Promise<void> {
    const { provider, owner, repo } = await this.resolve();
    return provider.cancelRun(owner, repo, runId);
  }

  async rerunRun(runId: number): Promise<void> {
    const { provider, owner, repo } = await this.resolve();
    return provider.rerunRun(owner, repo, runId);
  }

  async rerunFailedJobs(runId: number): Promise<void> {
    const { provider, owner, repo } = await this.resolve();
    return provider.rerunFailedJobs(owner, repo, runId);
  }

  async triggerWorkflowDispatch(
    workflowId: number | string,
    ref: string,
    inputs?: Record<string, string>,
  ): Promise<void> {
    const { provider, owner, repo } = await this.resolve();
    return provider.triggerWorkflowDispatch(owner, repo, workflowId, ref, inputs);
  }
}
