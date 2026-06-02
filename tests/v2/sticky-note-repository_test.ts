/**
 * Unit tests for v2 StickyNoteRepository (CRUD on disk) + StickyNoteService
 * (filter behaviour, position/size updates).
 *
 * Regression focus: parse-guard is `fm.color` (not `fm.id`/`fm.name`); id
 * lives ONLY in the filename; content lives in the body. STICKY_NOTE_BODY_KEYS
 * = ["id", "content"].
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { StickyNoteRepository } from "../../src/repositories/sticky-note.repository.ts";
import { StickyNoteService } from "../../src/services/sticky-note.service.ts";

async function setup(): Promise<
  {
    repo: StickyNoteRepository;
    service: StickyNoteService;
    dir: string;
  }
> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-sticky-test-" });
  const repo = new StickyNoteRepository(dir);
  const service = new StickyNoteService(repo);
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

Deno.test("StickyNoteRepository - create stores file with all defaults", async () => {
  const { repo, dir } = await setup();
  try {
    const note = await repo.create({ content: "Hello sticky" });
    assertExists(note.id);
    assertEquals(note.content, "Hello sticky");
    assertEquals(note.color, "yellow"); // default
    assertEquals(note.position, { x: 100, y: 100 }); // default
    assertEquals(note.boardId, "default"); // default
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StickyNoteRepository - create with explicit fields", async () => {
  const { repo, dir } = await setup();
  try {
    const note = await repo.create({
      content: "Pink note",
      color: "pink",
      position: { x: 250, y: 175 },
      size: { width: 240, height: 180 },
    });
    assertEquals(note.color, "pink");
    assertEquals(note.position, { x: 250, y: 175 });
    assertEquals(note.size, { width: 240, height: 180 });
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StickyNoteRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(await repo.findById("sticky_nope"), null);
  } finally {
    await cleanup(dir);
  }
});

// === parse-guard regression (guard holds via fm.color) ===

Deno.test("StickyNoteRepository - findById succeeds after update (parse-guard regression)", async () => {
  const { repo, dir } = await setup();
  try {
    const note = await repo.create({ content: "Guard sticky" });
    const updated = await repo.update(note.id, { content: "Updated content" });
    assertExists(updated);
    const fetched = await repo.findById(note.id);
    assertExists(fetched);
    assertEquals(fetched!.id, note.id);
    assertEquals(fetched!.content, "Updated content");
    assertEquals(fetched!.color, "yellow"); // color preserved → guard holds
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("StickyNoteRepository - update modifies content", async () => {
  const { repo, dir } = await setup();
  try {
    const note = await repo.create({ content: "Original" });
    const updated = await repo.update(note.id, { content: "Modified" });
    assertExists(updated);
    assertEquals(updated!.content, "Modified");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StickyNoteRepository - update preserves color/position when patching content", async () => {
  const { repo, dir } = await setup();
  try {
    const note = await repo.create({
      content: "Original",
      color: "blue",
      position: { x: 300, y: 200 },
    });
    await repo.update(note.id, { content: "New text" });
    const fetched = await repo.findById(note.id);
    assertExists(fetched);
    assertEquals(fetched!.content, "New text");
    assertEquals(fetched!.color, "blue");
    assertEquals(fetched!.position, { x: 300, y: 200 });
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StickyNoteRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(
      await repo.update("sticky_missing", { content: "X" }),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === updatePosition / updateSize ===

Deno.test("StickyNoteRepository - updatePosition updates only the position", async () => {
  const { repo, dir } = await setup();
  try {
    const note = await repo.create({
      content: "Movable",
      color: "green",
      position: { x: 100, y: 100 },
    });
    const moved = await repo.updatePosition(note.id, { x: 500, y: 400 });
    assertExists(moved);
    assertEquals(moved!.position, { x: 500, y: 400 });
    assertEquals(moved!.color, "green");
    assertEquals(moved!.content, "Movable");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StickyNoteRepository - updateSize updates only the size", async () => {
  const { repo, dir } = await setup();
  try {
    const note = await repo.create({ content: "Resizable" });
    const resized = await repo.updateSize(note.id, { width: 320, height: 240 });
    assertExists(resized);
    assertEquals(resized!.size, { width: 320, height: 240 });
    assertEquals(resized!.content, "Resizable");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StickyNoteRepository - updatePosition/updateSize return null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertStrictEquals(
      await repo.updatePosition("sticky_missing", { x: 1, y: 1 }),
      null,
    );
    assertStrictEquals(
      await repo.updateSize("sticky_missing", { width: 1, height: 1 }),
      null,
    );
  } finally {
    await cleanup(dir);
  }
});

// === delete (soft-archive) + hardDelete ===

Deno.test("StickyNoteRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const note = await repo.create({ content: "Archive me" });
    assertEquals(await repo.delete(note.id), true);
    const found = await repo.findById(note.id);
    assertExists(found);
    const all = await repo.findAllFromDisk();
    assertStrictEquals(all.find((n) => n.id === note.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StickyNoteRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const note = await repo.create({ content: "Truly gone" });
    assertEquals(await repo.hardDelete(note.id), true);
    assertStrictEquals(await repo.findById(note.id), null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StickyNoteRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    assertEquals(await repo.delete("sticky_ghost"), false);
  } finally {
    await cleanup(dir);
  }
});

// === findAll: sort by content (nameField) ===

Deno.test("StickyNoteRepository - findAll sorts alphabetically by content", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ content: "Charlie task" });
    await repo.create({ content: "Alpha task" });
    await repo.create({ content: "Bravo task" });
    const all = await repo.findAllFromDisk();
    assertEquals(all.map((n) => n.content), [
      "Alpha task",
      "Bravo task",
      "Charlie task",
    ]);
  } finally {
    await cleanup(dir);
  }
});

// === service.list filters ===

Deno.test("StickyNoteService - list with color filter (exact match)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ content: "y1", color: "yellow" });
    await repo.create({ content: "y2", color: "yellow" });
    await repo.create({ content: "p1", color: "pink" });
    const matches = await service.list({ color: "yellow" });
    assertEquals(matches.length, 2);
    assertEquals(matches.map((n) => n.content).sort(), ["y1", "y2"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StickyNoteService - list with q filter matches content (case-insensitive)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ content: "Call Acme tomorrow" });
    await repo.create({ content: "Email Globex" });
    const matches = await service.list({ q: "ACME" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].content, "Call Acme tomorrow");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StickyNoteService - list with project filter searches content (CI substring)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ content: "MD Planner roadmap" });
    await repo.create({ content: "Unrelated note" });
    const matches = await service.list({ project: "md planner" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].content, "MD Planner roadmap");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StickyNoteService - list combines color + q (AND)", async () => {
  const { repo, service, dir } = await setup();
  try {
    await repo.create({ content: "Match Acme", color: "yellow" });
    await repo.create({ content: "Acme other color", color: "pink" });
    await repo.create({ content: "Yellow without target", color: "yellow" });
    const matches = await service.list({ color: "yellow", q: "acme" });
    assertEquals(matches.length, 1);
    assertEquals(matches[0].content, "Match Acme");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("StickyNoteService - updatePosition/updateSize delegate to repo", async () => {
  const { repo, service, dir } = await setup();
  try {
    const note = await repo.create({ content: "Move via service" });
    const moved = await service.updatePosition(note.id, { x: 999, y: 888 });
    assertExists(moved);
    assertEquals(moved!.position, { x: 999, y: 888 });
    const resized = await service.updateSize(note.id, {
      width: 50,
      height: 60,
    });
    assertExists(resized);
    assertEquals(resized!.size, { width: 50, height: 60 });
  } finally {
    await cleanup(dir);
  }
});

// === multi-board ===

Deno.test("StickyNoteRepository - boardId is wired into directory and entity", async () => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-sticky-board-test-",
  });
  try {
    const repoWork = new StickyNoteRepository(dir, "work");
    const repoHome = new StickyNoteRepository(dir, "home");
    const w = await repoWork.create({ content: "Work note" });
    const h = await repoHome.create({ content: "Home note" });
    assertEquals(w.boardId, "work");
    assertEquals(h.boardId, "home");
    // Repos see only their own board's notes.
    const workAll = await repoWork.findAllFromDisk();
    const homeAll = await repoHome.findAllFromDisk();
    assertEquals(workAll.length, 1);
    assertEquals(homeAll.length, 1);
    assertEquals(workAll[0].id, w.id);
    assertEquals(homeAll[0].id, h.id);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

// === edges ===

Deno.test("StickyNoteRepository - findByName via content (case-insensitive)", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ content: "Find me by content" });
    await repo.create({ content: "Other note" });
    const found = await repo.findByName("find me by content");
    assertExists(found);
    assertEquals(found!.content, "Find me by content");
  } finally {
    await cleanup(dir);
  }
});
