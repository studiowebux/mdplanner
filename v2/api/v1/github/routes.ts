// GitHub API routes — all scoped to the project's configured githubRepo.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getGitHubService } from "../../../singletons/services.ts";
import { ErrorSchema, IdParam } from "../../../types/api.ts";
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
  WorkflowDispatchBodySchema,
} from "../../../types/github.types.ts";

export const githubRouter = new OpenAPIHono();

// ---------------------------------------------------------------------------
// Error helper — maps service errors to HTTP responses via c.json()
// c typed minimally so the helper works across all route contexts.
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
function githubError(c: { json: (d: any, s: number) => any }, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.startsWith("GITHUB_TOKEN_NOT_CONFIGURED") ||
    msg.startsWith("GITHUB_REPO_NOT_CONFIGURED") ||
    msg.startsWith("GITHUB_REPO_INVALID")
  ) {
    return c.json({ error: msg.split(":")[0], message: msg }, 400);
  }
  if (msg.includes("401")) {
    return c.json(
      { error: "GITHUB_UNAUTHORIZED", message: "GitHub token is invalid or expired" },
      401,
    );
  }
  if (msg.includes("404")) {
    return c.json({ error: "GITHUB_NOT_FOUND", message: msg }, 404);
  }
  return c.json({ error: "GITHUB_ERROR", message: msg }, 502);
}

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
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
      401: { content: { "application/json": { schema: ErrorSchema } }, description: "Unauthorized" },
      502: { content: { "application/json": { schema: ErrorSchema } }, description: "GitHub API error" },
    },
  }),
  async (c) => {
    try {
      return c.json(await getGitHubService().getRepo(), 200);
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
        content: { "application/json": { schema: z.array(GitHubIssueSchema) } },
        description: "List of issues",
      },
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
      502: { content: { "application/json": { schema: ErrorSchema } }, description: "GitHub API error" },
    },
  }),
  async (c) => {
    try {
      const { state, assignee } = c.req.valid("query");
      return c.json(await getGitHubService().listIssues(state, assignee), 200);
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
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
      502: { content: { "application/json": { schema: ErrorSchema } }, description: "GitHub API error" },
    },
  }),
  async (c) => {
    try {
      const { number } = c.req.valid("param");
      return c.json(await getGitHubService().getIssue(Number(number)), 200);
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
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
      502: { content: { "application/json": { schema: ErrorSchema } }, description: "GitHub API error" },
    },
  }),
  async (c) => {
    try {
      const { title, body } = c.req.valid("json");
      return c.json(await getGitHubService().createIssue(title, body), 201);
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
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
      502: { content: { "application/json": { schema: ErrorSchema } }, description: "GitHub API error" },
    },
  }),
  async (c) => {
    try {
      const { number } = c.req.valid("param");
      const { state } = c.req.valid("json");
      return c.json(
        await getGitHubService().setIssueState(Number(number), state),
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
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
      502: { content: { "application/json": { schema: ErrorSchema } }, description: "GitHub API error" },
    },
  }),
  async (c) => {
    try {
      const { state } = c.req.valid("query");
      return c.json(await getGitHubService().listPRs(state), 200);
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
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
      502: { content: { "application/json": { schema: ErrorSchema } }, description: "GitHub API error" },
    },
  }),
  async (c) => {
    try {
      const { number } = c.req.valid("param");
      return c.json(await getGitHubService().getPR(Number(number)), 200);
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
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
      502: { content: { "application/json": { schema: ErrorSchema } }, description: "GitHub API error" },
    },
  }),
  async (c) => {
    try {
      const { number } = c.req.valid("param");
      const body = c.req.valid("json");
      return c.json(
        await getGitHubService().mergePR(Number(number), body?.mergeMethod),
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
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
      502: { content: { "application/json": { schema: ErrorSchema } }, description: "GitHub API error" },
    },
  }),
  async (c) => {
    try {
      return c.json(await getGitHubService().listMilestones(), 200);
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
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
      502: { content: { "application/json": { schema: ErrorSchema } }, description: "GitHub API error" },
    },
  }),
  async (c) => {
    try {
      const release = await getGitHubService().getLatestRelease();
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
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
      502: { content: { "application/json": { schema: ErrorSchema } }, description: "GitHub API error" },
    },
  }),
  async (c) => {
    try {
      return c.json(await getGitHubService().listWorkflowRuns(), 200);
    } catch (err) {
      return githubError(c, err);
    }
  },
);

githubRouter.openapi(
  createRoute({
    method: "post",
    path: "/actions/runs/{id}/cancel",
    tags: ["GitHub"],
    summary: "Cancel a workflow run",
    operationId: "githubCancelRun",
    request: { params: IdParam },
    responses: {
      204: { description: "Cancelled" },
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
      502: { content: { "application/json": { schema: ErrorSchema } }, description: "GitHub API error" },
    },
  }),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      await getGitHubService().cancelRun(Number(id));
      return new Response(null, { status: 204 });
    } catch (err) {
      return githubError(c, err);
    }
  },
);

githubRouter.openapi(
  createRoute({
    method: "post",
    path: "/actions/runs/{id}/rerun",
    tags: ["GitHub"],
    summary: "Re-run all jobs in a workflow run",
    operationId: "githubRerunRun",
    request: { params: IdParam },
    responses: {
      204: { description: "Re-run triggered" },
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
      502: { content: { "application/json": { schema: ErrorSchema } }, description: "GitHub API error" },
    },
  }),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      await getGitHubService().rerunRun(Number(id));
      return new Response(null, { status: 204 });
    } catch (err) {
      return githubError(c, err);
    }
  },
);

githubRouter.openapi(
  createRoute({
    method: "post",
    path: "/actions/runs/{id}/rerun-failed",
    tags: ["GitHub"],
    summary: "Re-run failed jobs in a workflow run",
    operationId: "githubRerunFailedJobs",
    request: { params: IdParam },
    responses: {
      204: { description: "Re-run triggered" },
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
      502: { content: { "application/json": { schema: ErrorSchema } }, description: "GitHub API error" },
    },
  }),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      await getGitHubService().rerunFailedJobs(Number(id));
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
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
      502: { content: { "application/json": { schema: ErrorSchema } }, description: "GitHub API error" },
    },
  }),
  async (c) => {
    try {
      return c.json(await getGitHubService().listWorkflows(), 200);
    } catch (err) {
      return githubError(c, err);
    }
  },
);

githubRouter.openapi(
  createRoute({
    method: "post",
    path: "/actions/workflows/{id}/dispatch",
    tags: ["GitHub"],
    summary: "Trigger a workflow dispatch event",
    operationId: "githubWorkflowDispatch",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: WorkflowDispatchBodySchema } },
        required: true,
      },
    },
    responses: {
      204: { description: "Dispatch triggered" },
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Not configured" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
      502: { content: { "application/json": { schema: ErrorSchema } }, description: "GitHub API error" },
    },
  }),
  async (c) => {
    try {
      const { id } = c.req.valid("param");
      const { ref, inputs } = c.req.valid("json");
      await getGitHubService().triggerWorkflowDispatch(id, ref, inputs);
      return new Response(null, { status: 204 });
    } catch (err) {
      return githubError(c, err);
    }
  },
);
