/**
 * Unit tests for v2 InvestorRepository (CRUD on disk) + InvestorService
 * (filter behaviour).
 *
 * Investor uses a CUSTOM serializer (bypasses `serializeStandard`) and writes
 * snake_case directly (`amount_target`, `intro_date`, `last_contact`). parse()
 * reads camelCase via mapKeysFromFm. Regression focus: parse-guard via
 * `fm.id || fm.name`; defaults type=vc/stage=lead/status=not_started.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { join } from "@std/path";
import { InvestorRepository } from "../../v2/repositories/investor.repository.ts";
import { InvestorService } from "../../v2/services/investor.service.ts";

async function setup(): Promise<
  { repo: InvestorRepository; service: InvestorService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-investor-test-" });
  const repo = new InvestorRepository(dir);
  const service = new InvestorService(repo);
  return { repo, service, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

// === create + defaults ===

Deno.test("InvestorRepository - create applies defaults (vc/lead/not_started)", async () => {
  const { repo, dir } = await setup();
  try {
    const investor = await repo.create({
      name: "Acme Ventures",
      type: "vc",
      stage: "lead",
      status: "not_started",
    });
    assertExists(investor.id);
    assertEquals(investor.name, "Acme Ventures");
    assertEquals(investor.type, "vc");
    assertEquals(investor.stage, "lead");
    assertEquals(investor.status, "not_started");
    assertEquals(investor.tags, []);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvestorRepository - create with full fields", async () => {
  const { repo, dir } = await setup();
  try {
    const investor = await repo.create({
      name: "Full Investor",
      type: "angel",
      stage: "associate",
      status: "in_progress",
      amountTarget: 500000,
      contact: "jane@example.com",
      introDate: "2026-01-15",
      lastContact: "2026-03-20",
      notes: "Met at AngelList summit.",
      tags: ["fintech", "lead"],
    });
    assertEquals(investor.amountTarget, 500000);
    assertEquals(investor.contact, "jane@example.com");
    assertEquals(investor.introDate, "2026-01-15");
    assertEquals(investor.lastContact, "2026-03-20");
    assertEquals(investor.notes, "Met at AngelList summit.");
    assertEquals(investor.tags, ["fintech", "lead"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvestorRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.findById("investor_nope"), null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard ===

Deno.test("InvestorRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Guard Investor",
      type: "vc",
      stage: "lead",
      status: "not_started",
    });
    const updated = await repo.update(created.id, { status: "in_progress" });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.name, "Guard Investor");
    assertEquals(fetched!.status, "in_progress");
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("InvestorRepository - update modifies entity", async () => {
  const { repo, dir } = await setup();
  try {
    const investor = await repo.create({
      name: "Original",
      type: "vc",
      stage: "lead",
      status: "not_started",
    });
    const updated = await repo.update(investor.id, { stage: "partner" });
    assertExists(updated);
    assertEquals(updated!.stage, "partner");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvestorRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Multi-field",
      type: "angel",
      stage: "associate",
      status: "in_progress",
      amountTarget: 250000,
      contact: "alice@example.com",
      introDate: "2026-02-01",
      tags: ["alpha", "beta"],
      notes: "Keep intact.",
    });
    await repo.update(created.id, { stage: "partner" });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.stage, "partner");
    assertEquals(fetched!.type, "angel");
    assertEquals(fetched!.status, "in_progress");
    assertEquals(fetched!.amountTarget, 250000);
    assertEquals(fetched!.contact, "alice@example.com");
    assertEquals(fetched!.introDate, "2026-02-01");
    assertEquals(fetched!.tags, ["alpha", "beta"]);
    assertEquals(fetched!.notes, "Keep intact.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvestorRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(
      await repo.update("investor_missing", { name: "X" }),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === delete (soft-archive) + hardDelete ===

Deno.test("InvestorRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const investor = await repo.create({
      name: "Archive me",
      type: "vc",
      stage: "lead",
      status: "not_started",
    });
    assertEquals(await repo.delete(investor.id), true);
    const found = await repo.findById(investor.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((i) => i.id === investor.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvestorRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const investor = await repo.create({
      name: "Truly gone",
      type: "vc",
      stage: "lead",
      status: "not_started",
    });
    assertEquals(await repo.hardDelete(investor.id), true);
    assertStrictEquals(await repo.findById(investor.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvestorRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("investor_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort by name ===

Deno.test("InvestorRepository - findAll sorts alphabetically by name", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({
      name: "Charlie Capital",
      type: "vc",
      stage: "lead",
      status: "not_started",
    });
    await repo.create({
      name: "Alpha Ventures",
      type: "vc",
      stage: "lead",
      status: "not_started",
    });
    await repo.create({
      name: "Bravo Partners",
      type: "vc",
      stage: "lead",
      status: "not_started",
    });
    const all = await repo.findAllFromDisk();
    assertEquals(all.map((i) => i.name), [
      "Alpha Ventures",
      "Bravo Partners",
      "Charlie Capital",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("InvestorService - list with type filter", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      name: "A",
      type: "vc",
      stage: "lead",
      status: "not_started",
    });
    await repo.create({
      name: "B",
      type: "angel",
      stage: "lead",
      status: "not_started",
    });
    const matches = await service.list({ type: "angel" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "B");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvestorService - list with stage filter", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      name: "A",
      type: "vc",
      stage: "lead",
      status: "not_started",
    });
    await repo.create({
      name: "B",
      type: "vc",
      stage: "partner",
      status: "not_started",
    });
    const matches = await service.list({ stage: "partner" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "B");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvestorService - list with status filter", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      name: "A",
      type: "vc",
      stage: "lead",
      status: "not_started",
    });
    await repo.create({
      name: "B",
      type: "vc",
      stage: "lead",
      status: "invested",
    });
    const matches = await service.list({ status: "invested" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "B");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvestorService - list with tag filter (case-sensitive includes)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      name: "A",
      type: "vc",
      stage: "lead",
      status: "not_started",
      tags: ["fintech", "hot"],
    });
    await repo.create({
      name: "B",
      type: "vc",
      stage: "lead",
      status: "not_started",
      tags: ["healthcare"],
    });
    const matches = await service.list({ tag: "fintech" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "A");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvestorService - list with q filter matches name, contact, notes", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      name: "Acme Ventures",
      type: "vc",
      stage: "lead",
      status: "not_started",
    });
    await repo.create({
      name: "B",
      type: "vc",
      stage: "lead",
      status: "not_started",
      contact: "jane@acme.example.com",
    });
    await repo.create({
      name: "C",
      type: "vc",
      stage: "lead",
      status: "not_started",
      notes: "First met at Acme retreat.",
    });
    await repo.create({
      name: "D",
      type: "vc",
      stage: "lead",
      status: "not_started",
    });
    const matches = await service.list({ q: "acme" });
    assertEquals(matches.length, 3);
    assertEquals(matches.map((i) => i.name).sort(), [
      "Acme Ventures",
      "B",
      "C",
    ]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvestorService - list combines filters (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      name: "Match",
      type: "vc",
      stage: "partner",
      status: "in_progress",
      tags: ["fintech"],
    });
    await repo.create({
      name: "Wrong type",
      type: "angel",
      stage: "partner",
      status: "in_progress",
      tags: ["fintech"],
    });
    const matches = await service.list({
      type: "vc",
      stage: "partner",
      status: "in_progress",
      tag: "fintech",
    });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].name, "Match");
  } finally {
    await cleanup(dir);
  }
});

// === snake_case round-trip (custom serializer) ===

Deno.test("InvestorRepository - serializer writes snake_case keys to disk", async () => {
  const { repo, dir } = await setup();
  try {
    const investor = await repo.create({
      name: "Disk Format",
      type: "vc",
      stage: "lead",
      status: "not_started",
      amountTarget: 100000,
      introDate: "2026-01-01",
      lastContact: "2026-02-02",
    });
    const filePath = join(dir, "investors", `${investor.id}.md`);
    const raw = await Deno.readTextFile(filePath);
    const fmEnd = raw.indexOf("\n---", 4);
    const fm = raw.slice(0, fmEnd);
    assertEquals(fm.includes("amount_target:"), true);
    assertEquals(fm.includes("intro_date:"), true);
    assertEquals(fm.includes("last_contact:"), true);
    assertEquals(fm.includes("created_at:"), true);
    // camelCase variants MUST NOT appear in fm.
    assertEquals(fm.includes("amountTarget:"), false);
    assertEquals(fm.includes("introDate:"), false);
  } finally {
    await cleanup(dir);
  }
});

// === edges ===

Deno.test("InvestorRepository - optional fields left undefined round-trip as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      name: "Minimal",
      type: "vc",
      stage: "lead",
      status: "not_started",
    });
    assertStrictEquals(created.amountTarget, undefined);
    assertStrictEquals(created.contact, undefined);
    assertStrictEquals(created.introDate, undefined);
    assertStrictEquals(created.lastContact, undefined);
    assertStrictEquals(created.notes, undefined);

    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.amountTarget, undefined);
    assertStrictEquals(fetched!.contact, undefined);
    assertStrictEquals(fetched!.introDate, undefined);
    assertStrictEquals(fetched!.lastContact, undefined);
    assertStrictEquals(fetched!.notes, undefined);
    assertEquals(fetched!.tags, []);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("InvestorRepository - findByName returns matching investor (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({
      name: "Acme Ventures",
      type: "vc",
      stage: "lead",
      status: "not_started",
    });
    await repo.create({
      name: "Globex Capital",
      type: "vc",
      stage: "lead",
      status: "not_started",
    });
    const found = await repo.findByName("acme ventures");
    assertExists(found);
    assertEquals(found!.name, "Acme Ventures");
  } finally {
    await cleanup(dir);
  }
});
