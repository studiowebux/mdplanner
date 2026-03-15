/**
 * GitHub integration routes — repo summary, issue operations, extended.
 *
 * GET    /api/integrations/github/repo/:owner/:repo                  — repo summary
 * GET    /api/integrations/github/repo/:owner/:repo/issues/:n        — single issue status
 * POST   /api/integrations/github/repo/:owner/:repo/issues           — create issue
 * GET    /api/integrations/github/repos?query=:q                     — list accessible repos
 * GET    /api/integrations/github/repo/:owner/:repo/milestones       — list open milestones
 * GET    /api/integrations/github/repo/:owner/:repo/pulls/:number    — single PR status
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { GitHubApiProvider } from "../../lib/integrations/providers/github.ts";
import { AppVariables, getProjectManager } from "./context.ts";

export const githubRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

/** Resolve token or return 400 */
async function resolveToken(
  c: Parameters<typeof getProjectManager>[0],
): Promise<string | null> {
  const pm = getProjectManager(c);
  return pm.getIntegrationSecret("github", "token");
}

// GET /integrations/github/repo/:owner/:repo — fetch repo summary
const getRepoRoute = createRoute({
  method: "get",
  path: "/repo/{owner}/{repo}",
  tags: ["GitHub"],
  summary: "Fetch repository summary",
  operationId: "getGitHubRepo",
  request: {
    params: z.object({
      owner: z.string().openapi({
        param: { name: "owner", in: "path" },
      }),
      repo: z.string().openapi({
        param: { name: "repo", in: "path" },
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Repository summary",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Token not configured",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Authentication failed",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Repository not found",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "GitHub API error",
    },
  },
});

githubRouter.openapi(getRepoRoute, async (c) => {
  const token = await resolveToken(c);
  if (!token) return c.json({ error: "GitHub token not configured" }, 400);

  const { owner, repo } = c.req.valid("param");

  try {
    const provider = new GitHubApiProvider(token);
    const data = await provider.getRepo(owner, repo);
    return c.json(data, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    const status = msg.includes("404") ? 404 : msg.includes("401") ? 401 : 502;
    return c.json({ error: msg }, status);
  }
});

// GET /integrations/github/repo/:owner/:repo/issues/:number — single issue
const getIssueRoute = createRoute({
  method: "get",
  path: "/repo/{owner}/{repo}/issues/{number}",
  tags: ["GitHub"],
  summary: "Get a single GitHub issue",
  operationId: "getGitHubIssue",
  request: {
    params: z.object({
      owner: z.string().openapi({
        param: { name: "owner", in: "path" },
      }),
      repo: z.string().openapi({
        param: { name: "repo", in: "path" },
      }),
      number: z.string().openapi({
        param: { name: "number", in: "path" },
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Issue details",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Token not configured or invalid issue number",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Authentication failed",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Issue not found",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "GitHub API error",
    },
  },
});

githubRouter.openapi(getIssueRoute, async (c) => {
  const token = await resolveToken(c);
  if (!token) return c.json({ error: "GitHub token not configured" }, 400);

  const { owner, repo, number } = c.req.valid("param");
  const issueNum = parseInt(number, 10);
  if (isNaN(issueNum)) return c.json({ error: "Invalid issue number" }, 400);

  try {
    const provider = new GitHubApiProvider(token);
    const data = await provider.getIssue(owner, repo, issueNum);
    return c.json(data, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    const status = msg.includes("404") ? 404 : msg.includes("401") ? 401 : 502;
    return c.json({ error: msg }, status);
  }
});

// POST /integrations/github/repo/:owner/:repo/issues — create issue
const createIssueRoute = createRoute({
  method: "post",
  path: "/repo/{owner}/{repo}/issues",
  tags: ["GitHub"],
  summary: "Create a GitHub issue",
  operationId: "createGitHubIssue",
  request: {
    params: z.object({
      owner: z.string().openapi({
        param: { name: "owner", in: "path" },
      }),
      repo: z.string().openapi({
        param: { name: "repo", in: "path" },
      }),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            title: z.string(),
            body: z.string().optional(),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Issue created",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Token not configured or missing title",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Authentication failed",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Repository not found",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "GitHub API error",
    },
  },
});

githubRouter.openapi(createIssueRoute, async (c) => {
  const token = await resolveToken(c);
  if (!token) return c.json({ error: "GitHub token not configured" }, 400);

  const { owner, repo } = c.req.valid("param");
  const body = c.req.valid("json");
  const title = body.title?.trim();
  const issueBody = body.body?.trim() || "";

  if (!title) return c.json({ error: "title is required" }, 400);

  try {
    const provider = new GitHubApiProvider(token);
    const created = await provider.createIssue(owner, repo, title, issueBody);
    return c.json(created, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    const status = msg.includes("404") ? 404 : msg.includes("401") ? 401 : 502;
    return c.json({ error: msg }, status);
  }
});

// GET /integrations/github/repo/:owner/:repo/releases/latest — latest release
const getLatestReleaseRoute = createRoute({
  method: "get",
  path: "/repo/{owner}/{repo}/releases/latest",
  tags: ["GitHub"],
  summary: "Get the latest published release for a repository",
  operationId: "getGitHubLatestRelease",
  request: {
    params: z.object({
      owner: z.string().openapi({
        param: { name: "owner", in: "path" },
      }),
      repo: z.string().openapi({
        param: { name: "repo", in: "path" },
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Latest release details",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Token not configured",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "No releases found",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "GitHub API error",
    },
  },
});

githubRouter.openapi(getLatestReleaseRoute, async (c) => {
  const token = await resolveToken(c);
  if (!token) return c.json({ error: "GitHub token not configured" }, 400);

  const { owner, repo } = c.req.valid("param");

  try {
    const provider = new GitHubApiProvider(token);
    const release = await provider.getLatestRelease(owner, repo);
    if (!release) {
      return c.json({ error: "No releases found" }, 404);
    }
    return c.json(release, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    if (msg.includes("404")) return c.json({ error: msg }, 404);
    return c.json({ error: msg }, 502);
  }
});

// GET /integrations/github/repos?query=:q — list accessible repos (for autocomplete)
const listReposRoute = createRoute({
  method: "get",
  path: "/repos",
  tags: ["GitHub"],
  summary: "List accessible GitHub repositories",
  operationId: "listGitHubRepos",
  request: {
    query: z.object({
      query: z.string().optional().openapi({
        description: "Search query for filtering repos",
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of repositories",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Token not configured",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Authentication failed",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "GitHub API error",
    },
  },
});

githubRouter.openapi(listReposRoute, async (c) => {
  const token = await resolveToken(c);
  if (!token) return c.json({ error: "GitHub token not configured" }, 400);

  const { query } = c.req.valid("query");

  try {
    const provider = new GitHubApiProvider(token);
    const repos = await provider.listRepos(query);
    return c.json(repos, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    const status = msg.includes("401") ? 401 : 502;
    return c.json({ error: msg }, status);
  }
});

// GET /integrations/github/repo/:owner/:repo/milestones — list open milestones
const listMilestonesRoute = createRoute({
  method: "get",
  path: "/repo/{owner}/{repo}/milestones",
  tags: ["GitHub"],
  summary: "List open milestones for a repository",
  operationId: "listGitHubMilestones",
  request: {
    params: z.object({
      owner: z.string().openapi({
        param: { name: "owner", in: "path" },
      }),
      repo: z.string().openapi({
        param: { name: "repo", in: "path" },
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of open milestones",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Token not configured",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Authentication failed",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Repository not found",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "GitHub API error",
    },
  },
});

githubRouter.openapi(listMilestonesRoute, async (c) => {
  const token = await resolveToken(c);
  if (!token) return c.json({ error: "GitHub token not configured" }, 400);

  const { owner, repo } = c.req.valid("param");

  try {
    const provider = new GitHubApiProvider(token);
    const milestones = await provider.listMilestones(owner, repo);
    return c.json(milestones, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    const status = msg.includes("404") ? 404 : msg.includes("401") ? 401 : 502;
    return c.json({ error: msg }, status);
  }
});

// PATCH /integrations/github/repo/:owner/:repo/issues/:number — close or reopen an issue
const patchIssueRoute = createRoute({
  method: "patch",
  path: "/repo/{owner}/{repo}/issues/{number}",
  tags: ["GitHub"],
  summary: "Close or reopen a GitHub issue",
  operationId: "patchGitHubIssueState",
  request: {
    params: z.object({
      owner: z.string().openapi({
        param: { name: "owner", in: "path" },
      }),
      repo: z.string().openapi({
        param: { name: "repo", in: "path" },
      }),
      number: z.string().openapi({
        param: { name: "number", in: "path" },
      }),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            state: z.enum(["open", "closed"]),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Updated issue",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Token not configured, invalid number, or bad state",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Authentication failed",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Issue not found",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "GitHub API error",
    },
  },
});

githubRouter.openapi(patchIssueRoute, async (c) => {
  const token = await resolveToken(c);
  if (!token) return c.json({ error: "GitHub token not configured" }, 400);

  const { owner, repo, number } = c.req.valid("param");
  const issueNum = parseInt(number, 10);
  if (isNaN(issueNum)) return c.json({ error: "Invalid issue number" }, 400);

  const body = c.req.valid("json");
  const state = body.state;
  if (state !== "open" && state !== "closed") {
    return c.json({ error: "state must be 'open' or 'closed'" }, 400);
  }

  try {
    const provider = new GitHubApiProvider(token);
    const issue = await provider.setIssueState(owner, repo, issueNum, state);
    return c.json(issue, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    const status = msg.includes("404") ? 404 : msg.includes("401") ? 401 : 502;
    return c.json({ error: msg }, status);
  }
});

// GET /integrations/github/repo/:owner/:repo/actions/runs — recent workflow runs
const listRunsRoute = createRoute({
  method: "get",
  path: "/repo/{owner}/{repo}/actions/runs",
  tags: ["GitHub"],
  summary: "List recent workflow runs",
  operationId: "listGitHubWorkflowRuns",
  request: {
    params: z.object({
      owner: z.string().openapi({
        param: { name: "owner", in: "path" },
      }),
      repo: z.string().openapi({
        param: { name: "repo", in: "path" },
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Recent workflow runs",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Token not configured",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Authentication failed",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Repository not found",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "GitHub API error",
    },
  },
});

githubRouter.openapi(listRunsRoute, async (c) => {
  const token = await resolveToken(c);
  if (!token) return c.json({ error: "GitHub token not configured" }, 400);

  const { owner, repo } = c.req.valid("param");

  try {
    const provider = new GitHubApiProvider(token);
    const runs = await provider.listWorkflowRuns(owner, repo);
    return c.json({ runs }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    const status = msg.includes("404") ? 404 : msg.includes("401") ? 401 : 502;
    return c.json({ error: msg }, status);
  }
});

// GET /integrations/github/repo/:owner/:repo/pulls/:number — single PR status
const getPrRoute = createRoute({
  method: "get",
  path: "/repo/{owner}/{repo}/pulls/{number}",
  tags: ["GitHub"],
  summary: "Get a single pull request",
  operationId: "getGitHubPullRequest",
  request: {
    params: z.object({
      owner: z.string().openapi({
        param: { name: "owner", in: "path" },
      }),
      repo: z.string().openapi({
        param: { name: "repo", in: "path" },
      }),
      number: z.string().openapi({
        param: { name: "number", in: "path" },
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Pull request details",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Token not configured or invalid PR number",
    },
    401: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Authentication failed",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Pull request not found",
    },
    502: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "GitHub API error",
    },
  },
});

githubRouter.openapi(getPrRoute, async (c) => {
  const token = await resolveToken(c);
  if (!token) return c.json({ error: "GitHub token not configured" }, 400);

  const { owner, repo, number } = c.req.valid("param");
  const prNum = parseInt(number, 10);
  if (isNaN(prNum)) return c.json({ error: "Invalid PR number" }, 400);

  try {
    const provider = new GitHubApiProvider(token);
    const pr = await provider.getPR(owner, repo, prNum);
    return c.json(pr, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    const status = msg.includes("404") ? 404 : msg.includes("401") ? 401 : 502;
    return c.json({ error: msg }, status);
  }
});
