/**
 * Tests for FinanceService.aggregateMonthly and FinanceService.aggregateByTag.
 *
 * Both aggregators are static pure functions on Finance[] — they back the
 * chart view (`/finances?view=chart`) and feed `getSummary()`. They have no
 * DB or repo dependency, so these tests construct entries inline and assert
 * directly. Covers: empty input, mixed income/expense, multi-month ordering,
 * missing dates (skipped from monthly only), untagged entries (bucketed as
 * "uncategorized" in byTag).
 */

import { assertEquals } from "@std/assert";
import { FinanceService } from "../../src/services/finance.service.ts";
import type { Finance } from "../../src/types/finance.types.ts";

function entry(
  overrides: Partial<Finance> & Pick<Finance, "type" | "amount">,
): Finance {
  return {
    id: overrides.id ?? `f_${Math.random().toString(36).slice(2, 8)}`,
    title: overrides.title ?? "Entry",
    type: overrides.type,
    amount: overrides.amount,
    currency: overrides.currency ?? "CAD",
    date: overrides.date ?? null,
    description: overrides.description ?? null,
    tags: overrides.tags ?? null,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
    createdBy: overrides.createdBy ?? null,
    updatedBy: overrides.updatedBy ?? null,
  };
}

Deno.test("FinanceService.aggregateMonthly — empty input returns empty array", () => {
  assertEquals(FinanceService.aggregateMonthly([]), []);
});

Deno.test("FinanceService.aggregateMonthly — buckets entries by YYYY-MM", () => {
  const items = [
    entry({ type: "income", amount: 100, date: "2026-01-05" }),
    entry({ type: "income", amount: 200, date: "2026-01-20" }),
    entry({ type: "expense", amount: 50, date: "2026-01-15" }),
    entry({ type: "income", amount: 500, date: "2026-02-01" }),
    entry({ type: "expense", amount: 300, date: "2026-02-28" }),
  ];
  assertEquals(FinanceService.aggregateMonthly(items), [
    { month: "2026-01", income: 300, expense: 50 },
    { month: "2026-02", income: 500, expense: 300 },
  ]);
});

Deno.test("FinanceService.aggregateMonthly — sorts buckets ascending by month", () => {
  const items = [
    entry({ type: "income", amount: 1, date: "2026-03-01" }),
    entry({ type: "income", amount: 1, date: "2026-01-01" }),
    entry({ type: "income", amount: 1, date: "2026-02-01" }),
  ];
  assertEquals(
    FinanceService.aggregateMonthly(items).map((m) => m.month),
    ["2026-01", "2026-02", "2026-03"],
  );
});

Deno.test("FinanceService.aggregateMonthly — skips entries with no date", () => {
  const items = [
    entry({ type: "income", amount: 100, date: "2026-01-01" }),
    entry({ type: "income", amount: 999, date: null }),
    entry({ type: "expense", amount: 999 }),
  ];
  assertEquals(FinanceService.aggregateMonthly(items), [
    { month: "2026-01", income: 100, expense: 0 },
  ]);
});

Deno.test("FinanceService.aggregateByTag — empty input returns empty array", () => {
  assertEquals(FinanceService.aggregateByTag([]), []);
});

Deno.test("FinanceService.aggregateByTag — groups by (tag, type) and sorts desc", () => {
  const items = [
    entry({ type: "income", amount: 100, tags: ["saas"] }),
    entry({ type: "income", amount: 50, tags: ["saas"] }),
    entry({ type: "expense", amount: 30, tags: ["hosting"] }),
    entry({ type: "income", amount: 200, tags: ["consulting"] }),
  ];
  assertEquals(FinanceService.aggregateByTag(items), [
    { tag: "consulting", type: "income", total: 200 },
    { tag: "saas", type: "income", total: 150 },
    { tag: "hosting", type: "expense", total: 30 },
  ]);
});

Deno.test('FinanceService.aggregateByTag — untagged entries bucket as "uncategorized"', () => {
  const items = [
    entry({ type: "income", amount: 100, tags: null }),
    entry({ type: "expense", amount: 40, tags: [] }),
    entry({ type: "income", amount: 25 }),
  ];
  assertEquals(FinanceService.aggregateByTag(items), [
    { tag: "uncategorized", type: "income", total: 125 },
    { tag: "uncategorized", type: "expense", total: 40 },
  ]);
});

Deno.test("FinanceService.aggregateByTag — same tag, both types, produces two rows", () => {
  const items = [
    entry({ type: "income", amount: 100, tags: ["saas"] }),
    entry({ type: "expense", amount: 60, tags: ["saas"] }),
  ];
  const rows = FinanceService.aggregateByTag(items);
  assertEquals(rows.length, 2);
  assertEquals(
    rows.find((r) => r.type === "income"),
    { tag: "saas", type: "income", total: 100 },
  );
  assertEquals(
    rows.find((r) => r.type === "expense"),
    { tag: "saas", type: "expense", total: 60 },
  );
});

Deno.test("FinanceService.aggregateByTag — multi-tag entry contributes to each tag bucket", () => {
  const items = [
    entry({ type: "income", amount: 100, tags: ["saas", "recurring"] }),
  ];
  assertEquals(FinanceService.aggregateByTag(items), [
    { tag: "saas", type: "income", total: 100 },
    { tag: "recurring", type: "income", total: 100 },
  ]);
});
