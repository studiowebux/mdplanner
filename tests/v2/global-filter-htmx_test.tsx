/**
 * Global-filter (htmx) suite.
 *
 * Locks the topbar global filter (project/assignee multi-select) running on
 * PURE htmx form serialization:
 * - POST /settings/global-filters parses a form body (repeated globalProjects /
 *   globalAssignees keys via parseBody({all:true})), writes the ui_state cookie,
 *   and returns 204 + HX-Trigger: global-filter:changed so domain views
 *   (from:body) reload.
 * - The project + assignee dropdowns share ONE <form hx-post hx-trigger=change>
 *   so the browser serializes every checked box via FormData as repeated keys.
 *
 * Regression — htmx #1541: the dropdowns previously gathered LOOSE checkboxes
 * via hx-include, which collapses duplicate names to the FIRST value (only the
 * first selected project/assignee applied). The shared <form> fixes it; this
 * suite pins the form wiring + that hx-include is NOT used. Checked state is
 * rendered server-side from the active list (no client state sync).
 */

import { Hono } from "hono";
import { assert, assertEquals } from "@std/assert";
import { settingsViewRouter } from "../../src/views/settings/routes.tsx";
import { Topbar } from "../../src/components/shell/topbar.tsx";
import {
  getPeopleService,
  getPortfolioService,
  initServices,
} from "../../src/singletons/services.ts";

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
        // Aggregation: ALL selected projects/assignees must round-trip into the
        // cookie, not just the first (regression: multi-select collapsed to one).
        const raw = cookie.match(/ui_state=([^;]+)/)?.[1] ?? "";
        const state = JSON.parse(decodeURIComponent(raw));
        assertEquals(state._global.globalProjects, ["Alpha", "Beta"]);
        assertEquals(state._global.globalAssignees, ["Alice"]);
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
      (c) => c.html(<Topbar globalProjects={["Alpha"]} globalAssignees={[]} />),
    );

    await t.step(
      "both filters share one form posting to /settings/global-filters on change",
      async () => {
        const res = await app.request("/__topbar");
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes('hx-post="/settings/global-filters"'),
          "filters must POST to /settings/global-filters via htmx",
        );
        assert(
          html.includes('hx-trigger="change"'),
          "filter form must POST on change",
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

    await t.step(
      "hx-include is NOT used (loose-input gather hits htmx #1541)",
      async () => {
        const html = await (await app.request("/__topbar")).text();
        assert(
          !html.includes("hx-include"),
          "must serialize via shared <form>, never hx-include of loose checkboxes",
        );
      },
    );

    await t.step(
      "checked state is rendered server-side from the active list",
      async () => {
        const html = await (await app.request("/__topbar")).text();
        // globalProjects=["Alpha"] → exactly one box pre-checked. hono renders a
        // true boolean attr as a bare `checked` (tag-closing `checked>`).
        const checkedCount = html.split(" checked>").length - 1;
        assertEquals(
          checkedCount,
          1,
          "exactly the active project must render checked",
        );
        assert(
          html.includes('value="Alpha"'),
          "active project option must be present",
        );
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
