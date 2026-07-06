// GitHub API routes — nested under /portfolio/{id}/github.
// Resolves githubRepo from the portfolio item, token from project config.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getGitHubService } from "../../../singletons/services.ts";
import {
  errorContent,
  jsonContent,
  notFoundContent,
} from "../../../types/api.ts";
import {
  CreateIssueBodySchema,
  GitHubCreatedIssueSchema,
  GitHubIssueSchema,
  GitHubMergeResultSchema,
  GitHubMilestoneSchema,
  GitHubPRSchema,
  GitHubReleaseSchema,
  GitHubRepoSchema,
  GitHubWorkflowRunSchema,
  GitHubWorkflowSchema,
  ListIssuesQuerySchema,
  ListPRsQuerySchema,
  MergePRBodySchema,
  NumberParam,
  PatchIssueBodySchema,
  RunIdParam,
  WorkflowDispatchBodySchema,
  WorkflowIdParam,
} from "../../../types/github.types.ts";
import { githubOnError, resolveRepo } from "./helpers.ts";

export const githubRouter = new OpenAPIHono();

// Map thrown errors (resolveRepo config failures + GitHub service errors) to
// JSON responses once, so handlers throw instead of repeating try/catch.
githubRouter.onError(githubOnError);

// ---------------------------------------------------------------------------
// Repo
// ---------------------------------------------------------------------------

githubRouter.openapi(
  createRoute({
    method: "get",
    path: "/repo",
    tags: ["GitHub"],
    summary: "Get repository summary",
    operationId: "githubGetRepo",
    responses: {
      200: jsonContent(GitHubRepoSchema, "Repository summary"),
      400: errorContent("Not configured"),
      404: errorContent("Portfolio not found"),
      502: errorContent("GitHub API error"),
    },
  }),
  async (c) => {
    const { repo, provider } = await resolveRepo(c);
    return c.json(await getGitHubService().getRepo(repo, provider), 200);
  },
);

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

githubRouter.openapi(
  createRoute({
    method: "get",
    path: "/issues",
    tags: ["GitHub"],
    summary: "List issues",
    operationId: "githubListIssues",
    request: { query: ListIssuesQuerySchema },
    responses: {
      200: jsonContent(z.array(GitHubIssueSchema), "List of issues"),
      400: errorContent("Not configured"),
      404: errorContent("Portfolio not found"),
      502: errorContent("GitHub API error"),
    },
  }),
  async (c) => {
    const { repo, provider } = await resolveRepo(c);
    const { state, assignee } = c.req.valid("query");
    return c.json(
      await getGitHubService().listIssues(repo, state, assignee, provider),
      200,
    );
  },
);

githubRouter.openapi(
  createRoute({
    method: "get",
    path: "/issues/{number}",
    tags: ["GitHub"],
    summary: "Get issue by number",
    operationId: "githubGetIssue",
    request: { params: NumberParam },
    responses: {
      200: jsonContent(GitHubIssueSchema, "Issue"),
      400: errorContent("Not configured"),
      404: notFoundContent,
      502: errorContent("GitHub API error"),
    },
  }),
  async (c) => {
    const { repo, provider } = await resolveRepo(c);
    const { number } = c.req.valid("param");
    return c.json(
      await getGitHubService().getIssue(repo, Number(number), provider),
      200,
    );
  },
);

githubRouter.openapi(
  createRoute({
    method: "post",
    path: "/issues",
    tags: ["GitHub"],
    summary: "Create issue",
    operationId: "githubCreateIssue",
    request: {
      body: {
        content: { "application/json": { schema: CreateIssueBodySchema } },
        required: true,
      },
    },
    responses: {
      201: jsonContent(GitHubCreatedIssueSchema, "Created issue"),
      400: errorContent("Not configured"),
      404: errorContent("Portfolio not found"),
      502: errorContent("GitHub API error"),
    },
  }),
  async (c) => {
    const { repo, provider } = await resolveRepo(c);
    const { title, body } = c.req.valid("json");
    return c.json(
      await getGitHubService().createIssue(repo, title, body, provider),
      201,
    );
  },
);

githubRouter.openapi(
  createRoute({
    method: "patch",
    path: "/issues/{number}",
    tags: ["GitHub"],
    summary: "Open or close an issue",
    operationId: "githubPatchIssue",
    request: {
      params: NumberParam,
      body: {
        content: { "application/json": { schema: PatchIssueBodySchema } },
        required: true,
      },
    },
    responses: {
      200: jsonContent(GitHubIssueSchema, "Updated issue"),
      400: errorContent("Not configured"),
      404: notFoundContent,
      502: errorContent("GitHub API error"),
    },
  }),
  async (c) => {
    const { repo, provider } = await resolveRepo(c);
    const { number } = c.req.valid("param");
    const { state } = c.req.valid("json");
    return c.json(
      await getGitHubService().setIssueState(
        repo,
        Number(number),
        state,
        provider,
      ),
      200,
    );
  },
);

// ---------------------------------------------------------------------------
// Pull Requests
// ---------------------------------------------------------------------------

githubRouter.openapi(
  createRoute({
    method: "get",
    path: "/pulls",
    tags: ["GitHub"],
    summary: "List pull requests",
    operationId: "githubListPRs",
    request: { query: ListPRsQuerySchema },
    responses: {
      200: jsonContent(z.array(GitHubPRSchema), "List of pull requests"),
      400: errorContent("Not configured"),
      404: errorContent("Portfolio not found"),
      502: errorContent("GitHub API error"),
    },
  }),
  async (c) => {
    const { repo, provider } = await resolveRepo(c);
    const { state } = c.req.valid("query");
    return c.json(await getGitHubService().listPRs(repo, state, provider), 200);
  },
);

githubRouter.openapi(
  createRoute({
    method: "get",
    path: "/pulls/{number}",
    tags: ["GitHub"],
    summary: "Get pull request by number",
    operationId: "githubGetPR",
    request: { params: NumberParam },
    responses: {
      200: jsonContent(GitHubPRSchema, "Pull request"),
      400: errorContent("Not configured"),
      404: notFoundContent,
      502: errorContent("GitHub API error"),
    },
  }),
  async (c) => {
    const { repo, provider } = await resolveRepo(c);
    const { number } = c.req.valid("param");
    return c.json(
      await getGitHubService().getPR(repo, Number(number), provider),
      200,
    );
  },
);

githubRouter.openapi(
  createRoute({
    method: "put",
    path: "/pulls/{number}/merge",
    tags: ["GitHub"],
    summary: "Merge a pull request",
    operationId: "githubMergePR",
    request: {
      params: NumberParam,
      body: {
        content: { "application/json": { schema: MergePRBodySchema } },
        required: false,
      },
    },
    responses: {
      200: jsonContent(GitHubMergeResultSchema, "Merge result"),
      400: errorContent("Not configured"),
      404: notFoundContent,
      502: errorContent("GitHub API error"),
    },
  }),
  async (c) => {
    const { repo, provider } = await resolveRepo(c);
    const { number } = c.req.valid("param");
    const body = c.req.valid("json");
    return c.json(
      await getGitHubService().mergePR(
        repo,
        Number(number),
        body?.mergeMethod,
        provider,
      ),
      200,
    );
  },
);

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

githubRouter.openapi(
  createRoute({
    method: "get",
    path: "/milestones",
    tags: ["GitHub"],
    summary: "List open milestones",
    operationId: "githubListMilestones",
    responses: {
      200: jsonContent(z.array(GitHubMilestoneSchema), "List of milestones"),
      400: errorContent("Not configured"),
      404: errorContent("Portfolio not found"),
      502: errorContent("GitHub API error"),
    },
  }),
  async (c) => {
    const { repo, provider } = await resolveRepo(c);
    return c.json(
      await getGitHubService().listMilestones(repo, provider),
      200,
    );
  },
);

// ---------------------------------------------------------------------------
// Releases
// ---------------------------------------------------------------------------

githubRouter.openapi(
  createRoute({
    method: "get",
    path: "/releases/latest",
    tags: ["GitHub"],
    summary: "Get latest release",
    operationId: "githubGetLatestRelease",
    responses: {
      200: jsonContent(GitHubReleaseSchema, "Latest release"),
      204: { description: "No releases exist" },
      400: errorContent("Not configured"),
      404: errorContent("Portfolio not found"),
      502: errorContent("GitHub API error"),
    },
  }),
  async (c) => {
    const { repo, provider } = await resolveRepo(c);
    const release = await getGitHubService().getLatestRelease(repo, provider);
    if (!release) return c.body(null, 204);
    return c.json(release, 200);
  },
);

// ---------------------------------------------------------------------------
// Actions — Workflow Runs
// ---------------------------------------------------------------------------

githubRouter.openapi(
  createRoute({
    method: "get",
    path: "/actions/runs",
    tags: ["GitHub"],
    summary: "List workflow runs",
    operationId: "githubListWorkflowRuns",
    responses: {
      200: jsonContent(
        z.array(GitHubWorkflowRunSchema),
        "List of workflow runs",
      ),
      400: errorContent("Not configured"),
      404: errorContent("Portfolio not found"),
      502: errorContent("GitHub API error"),
    },
  }),
  async (c) => {
    const { repo, provider } = await resolveRepo(c);
    const { runs } = await getGitHubService().listWorkflowRuns(
      repo,
      {},
      provider,
    );
    return c.json(runs, 200);
  },
);

githubRouter.openapi(
  createRoute({
    method: "post",
    path: "/actions/runs/{runId}/cancel",
    tags: ["GitHub"],
    summary: "Cancel a workflow run",
    operationId: "githubCancelRun",
    request: { params: RunIdParam },
    responses: {
      204: { description: "Cancelled" },
      400: errorContent("Not configured"),
      404: notFoundContent,
      502: errorContent("GitHub API error"),
    },
  }),
  async (c) => {
    const { repo, provider } = await resolveRepo(c);
    const { runId } = c.req.valid("param");
    await getGitHubService().cancelRun(repo, Number(runId), provider);
    return c.body(null, 204);
  },
);

githubRouter.openapi(
  createRoute({
    method: "post",
    path: "/actions/runs/{runId}/rerun",
    tags: ["GitHub"],
    summary: "Re-run all jobs in a workflow run",
    operationId: "githubRerunRun",
    request: { params: RunIdParam },
    responses: {
      204: { description: "Re-run triggered" },
      400: errorContent("Not configured"),
      404: notFoundContent,
      502: errorContent("GitHub API error"),
    },
  }),
  async (c) => {
    const { repo, provider } = await resolveRepo(c);
    const { runId } = c.req.valid("param");
    await getGitHubService().rerunRun(repo, Number(runId), provider);
    return c.body(null, 204);
  },
);

githubRouter.openapi(
  createRoute({
    method: "post",
    path: "/actions/runs/{runId}/rerun-failed",
    tags: ["GitHub"],
    summary: "Re-run failed jobs in a workflow run",
    operationId: "githubRerunFailedJobs",
    request: { params: RunIdParam },
    responses: {
      204: { description: "Re-run triggered" },
      400: errorContent("Not configured"),
      404: notFoundContent,
      502: errorContent("GitHub API error"),
    },
  }),
  async (c) => {
    const { repo, provider } = await resolveRepo(c);
    const { runId } = c.req.valid("param");
    await getGitHubService().rerunFailedJobs(repo, Number(runId), provider);
    return c.body(null, 204);
  },
);

// ---------------------------------------------------------------------------
// Actions — Workflows
// ---------------------------------------------------------------------------

githubRouter.openapi(
  createRoute({
    method: "get",
    path: "/actions/workflows",
    tags: ["GitHub"],
    summary: "List workflows",
    operationId: "githubListWorkflows",
    responses: {
      200: jsonContent(z.array(GitHubWorkflowSchema), "List of workflows"),
      400: errorContent("Not configured"),
      404: errorContent("Portfolio not found"),
      502: errorContent("GitHub API error"),
    },
  }),
  async (c) => {
    const { repo, provider } = await resolveRepo(c);
    return c.json(await getGitHubService().listWorkflows(repo, provider), 200);
  },
);

githubRouter.openapi(
  createRoute({
    method: "post",
    path: "/actions/workflows/{workflowId}/dispatch",
    tags: ["GitHub"],
    summary: "Trigger a workflow dispatch event",
    operationId: "githubWorkflowDispatch",
    request: {
      params: WorkflowIdParam,
      body: {
        content: { "application/json": { schema: WorkflowDispatchBodySchema } },
        required: true,
      },
    },
    responses: {
      204: { description: "Dispatch triggered" },
      400: errorContent("Not configured"),
      404: notFoundContent,
      502: errorContent("GitHub API error"),
    },
  }),
  async (c) => {
    const { repo, provider } = await resolveRepo(c);
    const { workflowId } = c.req.valid("param");
    const { ref, inputs } = c.req.valid("json");
    await getGitHubService().triggerWorkflowDispatch(
      repo,
      workflowId,
      ref,
      inputs,
      provider,
    );
    return c.body(null, 204);
  },
);
