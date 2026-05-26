/**
 * Unit tests for v2 NoteRepository (CRUD on disk).
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { NoteRepository } from "../../v2/repositories/note.repository.ts";

async function setup(): Promise<{ repo: NoteRepository; dir: string }> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-note-test-" });
  const repo = new NoteRepository(dir);
  return { repo, dir };
}

async function cleanup(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // ignore
  }
}

// === create + findById ===

Deno.test("NoteRepository - create stores file and returns entity", async () => {
  const { repo, dir } = await setup();
  try {
    const note = await repo.create({
      title: "My first note",
      content: "",
      project: "MD Planner",
    });
    assertExists(note.id);
    assertEquals(note.title, "My first note");
    assertEquals(note.project, "MD Planner");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("NoteRepository - findById returns correct entity", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({ title: "Findable note", content: "" });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.id, created.id);
    assertEquals(found!.title, "Findable note");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("NoteRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    const found = await repo.findById("note_nonexistent");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

// === findAll ===

Deno.test("NoteRepository - findAll returns all entities", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Note A", content: "" });
    await repo.create({ title: "Note B", content: "" });
    await repo.create({ title: "Note C", content: "" });
    const all = await repo.findAll();
    assertEquals(all.length, 3);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("NoteRepository - findAll returns empty array when no notes exist", async () => {
  const { repo, dir } = await setup();
  try {
    const all = await repo.findAll();
    assertEquals(all.length, 0);
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("NoteRepository - update modifies title", async () => {
  const { repo, dir } = await setup();
  try {
    const note = await repo.create({ title: "Before", content: "" });
    const updated = await repo.update(note.id, { title: "After" });
    assertExists(updated);
    assertEquals(updated!.title, "After");

    const found = await repo.findById(note.id);
    assertEquals(found!.title, "After");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("NoteRepository - update increments revision", async () => {
  const { repo, dir } = await setup();
  try {
    const note = await repo.create({ title: "Rev test", content: "" });
    const updated = await repo.update(note.id, { title: "Rev test updated" });
    assertEquals(updated!.revision, (note.revision ?? 1) + 1);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("NoteRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.update("note_missing", { title: "Ghost" });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

// === delete ===

Deno.test("NoteRepository - delete soft-archives entity", async () => {
  // delete() is aliased to archive() per the soft-delete pattern. The file
  // stays on disk and findById still resolves it (cross-domain refs); only
  // findAll filters it out. Use hardDelete to remove the file.
  const { repo, dir } = await setup();
  try {
    const note = await repo.create({ title: "Ephemeral note", content: "" });
    const archived = await repo.delete(note.id);
    assertEquals(archived, true);

    const stillThere = await repo.findById(note.id);
    assertExists(stillThere);
    assertEquals(stillThere!.archived, true);

    const all = await repo.findAll();
    assertEquals(
      all.some((n) => n.id === note.id),
      false,
      "archived note is hidden from findAll",
    );

    const removed = await repo.hardDelete(note.id);
    assertEquals(removed, true);
    const gone = await repo.findById(note.id);
    assertStrictEquals(gone, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("NoteRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.delete("note_ghost");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

// === field persistence ===

Deno.test("NoteRepository - persists project field through round-trip", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({
      title: "Scoped note",
      content: "",
      project: "My Project",
    });
    const all = await repo.findAll();
    assertEquals(all[0].project, "My Project");
  } finally {
    await cleanup(dir);
  }
});
