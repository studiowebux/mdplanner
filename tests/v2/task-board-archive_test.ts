/**
 * Monthly board-archive acceptance suite — Task (2gg5e1).
 *
 * Sweeping a Done task moves its file board/<section>/<id>.md →
 * archive/<YYYY-MM>/<id>.md and stamps board_archived + archived_month. The
 * archived task must DROP OFF the active board (findAll) but STAY in the cache
 * → FTS search + analytics (findBoardArchived / findAllForCache). Restore moves
 * it back. Distinct from soft-delete `archived` (which IS search-excluded).
 *
 * Decision: note_1782350432340. registerTaskEntity is invoked once per file
 * (ENTITIES is a shared global).
 */

import { join } from "@std/path";
import { assert, assertEquals } from "@std/assert";
import {
  CacheDatabase,
  CacheSync,
  SearchEngine,
} from "../../src/database/sqlite/mod.ts";
import { registerTaskEntity } from "../../src/domains/task/cache.ts";
import { TaskRepository } from "../../src/repositories/task.repository.ts";

Deno.test("monthly board-archive — Task", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-task-board-arch-" });
  const repo = new TaskRepository(dir);
  registerTaskEntity(repo);

  const target = await repo.create({
    title: "Zatchwork quarterly cleanup",
    section: "Done",
    description: ["A finished task to sweep into the archive."],
  });
  const control = await repo.create({
    title: "Keep me active",
    section: "Done",
    description: ["Stays on the board."],
  });

  const db = new CacheDatabase(":memory:");
  const sync = new CacheSync(db);
  sync.init();
  repo.setCacheDb(db);
  await sync.fullSync({ tables: ["tasks"] });

  const boardFile = join(dir, "board", "done", `${target.id}.md`);
  const archiveFile = join(dir, "archive", "2026-05", `${target.id}.md`);

  try {
    await t.step("baseline — both on the board", async () => {
      const all = await repo.findAll();
      assert(all.some((x) => x.id === target.id));
      assert(all.some((x) => x.id === control.id));
    });

    await t.step("boardArchive moves the file to archive/YYYY-MM", async () => {
      const ok = await repo.boardArchive(target.id, "2026-05");
      assert(ok, "boardArchive returns true");
      assertEquals(
        await exists(boardFile),
        false,
        "board file removed",
      );
      assertEquals(await exists(archiveFile), true, "archive file created");
    });

    await t.step("findAll (board) excludes the archived task", async () => {
      const all = await repo.findAll();
      assert(!all.some((x) => x.id === target.id), "archived task off board");
      assert(all.some((x) => x.id === control.id), "control still on board");
    });

    await t.step("findBoardArchived includes it with month", async () => {
      const archived = await repo.findBoardArchived();
      const found = archived.find((x) => x.id === target.id);
      assert(found, "archived task discovered");
      assertEquals(found?.boardArchived, true);
      assertEquals(found?.archivedMonth, "2026-05");
      assertEquals(found?.section, "Done", "original section preserved");
    });

    await t.step("findById resolves the archived task", async () => {
      const got = await repo.findById(target.id);
      assert(got, "resolvable by id");
      assertEquals(got?.boardArchived, true);
    });

    await t.step("FTS search STILL returns the archived task", async () => {
      await sync.fullSync({ tables: ["tasks"] });
      const engine = new SearchEngine(db);
      const hits = engine.search("Zatchwork");
      assert(
        hits.some((h) => h.id === target.id),
        "board-archived task remains searchable (not soft-deleted)",
      );
    });

    await t.step("cache findAll still excludes it after sync", async () => {
      const all = await repo.findAll();
      assert(!all.some((x) => x.id === target.id), "cache board filter holds");
    });

    await t.step("boardRestore returns it to the board", async () => {
      const ok = await repo.boardRestore(target.id);
      assert(ok, "boardRestore returns true");
      assertEquals(await exists(archiveFile), false, "archive file removed");
      assertEquals(await exists(boardFile), true, "board file restored");
      const all = await repo.findAll();
      assert(all.some((x) => x.id === target.id), "back on the board");
    });
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
});

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) return false;
    throw err;
  }
}
