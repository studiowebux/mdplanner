/**
 * Unit tests for v2 SafeRepository (CRUD on disk) + SafeService
 * (filter behaviour).
 *
 * SAFe uses a custom `serialize()` (frontmatter-only, decorative body title).
 * The entity field `valuation_cap` is intentionally snake_case at the type
 * layer; `parse()` reads `fm.valuationCap` because `CachedMarkdownRepository`
 * passes frontmatter through `mapKeysFromFm` (snake → camel) before delivery,
 * so the on-disk `valuation_cap: 3000000` round-trips correctly. This file
 * locks that contract.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import { SafeRepository } from "../../src/repositories/safe.repository.ts";
import { SafeService } from "../../src/services/safe.service.ts";

async function setup(): Promise<
  { repo: SafeRepository; service: SafeService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-safe-test-" });
  const repo = new SafeRepository(dir);
  const service = new SafeService(repo);
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

Deno.test("SafeRepository - create stores file and returns entity with defaults", async () => {
  const { repo, dir } = await setup();
  try {
    const safe = await repo.create({
      investor: "Angel Investor",
      amount: 250000,
      date: "2026-01-15",
      // valuation_cap / discount / type / status / notes omitted — defaults apply
    });
    assertExists(safe.id);
    assertEquals(safe.investor, "Angel Investor");
    assertEquals(safe.amount, 250000);
    assertEquals(safe.date, "2026-01-15");
    // Defaults from fromCreateInput
    assertEquals(safe.valuation_cap, 0);
    assertEquals(safe.discount, 0);
    assertEquals(safe.type, "post-money");
    assertEquals(safe.status, "draft");
    assertExists(safe.createdAt);
    assertExists(safe.updatedAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SafeRepository - create stores fully-specified entity", async () => {
  const { repo, dir } = await setup();
  try {
    const safe = await repo.create({
      investor: "Series Seed Inc.",
      amount: 1000000,
      valuation_cap: 8000000,
      discount: 20,
      type: "pre-money",
      date: "2026-03-10",
      status: "signed",
      notes: "Lead investor with pro-rata rights.",
    });
    assertEquals(safe.investor, "Series Seed Inc.");
    assertEquals(safe.amount, 1000000);
    assertEquals(safe.valuation_cap, 8000000);
    assertEquals(safe.discount, 20);
    assertEquals(safe.type, "pre-money");
    assertEquals(safe.status, "signed");
    assertEquals(safe.notes, "Lead investor with pro-rata rights.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SafeRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    const found = await repo.findById("safe_nonexistent");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression ===

Deno.test("SafeRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      investor: "Parse Guard Inc.",
      amount: 100000,
      valuation_cap: 1000000,
      date: "2026-02-01",
    });
    // Custom serialize writes id to frontmatter; guard is
    // `!fm.id && !fm.investor` — sanity check that re-read still works.
    const updated = await repo.update(created.id, { amount: 200000 });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.investor, "Parse Guard Inc.");
    assertEquals(fetched!.amount, 200000);
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("SafeRepository - update modifies existing entity", async () => {
  const { repo, dir } = await setup();
  try {
    const safe = await repo.create({
      investor: "Test Investor",
      amount: 100000,
      date: "2026-01-01",
    });
    const updated = await repo.update(safe.id, { amount: 150000 });
    assertExists(updated);
    assertEquals(updated!.amount, 150000);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SafeRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      investor: "Multi-Field Investor",
      amount: 500000,
      valuation_cap: 5000000,
      discount: 15,
      type: "mfn",
      date: "2026-04-01",
      status: "signed",
      notes: "Keep me intact.",
    });
    await repo.update(created.id, { amount: 600000 });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.amount, 600000);
    assertEquals(fetched!.investor, "Multi-Field Investor");
    assertEquals(fetched!.valuation_cap, 5000000);
    assertEquals(fetched!.discount, 15);
    assertEquals(fetched!.type, "mfn");
    assertEquals(fetched!.date, "2026-04-01");
    assertEquals(fetched!.status, "signed");
    assertEquals(fetched!.notes, "Keep me intact.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SafeRepository - update transitions status (draft → signed → converted)", async () => {
  const { repo, dir } = await setup();
  try {
    const safe = await repo.create({
      investor: "Status Investor",
      amount: 100000,
      date: "2026-01-01",
    });
    assertEquals(safe.status, "draft");
    const signed = await repo.update(safe.id, { status: "signed" });
    assertEquals(signed!.status, "signed");
    const converted = await repo.update(safe.id, { status: "converted" });
    assertEquals(converted!.status, "converted");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SafeRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.update("safe_missing", { amount: 999 });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

// === delete (soft-archive) + hardDelete ===

Deno.test("SafeRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const safe = await repo.create({
      investor: "To Archive",
      amount: 100000,
      date: "2026-01-01",
    });
    const deleted = await repo.delete(safe.id);
    assertEquals(deleted, true);
    const found = await repo.findById(safe.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((s) => s.id === safe.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SafeRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const safe = await repo.create({
      investor: "Truly Gone",
      amount: 100000,
      date: "2026-01-01",
    });
    const ok = await repo.hardDelete(safe.id);
    assertEquals(ok, true);
    const found = await repo.findById(safe.id);
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SafeRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.delete("safe_ghost");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort + archive filtering ===

Deno.test("SafeRepository - findAllFromDisk sorts alphabetically by investor (nameField)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({
      investor: "Charlie Capital",
      amount: 100,
      date: "2026-01-01",
    });
    await repo.create({
      investor: "Alpha Ventures",
      amount: 100,
      date: "2026-01-01",
    });
    await repo.create({
      investor: "Bravo Fund",
      amount: 100,
      date: "2026-01-01",
    });
    const all = await repo.findAllFromDisk();
    assertEquals(all.length, 3);
    assertEquals(all.map((s) => s.investor), [
      "Alpha Ventures",
      "Bravo Fund",
      "Charlie Capital",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("SafeService - list with status filter returns only matching", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      investor: "Drafty",
      amount: 100,
      date: "2026-01-01",
    });
    await repo.create({
      investor: "Signed Up",
      amount: 200,
      date: "2026-01-02",
      status: "signed",
    });
    await repo.create({
      investor: "Converted Co",
      amount: 300,
      date: "2026-01-03",
      status: "converted",
    });
    const signed = await service.list({ status: "signed" });
    assertEquals(signed.length, 1);
    assertEquals(signed[0].investor, "Signed Up");
    const drafts = await service.list({ status: "draft" });
    assertEquals(drafts.length, 1);
    assertEquals(drafts[0].investor, "Drafty");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SafeService - list with type filter returns only matching", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      investor: "Pre-Money A",
      amount: 100,
      date: "2026-01-01",
      type: "pre-money",
    });
    await repo.create({
      investor: "Post-Money B",
      amount: 200,
      date: "2026-01-02",
      type: "post-money",
    });
    await repo.create({
      investor: "MFN C",
      amount: 300,
      date: "2026-01-03",
      type: "mfn",
    });
    const preMoney = await service.list({ type: "pre-money" });
    assertEquals(preMoney.length, 1);
    assertEquals(preMoney[0].investor, "Pre-Money A");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SafeService - list with q filter matches investor (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      investor: "ACME Ventures",
      amount: 100,
      date: "2026-01-01",
    });
    await repo.create({
      investor: "Beta Partners",
      amount: 200,
      date: "2026-01-02",
    });
    const matches = await service.list({ q: "acme" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].investor, "ACME Ventures");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SafeService - list with q filter matches notes (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      investor: "A",
      amount: 100,
      date: "2026-01-01",
      notes: "Has pro-rata RIGHTS.",
    });
    await repo.create({
      investor: "B",
      amount: 200,
      date: "2026-01-02",
      notes: "Standard agreement.",
    });
    const matches = await service.list({ q: "pro-rata" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].investor, "A");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SafeService - list combines status + type (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      investor: "Match",
      amount: 100,
      date: "2026-01-01",
      status: "signed",
      type: "post-money",
    });
    await repo.create({
      investor: "Wrong status",
      amount: 100,
      date: "2026-01-01",
      status: "draft",
      type: "post-money",
    });
    await repo.create({
      investor: "Wrong type",
      amount: 100,
      date: "2026-01-01",
      status: "signed",
      type: "pre-money",
    });
    const matches = await service.list({
      status: "signed",
      type: "post-money",
    });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].investor, "Match");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SafeService - list with no options returns all", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ investor: "A", amount: 1, date: "2026-01-01" });
    await repo.create({ investor: "B", amount: 2, date: "2026-01-02" });
    const all = await service.list();
    assertEquals(all.length, 2);
  } finally {
    await cleanup(dir);
  }
});

// === snake_case ↔ camelCase round-trip ===

Deno.test("SafeRepository - writes snake_case on disk, round-trips snake-named entity field", async () => {
  const { repo, dir } = await setup();
  try {
    const safe = await repo.create({
      investor: "Round Trip",
      amount: 250000,
      valuation_cap: 3000000,
      discount: 20,
      date: "2026-05-01",
    });
    const filePath = join(dir, "safe", `${safe.id}.md`);
    const raw = await Deno.readTextFile(filePath);
    const fmEnd = raw.indexOf("\n---", 4);
    const fm = raw.slice(0, fmEnd);
    // Custom serialize writes snake_case on disk.
    assertEquals(fm.includes("valuation_cap:"), true);
    assertEquals(fm.includes("created_at:"), true);
    // Entity reads back with the snake-named field (intentional type shape).
    const fetched = await repo.findById(safe.id);
    assertExists(fetched);
    assertEquals(fetched!.valuation_cap, 3000000);
    assertExists(fetched!.createdAt);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SafeRepository - parses a manually-written snake_case file", async () => {
  const { repo, dir } = await setup();
  try {
    await Deno.mkdir(join(dir, "safe"), { recursive: true });
    await Deno.writeTextFile(
      join(dir, "safe", "safe_manual.md"),
      [
        "---",
        "id: safe_manual",
        "investor: Manual Investor",
        "amount: 100000",
        "valuation_cap: 1000000",
        "discount: 15",
        "type: pre-money",
        "date: 2026-01-01",
        "status: signed",
        "notes: Hand-written fixture.",
        "created_at: 2026-01-01T00:00:00.000Z",
        "updated_at: 2026-01-02T00:00:00.000Z",
        "---",
        "# Manual Investor — $100,000 SAFE",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("safe_manual");
    assertExists(fetched);
    assertEquals(fetched!.id, "safe_manual");
    assertEquals(fetched!.investor, "Manual Investor");
    assertEquals(fetched!.amount, 100000);
    assertEquals(fetched!.valuation_cap, 1000000);
    assertEquals(fetched!.discount, 15);
    assertEquals(fetched!.type, "pre-money");
    assertEquals(fetched!.status, "signed");
    assertEquals(fetched!.notes, "Hand-written fixture.");
    assertEquals(fetched!.createdAt, "2026-01-01T00:00:00.000Z");
  } finally {
    await cleanup(dir);
  }
});

// === edge cases ===

Deno.test("SafeRepository - optional notes left undefined round-trips as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      investor: "Minimal Investor",
      amount: 100000,
      date: "2026-01-01",
    });
    assertStrictEquals(created.notes, undefined);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.notes, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SafeRepository - findByName returns matching SAFe by investor (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({
      investor: "Premium Capital",
      amount: 100,
      date: "2026-01-01",
    });
    await repo.create({
      investor: "Standard Fund",
      amount: 100,
      date: "2026-01-01",
    });
    const found = await repo.findByName("premium capital");
    assertExists(found);
    assertEquals(found!.investor, "Premium Capital");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SafeRepository - amount of 0 round-trips", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      investor: "Zero Investor",
      amount: 0,
      date: "2026-01-01",
    });
    assertEquals(created.amount, 0);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.amount, 0);
  } finally {
    await cleanup(dir);
  }
});
