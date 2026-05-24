/**
 * Reference test for the canonical soft-delete (archive) pattern.
 *
 * Acceptance per `task_1779585813359_zvvc`:
 *  - archive() removes the item from `findAll`/default cache query
 *  - findArchived() returns it
 *  - restore() brings it back to the default list
 *  - hardDelete() removes the file from disk + evicts cache
 *  - frontmatter round-trips `archived` / `archived_at` / `archived_by`
 *
 * Entity registration follows the Brain Memory rule — registered once at
 * module level; `db.close()` runs in finally so the signal-listener teardown
 * in `CacheDatabase` doesn't trip the op sanitizer.
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import { CacheDatabase, CacheSync } from "../../v2/database/sqlite/mod.ts";
import { registerIdeaEntity } from "../../v2/domains/idea/cache.ts";
import { IdeaRepository } from "../../v2/repositories/idea.repository.ts";

Deno.test("soft-delete (archive) — Idea reference", async (t) => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-idea-soft-delete-",
  });
  const repo = new IdeaRepository(dir);
  // Register the entity once for this test file. registerIdeaEntity pushes
  // to the shared global ENTITIES array; subsequent test runs in the same
  // process pick up this registration. The sync closure binds to `repo`.
  registerIdeaEntity(repo);

  // Seed two ideas — one to archive, one as control.
  const target = await repo.create({
    title: "To Be Archived",
    description: "Will be soft-deleted.",
    status: "new",
  });
  const control = await repo.create({
    title: "Stays Visible",
    description: "Control row, never archived.",
    status: "new",
  });

  const db = new CacheDatabase(":memory:");
  const sync = new CacheSync(db);
  sync.init();
  repo.setCacheDb(db);
  await sync.fullSync({ tables: ["ideas"] });

  try {
    await t.step("findAll baseline — both rows visible", async () => {
      const all = await repo.findAll();
      assertEquals(all.length, 2);
      assert(all.some((i) => i.id === target.id));
      assert(all.some((i) => i.id === control.id));
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
        const raw = await Deno.readTextFile(`${dir}/ideas/${target.id}.md`);
        assert(/archived: true/.test(raw), `expected archived in fm:\n${raw}`);
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
      const restored = all.find((i) => i.id === target.id);
      assertExists(restored);
      assertEquals(restored!.archived, undefined);
      assertEquals(restored!.archivedAt, undefined);
      assertEquals(restored!.archivedBy, undefined);
    });

    await t.step(
      "hardDelete removes the file from disk and the cache",
      async () => {
        const ok = await repo.hardDelete(target.id);
        assertEquals(ok, true);
        const all = await repo.findAll();
        assertEquals(all.length, 1);
        assertEquals(all[0].id, control.id);
        // File is truly gone.
        let exists = true;
        try {
          await Deno.stat(`${dir}/ideas/${target.id}.md`);
        } catch (err) {
          if (err instanceof Deno.errors.NotFound) exists = false;
          else throw err;
        }
        assertEquals(exists, false);
        // findById falls through to disk and reports null.
        const gone = await repo.findById(target.id);
        assertEquals(gone, null);
      },
    );

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
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
});
