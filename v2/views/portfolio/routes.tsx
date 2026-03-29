// Portfolio routes — factory-generated + custom detail and status update routes.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { portfolioConfig } from "../../domains/portfolio/config.tsx";
import {
  getGitHubService,
  getGoalService,
  getPeopleService,
  getPortfolioService,
  getProjectService,
} from "../../singletons/services.ts";
import { publish } from "../../singletons/event-bus.ts";
import {
  PortfolioDetailView,
  StatusUpdateEditRow,
  StatusUpdateRow,
} from "../portfolio-detail.tsx";
import {
  GitHubError,
  GitHubIssuesTable,
  GitHubMilestonesList,
  GitHubPipelineResults,
  GitHubPipelinesTable,
  GitHubPRsTable,
  GitHubRepoCard,
} from "../github.tsx";
import type { PipelineFilters } from "../github.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";
import { GITHUB_PIPELINES_PER_PAGE } from "../../types/github.types.ts";

export const portfolioRouter = createDomainRoutes(portfolioConfig);

// -- GitHub fragment routes (htmx partials for portfolio detail) --

portfolioRouter.get("/:id/github/card", async (c) => {
  const id = c.req.param("id");
  const item = await getPortfolioService().getById(id);
  if (!item?.githubRepo) {
    return c.html(
      <GitHubError message="No GitHub repository configured" />,
    );
  }
  try {
    const gh = getGitHubService();
    const [repo, release] = await Promise.all([
      gh.getRepo(item.githubRepo),
      gh.getLatestRelease(item.githubRepo),
    ]);
    return c.html(<GitHubRepoCard repo={repo} release={release} />);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(<GitHubError message={msg} />);
  }
});

portfolioRouter.get("/:id/github/issues", async (c) => {
  const id = c.req.param("id");
  const item = await getPortfolioService().getById(id);
  if (!item?.githubRepo) {
    return c.html(
      <GitHubError message="No GitHub repository configured" />,
    );
  }
  try {
    const issues = await getGitHubService().listIssues(item.githubRepo);
    return c.html(<GitHubIssuesTable issues={issues} itemId={id} />);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(<GitHubError message={msg} />);
  }
});

portfolioRouter.get("/:id/github/pulls", async (c) => {
  const id = c.req.param("id");
  const item = await getPortfolioService().getById(id);
  if (!item?.githubRepo) {
    return c.html(
      <GitHubError message="No GitHub repository configured" />,
    );
  }
  try {
    const prs = await getGitHubService().listPRs(item.githubRepo);
    return c.html(<GitHubPRsTable prs={prs} itemId={id} />);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(<GitHubError message={msg} />);
  }
});

portfolioRouter.get("/:id/github/milestones", async (c) => {
  const id = c.req.param("id");
  const item = await getPortfolioService().getById(id);
  if (!item?.githubRepo) {
    return c.html(
      <GitHubError message="No GitHub repository configured" />,
    );
  }
  try {
    const milestones = await getGitHubService().listMilestones(item.githubRepo);
    return c.html(<GitHubMilestonesList milestones={milestones} />);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(<GitHubError message={msg} />);
  }
});

portfolioRouter.get("/:id/github/pipelines", async (c) => {
  const id = c.req.param("id");
  const item = await getPortfolioService().getById(id);
  if (!item?.githubRepo) {
    return c.html(
      <GitHubError message="No GitHub repository configured" />,
    );
  }
  try {
    const filters: PipelineFilters = {
      status: c.req.query("status") || undefined,
      event: c.req.query("event") || undefined,
      branch: c.req.query("branch") || undefined,
      q: c.req.query("q") || undefined,
    };
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const projectConfig = await getProjectService().getConfig();
    const perPage = projectConfig.pipelinesPerPage ?? GITHUB_PIPELINES_PER_PAGE;
    const { runs, totalCount } = await getGitHubService()
      .listWorkflowRuns(item.githubRepo, {
        page,
        perPage,
        status: filters.status,
        branch: filters.branch,
        event: filters.event,
      });
    // q is local-only — GitHub API has no workflow name search
    const filtered = filters.q
      ? runs.filter((r) =>
        r.name.toLowerCase().includes(filters.q?.toLowerCase() ?? "")
      )
      : runs;
    const hasNext = runs.length === perPage;
    return c.html(
      <GitHubPipelinesTable
        runs={filtered}
        total={totalCount}
        itemId={id}
        filters={filters}
        page={page}
        hasNext={hasNext}
      />,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(<GitHubError message={msg} />);
  }
});

// Pipeline results fragment — swapped independently by filters and pagination
portfolioRouter.get("/:id/github/pipelines/results", async (c) => {
  const id = c.req.param("id");
  const item = await getPortfolioService().getById(id);
  if (!item?.githubRepo) {
    return c.html(
      <GitHubError message="No GitHub repository configured" />,
    );
  }
  try {
    const filters: PipelineFilters = {
      status: c.req.query("status") || undefined,
      event: c.req.query("event") || undefined,
      branch: c.req.query("branch") || undefined,
      q: c.req.query("q") || undefined,
    };
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const projectConfig = await getProjectService().getConfig();
    const perPage = projectConfig.pipelinesPerPage ?? GITHUB_PIPELINES_PER_PAGE;
    const { runs, totalCount } = await getGitHubService()
      .listWorkflowRuns(item.githubRepo, {
        page,
        perPage,
        status: filters.status,
        branch: filters.branch,
        event: filters.event,
      });
    const filtered = filters.q
      ? runs.filter((r) =>
        r.name.toLowerCase().includes(filters.q?.toLowerCase() ?? "")
      )
      : runs;
    const hasNext = runs.length === perPage;
    const filterQs = [
      filters.status ? `status=${filters.status}` : "",
      filters.event ? `event=${filters.event}` : "",
      filters.branch ? `branch=${encodeURIComponent(filters.branch)}` : "",
      filters.q ? `q=${encodeURIComponent(filters.q)}` : "",
    ].filter(Boolean).join("&");
    const resultsUrl = (p: number) => {
      const params = [`page=${p}`, filterQs].filter(Boolean).join("&");
      return `/portfolio/${id}/github/pipelines/results?${params}`;
    };
    return c.html(
      <GitHubPipelineResults
        runs={filtered}
        total={totalCount}
        itemId={id}
        page={page}
        hasNext={hasNext}
        resultsUrl={resultsUrl}
      />,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(<GitHubError message={msg} />);
  }
});

// Pipeline actions — perform action then return updated results
portfolioRouter.post("/:id/github/pipelines/cancel/:runId", async (c) => {
  const id = c.req.param("id");
  const runId = c.req.param("runId");
  const item = await getPortfolioService().getById(id);
  if (!item?.githubRepo) return c.notFound();
  try {
    await getGitHubService().cancelRun(item.githubRepo, Number(runId));
  } catch { /* run may already be done */ }
  const { runs, totalCount } = await getGitHubService().listWorkflowRuns(
    item.githubRepo,
    {},
  );
  const resultsUrl = (p: number) =>
    `/portfolio/${id}/github/pipelines/results?page=${p}`;
  return c.html(
    <GitHubPipelineResults
      runs={runs}
      total={totalCount}
      itemId={id}
      page={1}
      hasNext={runs.length === GITHUB_PIPELINES_PER_PAGE}
      resultsUrl={resultsUrl}
    />,
  );
});

portfolioRouter.post("/:id/github/pipelines/rerun/:runId", async (c) => {
  const id = c.req.param("id");
  const runId = c.req.param("runId");
  const item = await getPortfolioService().getById(id);
  if (!item?.githubRepo) return c.notFound();
  try {
    await getGitHubService().rerunRun(item.githubRepo, Number(runId));
  } catch { /* may fail if run is too old */ }
  const { runs, totalCount } = await getGitHubService().listWorkflowRuns(
    item.githubRepo,
    {},
  );
  const resultsUrl = (p: number) =>
    `/portfolio/${id}/github/pipelines/results?page=${p}`;
  return c.html(
    <GitHubPipelineResults
      runs={runs}
      total={totalCount}
      itemId={id}
      page={1}
      hasNext={runs.length === GITHUB_PIPELINES_PER_PAGE}
      resultsUrl={resultsUrl}
    />,
  );
});

portfolioRouter.post(
  "/:id/github/pipelines/rerun-failed/:runId",
  async (c) => {
    const id = c.req.param("id");
    const runId = c.req.param("runId");
    const item = await getPortfolioService().getById(id);
    if (!item?.githubRepo) return c.notFound();
    try {
      await getGitHubService().rerunFailedJobs(
        item.githubRepo,
        Number(runId),
      );
    } catch { /* may fail if run is too old */ }
    const { runs, totalCount } = await getGitHubService().listWorkflowRuns(
      item.githubRepo,
    );
    const resultsUrl = (p: number) =>
      `/portfolio/${id}/github/pipelines/results?page=${p}`;
    return c.html(
      <GitHubPipelineResults
        runs={runs}
        total={totalCount}
        itemId={id}
        page={1}
        hasNext={runs.length === GITHUB_PIPELINES_PER_PAGE}
        resultsUrl={resultsUrl}
      />,
    );
  },
);

// Detail view
portfolioRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getPortfolioService().getById(id);
  if (!item) return c.notFound();

  const teamNames = new Set(item.team ?? []);
  const [allGoals, allPeople] = await Promise.all([
    getGoalService().list(),
    teamNames.size > 0 ? getPeopleService().list() : Promise.resolve([]),
  ]);
  const linkedById = new Set(item.linkedGoals ?? []);
  const goals = allGoals.filter((g) =>
    linkedById.has(g.id) || g.project === item.name
  );
  const personByName: Record<string, string> = {};
  const teamLower = new Map([...teamNames].map((n) => [n.toLowerCase(), n]));
  for (const p of allPeople) {
    const orig = teamLower.get(p.name.toLowerCase());
    if (orig) personByName[orig] = p.id;
  }

  return c.html(
    <PortfolioDetailView
      {...viewProps(c, "/portfolio")}
      item={item}
      goals={goals}
      personByName={personByName}
    />,
  );
});

// Add status update — returns HTML fragment, htmx prepends to list
portfolioRouter.post("/:id/status-updates", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const message = String(body.message || "").trim();
  if (!message) return new Response(null, { status: 400 });
  const update = await getPortfolioService().addStatusUpdate(id, message);
  if (!update) return c.notFound();
  publish("portfolio.updated");
  return c.html(<StatusUpdateRow u={update} itemId={id} />, 200, {
    "HX-Trigger": hxTrigger("success", "Status update added"),
  });
});

// Update status update — returns updated row fragment
portfolioRouter.post("/:id/status-updates/:updateId", async (c) => {
  const id = c.req.param("id");
  const updateId = c.req.param("updateId");
  const body = await c.req.parseBody();
  const message = String(body.message || "").trim();
  if (!message) return new Response(null, { status: 400 });
  const update = await getPortfolioService().updateStatusUpdate(
    id,
    updateId,
    message,
  );
  if (!update) return c.notFound();
  publish("portfolio.updated");
  return c.html(<StatusUpdateRow u={update} itemId={id} />, 200, {
    "HX-Trigger": hxTrigger("success", "Status update saved"),
  });
});

// Edit form fragment — swaps row into edit mode
portfolioRouter.get("/:id/status-updates/:updateId/edit", async (c) => {
  const id = c.req.param("id");
  const updateId = c.req.param("updateId");
  const item = await getPortfolioService().getById(id);
  const u = item?.statusUpdates?.find((s) => s.id === updateId);
  if (!u) return c.notFound();
  return c.html(<StatusUpdateEditRow u={u} itemId={id} />);
});

// Read-only row fragment — cancel swaps back from edit mode
portfolioRouter.get("/:id/status-updates/:updateId/row", async (c) => {
  const id = c.req.param("id");
  const updateId = c.req.param("updateId");
  const item = await getPortfolioService().getById(id);
  const u = item?.statusUpdates?.find((s) => s.id === updateId);
  if (!u) return c.notFound();
  return c.html(<StatusUpdateRow u={u} itemId={id} />);
});

// Delete status update — returns empty, htmx removes the element
portfolioRouter.delete("/:id/status-updates/:updateId", async (c) => {
  const id = c.req.param("id");
  const updateId = c.req.param("updateId");
  await getPortfolioService().deleteStatusUpdate(id, updateId);
  publish("portfolio.updated");
  return new Response(null, {
    status: 200,
    headers: {
      "HX-Trigger": hxTrigger("success", "Status update deleted"),
    },
  });
});
