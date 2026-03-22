// GitHub API routes — nested under /portfolio/{id}/github.
// Resolves githubRepo from the portfolio item, token from project config.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getGitHubService } from "../../../singletons/services.ts";
import { ErrorSchema } from "../../../types/api.ts";
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
import { githubError, resolveRepo } from "./helpers.ts";

export const githubRouter = new OpenAPIHono();

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
      200: {
        content: { "application/json": { schema: GitHubRepoSchema } },
        description: "Repository summary",
      },
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not configured",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Portfolio not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "GitHub API error",
      },
    },
  }),
  async (c) => {
    try {
      const repo = await resolveRepo(c);
      if (typeof repo !== "string") return repo;
      return c.json(await getGitHubService().getRepo(repo), 200);
    } catch (err) {
      return githubError(c, err);
    }
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
      200: {
        content: {
          "application/json": { schema: z.array(GitHubIssueSchema) },
        },
        description: "List of issues",
      },
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not configured",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Portfolio not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "GitHub API error",
      },
    },
  }),
  async (c) => {
    try {
      const repo = await resolveRepo(c);
      if (typeof repo !== "string") return repo;
      const { state, assignee } = c.req.valid("query");
      return c.json(
        await getGitHubService().listIssues(repo, state, assignee),
        200,
      );
    } catch (err) {
      return githubError(c, err);
    }
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
      200: {
        content: { "application/json": { schema: GitHubIssueSchema } },
        description: "Issue",
      },
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not configured",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "GitHub API error",
      },
    },
  }),
  async (c) => {
    try {
      const repo = await resolveRepo(c);
      if (typeof repo !== "string") return repo;
      const { number } = c.req.valid("param");
      return c.json(
        await getGitHubService().getIssue(repo, Number(number)),
        200,
      );
    } catch (err) {
      return githubError(c, err);
    }
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
      201: {
        content: { "application/json": { schema: GitHubCreatedIssueSchema } },
        description: "Created issue",
      },
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not configured",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Portfolio not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "GitHub API error",
      },
    },
  }),
  async (c) => {
    try {
      const repo = await resolveRepo(c);
      if (typeof repo !== "string") return repo;
      const { title, body } = c.req.valid("json");
      return c.json(
        await getGitHubService().createIssue(repo, title, body),
        201,
      );
    } catch (err) {
      return githubError(c, err);
    }
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
      200: {
        content: { "application/json": { schema: GitHubIssueSchema } },
        description: "Updated issue",
      },
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not configured",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "GitHub API error",
      },
    },
  }),
  async (c) => {
    try {
      const repo = await resolveRepo(c);
      if (typeof repo !== "string") return repo;
      const { number } = c.req.valid("param");
      const { state } = c.req.valid("json");
      return c.json(
        await getGitHubService().setIssueState(repo, Number(number), state),
        200,
      );
    } catch (err) {
      return githubError(c, err);
    }
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
      200: {
        content: { "application/json": { schema: z.array(GitHubPRSchema) } },
        description: "List of pull requests",
      },
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not configured",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Portfolio not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "GitHub API error",
      },
    },
  }),
  async (c) => {
    try {
      const repo = await resolveRepo(c);
      if (typeof repo !== "string") return repo;
      const { state } = c.req.valid("query");
      return c.json(await getGitHubService().listPRs(repo, state), 200);
    } catch (err) {
      return githubError(c, err);
    }
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
      200: {
        content: { "application/json": { schema: GitHubPRSchema } },
        description: "Pull request",
      },
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not configured",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "GitHub API error",
      },
    },
  }),
  async (c) => {
    try {
      const repo = await resolveRepo(c);
      if (typeof repo !== "string") return repo;
      const { number } = c.req.valid("param");
      return c.json(
        await getGitHubService().getPR(repo, Number(number)),
        200,
      );
    } catch (err) {
      return githubError(c, err);
    }
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
      200: {
        content: { "application/json": { schema: GitHubMergeResultSchema } },
        description: "Merge result",
      },
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not configured",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "GitHub API error",
      },
    },
  }),
  async (c) => {
    try {
      const repo = await resolveRepo(c);
      if (typeof repo !== "string") return repo;
      const { number } = c.req.valid("param");
      const body = c.req.valid("json");
      return c.json(
        await getGitHubService().mergePR(
          repo,
          Number(number),
          body?.mergeMethod,
        ),
        200,
      );
    } catch (err) {
      return githubError(c, err);
    }
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
      200: {
        content: {
          "application/json": { schema: z.array(GitHubMilestoneSchema) },
        },
        description: "List of milestones",
      },
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not configured",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Portfolio not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "GitHub API error",
      },
    },
  }),
  async (c) => {
    try {
      const repo = await resolveRepo(c);
      if (typeof repo !== "string") return repo;
      return c.json(await getGitHubService().listMilestones(repo), 200);
    } catch (err) {
      return githubError(c, err);
    }
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
      200: {
        content: { "application/json": { schema: GitHubReleaseSchema } },
        description: "Latest release",
      },
      204: { description: "No releases exist" },
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not configured",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Portfolio not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "GitHub API error",
      },
    },
  }),
  async (c) => {
    try {
      const repo = await resolveRepo(c);
      if (typeof repo !== "string") return repo;
      const release = await getGitHubService().getLatestRelease(repo);
      if (!release) return new Response(null, { status: 204 });
      return c.json(release, 200);
    } catch (err) {
      return githubError(c, err);
    }
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
      200: {
        content: {
          "application/json": { schema: z.array(GitHubWorkflowRunSchema) },
        },
        description: "List of workflow runs",
      },
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not configured",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Portfolio not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "GitHub API error",
      },
    },
  }),
  async (c) => {
    try {
      const repo = await resolveRepo(c);
      if (typeof repo !== "string") return repo;
      return c.json(await getGitHubService().listWorkflowRuns(repo), 200);
    } catch (err) {
      return githubError(c, err);
    }
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
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not configured",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "GitHub API error",
      },
    },
  }),
  async (c) => {
    try {
      const repo = await resolveRepo(c);
      if (typeof repo !== "string") return repo;
      const { runId } = c.req.valid("param");
      await getGitHubService().cancelRun(repo, Number(runId));
      return new Response(null, { status: 204 });
    } catch (err) {
      return githubError(c, err);
    }
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
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not configured",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "GitHub API error",
      },
    },
  }),
  async (c) => {
    try {
      const repo = await resolveRepo(c);
      if (typeof repo !== "string") return repo;
      const { runId } = c.req.valid("param");
      await getGitHubService().rerunRun(repo, Number(runId));
      return new Response(null, { status: 204 });
    } catch (err) {
      return githubError(c, err);
    }
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
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not configured",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "GitHub API error",
      },
    },
  }),
  async (c) => {
    try {
      const repo = await resolveRepo(c);
      if (typeof repo !== "string") return repo;
      const { runId } = c.req.valid("param");
      await getGitHubService().rerunFailedJobs(repo, Number(runId));
      return new Response(null, { status: 204 });
    } catch (err) {
      return githubError(c, err);
    }
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
      200: {
        content: {
          "application/json": { schema: z.array(GitHubWorkflowSchema) },
        },
        description: "List of workflows",
      },
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not configured",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Portfolio not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "GitHub API error",
      },
    },
  }),
  async (c) => {
    try {
      const repo = await resolveRepo(c);
      if (typeof repo !== "string") return repo;
      return c.json(await getGitHubService().listWorkflows(repo), 200);
    } catch (err) {
      return githubError(c, err);
    }
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
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not configured",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "GitHub API error",
      },
    },
  }),
  async (c) => {
    try {
      const repo = await resolveRepo(c);
      if (typeof repo !== "string") return repo;
      const { workflowId } = c.req.valid("param");
      const { ref, inputs } = c.req.valid("json");
      await getGitHubService().triggerWorkflowDispatch(
        repo,
        workflowId,
        ref,
        inputs,
      );
      return new Response(null, { status: 204 });
    } catch (err) {
      return githubError(c, err);
    }
  },
);
