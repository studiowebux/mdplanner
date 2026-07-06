/**
 * Regression — GitHub API router error mapping via githubRouter.onError.
 *
 * The github routes were refactored from per-handler try/catch +
 * `githubError(c, err)` to a single `githubRouter.onError(githubOnError)` with
 * a throwing `resolveRepo` (task_1780696876492_hl9i, eliminates the last two
 * `as any` ctx shims). This guards that the two resolveRepo failure paths
 * still map to the same status + AppError body end-to-end, through the real
 * `.route("/:id/github", …)` mount that populates `c.req.param("id")`.
 *
 * Bootstrap: initServices(tempdir, { cache: false }) + a parent Hono that
 * mounts githubRouter exactly as portfolio/routes.ts does. No HTTP transport.
 */

import { assertEquals } from "@std/assert";
import { Hono } from "hono";
import { githubRouter } from "../../src/api/v1/github/routes.ts";
import {
  getPortfolioService,
  initServices,
} from "../../src/singletons/services.ts";

function mount(): Hono {
  const app = new Hono();
  app.route("/portfolio/:id/github", githubRouter);
  return app;
}

Deno.test("GET repo — unknown portfolio id maps to 404 PORTFOLIO_NOT_FOUND", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-github-err-" });
  initServices(dir, { cache: false });
  const app = mount();

  try {
    const res = await app.request(
      "http://localhost/portfolio/does-not-exist/github/repo",
    );
    assertEquals(res.status, 404);
    const body = await res.json();
    assertEquals(body.error, "PORTFOLIO_NOT_FOUND");
    assertEquals(body.status, 404);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("GET repo — portfolio without githubRepo maps to 400 GITHUB_REPO_NOT_CONFIGURED", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-github-err-" });
  initServices(dir, { cache: false });
  const app = mount();

  try {
    const item = await getPortfolioService().create({
      name: "No Repo Project",
    });
    assertEquals(item.githubRepo, undefined);

    const res = await app.request(
      `http://localhost/portfolio/${item.id}/github/repo`,
    );
    assertEquals(res.status, 400);
    const body = await res.json();
    assertEquals(body.error, "GITHUB_REPO_NOT_CONFIGURED");
    assertEquals(body.status, 400);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
