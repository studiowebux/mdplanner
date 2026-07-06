/**
 * Guards the data-driven AnalyticsSection decomposition (sh7n). The 16
 * per-domain sections are rendered from a single SECTIONS spec array through one
 * <AnalyticsSection>; this asserts the canonical scaffolding the CSS-only tabs
 * and jump anchors depend on stays intact for every section:
 *   - each section renders `id="analytics-<key>"` with the correct `data-cat`
 *     and `data-jump-target`;
 *   - the six wide sections carry `analytics__section--wide`;
 *   - populated sections emit their expected chart kind / bespoke body;
 *   - the empty payload falls back to the per-section EmptyState message
 *     (and the stat-only `customers` section renders neither chart nor empty).
 *
 * Renders the exported AnalyticsBody with the same renderToString the routes use.
 */

import { assert, assertEquals } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import {
  ALL_SECTIONS,
  AnalyticsBody,
  CATEGORY_DEFS,
} from "../../src/views/analytics.tsx";
import { emptyData, fixtureProps, fullData } from "./analytics-fixtures.ts";

function renderFull(): string {
  return renderToString(
    AnalyticsBody({ data: fullData, ...fixtureProps }) as never,
  );
}

function renderEmpty(): string {
  return renderToString(
    AnalyticsBody({ data: emptyData, ...fixtureProps }) as never,
  );
}

const WIDE = new Set([
  "milestones",
  "timeEntries",
  "capacity",
  "invoices",
  "finances",
  "habits",
  "journal",
]);

const CHART_KIND: Record<string, string> = {
  tasks: "bar",
  goals: "bar",
  timeEntries: "line",
  invoices: "line",
  quotes: "donut",
  meetings: "bar",
  notes: "donut",
  investors: "bar",
  finances: "groupedbar",
  deals: "funnel",
  reflections: "bar",
};

const EMPTY_MESSAGE: Record<string, string> = {
  tasks: "No tasks yet.",
  goals: "No goals yet.",
  milestones: "No milestones yet.",
  timeEntries: "No time logged yet.",
  capacity: "No capacity plans yet.",
  invoices: "No invoices yet.",
  quotes: "No quotes yet.",
  meetings: "No meetings yet.",
  notes: "No notes yet.",
  investors: "No investors yet.",
  finances: "No finance entries yet.",
  deals: "No deals yet.",
  habits: "No habits yet.",
  journal: "No journal entries yet.",
  reflections: "No reflections yet.",
};

// data-cat per section, derived from the category registry the tabs use.
const CAT_OF: Record<string, string> = {};
for (const cat of CATEGORY_DEFS) {
  for (const s of cat.sections) CAT_OF[s] = cat.key;
}

Deno.test("every section renders its canonical wrapper (id + data-cat + jump target)", () => {
  const html = renderFull();
  for (const { key } of ALL_SECTIONS) {
    assert(
      html.includes(`id="analytics-${key}"`),
      `missing section id for "${key}"`,
    );
    assert(
      html.includes(`data-jump-target="${key}"`),
      `missing data-jump-target for "${key}"`,
    );
    assert(
      html.includes(`data-cat="${CAT_OF[key]}"`),
      `missing/wrong data-cat for "${key}" (expected "${CAT_OF[key]}")`,
    );
  }
});

Deno.test("wide sections carry the --wide modifier, narrow ones do not", () => {
  const html = renderFull();
  // Pull each section's class string off its opening <section ... id=...>.
  for (const { key } of ALL_SECTIONS) {
    const marker = `id="analytics-${key}"`;
    const idx = html.indexOf(marker);
    assert(idx > -1, `section "${key}" not found`);
    const open = html.lastIndexOf("<section", idx);
    const classAttr = html.slice(open, idx);
    const isWide = classAttr.includes("analytics__section--wide");
    assertEquals(
      isWide,
      WIDE.has(key),
      `wide mismatch for "${key}": rendered=${isWide} expected=${
        WIDE.has(key)
      }`,
    );
  }
});

Deno.test("populated sections emit their expected chart kind", () => {
  const html = renderFull();
  for (const [key, kind] of Object.entries(CHART_KIND)) {
    assert(
      html.includes(`data-chart="${kind}"`),
      `section "${key}" should render a ${kind} chart`,
    );
  }
  // Bespoke (non-chart) bodies render their own containers.
  assert(html.includes("analytics__util-chart"), "capacity util chart missing");
  assert(html.includes("analytics__habit-grid"), "habit grid missing");
  assert(html.includes("analytics__heatmap"), "journal heatmap missing");
  assert(
    html.includes("analytics__milestones analytics__progress-scroll"),
    "milestones progress list missing",
  );
});

Deno.test("empty payload falls back to per-section EmptyState messages", () => {
  const html = renderEmpty();
  for (const msg of Object.values(EMPTY_MESSAGE)) {
    assert(html.includes(msg), `missing EmptyState message: "${msg}"`);
  }
  // No charts when every section is empty.
  assert(
    !html.includes("data-chart="),
    "empty payload should render no charts",
  );
  // The stat-only customers section still renders (no body, no empty state).
  assert(
    html.includes('id="analytics-customers"'),
    "customers section should always render",
  );
});
