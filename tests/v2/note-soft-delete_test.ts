/**
 * Soft-delete acceptance suite — Note (standalone repo rollout).
 *
 * Note is the first standalone-repo soft-delete rollout AND the first
 * FTS-bearing domain whose archive flag must be respected by global
 * search. The ticket pins FTS-exclusion coverage onto this same file, so
 * the test inlines the 8 canonical steps (instead of calling
 * `runSoftDeleteSuite`) and adds a 9th step for FTS exclusion — a single
 * `Deno.test` keeps `registerNoteEntity` invoked exactly once per file,
 * which `syncTable` requires (it `find()`s the first matching entity, so
 * duplicate registrations make the second test resolve a stale dir).
 *
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import {
  CacheDatabase,
  CacheSync,
  SearchEngine,
} from "../../src/database/sqlite/mod.ts";
import { registerNoteEntity } from "../../src/domains/note/cache.ts";
import { NoteRepository } from "../../src/repositories/note.repository.ts";

Deno.test("soft-delete (archive) — Note", async (t) => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-notes-soft-delete-",
  });
  const repo = new NoteRepository(dir);
  registerNoteEntity(repo);

  const target = await repo.create({
    title: "Archive me",
    content: "Will be soft-deleted.",
  });
  const control = await repo.create({
    title: "Keep me",
    content: "Control row, never archived.",
  });

  const db = new CacheDatabase(":memory:");
  const sync = new CacheSync(db);
  sync.init();
  repo.setCacheDb(db);
  await sync.fullSync({ tables: ["notes"] });

  const filePath = (id: string) => `${dir}/notes/${id}.md`;

  try {
    await t.step("findAll baseline — both rows visible", async () => {
      const all = await repo.findAll();
      assertEquals(all.length, 2);
      assert(all.some((n) => n.id === target.id));
      assert(all.some((n) => n.id === control.id));
    });

    await t.step("archive removes from default list", async () => {
      const ok = await repo.archive(target.id, "Tester");
      assertEquals(ok, true);
      const all = await repo.findAll();
      assertEquals(all.length, 1);
      assertEquals(all[0].id, control.id);
    });

    await t.step(
      "findArchived returns the archived row with stamps",
      async () => {
        const archived = await repo.findArchived();
        assertEquals(archived.length, 1);
        const got = archived[0];
        assertEquals(got.id, target.id);
        assertEquals(got.archived, true);
        assertExists(got.archivedAt);
        assertEquals(got.archivedBy, "Tester");
      },
    );

    await t.step(
      "findById still resolves archived items (cross-domain refs)",
      async () => {
        const got = await repo.findById(target.id);
        assertExists(got);
        assertEquals(got!.archived, true);
      },
    );

    await t.step(
      "frontmatter round-trips archived / archived_at / archived_by",
      async () => {
        const raw = await Deno.readTextFile(filePath(target.id));
        assert(
          /archived: true/.test(raw),
          `expected archived in fm:\n${raw}`,
        );
        assert(
          /archived_at:/.test(raw),
          `expected archived_at in fm:\n${raw}`,
        );
        assert(
          /archived_by: Tester/.test(raw),
          `expected archived_by in fm:\n${raw}`,
        );
      },
    );

    await t.step("restore re-shows the row in the default list", async () => {
      const ok = await repo.restore(target.id);
      assertEquals(ok, true);
      const all = await repo.findAll();
      assertEquals(all.length, 2);
      const restored = all.find((n) => n.id === target.id);
      assertExists(restored);
      assertEquals(restored!.archived, undefined);
      assertEquals(restored!.archivedAt, undefined);
      assertEquals(restored!.archivedBy, undefined);
    });

    await t.step("hardDelete removes the file from disk", async () => {
      const ok = await repo.hardDelete(target.id);
      assertEquals(ok, true);
      const all = await repo.findAll();
      assertEquals(all.length, 1);
      assertEquals(all[0].id, control.id);
      let exists = true;
      try {
        await Deno.stat(filePath(target.id));
      } catch (err) {
        if (err instanceof Deno.errors.NotFound) exists = false;
        else throw err;
      }
      assertEquals(exists, false);
      const gone = await repo.findById(target.id);
      assertEquals(gone, null);
    });

    await t.step(
      "delete() is aliased to archive() — base contract",
      async () => {
        const ok = await repo.delete(control.id);
        assertEquals(ok, true);
        const stillThere = await repo.findById(control.id);
        assertExists(stillThere);
        assertEquals(stillThere!.archived, true);
      },
    );

    await t.step(
      "FTS search excludes archived notes",
      async () => {
        const keyword = "uniqueSearchKeyword";
        const fts = await repo.create({
          title: "Searchable Note",
          content: `${keyword} body text`,
        });
        await sync.fullSync({ tables: ["notes"] });
        const engine = new SearchEngine(db);

        const before = engine.search(keyword);
        assert(
          before.some((r) => r.id === fts.id),
          `pre-archive: expected ${fts.id} in results, got ${
            JSON.stringify(before.map((r) => r.id))
          }`,
        );

        const ok = await repo.archive(fts.id, "Tester");
        assertEquals(ok, true);
        await sync.fullSync({ tables: ["notes"] });

        const after = engine.search(keyword);
        assertEquals(
          after.some((r) => r.id === fts.id),
          false,
          `post-archive: ${fts.id} must be hidden from FTS, got ${
            JSON.stringify(after.map((r) => r.id))
          }`,
        );

        const restored = await repo.restore(fts.id);
        assertEquals(restored, true);
        await sync.fullSync({ tables: ["notes"] });

        const final = engine.search(keyword);
        assert(
          final.some((r) => r.id === fts.id),
          `post-restore: expected ${fts.id} back in results, got ${
            JSON.stringify(final.map((r) => r.id))
          }`,
        );
      },
    );
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
});
