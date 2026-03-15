/**
 * GitHubProvider interface — provider pattern for GitHub REST API v3.
 * Pattern: Provider pattern — define interface, implement per vendor.
 */

export interface GitHubRepo {
  owner: string;
  repo: string;
  stars: number;
  openIssues: number;
  openPRs: number;
  lastCommitAt: string | null;
  license: string | null;
  htmlUrl: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  labels: string[];
  assignee: string | null;
  createdAt: string;
  htmlUrl: string;
}

export interface GitHubCreatedIssue {
  number: number;
  htmlUrl: string;
}

export interface GitHubUser {
  login: string;
}

export interface GitHubRepoSummary {
  fullName: string;
  description: string;
}

export interface GitHubMilestone {
  number: number;
  title: string;
  openIssues: number;
  closedIssues: number;
  htmlUrl: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  /** "open" | "closed" — use merged to distinguish closed+merged */
  state: "open" | "closed";
  merged: boolean;
  assignee: string | null;
  headBranch: string;
  createdAt: string;
  reviewDecision: string | null;
  htmlUrl: string;
}

export interface GitHubMergeResult {
  sha: string;
  merged: boolean;
  message: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed" | "waiting";
  conclusion:
    | "success"
    | "failure"
    | "neutral"
    | "skipped"
    | "cancelled"
    | "timed_out"
    | "action_required"
    | null;
  headBranch: string;
  event: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

export interface GitHubRelease {
  tagName: string;
  name: string | null;
  publishedAt: string | null;
  htmlUrl: string;
}

export interface GitHubProvider {
  /** Verify the PAT and return the authenticated user. */
  getAuthenticatedUser(): Promise<GitHubUser>;

  /** Fetch repository summary (stars, open issues, last commit, license). */
  getRepo(owner: string, repo: string): Promise<GitHubRepo>;

  /** Fetch a single issue by number. */
  getIssue(owner: string, repo: string, number: number): Promise<GitHubIssue>;

  /** Create a new issue and return the created issue number and URL. */
  createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
  ): Promise<GitHubCreatedIssue>;

  /** List repos accessible to the authenticated user, optionally filtered by query. */
  listRepos(query?: string): Promise<GitHubRepoSummary[]>;

  /** List open milestones for a repository. */
  listMilestones(
    owner: string,
    repo: string,
  ): Promise<GitHubMilestone[]>;

  /** Fetch a single pull request by number. */
  getPR(
    owner: string,
    repo: string,
    number: number,
  ): Promise<GitHubPR>;

  /** List recent workflow runs for a repository. */
  listWorkflowRuns(
    owner: string,
    repo: string,
  ): Promise<GitHubWorkflowRun[]>;

  /** Fetch the latest published release for a repository. Returns null if none exist. */
  getLatestRelease(
    owner: string,
    repo: string,
  ): Promise<GitHubRelease | null>;

  /** Set an issue's state to "open" or "closed". */
  setIssueState(
    owner: string,
    repo: string,
    number: number,
    state: "open" | "closed",
  ): Promise<GitHubIssue>;

  /** List issues for a repository, optionally filtered by state and assignee. */
  listIssues(
    owner: string,
    repo: string,
    state?: "open" | "closed" | "all",
    assignee?: string,
  ): Promise<GitHubIssue[]>;

  /** List pull requests for a repository, optionally filtered by state. */
  listPRs(
    owner: string,
    repo: string,
    state?: "open" | "closed" | "all",
  ): Promise<GitHubPR[]>;

  /** Merge a pull request. */
  mergePR(
    owner: string,
    repo: string,
    number: number,
    mergeMethod?: "merge" | "squash" | "rebase",
  ): Promise<GitHubMergeResult>;
}
