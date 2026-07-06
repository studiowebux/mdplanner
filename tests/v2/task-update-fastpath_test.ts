/**
 * findFileById cache fast-path — TaskRepository.
 *
 * update() resolves the task file via findFileById. With a cache attached it
 * uses the cached section to read the file directly (O(1)) instead of scanning
 * every section dir (O(N)). These tests exercise BOTH branches:
 *   1. fast path — cached row present, section change moves the file correctly;
 *   2. fallback — row absent from cache (created after sync) still resolves via
 *      the disk scan.
 */

import { join } from "@std/path";
import { assertEquals, assertExists } from "@std/assert";
import { CacheDatabase, CacheSync } from "../../src/database/sqlite/mod.ts";
import { registerTaskEntity } from "../../src/domains/task/cache.ts";
import { TaskRepository } from "../../src/repositories/task.repository.ts";

Deno.test("update — cache fast-path resolves + moves file on section change", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-task-fastpath-" });
  const repo = new TaskRepository(dir);
  registerTaskEntity(repo);

  const db = new CacheDatabase(":memory:");
  const sync = new CacheSync(db);
  sync.init();
  repo.setCacheDb(db);

  try {
    const task = await repo.create({ title: "Move me", section: "Todo" });
    await sync.fullSync({ tables: ["tasks"] });

    // Cache row exists in Todo → fast path resolves there, then moves to Done.
    const updated = await repo.update(task.id, {
      completed: true,
      section: "Done",
    });
    assertExists(updated);
    assertEquals(updated!.section, "Done");
    assertEquals(updated!.completed, true);
    assertExists(updated!.completedAt);

    // File physically moved: gone from todo/, present in done/.
    let inTodo = true;
    try {
      await Deno.stat(join(dir, "board", "todo", `${task.id}.md`));
    } catch {
      inTodo = false;
    }
    assertEquals(inTodo, false);
    const raw = await Deno.readTextFile(
      join(dir, "board", "done", `${task.id}.md`),
    );
    assertEquals(/completed: true/.test(raw), true);

    // repo.update writes disk but doesn't upsert the cache (the service does);
    // re-sync so findById reflects the moved file.
    await sync.fullSync({ tables: ["tasks"] });
    const reread = await repo.findById(task.id);
    assertEquals(reread!.section, "Done");
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("update — falls back to disk scan when the cache has no row", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-task-fallback-" });
  const repo = new TaskRepository(dir);
  registerTaskEntity(repo);

  const db = new CacheDatabase(":memory:");
  const sync = new CacheSync(db);
  sync.init();
  repo.setCacheDb(db);
  await sync.fullSync({ tables: ["tasks"] });

  try {
    // Created AFTER the sync → cache has no row for this id. The fast path
    // finds nothing and must fall through to the directory scan.
    const task = await repo.create({ title: "Unsynced", section: "Todo" });

    const updated = await repo.update(task.id, { title: "Renamed via scan" });
    assertExists(updated);
    assertEquals(updated!.title, "Renamed via scan");
    assertEquals(updated!.section, "Todo");
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
});
