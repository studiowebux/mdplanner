/**
 * Unit tests for v2 EisenhowerRepository (CRUD on disk) + EisenhowerService.
 *
 * Eisenhower stores all four quadrant arrays in FRONTMATTER (not body).
 * Body holds only the `# title` heading. nameField = "title".
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { EisenhowerRepository } from "../../v2/repositories/eisenhower.repository.ts";
import { EisenhowerService } from "../../v2/services/eisenhower.service.ts";

async function setup(): Promise<
  { repo: EisenhowerRepository; service: EisenhowerService; dir: string }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-eisenhower-test-" });
  const repo = new EisenhowerRepository(dir);
  const service = new EisenhowerService(repo);
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

Deno.test("EisenhowerRepository - create defaults quadrants to [] and date to today", async () => {
  const { repo, dir } = await setup();
  try {
    const item = await repo.create({ title: "Q1 priorities" });
    assertExists(item.id);
    assertEquals(item.title, "Q1 priorities");
    assertEquals(item.urgentImportant, []);
    assertEquals(item.notUrgentImportant, []);
    assertEquals(item.urgentNotImportant, []);
    assertEquals(item.notUrgentNotImportant, []);
    // Date defaults to today's YYYY-MM-DD.
    assertEquals(item.date.length, 10);
    assertEquals(/^\d{4}-\d{2}-\d{2}$/.test(item.date), true);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("EisenhowerRepository - create with full quadrants", async () => {
  const { repo, dir } = await setup();
  try {
    const item = await repo.create({
      title: "Full matrix",
      date: "2026-04-01",
      urgentImportant: ["Fix prod bug"],
      notUrgentImportant: ["Plan Q3 roadmap"],
      urgentNotImportant: ["Reply to vendor email"],
      notUrgentNotImportant: ["Social media browsing"],
      project: "MD Planner",
      notes: "Weekly review.",
    });
    assertEquals(item.urgentImportant, ["Fix prod bug"]);
    assertEquals(item.notUrgentImportant, ["Plan Q3 roadmap"]);
    assertEquals(item.urgentNotImportant, ["Reply to vendor email"]);
    assertEquals(item.notUrgentNotImportant, ["Social media browsing"]);
    assertEquals(item.project, "MD Planner");
    assertEquals(item.notes, "Weekly review.");
    assertEquals(item.date, "2026-04-01");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("EisenhowerRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.findById("eisenhower_nope"), null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard ===

Deno.test("EisenhowerRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Guard Matrix",
      urgentImportant: ["a"],
    });
    const updated = await repo.update(created.id, {
      urgentImportant: ["a", "b"],
    });
    assertExists(updated);
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.title, "Guard Matrix");
    assertEquals(fetched!.urgentImportant, ["a", "b"]);
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("EisenhowerRepository - update preserves sibling quadrants", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Preserve",
      urgentImportant: ["A"],
      notUrgentImportant: ["B"],
      urgentNotImportant: ["C"],
      notUrgentNotImportant: ["D"],
    });
    await repo.update(created.id, { urgentImportant: ["A1", "A2"] });
    const fetched = await repo.findById(created.id);
    assertExists(fetched);
    assertEquals(fetched!.urgentImportant, ["A1", "A2"]);
    assertEquals(fetched!.notUrgentImportant, ["B"]);
    assertEquals(fetched!.urgentNotImportant, ["C"]);
    assertEquals(fetched!.notUrgentNotImportant, ["D"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("EisenhowerRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(
      await repo.update("eisenhower_missing", { title: "X" }),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === delete + hardDelete ===

Deno.test("EisenhowerRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const item = await repo.create({ title: "Archive me" });
    assertEquals(await repo.delete(item.id), true);
    const found = await repo.findById(item.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((e) => e.id === item.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("EisenhowerRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const item = await repo.create({ title: "Truly gone" });
    assertEquals(await repo.hardDelete(item.id), true);
    assertStrictEquals(await repo.findById(item.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("EisenhowerRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("eisenhower_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === sort by title ===

Deno.test("EisenhowerRepository - findAll sorts alphabetically by title", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Charlie" });
    await repo.create({ title: "Alpha" });
    await repo.create({ title: "Bravo" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.map((e) => e.title), ["Alpha", "Bravo", "Charlie"]);
  } finally {
    await cleanup(dir);
  }
});

// === service filters ===

Deno.test("EisenhowerService - list with project filter (case-insensitive)", async () => {
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

Deno.test("EisenhowerService - list with q filter matches title", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "Roadmap matrix" });
    await repo.create({ title: "Sprint matrix" });
    const matches = await service.list({ q: "roadmap" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "Roadmap matrix");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("EisenhowerService - list with q filter matches any quadrant item", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "A",
      urgentImportant: ["FIX prod issue"],
    });
    await repo.create({
      title: "B",
      notUrgentImportant: ["Plan next quarter"],
    });
    await repo.create({
      title: "C",
      urgentNotImportant: ["Reply to vendor"],
    });
    await repo.create({
      title: "D",
      notUrgentNotImportant: ["Scroll Twitter"],
    });
    await repo.create({ title: "E", urgentImportant: ["Unrelated"] });
    // 'fix' substring exists only in entity A.
    const matches = await service.list({ q: "fix" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "A");
    // 'next' substring exists only in entity B.
    const next = await service.list({ q: "next" });
    assertEquals(next.length, 1);
    assertEquals(next[0].title, "B");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("EisenhowerService - list with q filter matches notes", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ title: "A", notes: "Weekly review with Alice." });
    await repo.create({ title: "B" });
    const matches = await service.list({ q: "alice" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].title, "A");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("EisenhowerService - list combines project + q (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({
      title: "Match",
      project: "MD Planner",
      urgentImportant: ["alpha"],
    });
    await repo.create({
      title: "Wrong project",
      project: "Other",
      urgentImportant: ["alpha"],
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

// === edges ===

Deno.test("EisenhowerRepository - optional project/notes left undefined round-trip as undefined", async () => {
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

Deno.test("EisenhowerRepository - findByName via title (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Q1 Matrix" });
    await repo.create({ title: "Q2 Matrix" });
    const found = await repo.findByName("q1 matrix");
    assertExists(found);
    assertEquals(found!.title, "Q1 Matrix");
  } finally {
    await cleanup(dir);
  }
});
