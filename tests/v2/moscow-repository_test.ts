/**
 * Unit tests for v2 MoscowRepository (CRUD on disk) + MoscowService.
 *
 * MoSCoW stores its four buckets (must/should/could/wont) as BODY sections
 * with bullet lists (## Must Have / Should Have / Could Have / Won't Have),
 * NOT as frontmatter arrays. nameField = "title". Custom serializer.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { MoscowRepository } from "../../v2/repositories/moscow.repository.ts";
import { MoscowService } from "../../v2/services/moscow.service.ts";

async function setup(): Promise<
  { repo: MoscowRepository; service: MoscowService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-moscow-test-" });
  const repo = new MoscowRepository(dir);
  const service = new MoscowService(repo);
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

Deno.test("MoscowRepository - create defaults buckets to [] and date to today", async () => {
  const { repo, dir } = await setup();
  try {
    const item = await repo.create({ title: "Q1 MoSCoW" });
    assertExists(item.id);
    assertEquals(item.title, "Q1 MoSCoW");
    assertEquals(item.must, []);
    assertEquals(item.should, []);
    assertEquals(item.could, []);
    assertEquals(item.wont, []);
    assertEquals(item.date.length, 10);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MoscowRepository - create with full buckets and notes", async () => {
  const { repo, dir } = await setup();
  try {
    const item = await repo.create({
      title: "Full MoSCoW",
      date: "2026-01-15",
      must: ["Ship MVP"],
      should: ["Add analytics"],
      could: ["Polish onboarding"],
      wont: ["Refactor everything"],
      project: "MD Planner",
      notes: "Quarterly planning session.",
    });
    assertEquals(item.must, ["Ship MVP"]);
    assertEquals(item.should, ["Add analytics"]);
    assertEquals(item.could, ["Polish onboarding"]);
    assertEquals(item.wont, ["Refactor everything"]);
    assertEquals(item.project, "MD Planner");
    assertEquals(item.notes, "Quarterly planning session.");
    assertEquals(item.date, "2026-01-15");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MoscowRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.findById("moscow_nope"), null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard ===

Deno.test("MoscowRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Guard MoSCoW",
      must: ["A"],
    });
    await repo.update(created.id, { must: ["A", "B"] });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.title, "Guard MoSCoW");
    assertEquals(fetched!.must, ["A", "B"]);
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("MoscowRepository - update preserves sibling buckets", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Preserve",
      must: ["M1"],
      should: ["S1"],
      could: ["C1"],
      wont: ["W1"],
    });
    await repo.update(created.id, { must: ["M1", "M2"] });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.must, ["M1", "M2"]);
    assertEquals(fetched!.should, ["S1"]);
    assertEquals(fetched!.could, ["C1"]);
    assertEquals(fetched!.wont, ["W1"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MoscowRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(
      await repo.update("moscow_missing", { title: "X" }),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === delete + hardDelete ===

Deno.test("MoscowRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const item = await repo.create({ title: "Archive me" });
    assertEquals(await repo.delete(item.id), true);
    const found = await repo.findById(item.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((m) => m.id === item.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MoscowRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const item = await repo.create({ title: "Truly gone" });
    assertEquals(await repo.hardDelete(item.id), true);
    assertStrictEquals(await repo.findById(item.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MoscowRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("moscow_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === sort by title ===

Deno.test("MoscowRepository - findAll sorts alphabetically by title", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Charlie" });
    await repo.create({ title: "Alpha" });
    await repo.create({ title: "Bravo" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.map((m) => m.title), ["Alpha", "Bravo", "Charlie"]);
  } finally {
    await cleanup(dir);
  }
});

// === service filters ===

Deno.test("MoscowService - list with project filter (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A", project: "MD Planner" });
    await repo.create({ title: "B", project: "md planner" });
    await repo.create({ title: "C", project: "Other" });
    const matches = await service.list({ project: "md planner" });
    assertEquals(matches.length, 2);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MoscowService - list with q filter matches title", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "Roadmap MoSCoW" });
    await repo.create({ title: "Sprint MoSCoW" });
    const matches = await service.list({ q: "roadmap" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Roadmap MoSCoW");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MoscowService - list with q filter matches any bucket item", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A", must: ["FIX prod issue"] });
    await repo.create({ title: "B", should: ["Plan next quarter"] });
    await repo.create({ title: "C", could: ["Polish UI tweaks"] });
    await repo.create({ title: "D", wont: ["Scope-bloat features"] });
    await repo.create({ title: "E", must: ["Unrelated"] });
    assertEquals((await service.list({ q: "fix" }))[0].title, "A");
    assertEquals((await service.list({ q: "next" }))[0].title, "B");
    assertEquals((await service.list({ q: "polish" }))[0].title, "C");
    assertEquals((await service.list({ q: "bloat" }))[0].title, "D");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MoscowService - list combines project + q (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "Match",
      project: "MD Planner",
      must: ["alpha"],
    });
    await repo.create({
      title: "Wrong project",
      project: "Other",
      must: ["alpha"],
    });
    const matches = await service.list({
      project: "MD Planner",
      q: "alpha",
    });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Match");
  } finally {
    await cleanup(dir);
  }
});

// === body-section round-trip ===

Deno.test("MoscowRepository - buckets round-trip through body section headings", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Section Round Trip",
      must: ["item M1", "item M2"],
      should: ["item S1"],
      could: ["item C1"],
      wont: ["item W1"],
    });
    const filePath = `${dir}/moscow/${created.id}.md`;
    const raw = await Deno.readTextFile(filePath);
    // Body must contain the four canonical section headings.
    assertEquals(raw.includes("## Must Have"), true);
    assertEquals(raw.includes("## Should Have"), true);
    assertEquals(raw.includes("## Could Have"), true);
    assertEquals(raw.includes("## Won't Have"), true);
    // Bullet items must appear under their respective sections.
    assertEquals(raw.includes("- item M1"), true);
    assertEquals(raw.includes("- item M2"), true);
    assertEquals(raw.includes("- item S1"), true);
    assertEquals(raw.includes("- item C1"), true);
    assertEquals(raw.includes("- item W1"), true);

    // Re-read via repo — buckets reconstructed from body.
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.must, ["item M1", "item M2"]);
    assertEquals(fetched!.should, ["item S1"]);
    assertEquals(fetched!.could, ["item C1"]);
    assertEquals(fetched!.wont, ["item W1"]);
  } finally {
    await cleanup(dir);
  }
});

// === edges ===

Deno.test("MoscowRepository - optional project/notes left undefined round-trip as undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({ title: "Minimal" });
    assertStrictEquals(created.project, undefined);
    assertStrictEquals(created.notes, undefined);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertStrictEquals(fetched!.project, undefined);
    assertStrictEquals(fetched!.notes, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("MoscowRepository - findByName via title (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Q1 Plan" });
    await repo.create({ title: "Q2 Plan" });
    const found = await repo.findByName("q1 plan");
    assertExists(found);
    assertEquals(found!.title, "Q1 Plan");
  } finally {
    await cleanup(dir);
  }
});
