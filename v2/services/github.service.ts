// GitHub service — wraps GitHubProvider.
// Token from project config, repo from portfolio item (passed by caller).

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
  // Internal
  // ---------------------------------------------------------------------------

  private async resolve(githubRepo: string): Promise<
    { provider: GitHubProvider; owner: string; repo: string }
  > {
    const provider = await this.provider();
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

  async getRepo(githubRepo: string): Promise<GitHubRepo> {
    const { provider, owner, repo } = await this.resolve(githubRepo);
    return provider.getRepo(owner, repo);
  }

  async listRepos(query?: string): Promise<GitHubRepoSummary[]> {
    return (await this.provider()).listRepos(query);
  }

  // ---------------------------------------------------------------------------
  // Issues
  // ---------------------------------------------------------------------------

  async getIssue(githubRepo: string, number: number): Promise<GitHubIssue> {
    const { provider, owner, repo } = await this.resolve(githubRepo);
    return provider.getIssue(owner, repo, number);
  }

  async createIssue(
    githubRepo: string,
    title: string,
    body: string,
  ): Promise<GitHubCreatedIssue> {
    const { provider, owner, repo } = await this.resolve(githubRepo);
    return provider.createIssue(owner, repo, title, body);
  }

  async setIssueState(
    githubRepo: string,
    number: number,
    state: GitHubIssueState,
  ): Promise<GitHubIssue> {
    const { provider, owner, repo } = await this.resolve(githubRepo);
    return provider.setIssueState(owner, repo, number, state);
  }

  async listIssues(
    githubRepo: string,
    state: GitHubIssueState | "all" = "open",
    assignee?: string,
  ): Promise<GitHubIssue[]> {
    const { provider, owner, repo } = await this.resolve(githubRepo);
    return provider.listIssues(owner, repo, state, assignee);
  }

  // ---------------------------------------------------------------------------
  // Pull Requests
  // ---------------------------------------------------------------------------

  async getPR(githubRepo: string, number: number): Promise<GitHubPR> {
    const { provider, owner, repo } = await this.resolve(githubRepo);
    return provider.getPR(owner, repo, number);
  }

  async listPRs(
    githubRepo: string,
    state: GitHubPRState = "open",
  ): Promise<GitHubPR[]> {
    const { provider, owner, repo } = await this.resolve(githubRepo);
    return provider.listPRs(owner, repo, state);
  }

  async mergePR(
    githubRepo: string,
    number: number,
    mergeMethod: GitHubMergeMethod = "squash",
  ): Promise<GitHubMergeResult> {
    const { provider, owner, repo } = await this.resolve(githubRepo);
    return provider.mergePR(owner, repo, number, mergeMethod);
  }

  // ---------------------------------------------------------------------------
  // Milestones
  // ---------------------------------------------------------------------------

  async listMilestones(githubRepo: string): Promise<GitHubMilestone[]> {
    const { provider, owner, repo } = await this.resolve(githubRepo);
    return provider.listMilestones(owner, repo);
  }

  // ---------------------------------------------------------------------------
  // Releases
  // ---------------------------------------------------------------------------

  async getLatestRelease(
    githubRepo: string,
  ): Promise<GitHubRelease | null> {
    const { provider, owner, repo } = await this.resolve(githubRepo);
    return provider.getLatestRelease(owner, repo);
  }

  // ---------------------------------------------------------------------------
  // Actions — Workflows
  // ---------------------------------------------------------------------------

  async listWorkflows(githubRepo: string): Promise<GitHubWorkflow[]> {
    const { provider, owner, repo } = await this.resolve(githubRepo);
    return provider.listWorkflows(owner, repo);
  }

  // ---------------------------------------------------------------------------
  // Actions — Workflow Runs
  // ---------------------------------------------------------------------------

  async listWorkflowRuns(
    githubRepo: string,
  ): Promise<GitHubWorkflowRun[]> {
    const { provider, owner, repo } = await this.resolve(githubRepo);
    return provider.listWorkflowRuns(owner, repo);
  }

  async cancelRun(githubRepo: string, runId: number): Promise<void> {
    const { provider, owner, repo } = await this.resolve(githubRepo);
    return provider.cancelRun(owner, repo, runId);
  }

  async rerunRun(githubRepo: string, runId: number): Promise<void> {
    const { provider, owner, repo } = await this.resolve(githubRepo);
    return provider.rerunRun(owner, repo, runId);
  }

  async rerunFailedJobs(githubRepo: string, runId: number): Promise<void> {
    const { provider, owner, repo } = await this.resolve(githubRepo);
    return provider.rerunFailedJobs(owner, repo, runId);
  }

  async triggerWorkflowDispatch(
    githubRepo: string,
    workflowId: number | string,
    ref: string,
    inputs?: Record<string, string>,
  ): Promise<void> {
    const { provider, owner, repo } = await this.resolve(githubRepo);
    return provider.triggerWorkflowDispatch(
      owner,
      repo,
      workflowId,
      ref,
      inputs,
    );
  }
}
