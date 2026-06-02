/**
 * Unit tests for v2 BillingRateRepository (CRUD on disk) + BillingRateService
 * (filter behaviour).
 *
 * Regression focus: id and notes live in BILLING_RATE_BODY_KEYS, so
 * `serialize()` writes id only via the filename and notes only in the
 * `## Notes` body block — never to frontmatter. `parse()` must still
 * recognise such a file after `update()` rewrites it (the classic
 * "findById 404 after first update" bug — see retrospective-repository_test.ts).
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import { BillingRateRepository } from "../../src/repositories/billing-rate.repository.ts";
import { BillingRateService } from "../../src/services/billing-rate.service.ts";

async function setup(): Promise<
  { repo: BillingRateRepository; service: BillingRateService; dir: string }
> {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-billing-rate-test-",
  });
  const repo = new BillingRateRepository(dir);
  const service = new BillingRateService(repo);
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

Deno.test("BillingRateRepository - create stores file and returns entity", async () => {
  const { repo, dir } = await setup();
  try {
    const rate = await repo.create({
      name: "Standard Rate",
      unit: "h",
      rate: 150,
      currency: "CAD",
      assignee: "person_123",
      isDefault: true,
      notes: "Default hourly rate for senior engineers.",
    });
    assertExists(rate.id);
    assertEquals(rate.name, "Standard Rate");
    assertEquals(rate.unit, "h");
    assertEquals(rate.rate, 150);
    assertEquals(rate.currency, "CAD");
    assertEquals(rate.assignee, "person_123");
    assertEquals(rate.isDefault, true);
    assertEquals(rate.notes, "Default hourly rate for senior engineers.");
    assertExists(rate.createdAt);
    assertExists(rate.updatedAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BillingRateRepository - findById returns correct entity", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Findable Rate",
      unit: "d",
      rate: 1200,
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.id, created.id);
    assertEquals(found!.name, "Findable Rate");
    assertEquals(found!.unit, "d");
    assertEquals(found!.rate, 1200);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BillingRateRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    const found = await repo.findById("rate_nonexistent");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression (id + notes in body keys) ===

Deno.test("BillingRateRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Q1 Senior Rate",
      unit: "h",
      rate: 175,
    });
    // First update — rewrites the file. BILLING_RATE_BODY_KEYS = ["id", "notes"]
    // so `fm.id` is absent from the new file; the parse guard
    // `!fm.id && !fm.name` must still hold via `fm.name`.
    const updated = await repo.update(created.id, { rate: 200 });
    assertExists(updated);
    // The bug being guarded against: re-reading the just-written file → null → 404.
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.name, "Q1 Senior Rate");
    assertEquals(fetched!.rate, 200);
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("BillingRateRepository - update modifies existing entity", async () => {
  const { repo, dir } = await setup();
  try {
    const rate = await repo.create({
      name: "Original Rate",
      unit: "h",
      rate: 100,
    });
    const updated = await repo.update(rate.id, { rate: 125 });
    assertExists(updated);
    assertEquals(updated!.rate, 125);

    const found = await repo.findById(rate.id);
    assertEquals(found!.rate, 125);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BillingRateRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Multi-field Rate",
      unit: "h",
      rate: 150,
      currency: "USD",
      assignee: "person_abc",
      isDefault: false,
      notes: "Keep me intact.",
    });
    // Patch only `rate` — every sibling must round-trip unchanged.
    await repo.update(created.id, { rate: 175 });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.rate, 175);
    assertEquals(fetched!.name, "Multi-field Rate");
    assertEquals(fetched!.unit, "h");
    assertEquals(fetched!.currency, "USD");
    assertEquals(fetched!.assignee, "person_abc");
    assertEquals(fetched!.isDefault, false);
    assertEquals(fetched!.notes, "Keep me intact.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BillingRateRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.update("rate_missing", { rate: 999 });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

// === delete (soft-archive) + hardDelete ===

Deno.test("BillingRateRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const rate = await repo.create({
      name: "To be archived",
      unit: "h",
      rate: 100,
    });
    const deleted = await repo.delete(rate.id);
    assertEquals(deleted, true);
    // delete() aliases archive() — file stays, findById still resolves it,
    // findAll filters it out.
    const found = await repo.findById(rate.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((r) => r.id === rate.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BillingRateRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const rate = await repo.create({
      name: "Truly gone",
      unit: "h",
      rate: 100,
    });
    const ok = await repo.hardDelete(rate.id);
    assertEquals(ok, true);
    const found = await repo.findById(rate.id);
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BillingRateRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.delete("rate_ghost");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort + archive filtering ===

Deno.test("BillingRateRepository - findAll sorts alphabetically by name", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ name: "Charlie Rate", unit: "h", rate: 100 });
    await repo.create({ name: "Alpha Rate", unit: "h", rate: 100 });
    await repo.create({ name: "Bravo Rate", unit: "h", rate: 100 });
    const all = await repo.findAllFromDisk();
    assertEquals(all.length, 3);
    assertEquals(all.map((r) => r.name), [
      "Alpha Rate",
      "Bravo Rate",
      "Charlie Rate",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filter ===

Deno.test("BillingRateService - list with q filter matches name (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "Senior Hourly", unit: "h", rate: 200 });
    await repo.create({ name: "Junior Hourly", unit: "h", rate: 100 });
    await repo.create({ name: "Project Flat", unit: "fixed", rate: 5000 });
    const matches = await service.list({ q: "hourly" });
    assertEquals(matches.length, 2);
    assertEquals(
      matches.map((r) => r.name).sort(),
      ["Junior Hourly", "Senior Hourly"],
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BillingRateService - list with q filter matches notes (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      name: "Standard",
      unit: "h",
      rate: 150,
      notes: "Applies to ONBOARDING projects only.",
    });
    await repo.create({
      name: "Premium",
      unit: "h",
      rate: 250,
      notes: "Long-term retainer rate.",
    });
    const matches = await service.list({ q: "onboarding" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "Standard");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BillingRateService - list with no options returns all", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ name: "A", unit: "h", rate: 100 });
    await repo.create({ name: "B", unit: "d", rate: 800 });
    const all = await service.list();
    assertEquals(all.length, 2);
  } finally {
    await cleanup(dir);
  }
});

// === snake_case ↔ camelCase round-trip ===

Deno.test("BillingRateRepository - writes snake_case on disk, reads camelCase entity", async () => {
  const { repo, dir } = await setup();
  try {
    const rate = await repo.create({
      name: "Round Trip",
      unit: "h",
      rate: 150,
      isDefault: true,
    });
    const filePath = join(dir, "billing/rates", `${rate.id}.md`);
    const raw = await Deno.readTextFile(filePath);
    // Frontmatter uses snake_case keys on disk.
    const fmEnd = raw.indexOf("\n---", 4);
    const fm = raw.slice(0, fmEnd);
    assertEquals(fm.includes("is_default:"), true);
    assertEquals(fm.includes("created_at:"), true);
    assertEquals(fm.includes("updated_at:"), true);
    // The camelCase variants must NOT appear in frontmatter.
    assertEquals(fm.includes("isDefault:"), false);
    assertEquals(fm.includes("createdAt:"), false);
    // Entity reads back camelCase.
    const fetched = await repo.findById(rate.id);
    assertExists(fetched);
    assertEquals(fetched!.isDefault, true);
    assertExists(fetched!.createdAt);
    assertExists(fetched!.updatedAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BillingRateRepository - parses a manually-written snake_case file", async () => {
  const { repo, dir } = await setup();
  try {
    // Mimics a disk file written by an older session: snake_case fm,
    // id reconstructed from filename, notes in body.
    await Deno.mkdir(join(dir, "billing/rates"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "billing/rates", "rate_manual.md"),
      [
        "---",
        "name: Manual Rate",
        "unit: h",
        "rate: 175",
        "currency: USD",
        "is_default: false",
        "created_at: 2026-01-01T00:00:00.000Z",
        "updated_at: 2026-01-02T00:00:00.000Z",
        "---",
        "# Manual Rate",
        "",
        "## Notes",
        "",
        "Hand-written fixture.",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("rate_manual");
    assertExists(fetched);
    assertEquals(fetched!.id, "rate_manual");
    assertEquals(fetched!.name, "Manual Rate");
    assertEquals(fetched!.unit, "h");
    assertEquals(fetched!.rate, 175);
    assertEquals(fetched!.currency, "USD");
    assertEquals(fetched!.isDefault, false);
    assertEquals(fetched!.notes, "Hand-written fixture.");
    assertEquals(fetched!.createdAt, "2026-01-01T00:00:00.000Z");
    assertEquals(fetched!.updatedAt, "2026-01-02T00:00:00.000Z");
  } finally {
    await cleanup(dir);
  }
});

// === edge cases ===

Deno.test("BillingRateRepository - optional fields left undefined round-trip as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Minimal",
      unit: "h",
      rate: 100,
      // currency / assignee / isDefault / notes intentionally omitted
    });
    assertStrictEquals(created.currency, undefined);
    assertStrictEquals(created.assignee, undefined);
    assertStrictEquals(created.isDefault, undefined);
    assertStrictEquals(created.notes, undefined);

    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.currency, undefined);
    assertStrictEquals(fetched!.assignee, undefined);
    assertStrictEquals(fetched!.isDefault, undefined);
    assertStrictEquals(fetched!.notes, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("BillingRateRepository - findByName returns matching rate (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ name: "Premium Tier", unit: "h", rate: 300 });
    await repo.create({ name: "Standard Tier", unit: "h", rate: 150 });
    const found = await repo.findByName("premium tier");
    assertExists(found);
    assertEquals(found!.name, "Premium Tier");
  } finally {
    await cleanup(dir);
  }
});
