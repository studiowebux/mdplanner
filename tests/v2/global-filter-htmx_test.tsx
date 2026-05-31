/**
 * Global-filter (htmx) suite.
 *
 * Locks the topbar global filter (project/assignee multi-select) running on
 * pure htmx instead of fetch():
 * - POST /settings/global-filters parses a form body (repeated globalProjects /
 *   globalAssignees keys), writes the ui_state cookie, and returns 204 +
 *   HX-Trigger: global-filter:changed so domain views (from:body) reload.
 * - The topbar filter wraps carry hx-post + hx-include and the checkboxes carry
 *   name="globalProjects" / name="globalAssignees" for hx-include serialization.
 *
 * Regression: global-filter.js previously fetch'd JSON to /settings/global-filters
 * and fired global-filter:changed client-side.
 */

import { Hono } from "hono";
import { assert, assertEquals } from "@std/assert";
import { settingsViewRouter } from "../../v2/views/settings/routes.tsx";
import { Topbar } from "../../v2/components/shell/topbar.tsx";
import {
  getPeopleService,
  getPortfolioService,
  initServices,
} from "../../v2/singletons/services.ts";

function filtersRequest(projects: string[], assignees: string[]): Request {
  const form = new URLSearchParams();
  for (const p of projects) form.append("globalProjects", p);
  for (const a of assignees) form.append("globalAssignees", a);
  return new Request("http://localhost/global-filters", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

Deno.test("global-filter htmx — server contract", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-global-filter-" });
  initServices(dir, { cache: false });

  try {
    await t.step(
      "POST writes filters + returns 204 HX-Trigger global-filter:changed",
      async () => {
        const res = await settingsViewRouter.request(
          filtersRequest(["Alpha", "Beta"], ["Alice"]),
        );
        assertEquals(res.status, 204);
        assertEquals(res.headers.get("HX-Trigger"), "global-filter:changed");
        const cookie = res.headers.get("Set-Cookie") ?? "";
        assert(cookie.includes("ui_state"), "ui_state cookie must be written");
        await res.body?.cancel();
      },
    );

    await t.step(
      "empty form clears filters (still 204 + trigger)",
      async () => {
        const res = await settingsViewRouter.request(filtersRequest([], []));
        assertEquals(res.status, 204);
        assertEquals(res.headers.get("HX-Trigger"), "global-filter:changed");
        await res.body?.cancel();
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("global-filter htmx — topbar markup wiring", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-global-filter-ui-" });
  initServices(dir, { cache: false });

  try {
    await getPortfolioService().create({ name: "Alpha" });
    await getPeopleService().create({ name: "Alice" });

    const app = new Hono();
    app.get(
      "/__topbar",
      (c) => c.html(<Topbar globalProjects={[]} globalAssignees={[]} />),
    );

    await t.step(
      "filter wraps are htmx-wired + checkboxes carry name",
      async () => {
        const res = await app.request("/__topbar");
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes('hx-post="/settings/global-filters"'),
          "filter wrap must POST to /settings/global-filters via htmx",
        );
        assert(
          html.includes('hx-include="[data-global-filter-item] input"'),
          "filter wrap must include both panels' checkboxes",
        );
        assert(
          html.includes('name="globalProjects"'),
          "project checkbox must carry name=globalProjects",
        );
        assert(
          html.includes('name="globalAssignees"'),
          "assignee checkbox must carry name=globalAssignees",
        );
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
