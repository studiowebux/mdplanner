/**
 * Unit tests for v2 FinanceRepository (CRUD on disk) + FinanceService
 * (filter behaviour).
 *
 * Complements `tests/src/finance-aggregations_test.ts`, which exercises the
 * static aggregator helpers (`aggregateMonthly`, `aggregateByTag`). This file
 * covers: CRUD, parse-guard regression (`FINANCE_BODY_KEYS = ["id",
 * "description"]` so the post-update file has no `fm.id` — `parse()` must
 * still resolve via `fm.title`), service filters (q/type/tag/from/to plus
 * combined), snake_case ↔ camelCase round-trip, and the previously-untested
 * `FinanceService.computeRunningBalance` static helper.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import { FinanceRepository } from "../../src/repositories/finance.repository.ts";
import { FinanceService } from "../../src/services/finance.service.ts";
import type { Finance } from "../../src/types/finance.types.ts";

async function setup(): Promise<
  { repo: FinanceRepository; service: FinanceService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-finance-test-" });
  const repo = new FinanceRepository(dir);
  const service = new FinanceService(repo);
  return { repo, service, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

// === create + findById ===

Deno.test("FinanceRepository - create stores file and returns entity", async () => {
  const { repo, dir } = await setup();
  try {
    const entry = await repo.create({
      title: "SaaS Revenue — January",
      type: "income",
      amount: 4200,
      currency: "CAD",
      date: "2026-01-31",
      description: "Stripe payouts for Pro plan subscriptions.",
      tags: ["saas", "recurring"],
    });
    assertExists(entry.id);
    assertEquals(entry.title, "SaaS Revenue — January");
    assertEquals(entry.type, "income");
    assertEquals(entry.amount, 4200);
    assertEquals(entry.currency, "CAD");
    assertEquals(entry.date, "2026-01-31");
    assertEquals(
      entry.description,
      "Stripe payouts for Pro plan subscriptions.",
    );
    assertEquals(entry.tags, ["saas", "recurring"]);
    assertExists(entry.createdAt);
    assertExists(entry.updatedAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceRepository - findById returns correct entity", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Hosting bill",
      type: "expense",
      amount: 120,
      currency: "USD",
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.id, created.id);
    assertEquals(found!.title, "Hosting bill");
    assertEquals(found!.type, "expense");
    assertEquals(found!.amount, 120);
    assertEquals(found!.currency, "USD");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    const found = await repo.findById("finance_nonexistent");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression ===

Deno.test("FinanceRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Consulting Income",
      type: "income",
      amount: 2500,
    });
    // FINANCE_BODY_KEYS = ["id", "description"], so the rewritten file has no
    // `id` key in frontmatter. The parse guard `!fm.id && !fm.title` must
    // still hold via `fm.title`.
    const updated = await repo.update(created.id, { amount: 3000 });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.title, "Consulting Income");
    assertEquals(fetched!.amount, 3000);
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("FinanceRepository - update modifies existing entity", async () => {
  const { repo, dir } = await setup();
  try {
    const entry = await repo.create({
      title: "Original",
      type: "expense",
      amount: 100,
    });
    const updated = await repo.update(entry.id, { amount: 150 });
    assertExists(updated);
    assertEquals(updated!.amount, 150);

    const found = await repo.findById(entry.id);
    assertEquals(found!.amount, 150);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Multi-field Entry",
      type: "income",
      amount: 500,
      currency: "EUR",
      date: "2026-03-15",
      description: "Keep me intact.",
      tags: ["consulting", "eu"],
    });
    // Patch only amount — every sibling must round-trip unchanged.
    await repo.update(created.id, { amount: 600 });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.amount, 600);
    assertEquals(fetched!.title, "Multi-field Entry");
    assertEquals(fetched!.type, "income");
    assertEquals(fetched!.currency, "EUR");
    assertEquals(fetched!.date, "2026-03-15");
    assertEquals(fetched!.description, "Keep me intact.");
    assertEquals(fetched!.tags, ["consulting", "eu"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.update("finance_missing", { amount: 999 });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

// === delete (soft-archive) + hardDelete ===

Deno.test("FinanceRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const entry = await repo.create({
      title: "To be archived",
      type: "expense",
      amount: 50,
    });
    const deleted = await repo.delete(entry.id);
    assertEquals(deleted, true);
    // delete() aliases archive() — file stays, findById still resolves it,
    // findAllFromDisk filters it out.
    const found = await repo.findById(entry.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((f) => f.id === entry.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const entry = await repo.create({
      title: "Truly gone",
      type: "expense",
      amount: 10,
    });
    const ok = await repo.hardDelete(entry.id);
    assertEquals(ok, true);
    const found = await repo.findById(entry.id);
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.delete("finance_ghost");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort + archive filtering ===

Deno.test("FinanceRepository - findAllFromDisk sorts alphabetically by title", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Charlie Income", type: "income", amount: 100 });
    await repo.create({ title: "Alpha Income", type: "income", amount: 100 });
    await repo.create({ title: "Bravo Income", type: "income", amount: 100 });
    const all = await repo.findAllFromDisk();
    assertEquals(all.length, 3);
    assertEquals(all.map((f) => f.title), [
      "Alpha Income",
      "Bravo Income",
      "Charlie Income",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("FinanceService - list with q filter matches title (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "SaaS Revenue", type: "income", amount: 1000 });
    await repo.create({
      title: "Consulting Revenue",
      type: "income",
      amount: 2000,
    });
    await repo.create({ title: "Hosting Bill", type: "expense", amount: 50 });
    const matches = await service.list({ q: "revenue" });
    assertEquals(matches.length, 2);
    assertEquals(
      matches.map((f) => f.title).sort(),
      ["Consulting Revenue", "SaaS Revenue"],
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceService - list with q filter matches description (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "Server",
      type: "expense",
      amount: 100,
      description: "Applies to ONBOARDING infra only.",
    });
    await repo.create({
      title: "CDN",
      type: "expense",
      amount: 50,
      description: "Edge cache rollout.",
    });
    const matches = await service.list({ q: "onboarding" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Server");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceService - list with q filter matches tags (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "Stripe",
      type: "income",
      amount: 500,
      tags: ["saas"],
    });
    await repo.create({
      title: "Salary",
      type: "expense",
      amount: 3000,
      tags: ["payroll"],
    });
    const matches = await service.list({ q: "saas" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Stripe");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceService - list with type filter returns only matching", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "Income A", type: "income", amount: 100 });
    await repo.create({ title: "Income B", type: "income", amount: 200 });
    await repo.create({ title: "Expense A", type: "expense", amount: 50 });
    const incomes = await service.list({ type: "income" });
    assertEquals(incomes.length, 2);
    assertEquals(incomes.every((f) => f.type === "income"), true);
    const expenses = await service.list({ type: "expense" });
    assertEquals(expenses.length, 1);
    assertEquals(expenses[0].title, "Expense A");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceService - list with tag filter is case-insensitive", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "A",
      type: "income",
      amount: 100,
      tags: ["SaaS", "recurring"],
    });
    await repo.create({
      title: "B",
      type: "income",
      amount: 50,
      tags: ["consulting"],
    });
    const matches = await service.list({ tag: "saas" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "A");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceService - list with from/to date range filters on entity date (inclusive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "Jan",
      type: "income",
      amount: 100,
      date: "2026-01-15",
    });
    await repo.create({
      title: "Feb",
      type: "income",
      amount: 100,
      date: "2026-02-15",
    });
    await repo.create({
      title: "Mar",
      type: "income",
      amount: 100,
      date: "2026-03-15",
    });
    // No date — must be filtered out of any date-bounded query.
    await repo.create({
      title: "Undated",
      type: "income",
      amount: 100,
    });
    const range = await service.list({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    assertEquals(range.length, 1);
    assertEquals(range[0].title, "Feb");

    const fromOnly = await service.list({ from: "2026-02-15" });
    assertEquals(fromOnly.length, 2);
    assertEquals(
      fromOnly.map((f) => f.title).sort(),
      ["Feb", "Mar"],
    );

    const toOnly = await service.list({ to: "2026-02-15" });
    assertEquals(toOnly.length, 2);
    assertEquals(
      toOnly.map((f) => f.title).sort(),
      ["Feb", "Jan"].sort(),
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceService - list combines type + tag + date range (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "Match",
      type: "income",
      amount: 100,
      date: "2026-02-10",
      tags: ["saas"],
    });
    await repo.create({
      title: "Wrong type",
      type: "expense",
      amount: 100,
      date: "2026-02-10",
      tags: ["saas"],
    });
    await repo.create({
      title: "Wrong tag",
      type: "income",
      amount: 100,
      date: "2026-02-10",
      tags: ["consulting"],
    });
    await repo.create({
      title: "Out of range",
      type: "income",
      amount: 100,
      date: "2026-04-01",
      tags: ["saas"],
    });
    const matches = await service.list({
      type: "income",
      tag: "saas",
      from: "2026-02-01",
      to: "2026-02-28",
    });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Match");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceService - list with no options returns all", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A", type: "income", amount: 1 });
    await repo.create({ title: "B", type: "expense", amount: 2 });
    const all = await service.list();
    assertEquals(all.length, 2);
  } finally {
    await cleanup(dir);
  }
});

// === snake_case ↔ camelCase round-trip ===

Deno.test("FinanceRepository - writes snake_case on disk, reads camelCase entity", async () => {
  const { repo, dir } = await setup();
  try {
    const entry = await repo.create({
      title: "Round Trip",
      type: "income",
      amount: 500,
      currency: "CAD",
      date: "2026-05-01",
    });
    const filePath = join(dir, "finances", `${entry.id}.md`);
    const raw = await Deno.readTextFile(filePath);
    const fmEnd = raw.indexOf("\n---", 4);
    const fm = raw.slice(0, fmEnd);
    assertEquals(fm.includes("created_at:"), true);
    assertEquals(fm.includes("updated_at:"), true);
    assertEquals(fm.includes("createdAt:"), false);
    // Entity reads back camelCase.
    const fetched = await repo.findById(entry.id);
    assertExists(fetched);
    assertExists(fetched!.createdAt);
    assertExists(fetched!.updatedAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceRepository - parses a manually-written snake_case file", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "finances"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "finances", "finance_manual.md"),
      [
        "---",
        "title: Manual Entry",
        "type: expense",
        "amount: 175",
        "currency: USD",
        "date: 2026-01-01",
        "tags:",
        "  - manual",
        "  - test",
        "created_at: 2026-01-01T00:00:00.000Z",
        "updated_at: 2026-01-02T00:00:00.000Z",
        "---",
        "Hand-written fixture body.",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("finance_manual");
    assertExists(fetched);
    assertEquals(fetched!.id, "finance_manual");
    assertEquals(fetched!.title, "Manual Entry");
    assertEquals(fetched!.type, "expense");
    assertEquals(fetched!.amount, 175);
    assertEquals(fetched!.currency, "USD");
    assertEquals(fetched!.date, "2026-01-01");
    assertEquals(fetched!.tags, ["manual", "test"]);
    assertEquals(fetched!.description, "Hand-written fixture body.");
    assertEquals(fetched!.createdAt, "2026-01-01T00:00:00.000Z");
    assertEquals(fetched!.updatedAt, "2026-01-02T00:00:00.000Z");
  } finally {
    await cleanup(dir);
  }
});

// === edge cases ===

Deno.test("FinanceRepository - unknown type falls back to expense", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "finances"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "finances", "finance_bad_type.md"),
      [
        "---",
        "title: Bad Type",
        "type: nonsense",
        "amount: 10",
        "---",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("finance_bad_type");
    assertExists(fetched);
    assertEquals(fetched!.type, "expense");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceRepository - optional fields left undefined round-trip as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Minimal",
      type: "expense",
      amount: 1,
      // currency / date / description / tags intentionally omitted
    });
    assertStrictEquals(created.currency, undefined);
    assertStrictEquals(created.date, undefined);
    assertStrictEquals(created.description, undefined);
    assertEquals(created.tags, []);

    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.currency, undefined);
    assertStrictEquals(fetched!.date, undefined);
    assertStrictEquals(fetched!.description, undefined);
    assertEquals(fetched!.tags, []);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceRepository - findByName returns matching entry (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({
      title: "Stripe Payout",
      type: "income",
      amount: 1000,
    });
    await repo.create({ title: "AWS Hosting", type: "expense", amount: 250 });
    const found = await repo.findByName("stripe payout");
    assertExists(found);
    assertEquals(found!.title, "Stripe Payout");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("FinanceRepository - amount of 0 round-trips", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Zero",
      type: "expense",
      amount: 0,
    });
    assertEquals(created.amount, 0);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.amount, 0);
  } finally {
    await cleanup(dir);
  }
});

// === FinanceService.computeRunningBalance (static) ===

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

Deno.test("FinanceService.computeRunningBalance - empty input returns empty map", () => {
  const out = FinanceService.computeRunningBalance([]);
  assertEquals(out.size, 0);
});

Deno.test("FinanceService.computeRunningBalance - accumulates income and expense in date-ascending order", () => {
  const items = [
    entry({ id: "f1", type: "income", amount: 100, date: "2026-01-01" }),
    entry({ id: "f2", type: "expense", amount: 40, date: "2026-01-15" }),
    entry({ id: "f3", type: "income", amount: 200, date: "2026-02-01" }),
  ];
  // Pass in non-ascending order to verify internal sort.
  const out = FinanceService.computeRunningBalance(
    [items[2], items[0], items[1]],
  );
  assertEquals(out.get("f1"), 100);
  assertEquals(out.get("f2"), 60);
  assertEquals(out.get("f3"), 260);
});

Deno.test("FinanceService.computeRunningBalance - undated entries are placed first", () => {
  const items = [
    entry({ id: "dated", type: "income", amount: 50, date: "2026-01-01" }),
    entry({ id: "undated", type: "income", amount: 10 }), // no date
  ];
  const out = FinanceService.computeRunningBalance(items);
  // Undated comes first (treated as earliest), so its running balance is 10,
  // then dated adds 50 to reach 60.
  assertEquals(out.get("undated"), 10);
  assertEquals(out.get("dated"), 60);
});
