/**
 * Regression test for v2 habit global search (FTS).
 *
 * Bug ticket: "Search: Habits not indexed — habit entries return no results in
 * global search". When the habit module was rebuilt (commit ff2d515) its
 * `EntityDef` shipped with an `fts` config indexing `title` + `description`,
 * so habits ARE searchable. This test locks that wiring in: registers the
 * habit entity, syncs two habits to an in-memory cache, and asserts that the
 * `SearchEngine` returns them by both title and description, typed `habit`.
 *
 * Single registration: `registerHabitEntity` pushes to the shared `ENTITIES`
 * array, so habit is registered once and the three checks run as steps over
 * one cache. Assertions filter on `type === "habit"` and the sync is scoped to
 * the habit table, so unrelated entities in `ENTITIES` cannot affect results.
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  CacheDatabase,
  CacheSync,
  SearchEngine,
} from "../../v2/database/sqlite/mod.ts";
import { registerHabitEntity } from "../../v2/domains/habit/cache.ts";
import { HabitRepository } from "../../v2/repositories/habit.repository.ts";

Deno.test("habit global search", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-habit-search-" });
  const repo = new HabitRepository(dir);

  await repo.create({
    title: "Morning Exercise",
    description: "Twenty minutes of physical activity in the morning.",
    frequency: "daily",
    targetPerPeriod: 1,
    completedDates: [],
  });
  await repo.create({
    title: "Reading",
    description: "Read a chapter of a book every week.",
    frequency: "weekly",
    targetPerPeriod: 1,
    completedDates: [],
  });

  registerHabitEntity(repo);

  const db = new CacheDatabase(":memory:");
  const sync = new CacheSync(db);
  sync.init();
  await sync.fullSync({ tables: ["habit"] });
  const engine = new SearchEngine(db);

  try {
    await t.step("matches by title", () => {
      const habit = engine.search("Reading", { types: ["habit"] })
        .find((r) => r.type === "habit");
      assertExists(habit);
      assertEquals(habit!.title, "Reading");
    });

    await t.step("matches by description content", () => {
      const habit = engine.search("physical activity", { types: ["habit"] })
        .find((r) => r.type === "habit");
      assertExists(habit);
      assertEquals(habit!.title, "Morning Exercise");
    });

    await t.step("type-scoped search returns only habits", () => {
      const results = engine.search("Exercise", { types: ["habit"] });
      assertEquals(results.length >= 1, true);
      assertEquals(results.every((r) => r.type === "habit"), true);
    });
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
});
