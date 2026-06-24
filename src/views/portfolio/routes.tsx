// Portfolio routes — factory-generated + custom detail and status update routes.

import type { AppContext } from "../../types/app.ts";
import { log } from "../../singletons/logger.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { portfolioConfig } from "../../domains/portfolio/config.tsx";
import {
  getCustomerService,
  getDnsService,
  getGitHubService,
  getGoalService,
  getInvoiceService,
  getPortfolioService,
  getProjectService,
  getQuoteService,
} from "../../singletons/services.ts";
import { buildTeamPersonById } from "../../domains/portfolio/owners.ts";
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
import type { VcsProvider } from "../../types/github.types.ts";
import { DEFAULT_STALE_DAYS } from "../../constants/mod.ts";
import {
  DashboardTable,
  PortfolioDashboardView,
} from "../portfolio-dashboard.tsx";
import {
  buildSectionMap,
  fetchDashboardItems,
  filterItems,
  sortItems,
} from "./helpers.ts";

export const portfolioRouter = createDomainRoutes(portfolioConfig);

// -- Dashboard view routes (must be before /:id) --------------------------

portfolioRouter.get("/dashboard", async (c) => {
  const { q, sort, order, filter } = c.req.query();
  const config = await getProjectService().getConfig();
  const staleDays = config.staleDays ?? DEFAULT_STALE_DAYS;

  let items = await fetchDashboardItems();
  items = filterItems(items, staleDays, q, filter);
  items = sortItems(items, sort, order);

  return c.html(
    <PortfolioDashboardView
      {...viewProps(c, "/portfolio/dashboard")}
      items={items}
      sectionMap={buildSectionMap()}
      staleDays={staleDays}
      q={q}
      sort={sort}
      order={order}
      filter={filter}
    />,
  );
});

portfolioRouter.get("/dashboard/view", async (c) => {
  const { q, sort, order, filter } = c.req.query();
  const config = await getProjectService().getConfig();
  const staleDays = config.staleDays ?? DEFAULT_STALE_DAYS;

  let items = await fetchDashboardItems();
  items = filterItems(items, staleDays, q, filter);
  items = sortItems(items, sort, order);

  return c.html(
    <DashboardTable
      items={items}
      sectionMap={buildSectionMap()}
      staleDays={staleDays}
      sort={sort}
      order={order}
      q={q}
      filter={filter}
    />,
  );
});

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
      gh.getRepo(item.githubRepo, item.vcsProvider),
      gh.getLatestRelease(item.githubRepo, item.vcsProvider),
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
    const issues = await getGitHubService().listIssues(
      item.githubRepo,
      "open",
      undefined,
      item.vcsProvider,
    );
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
    const prs = await getGitHubService().listPRs(
      item.githubRepo,
      "open",
      item.vcsProvider,
    );
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
    const milestones = await getGitHubService().listMilestones(
      item.githubRepo,
      item.vcsProvider,
    );
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
      }, item.vcsProvider);
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
      }, item.vcsProvider);
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

// Pipeline actions — perform action then return updated results. Each handler
// resolves the item, applies the archived guard, runs the action, re-lists the
// workflow runs, and renders the shared results fragment.
async function pipelineAction(
  c: AppContext,
  id: string,
  runId: string,
  action: (
    repo: string,
    runId: number,
    provider?: VcsProvider | null,
  ) => Promise<void>,
  label: string,
) {
  const item = await getPortfolioService().getById(id);
  if (!item?.githubRepo) return c.notFound();
  if (item.archived === true) {
    return c.text(
      "Portfolio item is archived — restore before editing",
      422,
    );
  }
  try {
    await action(item.githubRepo, Number(runId), item.vcsProvider);
  } catch (err) {
    log.warn(`[portfolio] ${label} failed for run ${runId}:`, err);
  }
  const { runs, totalCount } = await getGitHubService().listWorkflowRuns(
    item.githubRepo,
    {},
    item.vcsProvider,
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
}

portfolioRouter.post(
  "/:id/github/pipelines/cancel/:runId",
  (c) =>
    pipelineAction(
      c,
      c.req.param("id"),
      c.req.param("runId"),
      (repo, runId, provider) =>
        getGitHubService().cancelRun(repo, runId, provider),
      "pipeline cancel",
    ),
);

portfolioRouter.post(
  "/:id/github/pipelines/rerun/:runId",
  (c) =>
    pipelineAction(
      c,
      c.req.param("id"),
      c.req.param("runId"),
      (repo, runId, provider) =>
        getGitHubService().rerunRun(repo, runId, provider),
      "pipeline rerun",
    ),
);

portfolioRouter.post(
  "/:id/github/pipelines/rerun-failed/:runId",
  (c) =>
    pipelineAction(
      c,
      c.req.param("id"),
      c.req.param("runId"),
      (repo, runId, provider) =>
        getGitHubService().rerunFailedJobs(repo, runId, provider),
      "pipeline rerun-failed",
    ),
);

/** Render the detail page; `?editing=true` enables in-place description editing. */
async function renderDetail(c: AppContext, id: string) {
  const item = await getPortfolioService().getById(id);
  if (!item) return c.notFound();

  const [allGoals, customer, clientCustomer, allDnsDomains] = await Promise.all(
    [
      getGoalService().list(),
      item.billingCustomerId
        ? getCustomerService().getById(item.billingCustomerId)
        : Promise.resolve(null),
      item.client
        ? getCustomerService().getById(item.client)
        : Promise.resolve(null),
      getDnsService().list(),
    ],
  );
  const linkedById = new Set(item.linkedGoals ?? []);
  const goals = allGoals.filter((g) =>
    linkedById.has(g.id) || g.project === item.name
  );
  const dnsDomains = allDnsDomains.filter((d) => d.project === item.name);
  const personById = await buildTeamPersonById(item.team ?? []);
  const editing = c.req.query("editing") === "true";

  // Billing linked to this portfolio item: quotes carry portfolioItemId, and
  // invoices link through their quote. Feeds the reconciliation section.
  const [allQuotes, allInvoices] = await Promise.all([
    getQuoteService().list(),
    getInvoiceService().list(),
  ]);
  const quotes = allQuotes.filter((q) => q.portfolioItemId === item.id);
  const quoteIds = new Set(quotes.map((q) => q.id));
  const invoices = allInvoices.filter((i) => quoteIds.has(i.quoteId));

  const vcsProvider = item.githubRepo
    ? await getGitHubService().activeProviderName(item.vcsProvider)
    : undefined;

  return c.html(
    <PortfolioDetailView
      {...viewProps(c, "/portfolio")}
      item={item}
      goals={goals}
      personById={personById}
      customer={customer ?? null}
      clientCustomer={clientCustomer ?? null}
      dnsDomains={dnsDomains}
      quotes={quotes}
      invoices={invoices}
      editing={editing}
      vcsProvider={vcsProvider}
    />,
  );
}

// Detail view
portfolioRouter.get("/:id", (c) => renderDetail(c, c.req.param("id")));

// In-place description save (Edit Mode). Factory provides edit/delete routes.
portfolioRouter.put("/:id/description", async (c) => {
  const id = c.req.param("id");
  const existing = await getPortfolioService().getById(id);
  if (!existing) return c.notFound();
  if (existing.archived === true) {
    return c.text("Portfolio item is archived — restore before editing", 422);
  }
  const body = await c.req.parseBody();
  const description = String(body.description ?? "").trim() || undefined;
  await getPortfolioService().update(id, { description });
  return renderDetail(c, id);
});

// Restore an archived portfolio item — drops the three archive frontmatter
// fields. Publish `portfolio.updated` so the detail page re-renders without
// the banner; per soft-delete arch note, never publish `portfolio.archived`.
portfolioRouter.post("/:id/restore", async (c) => {
  const id = c.req.param("id");
  const ok = await getPortfolioService().restore(id);
  if (!ok) return c.notFound();
  c.header("HX-Trigger", hxTrigger("success", "Portfolio item restored"));
  c.header("HX-Redirect", `/portfolio/${id}`);
  return new Response(null, { status: 204 });
});

// Permanently delete a portfolio item — removes the file from disk; cascades
// to embedded status updates. No recovery.
portfolioRouter.post("/:id/destroy", async (c) => {
  const id = c.req.param("id");
  const ok = await getPortfolioService().hardDelete(id);
  if (!ok) return c.notFound();
  c.header(
    "HX-Trigger",
    hxTrigger("success", "Portfolio item permanently deleted"),
  );
  c.header("HX-Redirect", `/portfolio`);
  return new Response(null, { status: 204 });
});

// Add status update — returns HTML fragment, htmx prepends to list
portfolioRouter.post("/:id/status-updates", async (c) => {
  const id = c.req.param("id");
  const existing = await getPortfolioService().getById(id);
  if (!existing) return c.notFound();
  if (existing.archived === true) {
    return c.text(
      "Portfolio item is archived — restore before editing",
      422,
    );
  }
  const body = await c.req.parseBody();
  const message = String(body.message || "").trim();
  if (!message) return new Response(null, { status: 400 });
  const update = await getPortfolioService().addStatusUpdate(id, message);
  if (!update) return c.notFound();
  return c.html(<StatusUpdateRow u={update} itemId={id} />, 200, {
    "HX-Trigger": hxTrigger("success", "Status update added"),
  });
});

// Update status update — returns updated row fragment
portfolioRouter.post("/:id/status-updates/:updateId", async (c) => {
  const id = c.req.param("id");
  const updateId = c.req.param("updateId");
  const existing = await getPortfolioService().getById(id);
  if (!existing) return c.notFound();
  if (existing.archived === true) {
    return c.text(
      "Portfolio item is archived — restore before editing",
      422,
    );
  }
  const body = await c.req.parseBody();
  const message = String(body.message || "").trim();
  if (!message) return new Response(null, { status: 400 });
  const update = await getPortfolioService().updateStatusUpdate(
    id,
    updateId,
    message,
  );
  if (!update) return c.notFound();
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
  const existing = await getPortfolioService().getById(id);
  if (!existing) return c.notFound();
  if (existing.archived === true) {
    return c.text(
      "Portfolio item is archived — restore before editing",
      422,
    );
  }
  await getPortfolioService().deleteStatusUpdate(id, updateId);
  return new Response(null, {
    status: 200,
    headers: {
      "HX-Trigger": hxTrigger("success", "Status update deleted"),
    },
  });
});

// PATCH /:id/github/issues/:number — toggle issue open/closed state
portfolioRouter.patch("/:id/github/issues/:number", async (c) => {
  const id = c.req.param("id");
  const number = Number(c.req.param("number"));
  const item = await getPortfolioService().getById(id);
  if (!item?.githubRepo) return c.notFound();
  if (item.archived === true) {
    return c.text(
      "Portfolio item is archived — restore before editing",
      422,
    );
  }
  const body = await c.req.json<{ state?: string }>();
  const state = body.state === "closed" ? "closed" : "open";
  try {
    await getGitHubService().setIssueState(
      item.githubRepo,
      number,
      state,
      item.vcsProvider,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(null, {
      status: 502,
      headers: { "HX-Trigger": hxTrigger("error", msg) },
    });
  }
  const issues = await getGitHubService().listIssues(
    item.githubRepo,
    "open",
    undefined,
    item.vcsProvider,
  ).catch(() => []);
  return c.html(<GitHubIssuesTable issues={issues} itemId={id} />);
});
