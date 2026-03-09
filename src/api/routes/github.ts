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

import { Hono } from "hono";
import { GitHubApiProvider } from "../../lib/integrations/providers/github.ts";
import {
  AppVariables,
  errorResponse,
  getProjectManager,
  jsonResponse,
} from "./context.ts";

export const githubRouter = new Hono<{ Variables: AppVariables }>();

/** Resolve token or return 400 */
async function resolveToken(
  c: Parameters<typeof getProjectManager>[0],
): Promise<string | null> {
  const pm = getProjectManager(c);
  return pm.getIntegrationSecret("github", "token");
}

// GET /integrations/github/repo/:owner/:repo — fetch repo summary
githubRouter.get("/repo/:owner/:repo", async (c) => {
  const token = await resolveToken(c);
  if (!token) return errorResponse("GitHub token not configured", 400);

  const { owner, repo } = c.req.param();

  try {
    const provider = new GitHubApiProvider(token);
    const data = await provider.getRepo(owner, repo);
    return jsonResponse(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    const status = msg.includes("404") ? 404 : msg.includes("401") ? 401 : 502;
    return errorResponse(msg, status);
  }
});

// GET /integrations/github/repo/:owner/:repo/issues/:number — single issue
githubRouter.get("/repo/:owner/:repo/issues/:number", async (c) => {
  const token = await resolveToken(c);
  if (!token) return errorResponse("GitHub token not configured", 400);

  const { owner, repo, number } = c.req.param();
  const issueNum = parseInt(number, 10);
  if (isNaN(issueNum)) return errorResponse("Invalid issue number", 400);

  try {
    const provider = new GitHubApiProvider(token);
    const data = await provider.getIssue(owner, repo, issueNum);
    return jsonResponse(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    const status = msg.includes("404") ? 404 : msg.includes("401") ? 401 : 502;
    return errorResponse(msg, status);
  }
});

// POST /integrations/github/repo/:owner/:repo/issues — create issue
githubRouter.post("/repo/:owner/:repo/issues", async (c) => {
  const token = await resolveToken(c);
  if (!token) return errorResponse("GitHub token not configured", 400);

  const { owner, repo } = c.req.param();
  const body = await c.req.json();
  const title = body.title?.trim();
  const issueBody = body.body?.trim() || "";

  if (!title) return errorResponse("title is required", 400);

  try {
    const provider = new GitHubApiProvider(token);
    const created = await provider.createIssue(owner, repo, title, issueBody);
    return jsonResponse(created, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    const status = msg.includes("404") ? 404 : msg.includes("401") ? 401 : 502;
    return errorResponse(msg, status);
  }
});

// GET /integrations/github/repos?query=:q — list accessible repos (for autocomplete)
githubRouter.get("/repos", async (c) => {
  const token = await resolveToken(c);
  if (!token) return errorResponse("GitHub token not configured", 400);

  const query = c.req.query("query") ?? undefined;

  try {
    const provider = new GitHubApiProvider(token);
    const repos = await provider.listRepos(query);
    return jsonResponse(repos);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    const status = msg.includes("401") ? 401 : 502;
    return errorResponse(msg, status);
  }
});

// GET /integrations/github/repo/:owner/:repo/milestones — list open milestones
githubRouter.get("/repo/:owner/:repo/milestones", async (c) => {
  const token = await resolveToken(c);
  if (!token) return errorResponse("GitHub token not configured", 400);

  const { owner, repo } = c.req.param();

  try {
    const provider = new GitHubApiProvider(token);
    const milestones = await provider.listMilestones(owner, repo);
    return jsonResponse(milestones);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    const status = msg.includes("404") ? 404 : msg.includes("401") ? 401 : 502;
    return errorResponse(msg, status);
  }
});

// PATCH /integrations/github/repo/:owner/:repo/issues/:number — close or reopen an issue
githubRouter.patch("/repo/:owner/:repo/issues/:number", async (c) => {
  const token = await resolveToken(c);
  if (!token) return errorResponse("GitHub token not configured", 400);

  const { owner, repo, number } = c.req.param();
  const issueNum = parseInt(number, 10);
  if (isNaN(issueNum)) return errorResponse("Invalid issue number", 400);

  const body = await c.req.json();
  const state = body.state;
  if (state !== "open" && state !== "closed") {
    return errorResponse("state must be 'open' or 'closed'", 400);
  }

  try {
    const provider = new GitHubApiProvider(token);
    const issue = await provider.setIssueState(owner, repo, issueNum, state);
    return jsonResponse(issue);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    const status = msg.includes("404") ? 404 : msg.includes("401") ? 401 : 502;
    return errorResponse(msg, status);
  }
});

// GET /integrations/github/repo/:owner/:repo/actions/runs — recent workflow runs
githubRouter.get("/repo/:owner/:repo/actions/runs", async (c) => {
  const token = await resolveToken(c);
  if (!token) return errorResponse("GitHub token not configured", 400);

  const { owner, repo } = c.req.param();

  try {
    const provider = new GitHubApiProvider(token);
    const runs = await provider.listWorkflowRuns(owner, repo);
    return jsonResponse(runs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    const status = msg.includes("404") ? 404 : msg.includes("401") ? 401 : 502;
    return errorResponse(msg, status);
  }
});

// GET /integrations/github/repo/:owner/:repo/pulls/:number — single PR status
githubRouter.get("/repo/:owner/:repo/pulls/:number", async (c) => {
  const token = await resolveToken(c);
  if (!token) return errorResponse("GitHub token not configured", 400);

  const { owner, repo, number } = c.req.param();
  const prNum = parseInt(number, 10);
  if (isNaN(prNum)) return errorResponse("Invalid PR number", 400);

  try {
    const provider = new GitHubApiProvider(token);
    const pr = await provider.getPR(owner, repo, prNum);
    return jsonResponse(pr);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "GitHub API error";
    const status = msg.includes("404") ? 404 : msg.includes("401") ? 401 : 502;
    return errorResponse(msg, status);
  }
});
