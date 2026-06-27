/**
 * Real-time note search indexing (task_1782407758681_fic626).
 *
 * Before this change, the `notes` cache row — and therefore the FTS index —
 * was written ONLY by `CacheSync.fullSync` (boot + manual rebuild). Mutating a
 * note via the service left global search stale until restart. NoteService now
 * upserts/removes the cache row on every mutation (create/update/delete/
 * archive/restore/hardDelete), so the FTS triggers keep search live.
 *
 * This suite drives mutations through NoteService and asserts the SearchEngine
 * reflects them WITHOUT ever calling fullSync. Registering the note entity once
 * per file is required (syncTable find()s the first matching entity).
 *
 * Pattern: `[architecture] MD Planner — Note content IS FTS-indexed but
 * reindexed only at boot fullSync (NOT real-time)` (the gap this closes).
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import {
  CacheDatabase,
  CacheSync,
  SearchEngine,
} from "../../src/database/sqlite/mod.ts";
import { registerNoteEntity } from "../../src/domains/note/cache.ts";
import { NoteRepository } from "../../src/repositories/note.repository.ts";
import { NoteService } from "../../src/services/note.service.ts";

Deno.test("note mutations update FTS in real time (no fullSync)", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-note-rt-" });
  const repo = new NoteRepository(dir);
  registerNoteEntity(repo);

  const db = new CacheDatabase(":memory:");
  const sync = new CacheSync(db);
  sync.init();
  repo.setCacheDb(db);
  const service = new NoteService(repo);
  service.setCache(sync);
  const engine = new SearchEngine(db);

  try {
    let noteId = "";

    await t.step(
      "create → findable by title and body immediately",
      async () => {
        const created = await service.create({
          title: "Realtime Indexed Note",
          content: "alphakeyword body text",
          project: "MD Planner",
        });
        noteId = created.id;

        const byTitle = engine.search("Realtime Indexed");
        assert(
          byTitle.some((r) => r.id === noteId),
          "title search should find the new note without fullSync",
        );
        const byBody = engine.search("alphakeyword");
        assert(
          byBody.some((r) => r.id === noteId),
          "body search should find the new note without fullSync",
        );
      },
    );

    await t.step(
      "update → new body matches, removed text does not",
      async () => {
        // Send a full, consistent body: clearing paragraphs makes `content` the
        // authoritative serialized body (serialize prefers paragraphs when set).
        await service.update(noteId, {
          content: "betakeyword replaced text",
          paragraphs: [],
        });

        const beta = engine.search("betakeyword");
        assert(
          beta.some((r) => r.id === noteId),
          "updated body keyword should match",
        );
        const alpha = engine.search("alphakeyword");
        assertEquals(
          alpha.some((r) => r.id === noteId),
          false,
          "removed body keyword should no longer match",
        );
      },
    );

    await t.step("archive → drops out of keyword search", async () => {
      const ok = await service.archive(noteId, "Tester");
      assertEquals(ok, true);
      const beta = engine.search("betakeyword");
      assertEquals(
        beta.some((r) => r.id === noteId),
        false,
        "archived note must be excluded from FTS results",
      );
    });

    await t.step("restore → returns to keyword search", async () => {
      const ok = await service.restore(noteId);
      assertEquals(ok, true);
      const beta = engine.search("betakeyword");
      assert(
        beta.some((r) => r.id === noteId),
        "restored note should be searchable again",
      );
    });

    await t.step("hardDelete → gone from search", async () => {
      const ok = await service.hardDelete(noteId);
      assertEquals(ok, true);
      const beta = engine.search("betakeyword");
      assertEquals(
        beta.some((r) => r.id === noteId),
        false,
        "hard-deleted note must be removed from FTS",
      );
    });
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("cache-disabled NoteService mutations are no-ops (no throw)", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-note-rt-nocache-" });
  const repo = new NoteRepository(dir);
  // No setCache() — mirrors a boot with cache disabled.
  const service = new NoteService(repo);

  try {
    const created = await service.create({
      title: "No Cache Note",
      content: "gammakeyword",
    });
    assertExists(created.id);
    const updated = await service.update(created.id, {
      content: "deltakeyword",
    });
    assertExists(updated);
    assertEquals(await service.archive(created.id), true);
    assertEquals(await service.restore(created.id), true);
    assertEquals(await service.hardDelete(created.id), true);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
