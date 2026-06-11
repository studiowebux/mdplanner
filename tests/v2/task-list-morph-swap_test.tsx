/**
 * User-initiated list swaps morph instead of replacing the view (jank fix
 * r87t6e, jank audit note_1781147689252 finding A).
 *
 * The factory toolbar controls (search, clear-sort, page-size, filter selects,
 * hideCompleted/showHidden/archived toggles) and the date-range filter inputs
 * re-render the SAME view, so they now use `morph:outerHTML` — same as the SSE
 * path — to avoid the full-repaint flash, collapsed-section reset, and
 * scroll-jump. View-MODE toggles (list/board/table) are a different-structure
 * swap and intentionally keep `outerHTML swap:100ms`.
 *
 * Full MainLayout pages aren't sync-renderable (renderToString throws), so the
 * page is rendered through Hono's async `c.html` exactly like loading-indicator
 * _test.tsx; DateRangeFilter is an exported sync FC rendered directly.
 */

import { Hono } from "hono";
import { assert, assertEquals } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { createDomainPage } from "../../src/factories/domain-view.tsx";
import { DateRangeFilter } from "../../src/factories/domain-view-filters.tsx";
import { taskConfig } from "../../src/domains/task/config.tsx";
import { initServices } from "../../src/singletons/services.ts";
import type { DomainFilterState } from "../../src/factories/domain.types.ts";

async function renderTaskPage(): Promise<string> {
  const { DomainPage } = createDomainPage(taskConfig);
  const app = new Hono();
  app.get(
    "/__page",
    async (c) =>
      c.html(
        await DomainPage({
          items: [],
          state: { view: "list" } as unknown as DomainFilterState,
        }) as unknown as string,
      ),
  );
  const res = await app.request("/__page");
  assertEquals(res.status, 200);
  return await res.text();
}

function tag(html: string, re: RegExp): string {
  return html.match(re)?.[0] ?? "";
}

Deno.test("task list page — toolbar filter controls morph the view (no full replace)", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-morph-swap-" });
  initServices(dir, { cache: false });
  try {
    const html = await renderTaskPage();

    const search = tag(html, /<input[^>]*name="q"[^>]*>/);
    assert(search.length > 0, "expected the toolbar search input");
    assertStringIncludesMorph(search, "search input");

    const archived = tag(html, /<input[^>]*name="archived"[^>]*>/);
    assert(archived.length > 0, "expected the Show-archived toggle");
    assertStringIncludesMorph(archived, "archived toggle");

    // View-MODE toggles must NOT morph — a list↔board layout switch is a clean
    // structural replace (with its 100ms transition), not a same-view re-render.
    assert(
      html.includes('hx-swap="outerHTML swap:100ms"'),
      "view-mode toggle should keep outerHTML swap:100ms",
    );
    // No bare `hx-swap="outerHTML"` should survive on a same-view control: the
    // only outerHTML left is the view-toggle's `outerHTML swap:100ms`, whose
    // attribute value never matches the bare-closing-quote form.
    assertEquals(
      html.includes('hx-swap="outerHTML"'),
      false,
      "no same-view control should still use a bare outerHTML replace",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("DateRangeFilter — from/to inputs morph the view", () => {
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    DateRangeFilter({
      domain: "tasks",
      fromKey: "due_from",
      toKey: "due_to",
      fromLabel: "Due from",
      toLabel: "Due to",
      state: {} as unknown as DomainFilterState,
      // deno-lint-ignore no-explicit-any
    }) as any,
  );
  assertEquals(html.includes('hx-swap="outerHTML"'), false);
  assertEquals(
    (html.match(/hx-swap="morph:outerHTML"/g) ?? []).length,
    2,
    "both date inputs morph",
  );
});

function assertStringIncludesMorph(tagHtml: string, label: string): void {
  assert(
    tagHtml.includes('hx-swap="morph:outerHTML"'),
    `${label} must use morph:outerHTML, got: ${tagHtml}`,
  );
}
