/**
 * Unit tests for v2 JournalRepository (CRUD on disk).
 *
 * Covers the markdown-content round-trip that the detail-page "Edit Mode"
 * (contenteditable) relies on: raw markdown written via update() must survive
 * the serialize → parse cycle unchanged (modulo trim).
 */

import { assertEquals, assertExists, assertStrictEquals } from "@std/assert";
import { JournalRepository } from "../../src/repositories/journal.repository.ts";

async function setup(): Promise<{ repo: JournalRepository; dir: string }> {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-journal-test-" });
  const repo = new JournalRepository(dir);
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

Deno.test("JournalRepository - create stores file and returns entity", async () => {
  const { repo, dir } = await setup();
  try {
    const entry = await repo.create({
      title: "Morning reflection",
      content: "Felt focused today.",
      date: "2026-03-01",
      mood: "good",
      tags: ["work", "focus"],
    });
    assertExists(entry.id);
    assertEquals(entry.title, "Morning reflection");
    assertEquals(entry.content, "Felt focused today.");
    assertEquals(entry.date, "2026-03-01");
    assertEquals(entry.mood, "good");
    assertEquals(entry.tags, ["work", "focus"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("JournalRepository - create without content leaves content undefined", async () => {
  const { repo, dir } = await setup();
  try {
    const entry = await repo.create({
      title: "Empty entry",
      date: "2026-03-02",
    });
    const found = await repo.findById(entry.id);
    assertExists(found);
    assertStrictEquals(found!.content, undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("JournalRepository - findById returns correct entity", async () => {
  const { repo, dir } = await setup();
  try {
    const created = await repo.create({
      title: "Findable entry",
      date: "2026-03-03",
    });
    const found = await repo.findById(created.id);
    assertExists(found);
    assertEquals(found!.id, created.id);
    assertEquals(found!.title, "Findable entry");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("JournalRepository - findById returns null for missing ID", async () => {
  const { repo, dir } = await setup();
  try {
    const found = await repo.findById("journal_nonexistent");
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

// === findAll ===

Deno.test("JournalRepository - findAll returns all entities", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({ title: "Entry A", date: "2026-03-04" });
    await repo.create({ title: "Entry B", date: "2026-03-05" });
    await repo.create({ title: "Entry C", date: "2026-03-06" });
    const all = await repo.findAll();
    assertEquals(all.length, 3);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("JournalRepository - findAll returns empty array when none exist", async () => {
  const { repo, dir } = await setup();
  try {
    const all = await repo.findAll();
    assertEquals(all.length, 0);
  } finally {
    await cleanup(dir);
  }
});

// === update ===

Deno.test("JournalRepository - update modifies content (Edit Mode save path)", async () => {
  const { repo, dir } = await setup();
  try {
    const entry = await repo.create({
      title: "Content entry",
      content: "Original body.",
      date: "2026-03-07",
    });
    const updated = await repo.update(entry.id, {
      content: "Edited in place.",
    });
    assertExists(updated);
    assertEquals(updated!.content, "Edited in place.");

    const found = await repo.findById(entry.id);
    assertEquals(found!.content, "Edited in place.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("JournalRepository - update content leaves other fields intact", async () => {
  const { repo, dir } = await setup();
  try {
    const entry = await repo.create({
      title: "Stable fields",
      content: "Before.",
      date: "2026-03-08",
      mood: "great",
      tags: ["keep"],
    });
    await repo.update(entry.id, { content: "After." });
    const found = await repo.findById(entry.id);
    assertEquals(found!.title, "Stable fields");
    assertEquals(found!.date, "2026-03-08");
    assertEquals(found!.mood, "great");
    assertEquals(found!.tags, ["keep"]);
    assertEquals(found!.content, "After.");
  } finally {
    await cleanup(dir);
  }
});

Deno.test("JournalRepository - update modifies title, mood, and tags", async () => {
  const { repo, dir } = await setup();
  try {
    const entry = await repo.create({
      title: "Before",
      date: "2026-03-09",
      mood: "bad",
      tags: ["old"],
    });
    const updated = await repo.update(entry.id, {
      title: "After",
      mood: "good",
      tags: ["new", "fresh"],
    });
    assertEquals(updated!.title, "After");
    assertEquals(updated!.mood, "good");
    assertEquals(updated!.tags, ["new", "fresh"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("JournalRepository - update returns null for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.update("journal_missing", { title: "Ghost" });
    assertStrictEquals(result, null);
  } finally {
    await cleanup(dir);
  }
});

// === delete ===

Deno.test("JournalRepository - delete soft-archives entity", async () => {
  const { repo, dir } = await setup();
  try {
    const entry = await repo.create({
      title: "Ephemeral",
      date: "2026-03-10",
    });
    const deleted = await repo.delete(entry.id);
    assertEquals(deleted, true);
    // delete() now aliases archive() — file stays on disk, findById still
    // resolves it for cross-domain reference safety. findAll filters it out.
    const found = await repo.findById(entry.id);
    assertExists(found);
    const all = await repo.findAll();
    assertStrictEquals(all.find((j) => j.id === entry.id), undefined);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("JournalRepository - hardDelete removes the file", async () => {
  const { repo, dir } = await setup();
  try {
    const entry = await repo.create({
      title: "Truly Ephemeral",
      date: "2026-03-10",
    });
    const ok = await repo.hardDelete(entry.id);
    assertEquals(ok, true);
    const found = await repo.findById(entry.id);
    assertStrictEquals(found, null);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("JournalRepository - delete returns false for non-existent ID", async () => {
  const { repo, dir } = await setup();
  try {
    const result = await repo.delete("journal_ghost");
    assertEquals(result, false);
  } finally {
    await cleanup(dir);
  }
});

// === markdown round-trip ===

Deno.test("JournalRepository - preserves multi-format markdown content round-trip", async () => {
  const { repo, dir } = await setup();
  try {
    const markdown = [
      "# Heading",
      "",
      "A paragraph with **bold**, *italic*, and `inline code`.",
      "",
      "- bullet one",
      "- bullet two",
      "  - nested bullet",
      "",
      "1. first",
      "2. second",
      "",
      "> A blockquote line.",
      "",
      "```ts",
      "const x: number = 1;",
      "```",
      "",
      "| Col A | Col B |",
      "| ----- | ----- |",
      "| 1     | 2     |",
    ].join("\n");

    const entry = await repo.create({
      title: "Markdown round-trip",
      content: markdown,
      date: "2026-03-11",
    });
    const found = await repo.findById(entry.id);
    assertExists(found);
    assertEquals(found!.content, markdown);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("JournalRepository - preserves tags array round-trip", async () => {
  const { repo, dir } = await setup();
  try {
    await repo.create({
      title: "Tagged entry",
      date: "2026-03-12",
      tags: ["alpha", "beta", "gamma"],
    });
    const all = await repo.findAll();
    assertEquals(all[0].tags, ["alpha", "beta", "gamma"]);
  } finally {
    await cleanup(dir);
  }
});

Deno.test("JournalRepository - persists every mood value", async () => {
  const { repo, dir } = await setup();
  try {
    const moods = ["great", "good", "neutral", "bad", "awful"] as const;
    for (const mood of moods) {
      const entry = await repo.create({
        title: `Mood ${mood}`,
        date: "2026-03-13",
        mood,
      });
      const found = await repo.findById(entry.id);
      assertEquals(found!.mood, mood);
    }
  } finally {
    await cleanup(dir);
  }
});
