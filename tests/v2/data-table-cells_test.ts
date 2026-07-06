/**
 * Guards detail-view tables against regressing to bare / bespoke body cells
 * mixed inside a `.data-table`. Body rows must carry `data-table__row` and
 * every `<td>`/`<th>` must carry the canonical `data-table__td`/`data-table__th`
 * class (bespoke classes like `--right` / `--actions` stay as additive
 * modifiers) so rows inherit shared striping, hover, border, and padding.
 *
 * Sibling reference: tests/v2/uploads-view_test.ts. Covers the three views
 * normalized in the uploads blast-radius sweep (or66): customer billing tables,
 * task time-entries table, goal sub-goals table.
 */

import { assert } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { BillingSection } from "../../src/views/customer-detail.tsx";
import { TimeEntriesSection } from "../../src/views/task-detail.tsx";
import { SubGoalsTable } from "../../src/views/goal-detail.tsx";
import { DataTable } from "../../src/components/ui/data-table.tsx";

/** Every `<td>` carries `data-table__td`; every `<th>` carries `data-table__th`. */
function assertCanonicalCells(html: string, label: string): void {
  assert(
    html.includes("data-table__row"),
    `${label}: rows need data-table__row`,
  );
  assert(
    html.includes("data-table__td"),
    `${label}: cells need data-table__td`,
  );
  assert(
    !/<td\b(?![^>]*data-table__td)/.test(html),
    `${label}: every <td> must carry the canonical data-table__td class`,
  );
  assert(
    !/<th\b(?![^>]*data-table__th)/.test(html),
    `${label}: every <th> must carry the canonical data-table__th class`,
  );
  // a11y: every header cell must carry a scope so screen readers can
  // associate it with its column/row.
  assert(
    !/<th\b(?![^>]*scope=)/.test(html),
    `${label}: every <th> must carry a scope attribute`,
  );
}

Deno.test("customer billing tables use canonical data-table cells", () => {
  const quotes = [
    {
      id: "q1",
      number: "Q-1",
      title: "Quote One",
      status: "draft",
      total: 1000,
      expiresAt: "2026-07-01",
    },
  ];
  const invoices = [
    {
      id: "i1",
      number: "I-1",
      title: "Invoice One",
      status: "sent",
      displayStatus: "sent",
      total: 2000,
      paidAmount: 500,
      dueDate: "2026-07-15",
    },
  ];
  const html = renderToString(
    BillingSection(
      {
        customerId: "c1",
        quotes,
        invoices,
        payments: [],
        invoiceNumbers: new Map(),
      } as unknown as Parameters<
        typeof BillingSection
      >[0],
    ),
  );
  assertCanonicalCells(html, "customer billing");
  // Right-align modifier survives as an additive class.
  assert(
    html.includes("data-table__td data-table__td--right"),
    "currency cells keep the --right modifier alongside the base class",
  );
});

Deno.test("task time-entries table uses canonical data-table cells", () => {
  const entries = [
    {
      id: "te1",
      date: "2026-05-01",
      hours: 2,
      person: "Alice",
      description: "Investigation",
    },
  ];
  const html = renderToString(
    TimeEntriesSection(
      { taskId: "t1", entries } as Parameters<typeof TimeEntriesSection>[0],
    ),
  );
  assertCanonicalCells(html, "task time-entries");
  assert(
    html.includes("data-table__td task-detail__time-hours"),
    "hours cell keeps its bespoke modifier alongside the base class",
  );
});

Deno.test("goal sub-goals table uses canonical data-table cells", () => {
  const childGoals = [
    { id: "g1", title: "Child Goal", status: "in_progress", progress: 40 },
  ];
  const html = renderToString(
    SubGoalsTable(
      { childGoals } as Parameters<typeof SubGoalsTable>[0],
    ),
  );
  assertCanonicalCells(html, "goal sub-goals");
});

Deno.test("shared DataTable root marks every header with scope=col", () => {
  const html = renderToString(
    DataTable({
      columns: [
        { key: "name", label: "Name" },
        { key: "status", label: "Status" },
      ],
      rows: [{ id: "r1", name: "Alpha", status: "open" }],
    }),
  );
  assert(
    !/<th\b(?![^>]*scope="col")/.test(html),
    'every DataTable header <th> must carry scope="col"',
  );
});
