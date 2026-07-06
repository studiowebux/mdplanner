/**
 * View-route smoke test — every domain page renders for an identified user.
 *
 * Boots the real view layer (contextMiddleware + identityGuard + the aggregated
 * `views` router, exactly as bin.ts wires them) against a temp copy of the
 * committed example/ data and asserts every domain index route returns 200.
 * This is the prod-readiness guard the curl smoke test could not be: it fails
 * the build if any domain view throws on SSR (500), loses its route, or starts
 * redirecting an identified user.
 *
 * The example tree is copied into a temp dir first so the cached repository
 * never writes its cache back into the source (and cache:false keeps the run
 * disk-only). Identity is a forged unsigned `mdp_identity` cookie — matching the
 * default `deno task test` env where MDPLANNER_SECRET_KEY is unset, so the
 * cookie is read unsigned. `alice` is a human in example/people.
 */

import { Hono } from "hono";
import { assertEquals } from "@std/assert";
import { copy } from "@std/fs";
import { contextMiddleware } from "../../src/middleware/context.ts";
import { identityGuard } from "../../src/middleware/identity-guard.ts";
import { views } from "../../src/views/mod.tsx";
import { initServices } from "../../src/singletons/services.ts";
import type { AppVariables } from "../../src/types/app.ts";

const EXAMPLE_DIR = new URL("../../example", import.meta.url).pathname;

/** Forged unsigned identity cookie for `alice` (a human in example/people). */
const IDENTITY_COOKIE = `mdp_identity=${
  encodeURIComponent(JSON.stringify({ name: "Alice", id: "alice" }))
}`;

/** Every domain index route mounted by views/mod.tsx (partial routers
 * autocomplete/sidebar/identity excluded — they are not standalone pages). */
const VIEW_ROUTES = [
  "/",
  "/billing-rates",
  "/contacts",
  "/companies",
  "/deals",
  "/finances",
  "/habits",
  "/journal",
  "/reflections",
  "/customers",
  "/invoices",
  "/payments",
  "/quotes",
  "/dns",
  "/goals",
  "/ideas",
  "/milestones",
  "/notes",
  "/people",
  "/portfolio",
  "/tasks",
  "/github",
  "/settings",
  "/marketing-plans",
  "/swot",
  "/moscow",
  "/eisenhower",
  "/mindmaps",
  "/fishbones",
  "/business-models",
  "/risks",
  "/vacation",
  "/investors",
  "/safe",
  "/project-value",
  "/strategic-levels",
  "/c4",
  "/brainstorms",
  "/brainstorm-templates",
  "/reflection-templates",
  "/onboarding",
  "/onboarding-templates",
  "/briefs",
  "/retrospectives",
  "/meetings",
  "/lean-canvases",
  "/sticky-notes",
  "/capacity-plans",
  "/time-entries",
  "/analytics",
  "/uploads",
  "/me",
  "/search",
] as const;

/** Stand up the view layer the way bin.ts does, over a temp example copy. */
async function bootViewApp(prefix: string): Promise<{
  app: Hono<{ Variables: AppVariables }>;
  dir: string;
}> {
  const dir = await Deno.makeTempDir({ prefix });
  await copy(EXAMPLE_DIR, dir, { overwrite: true });
  initServices(dir, { cache: false });

  const app = new Hono<{ Variables: AppVariables }>();
  app.use("*", contextMiddleware);
  app.use("*", identityGuard);
  app.route("/", views);
  return { app, dir };
}

Deno.test("view routes — every domain page renders 200 for an identified user", async () => {
  const { app, dir } = await bootViewApp("mdplanner-view-smoke-");
  try {
    for (const path of VIEW_ROUTES) {
      const res = await app.request(path, {
        headers: { Cookie: IDENTITY_COOKIE },
      });
      // Drain the body so the response stream does not leak between requests.
      await res.body?.cancel();
      assertEquals(res.status, 200, `GET ${path} should render 200`);
    }
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("view routes — identity guard redirects anonymous SSR to /identity", async () => {
  const { app, dir } = await bootViewApp("mdplanner-view-guard-");
  try {
    // No cookie → guarded page redirects to the identity picker.
    const guarded = await app.request("/tasks");
    await guarded.body?.cancel();
    assertEquals(guarded.status, 302);
    assertEquals(guarded.headers.get("location"), "/identity");

    // The picker itself is exempt and renders anonymously.
    const picker = await app.request("/identity");
    await picker.body?.cancel();
    assertEquals(picker.status, 200);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
