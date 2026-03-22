// Portfolio routes — factory-generated + custom detail and status update routes.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { portfolioConfig } from "../../domains/portfolio/config.tsx";
import {
  getGitHubService,
  getPortfolioService,
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
  GitHubPRsTable,
  GitHubRepoCard,
} from "../github.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";

export const portfolioRouter = createDomainRoutes(portfolioConfig);

// -- GitHub fragment routes (htmx partials for portfolio detail) --

portfolioRouter.get("/:id/github/card", async (c) => {
  const id = c.req.param("id");
  const item = await getPortfolioService().getById(id);
  if (!item?.githubRepo) {
    return c.html(
      GitHubError({ message: "No GitHub repository configured" }) as unknown as string,
    );
  }
  try {
    const gh = getGitHubService();
    const [repo, release] = await Promise.all([
      gh.getRepo(item.githubRepo),
      gh.getLatestRelease(item.githubRepo),
    ]);
    return c.html(
      GitHubRepoCard({ repo, release }) as unknown as string,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(GitHubError({ message: msg }) as unknown as string);
  }
});

portfolioRouter.get("/:id/github/issues", async (c) => {
  const id = c.req.param("id");
  const item = await getPortfolioService().getById(id);
  if (!item?.githubRepo) {
    return c.html(
      GitHubError({ message: "No GitHub repository configured" }) as unknown as string,
    );
  }
  try {
    const issues = await getGitHubService().listIssues(item.githubRepo);
    return c.html(
      GitHubIssuesTable({ issues, itemId: id }) as unknown as string,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(GitHubError({ message: msg }) as unknown as string);
  }
});

portfolioRouter.get("/:id/github/pulls", async (c) => {
  const id = c.req.param("id");
  const item = await getPortfolioService().getById(id);
  if (!item?.githubRepo) {
    return c.html(
      GitHubError({ message: "No GitHub repository configured" }) as unknown as string,
    );
  }
  try {
    const prs = await getGitHubService().listPRs(item.githubRepo);
    return c.html(
      GitHubPRsTable({ prs, itemId: id }) as unknown as string,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(GitHubError({ message: msg }) as unknown as string);
  }
});

portfolioRouter.get("/:id/github/milestones", async (c) => {
  const id = c.req.param("id");
  const item = await getPortfolioService().getById(id);
  if (!item?.githubRepo) {
    return c.html(
      GitHubError({ message: "No GitHub repository configured" }) as unknown as string,
    );
  }
  try {
    const milestones = await getGitHubService().listMilestones(item.githubRepo);
    return c.html(
      GitHubMilestonesList({ milestones }) as unknown as string,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(GitHubError({ message: msg }) as unknown as string);
  }
});

// Detail view
portfolioRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getPortfolioService().getById(id);
  if (!item) return c.notFound();
  return c.html(
    PortfolioDetailView({
      ...viewProps(c, "/portfolio"),
      item,
    }) as unknown as string,
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
  const html = StatusUpdateRow({ u: update, itemId: id }) as unknown as string;
  return c.html(html, 200, {
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
  const html = StatusUpdateRow({ u: update, itemId: id }) as unknown as string;
  return c.html(html, 200, {
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
  return c.html(
    StatusUpdateEditRow({ u, itemId: id }) as unknown as string,
  );
});

// Read-only row fragment — cancel swaps back from edit mode
portfolioRouter.get("/:id/status-updates/:updateId/row", async (c) => {
  const id = c.req.param("id");
  const updateId = c.req.param("updateId");
  const item = await getPortfolioService().getById(id);
  const u = item?.statusUpdates?.find((s) => s.id === updateId);
  if (!u) return c.notFound();
  return c.html(
    StatusUpdateRow({ u, itemId: id }) as unknown as string,
  );
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
