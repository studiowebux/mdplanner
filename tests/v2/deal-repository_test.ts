/**
 * Unit tests for v2 DealRepository (CRUD on disk) + DealService (filters).
 *
 * Body keys = ["id", "description"]. nameField = "title". parse-guard via
 * `fm.id || fm.title`; stage defaults to "lead", invalid stage coerced.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { DealRepository } from "../../src/repositories/deal.repository.ts";
import { DealService } from "../../src/services/deal.service.ts";

async function setup(): Promise<
  { repo: DealRepository; service: DealService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-deal-test-" });
  const repo = new DealRepository(dir);
  const service = new DealService(repo);
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

Deno.test("DealRepository - create defaults stage to 'lead'", async () => {
  const { repo, dir } = await setup();
  try {
    const deal = await repo.create({ title: "New Deal" });
    assertEquals(deal.stage, "lead");
    assertEquals(deal.tags, []);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DealRepository - create with full fields", async () => {
  const { repo, dir } = await setup();
  try {
    const deal = await repo.create({
      title: "Acme Website Redesign",
      stage: "proposal",
      value: 15000,
      currency: "CAD",
      company: "Acme Corp",
      contact: "Jane Doe",
      assignee: "Tommy",
      description: "Multi-phase redesign.",
      tags: ["enterprise"],
      closedAt: "2026-04-15T00:00:00.000Z",
    });
    assertEquals(deal.value, 15000);
    assertEquals(deal.currency, "CAD");
    assertEquals(deal.company, "Acme Corp");
    assertEquals(deal.contact, "Jane Doe");
    assertEquals(deal.assignee, "Tommy");
    assertEquals(deal.description, "Multi-phase redesign.");
    assertEquals(deal.tags, ["enterprise"]);
    assertEquals(deal.closedAt, "2026-04-15T00:00:00.000Z");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DealRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.findById("deal_nope"), null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression ===

Deno.test("DealRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({ title: "Guard Deal", stage: "lead" });
    const updated = await repo.update(created.id, { stage: "proposal" });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.id, created.id);
    assertEquals(fetched!.title, "Guard Deal");
    assertEquals(fetched!.stage, "proposal");
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("DealRepository - update preserves sibling fields", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Multi-field",
      stage: "qualified",
      value: 10000,
      currency: "USD",
      company: "Acme",
      contact: "Jane",
      assignee: "Tommy",
      tags: ["alpha"],
      description: "Keep intact.",
    });
    await repo.update(created.id, { stage: "negotiation" });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.stage, "negotiation");
    assertEquals(fetched!.value, 10000);
    assertEquals(fetched!.currency, "USD");
    assertEquals(fetched!.company, "Acme");
    assertEquals(fetched!.contact, "Jane");
    assertEquals(fetched!.assignee, "Tommy");
    assertEquals(fetched!.tags, ["alpha"]);
    assertEquals(fetched!.description, "Keep intact.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DealRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(
      await repo.update("deal_missing", { title: "X" }),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === delete + hardDelete ===

Deno.test("DealRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const deal = await repo.create({ title: "Archive me" });
    assertEquals(await repo.delete(deal.id), true);
    const found = await repo.findById(deal.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((d) => d.id === deal.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DealRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const deal = await repo.create({ title: "Truly gone" });
    assertEquals(await repo.hardDelete(deal.id), true);
    assertStrictEquals(await repo.findById(deal.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DealRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("deal_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === sort by title ===

Deno.test("DealRepository - findAll sorts alphabetically by title", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Charlie Deal" });
    await repo.create({ title: "Alpha Deal" });
    await repo.create({ title: "Bravo Deal" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.map((d) => d.title), [
      "Alpha Deal",
      "Bravo Deal",
      "Charlie Deal",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service filters ===

Deno.test("DealService - list with stage filter (exact)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A", stage: "lead" });
    await repo.create({ title: "B", stage: "proposal" });
    await repo.create({ title: "C", stage: "closed-won" });
    const matches = await service.list({ stage: "proposal" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "B");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DealService - list with assignee filter (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A", assignee: "Tommy" });
    await repo.create({ title: "B", assignee: "tommy" });
    await repo.create({ title: "C", assignee: "Other" });
    const matches = await service.list({ assignee: "TOMMY" });
    assertEquals(matches.length, 2);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DealService - list with company filter (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A", company: "Acme" });
    await repo.create({ title: "B", company: "acme" });
    await repo.create({ title: "C", company: "Globex" });
    const matches = await service.list({ company: "ACME" });
    assertEquals(matches.length, 2);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DealService - list with q filter matches title/company/contact/description", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "Acme deal" });
    await repo.create({ title: "B", company: "Acme Corp" });
    await repo.create({ title: "C", contact: "Jane @ Acme" });
    await repo.create({ title: "D", description: "Discussed Acme retreat." });
    await repo.create({ title: "E", company: "Globex" });
    const matches = await service.list({ q: "acme" });
    assertEquals(matches.length, 4);
    assertEquals(
      matches.map((d) => d.title).sort(),
      ["Acme deal", "B", "C", "D"],
    );
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DealService - list combines stage + assignee + company + q (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "Match",
      stage: "proposal",
      assignee: "Tommy",
      company: "Acme",
      description: "alpha keyword",
    });
    await repo.create({
      title: "Wrong stage",
      stage: "lead",
      assignee: "Tommy",
      company: "Acme",
      description: "alpha keyword",
    });
    const matches = await service.list({
      stage: "proposal",
      assignee: "Tommy",
      company: "Acme",
      q: "alpha",
    });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Match");
  } finally {
    await cleanup(dir);
  }
});

// === edges ===

Deno.test("DealRepository - invalid stage coerced to 'lead'", async () => {
  const { repo, dir } = await setup();
  try {
    // Write a file with an invalid stage value directly.
    await Deno.mkdir(`${dir}/deals`, { recursive: true });
    await Deno.writeTextFile(
      `${dir}/deals/deal_bad_stage.md`,
      [
        "---",
        "title: Bad Stage",
        "stage: not-a-real-stage",
        "---",
        "",
      ].join("\n"),
    );
    const fetched = await repo.findById("deal_bad_stage");
    assertExists(fetched);
    assertEquals(fetched!.stage, "lead");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DealRepository - optional fields left undefined round-trip as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({ title: "Minimal" });
    assertStrictEquals(created.value, undefined);
    assertStrictEquals(created.currency, undefined);
    assertStrictEquals(created.company, undefined);
    assertStrictEquals(created.contact, undefined);
    assertStrictEquals(created.assignee, undefined);
    assertStrictEquals(created.description, undefined);
    assertStrictEquals(created.closedAt, undefined);

    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.value, undefined);
    assertStrictEquals(fetched!.currency, undefined);
    assertStrictEquals(fetched!.company, undefined);
    assertStrictEquals(fetched!.contact, undefined);
    assertStrictEquals(fetched!.assignee, undefined);
    assertStrictEquals(fetched!.description, undefined);
    assertStrictEquals(fetched!.closedAt, undefined);
    assertEquals(fetched!.tags, []);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("DealRepository - findByName via title (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Acme Website" });
    await repo.create({ title: "Globex Mobile" });
    const found = await repo.findByName("acme website");
    assertExists(found);
    assertEquals(found!.title, "Acme Website");
  } finally {
    await cleanup(dir);
  }
});
