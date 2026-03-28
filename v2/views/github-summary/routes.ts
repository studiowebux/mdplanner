// GitHub summary view routes — dashboard page + per-item card fragments.

import { Hono } from "hono";
import {
  getGitHubService,
  getPortfolioService,
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
    GitHubSummaryView({
      ...viewProps(c, "/github"),
      items,
    }) as unknown as string,
  );
});

// Per-item card fragment — loaded via htmx
githubSummaryRouter.get("/:id/card", async (c) => {
  const id = c.req.param("id");
  const item = await getPortfolioService().getById(id);
  if (!item?.githubRepo) {
    return c.html(
      GitHubSummaryCardError({
        item: item ?? { id, name: id } as never,
        message: "No GitHub repository configured",
      }) as unknown as string,
    );
  }
  try {
    const gh = getGitHubService();
    const [repo, release] = await Promise.all([
      gh.getRepo(item.githubRepo),
      gh.getLatestRelease(item.githubRepo),
    ]);
    return c.html(
      GitHubSummaryCard({ item, repo, release }) as unknown as string,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(
      GitHubSummaryCardError({ item, message: msg }) as unknown as string,
    );
  }
});
