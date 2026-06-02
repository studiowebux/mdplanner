/**
 * Reusable soft-delete (archive) acceptance suite.
 *
 * Domain rollout tickets call `runSoftDeleteSuite` from a thin per-domain
 * `<domain>-soft-delete_test.ts` file. The suite runs the 8 canonical
 * acceptance steps against any repository that implements the base
 * archive/restore/hardDelete/findArchived contract.
 *
 * Pattern: see `[architecture] MD Planner — Soft-delete (archive) pattern`.
 *
 * Entity registration follows the Brain Memory rule — caller passes a
 * `registerEntity` function that is invoked exactly once per test file at
 * module level. `db.close()` runs in finally so the `CacheDatabase` SQLite
 * handle is released and doesn't trip the resource sanitizer.
 */

import { assert, assertEquals, assertExists } from "@std/assert";
import { CacheDatabase, CacheSync } from "../../../src/database/sqlite/mod.ts";

/**
 * A minimal entity shape the suite asserts against. Domains pass their own
 * entity type which structurally satisfies this — the suite only reads `id`
 * and the three archive fields.
 */
export type ArchivableRow = {
  id: string;
  archived?: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;
};

/**
 * Minimal repository contract the suite exercises. Concrete repositories
 * implement these via `CachedMarkdownRepository`/`BaseMarkdownRepository`.
 */
export type ArchivableRepo<T extends ArchivableRow> = {
  create(data: unknown): Promise<T>;
  findAll(): Promise<T[]>;
  findArchived(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  archive(id: string, by?: string): Promise<boolean>;
  restore(id: string): Promise<boolean>;
  hardDelete(id: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  setCacheDb(db: CacheDatabase): void;
};

export type SoftDeleteSuiteOptions<T extends ArchivableRow> = {
  /** Display name e.g. "Billing Rate". Used in the Deno.test title. */
  name: string;
  /** Cache table name e.g. "billing_rates" — passed to `fullSync({ tables })`. */
  table: string;
  /**
   * Factory that returns a fresh repository bound to the given temp dir.
   * Called once per test run.
   */
  makeRepo: (dir: string) => ArchivableRepo<T>;
  /** Entity registration callback. Idempotent — invoked once. */
  registerEntity: (repo: ArchivableRepo<T>) => void;
  /** Factory: seed data for the "target" row (the one that gets archived). */
  seedTarget: () => unknown;
  /** Factory: seed data for the "control" row (stays visible). */
  seedControl: () => unknown;
  /**
   * Build the on-disk file path for a given id. Default:
   * `${dir}/${table}/${id}.md`. Override for domains whose `directory`
   * config differs from the table name (e.g. billing/rates vs billing_rates).
   */
  filePath?: (dir: string, id: string) => string;
};

export function runSoftDeleteSuite<T extends ArchivableRow>(
  opts: SoftDeleteSuiteOptions<T>,
): void {
  const filePath = opts.filePath ??
    ((dir: string, id: string) => `${dir}/${opts.table}/${id}.md`);

  Deno.test(`soft-delete (archive) — ${opts.name}`, async (t) => {
    const dir = await Deno.makeTempDir({
      prefix: `mdplanner-${opts.table}-soft-delete-`,
    });
    const repo = opts.makeRepo(dir);
    opts.registerEntity(repo);

    const target = await repo.create(opts.seedTarget());
    const control = await repo.create(opts.seedControl());

    const db = new CacheDatabase(":memory:");
    const sync = new CacheSync(db);
    sync.init();
    repo.setCacheDb(db);
    await sync.fullSync({ tables: [opts.table] });

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
          const raw = await Deno.readTextFile(filePath(dir, target.id));
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
          let exists = true;
          try {
            await Deno.stat(filePath(dir, target.id));
          } catch (err) {
            if (err instanceof Deno.errors.NotFound) exists = false;
            else throw err;
          }
          assertEquals(exists, false);
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
}
