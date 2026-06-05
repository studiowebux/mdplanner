/**
 * Global htmx loading indicator wiring.
 *
 * Locks the shared loading affordance (task_1780614259419_7e1m):
 * - Every page carries a single persistent `#global-loading` element, rendered
 *   once by the app shell (MainLayout → AppShell). Replaces the per-view
 *   one-offs (analytics `.analytics__loading`, github-only `.htmx-indicator`).
 * - The domain factory points `hx-indicator="#global-loading"` on the list
 *   `<main class="domain-page">`, so every filter/sort/search/pagination swap
 *   (inherited by descendants) shows loading feedback for free.
 *
 * Renders the REAL components through Hono's async `c.html` (the same path the
 * routes use), not a throwaway string probe — full MainLayout views are not
 * sync-renderable via renderToString, but `app.request` renders them async.
 */

import { Hono } from "hono";
import { assert, assertEquals } from "@std/assert";
import { createDomainPage } from "../../src/factories/domain-view.tsx";
import { taskConfig } from "../../src/domains/task/config.tsx";
import { MainLayout } from "../../src/components/layout/main.tsx";
import { initServices } from "../../src/singletons/services.ts";

Deno.test("global htmx loading indicator wiring", async (t) => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-loading-indicator-",
  });
  initServices(dir, { cache: false });

  try {
    await t.step(
      "shell renders the persistent #global-loading element on every page",
      async () => {
        const app = new Hono();
        app.get("/__layout", (c) => c.html(<MainLayout>content</MainLayout>));
        const res = await app.request("/__layout");
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes('id="global-loading"'),
          "shell must render the persistent #global-loading element",
        );
        assert(
          html.includes('class="global-loading"'),
          "indicator must carry the canonical .global-loading class",
        );
      },
    );

    await t.step(
      "factory list page points hx-indicator at #global-loading",
      async () => {
        const { DomainPage } = createDomainPage(taskConfig);
        const app = new Hono();
        app.get(
          "/__page",
          async (c) =>
            c.html(
              await DomainPage({
                items: [],
                state: { view: "table" },
              }) as unknown as string,
            ),
        );
        const res = await app.request("/__page");
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes('hx-indicator="#global-loading"'),
          "domain-page <main> must point hx-indicator at #global-loading",
        );
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
