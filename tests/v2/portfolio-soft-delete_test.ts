/**
 * Soft-delete acceptance suite — Portfolio (standalone repo rollout).
 *
 * Portfolio is the second standalone-repo soft-delete rollout (after Note).
 * Like Note it carries FTS, so this file covers the 8 canonical archive
 * steps PLUS one FTS-exclusion step. A single `Deno.test` keeps
 * `registerPortfolioEntity` invoked exactly once per file — `syncTable`
 * `find()`s the first matching entity, so duplicate registrations would
 * make later tests resolve a stale (cleaned-up) tempdir.
 *
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 * Reference: `tests/v2/note-soft-delete_test.ts` (commit 3e39450).
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import {
  CacheDatabase,
  CacheSync,
  SearchEngine,
} from "../../v2/database/sqlite/mod.ts";
import { registerPortfolioEntity } from "../../v2/domains/portfolio/cache.ts";
import { PortfolioRepository } from "../../v2/repositories/portfolio.repository.ts";

Deno.test("soft-delete (archive) — Portfolio", async (t) => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-portfolio-soft-delete-",
  });
  const repo = new PortfolioRepository(dir);
  registerPortfolioEntity(repo);

  const target = await repo.create({
    name: "Archive me",
    category: "SaaS",
    status: "active",
    description: "Will be soft-deleted.",
  });
  const control = await repo.create({
    name: "Keep me",
    category: "SaaS",
    status: "active",
    description: "Control row, never archived.",
  });

  const db = new CacheDatabase(":memory:");
  const sync = new CacheSync(db);
  sync.init();
  repo.setCacheDb(db);
  await sync.fullSync({ tables: ["portfolio"] });

  const filePath = (id: string) => `${dir}/portfolio/${id}.md`;

  try {
    await t.step("findAll baseline — both rows visible", async () => {
      const all = await repo.findAll();
      assertEquals(all.length, 2);
      assert(all.some((p) => p.id === target.id));
      assert(all.some((p) => p.id === control.id));
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
      const restored = all.find((p) => p.id === target.id);
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
      "FTS search excludes archived portfolio items",
      async () => {
        const keyword = "uniquePortfolioKeyword";
        const fts = await repo.create({
          name: "Searchable item",
          category: "SaaS",
          status: "active",
          description: `${keyword} description text`,
        });
        await sync.fullSync({ tables: ["portfolio"] });
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
        await sync.fullSync({ tables: ["portfolio"] });

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
        await sync.fullSync({ tables: ["portfolio"] });

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
