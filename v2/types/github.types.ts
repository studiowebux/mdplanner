/**
 * GitHub REST API v3 types.
 * Pattern: Provider pattern — interfaces used by GitHubProvider.
 */

export const GITHUB_ISSUE_STATES = ["open", "closed"] as const;
export type GitHubIssueState = typeof GITHUB_ISSUE_STATES[number];

export const GITHUB_PR_STATES = ["open", "closed", "all"] as const;
export type GitHubPRState = typeof GITHUB_PR_STATES[number];

export const GITHUB_MERGE_METHODS = ["merge", "squash", "rebase"] as const;
export type GitHubMergeMethod = typeof GITHUB_MERGE_METHODS[number];

export const GITHUB_WORKFLOW_RUN_STATUSES = [
  "queued",
  "in_progress",
  "completed",
  "waiting",
] as const;
export type GitHubWorkflowRunStatus =
  typeof GITHUB_WORKFLOW_RUN_STATUSES[number];

export const GITHUB_WORKFLOW_RUN_CONCLUSIONS = [
  "success",
  "failure",
  "neutral",
  "skipped",
  "cancelled",
  "timed_out",
  "action_required",
] as const;
export type GitHubWorkflowRunConclusion =
  typeof GITHUB_WORKFLOW_RUN_CONCLUSIONS[number] | null;

export const GITHUB_WORKFLOW_STATES = [
  "active",
  "deleted",
  "disabled_fork",
  "disabled_inactivity",
  "disabled_manually",
] as const;
export type GitHubWorkflowState = typeof GITHUB_WORKFLOW_STATES[number];

// ---------------------------------------------------------------------------

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
  state: GitHubIssueState;
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
  /** Use merged to distinguish closed+merged from closed without merge. */
  state: GitHubIssueState;
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
  status: GitHubWorkflowRunStatus;
  conclusion: GitHubWorkflowRunConclusion;
  headBranch: string;
  event: string;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

export interface GitHubWorkflow {
  id: number;
  name: string;
  /** Relative path, e.g. ".github/workflows/ci.yml" */
  path: string;
  state: GitHubWorkflowState;
  htmlUrl: string;
}

export interface GitHubRelease {
  tagName: string;
  name: string | null;
  publishedAt: string | null;
  htmlUrl: string;
}
