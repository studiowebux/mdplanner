/**
 * Unit tests for v2 SwotRepository (CRUD on disk) + SwotService.
 *
 * SWOT stores its four quadrants (strengths/weaknesses/opportunities/threats)
 * as BODY sections with bullet lists, NOT as frontmatter arrays. nameField =
 * "title". Custom serializer. Soft-archive flow is covered separately in
 * `swot-soft-delete_test.ts`.
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { SwotRepository } from "../../v2/repositories/swot.repository.ts";
import { SwotService } from "../../v2/services/swot.service.ts";

async function setup(): Promise<
  { repo: SwotRepository; service: SwotService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-swot-test-" });
  const repo = new SwotRepository(dir);
  const service = new SwotService(repo);
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

Deno.test("SwotRepository - create defaults quadrants to [] and date to today", async () => {
  const { repo, dir } = await setup();
  try {
    const item = await repo.create({ title: "Q1 SWOT" });
    assertExists(item.id);
    assertEquals(item.title, "Q1 SWOT");
    assertEquals(item.strengths, []);
    assertEquals(item.weaknesses, []);
    assertEquals(item.opportunities, []);
    assertEquals(item.threats, []);
    assertEquals(item.date.length, 10);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SwotRepository - create with full quadrants and notes", async () => {
  const { repo, dir } = await setup();
  try {
    const item = await repo.create({
      title: "Full SWOT",
      date: "2026-01-15",
      strengths: ["Strong brand"],
      weaknesses: ["Small team"],
      opportunities: ["New market"],
      threats: ["Competitor X"],
      project: "MD Planner",
      notes: "Quarterly analysis.",
    });
    assertEquals(item.strengths, ["Strong brand"]);
    assertEquals(item.weaknesses, ["Small team"]);
    assertEquals(item.opportunities, ["New market"]);
    assertEquals(item.threats, ["Competitor X"]);
    assertEquals(item.project, "MD Planner");
    assertEquals(item.notes, "Quarterly analysis.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SwotRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.findById("swot_nope"), null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard ===

Deno.test("SwotRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Guard SWOT",
      strengths: ["A"],
    });
    await repo.update(created.id, { strengths: ["A", "B"] });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.title, "Guard SWOT");
    assertEquals(fetched!.strengths, ["A", "B"]);
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("SwotRepository - update preserves sibling quadrants", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Preserve",
      strengths: ["S1"],
      weaknesses: ["W1"],
      opportunities: ["O1"],
      threats: ["T1"],
    });
    await repo.update(created.id, { strengths: ["S1", "S2"] });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.strengths, ["S1", "S2"]);
    assertEquals(fetched!.weaknesses, ["W1"]);
    assertEquals(fetched!.opportunities, ["O1"]);
    assertEquals(fetched!.threats, ["T1"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SwotRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(
      await repo.update("swot_missing", { title: "X" }),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === delete + hardDelete ===

Deno.test("SwotRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const item = await repo.create({ title: "Archive me" });
    assertEquals(await repo.delete(item.id), true);
    const found = await repo.findById(item.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((s) => s.id === item.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SwotRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const item = await repo.create({ title: "Truly gone" });
    assertEquals(await repo.hardDelete(item.id), true);
    assertStrictEquals(await repo.findById(item.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SwotRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("swot_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === sort by title ===

Deno.test("SwotRepository - findAll sorts alphabetically by title", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Charlie" });
    await repo.create({ title: "Alpha" });
    await repo.create({ title: "Bravo" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.map((s) => s.title), ["Alpha", "Bravo", "Charlie"]);
  } finally {
    await cleanup(dir);
  }
});

// === service filters ===

Deno.test("SwotService - list with project filter (case-insensitive)", async () => {
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

Deno.test("SwotService - list with q filter matches title", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "Strategic SWOT" });
    await repo.create({ title: "Tactical SWOT" });
    const matches = await service.list({ q: "strategic" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Strategic SWOT");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SwotService - list with q filter matches any quadrant item", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A", strengths: ["Strong BRAND recognition"] });
    await repo.create({ title: "B", weaknesses: ["Limited bench DEPTH"] });
    await repo.create({ title: "C", opportunities: ["Emerging MARKET share"] });
    await repo.create({ title: "D", threats: ["Aggressive RIVAL launches"] });
    assertEquals((await service.list({ q: "brand" }))[0].title, "A");
    assertEquals((await service.list({ q: "depth" }))[0].title, "B");
    assertEquals((await service.list({ q: "market" }))[0].title, "C");
    assertEquals((await service.list({ q: "rival" }))[0].title, "D");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("SwotService - list combines project + q (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "Match",
      project: "MD Planner",
      strengths: ["alpha trait"],
    });
    await repo.create({
      title: "Wrong project",
      project: "Other",
      strengths: ["alpha trait"],
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

Deno.test("SwotRepository - quadrants round-trip through body section headings", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Section Round Trip",
      strengths: ["item S1"],
      weaknesses: ["item W1"],
      opportunities: ["item O1"],
      threats: ["item T1"],
    });
    const filePath = `${dir}/swot/${created.id}.md`;
    const raw = await Deno.readTextFile(filePath);
    assertEquals(raw.includes("## Strengths"), true);
    assertEquals(raw.includes("## Weaknesses"), true);
    assertEquals(raw.includes("## Opportunities"), true);
    assertEquals(raw.includes("## Threats"), true);
    assertEquals(raw.includes("- item S1"), true);
    assertEquals(raw.includes("- item W1"), true);
    assertEquals(raw.includes("- item O1"), true);
    assertEquals(raw.includes("- item T1"), true);

    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.strengths, ["item S1"]);
    assertEquals(fetched!.weaknesses, ["item W1"]);
    assertEquals(fetched!.opportunities, ["item O1"]);
    assertEquals(fetched!.threats, ["item T1"]);
  } finally {
    await cleanup(dir);
  }
});

// === edges ===

Deno.test("SwotRepository - optional project/notes left undefined round-trip as undefined", async () => {
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

Deno.test("SwotRepository - findByName via title (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Q1 SWOT" });
    await repo.create({ title: "Q2 SWOT" });
    const found = await repo.findByName("q1 swot");
    assertExists(found);
    assertEquals(found!.title, "Q1 SWOT");
  } finally {
    await cleanup(dir);
  }
});
