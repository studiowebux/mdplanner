// GitHub summary view routes — dashboard page + per-item card fragments.

import { Hono } from "hono";
import {
  getGitHubService,
  getPortfolioService,
  getWoodpeckerService,
} from "../../singletons/services.ts";
import {
  GitHubSummaryCard,
  GitHubSummaryCardError,
  GitHubSummaryView,
} from "../github-summary.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import type { AppVariables } from "../../types/app.ts";

export const githubSummaryRouter = new Hono<{ Variables: AppVariables }>();

// Full page — lists portfolio items with githubRepo
githubSummaryRouter.get("/", async (c) => {
  const all = await getPortfolioService().list();
  const items = all.filter((p) => p.githubRepo);
  return c.html(
    <GitHubSummaryView
      {...viewProps(c, "/github")}
      items={items}
    />,
  );
});

// Per-item card fragment — loaded via htmx
githubSummaryRouter.get("/:id/card", async (c) => {
  const id = c.req.param("id");
  const item = await getPortfolioService().getById(id);
  if (!item?.githubRepo) {
    const fallback = item ?? { id, name: id } as never;
    return c.html(
      <GitHubSummaryCardError
        item={fallback}
        message="No Git repository configured"
      />,
    );
  }
  try {
    const gh = getGitHubService();
    const wp = getWoodpeckerService();
    const [repo, release, ci] = await Promise.all([
      gh.getRepo(item.githubRepo, item.vcsProvider),
      gh.getLatestRelease(item.githubRepo, item.vcsProvider),
      (await wp.isConfigured())
        ? wp.latestPipeline(item.githubRepo).catch(() => null)
        : null,
    ]);
    return c.html(
      <GitHubSummaryCard item={item} repo={repo} release={release} ci={ci} />,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(<GitHubSummaryCardError item={item} message={msg} />);
  }
});
