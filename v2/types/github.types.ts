/**
 * GitHub REST API v3 types.
 * Pattern: Provider pattern — interfaces used by GitHubProvider.
 */

import { z } from "@hono/zod-openapi";

export const GITHUB_ISSUE_STATES = ["open", "closed"] as const;
export type GitHubIssueState = typeof GITHUB_ISSUE_STATES[number];

export const GITHUB_FILTER_STATES = ["open", "closed", "all"] as const;
export type GitHubFilterState = typeof GITHUB_FILTER_STATES[number];

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
  | typeof GITHUB_WORKFLOW_RUN_CONCLUSIONS[number]
  | null;

export const GITHUB_WORKFLOW_EVENTS = [
  "push",
  "pull_request",
  "schedule",
  "workflow_dispatch",
] as const;
export type GitHubWorkflowEvent = typeof GITHUB_WORKFLOW_EVENTS[number];

export const GITHUB_PIPELINES_PER_PAGE = 10;

export const GITHUB_PIPELINE_STATUSES = [
  "success",
  "failure",
  "cancelled",
  "timed_out",
  "in_progress",
  "queued",
] as const;
export type GitHubPipelineStatus = typeof GITHUB_PIPELINE_STATUSES[number];

export const GITHUB_WORKFLOW_STATES = [
  "active",
  "deleted",
  "disabled_fork",
  "disabled_inactivity",
  "disabled_manually",
] as const;
export type GitHubWorkflowState = typeof GITHUB_WORKFLOW_STATES[number];

// ---------------------------------------------------------------------------
// Interfaces
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

// ---------------------------------------------------------------------------
// Zod schemas — used for OpenAPI route definitions
// ---------------------------------------------------------------------------

export const GitHubRepoSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  stars: z.number(),
  openIssues: z.number(),
  openPRs: z.number(),
  lastCommitAt: z.string().nullable(),
  license: z.string().nullable(),
  htmlUrl: z.string(),
}).openapi("GitHubRepo");

export const GitHubIssueSchema = z.object({
  number: z.number(),
  title: z.string(),
  state: z.enum(GITHUB_ISSUE_STATES),
  labels: z.array(z.string()),
  assignee: z.string().nullable(),
  createdAt: z.string(),
  htmlUrl: z.string(),
}).openapi("GitHubIssue");

export const GitHubCreatedIssueSchema = z.object({
  number: z.number(),
  htmlUrl: z.string(),
}).openapi("GitHubCreatedIssue");

export const GitHubUserSchema = z.object({
  login: z.string(),
}).openapi("GitHubUser");

export const GitHubRepoSummarySchema = z.object({
  fullName: z.string(),
  description: z.string(),
}).openapi("GitHubRepoSummary");

export const GitHubMilestoneSchema = z.object({
  number: z.number(),
  title: z.string(),
  openIssues: z.number(),
  closedIssues: z.number(),
  htmlUrl: z.string(),
}).openapi("GitHubMilestone");

export const GitHubPRSchema = z.object({
  number: z.number(),
  title: z.string(),
  state: z.enum(GITHUB_ISSUE_STATES),
  merged: z.boolean(),
  assignee: z.string().nullable(),
  headBranch: z.string(),
  createdAt: z.string(),
  reviewDecision: z.string().nullable(),
  htmlUrl: z.string(),
}).openapi("GitHubPR");

export const GitHubMergeResultSchema = z.object({
  sha: z.string(),
  merged: z.boolean(),
  message: z.string(),
}).openapi("GitHubMergeResult");

export const GitHubWorkflowRunSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.enum(GITHUB_WORKFLOW_RUN_STATUSES),
  conclusion: z.enum(GITHUB_WORKFLOW_RUN_CONCLUSIONS).nullable(),
  headBranch: z.string(),
  event: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  htmlUrl: z.string(),
}).openapi("GitHubWorkflowRun");

export const GitHubWorkflowSchema = z.object({
  id: z.number(),
  name: z.string(),
  path: z.string(),
  state: z.enum(GITHUB_WORKFLOW_STATES),
  htmlUrl: z.string(),
}).openapi("GitHubWorkflow");

export const GitHubReleaseSchema = z.object({
  tagName: z.string(),
  name: z.string().nullable(),
  publishedAt: z.string().nullable(),
  htmlUrl: z.string(),
}).openapi("GitHubRelease");

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

export const ListIssuesQuerySchema = z.object({
  state: z.enum(GITHUB_FILTER_STATES).optional().openapi({
    description: "Filter by state (default: open)",
  }),
  assignee: z.string().optional().openapi({
    description: "Filter by assignee login",
  }),
}).openapi("ListIssuesQuery");

export const ListPRsQuerySchema = z.object({
  state: z.enum(GITHUB_PR_STATES).optional().openapi({
    description: "Filter by state (default: open)",
  }),
}).openapi("ListPRsQuery");

// ---------------------------------------------------------------------------
// IGitProvider — shared interface for multi-forge support (GitHub, Gitea)
// ---------------------------------------------------------------------------

export interface IGitProvider {
  getAuthenticatedUser(): Promise<GitHubUser>;
  getRepo(owner: string, repo: string): Promise<GitHubRepo>;
  listRepos(query?: string): Promise<GitHubRepoSummary[]>;
  getIssue(owner: string, repo: string, number: number): Promise<GitHubIssue>;
  createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
  ): Promise<GitHubCreatedIssue>;
  setIssueState(
    owner: string,
    repo: string,
    number: number,
    state: GitHubIssueState,
  ): Promise<GitHubIssue>;
  listIssues(
    owner: string,
    repo: string,
    state?: GitHubIssueState | "all",
    assignee?: string,
  ): Promise<GitHubIssue[]>;
  getPR(owner: string, repo: string, number: number): Promise<GitHubPR>;
  listPRs(
    owner: string,
    repo: string,
    state?: GitHubPRState,
  ): Promise<GitHubPR[]>;
  mergePR(
    owner: string,
    repo: string,
    number: number,
    mergeMethod?: GitHubMergeMethod,
  ): Promise<GitHubMergeResult>;
  listMilestones(owner: string, repo: string): Promise<GitHubMilestone[]>;
  getLatestRelease(
    owner: string,
    repo: string,
  ): Promise<GitHubRelease | null>;
  listWorkflows(owner: string, repo: string): Promise<GitHubWorkflow[]>;
  listWorkflowRuns(
    owner: string,
    repo: string,
    options?: {
      page?: number;
      perPage?: number;
      status?: string;
      branch?: string;
      event?: string;
    },
  ): Promise<{ runs: GitHubWorkflowRun[]; totalCount: number }>;
  cancelRun(owner: string, repo: string, runId: number): Promise<void>;
  rerunRun(owner: string, repo: string, runId: number): Promise<void>;
  rerunFailedJobs(owner: string, repo: string, runId: number): Promise<void>;
  triggerWorkflowDispatch(
    owner: string,
    repo: string,
    workflowId: number | string,
    ref: string,
    inputs?: Record<string, string>,
  ): Promise<void>;
}

// ---------------------------------------------------------------------------
// Reusable input fields
// ---------------------------------------------------------------------------

export const GitHubRepoInput = z.string().describe(
  "GitHub repository in owner/repo format",
);

export const GitHubNumberInput = z.number().describe(
  "GitHub issue or PR number",
);

// NumberParam — for GitHub issue/PR number path params (:number).
// For portfolio :id path params reuse IdParam from types/api.ts.
export const NumberParam = z.object({
  number: z.string().openapi({ param: { name: "number", in: "path" } }),
});

export const RunIdParam = z.object({
  runId: z.string().openapi({ param: { name: "runId", in: "path" } }),
});

export const WorkflowIdParam = z.object({
  workflowId: z.string().openapi({
    param: { name: "workflowId", in: "path" },
  }),
});

export const CreateIssueBodySchema = z.object({
  title: z.string().min(1).openapi({ description: "Issue title" }),
  body: z.string().openapi({ description: "Issue body (markdown)" }),
}).openapi("CreateIssueBody");

export const PatchIssueBodySchema = z.object({
  state: z.enum(GITHUB_ISSUE_STATES).openapi({ description: "New state" }),
}).openapi("PatchIssueBody");

export const MergePRBodySchema = z.object({
  mergeMethod: z.enum(GITHUB_MERGE_METHODS).optional().openapi({
    description: "Merge method (default: squash)",
  }),
}).openapi("MergePRBody");

export const WorkflowDispatchBodySchema = z.object({
  ref: z.string().openapi({ description: "Branch or tag to run on" }),
  inputs: z.record(z.string()).optional().openapi({
    description: "Workflow input parameters",
  }),
}).openapi("WorkflowDispatchBody");

// ---------------------------------------------------------------------------
// Task GitHub linking schemas
// ---------------------------------------------------------------------------

export const LinkIssueInputSchema = z.object({
  githubRepo: GitHubRepoInput,
  issueNumber: GitHubNumberInput.describe("GitHub issue number"),
  prNumber: GitHubNumberInput.optional().describe(
    "GitHub PR number (optional, link both at once)",
  ),
}).openapi("LinkIssueInput");

export const LinkPRInputSchema = z.object({
  githubRepo: GitHubRepoInput,
  prNumber: GitHubNumberInput.describe("GitHub PR number"),
}).openapi("LinkPRInput");

export const UnlinkGitHubInputSchema = z.object({
  unlinkIssue: z.boolean().optional().openapi({
    description: "Unlink the GitHub issue (default: true)",
  }),
  unlinkPR: z.boolean().optional().openapi({
    description: "Unlink the GitHub PR (default: true)",
  }),
}).openapi("UnlinkGitHubInput");
