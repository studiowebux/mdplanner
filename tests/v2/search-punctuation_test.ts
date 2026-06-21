/**
 * Regression test for v2 global-search precision with punctuation in queries.
 *
 * Bug ticket task_1781670927076_el426o ("global search — poor precision,
 * missing results"). `escapeQuery` split the query on whitespace and turned
 * EVERY token into a mandatory `"token"*` AND prefix term. A punctuation-only
 * token (e.g. the "&" in "API & Webhooks") carries nothing the FTS5 tokenizer
 * can index, so it matched zero rows and zeroed out the entire query — the
 * exact-title search returned NONE.
 *
 * The fix drops punctuation-only tokens (no Unicode letter/digit) before
 * building the MATCH expression, and short-circuits an all-punctuation query
 * to avoid an empty `MATCH ""` (which FTS5 rejects). This test registers the
 * note entity, syncs notes to an in-memory cache, and asserts the title is
 * found whether or not the query includes the ampersand, while an
 * all-punctuation query returns no results and does not throw.
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  CacheDatabase,
  CacheSync,
  SearchEngine,
} from "../../src/database/sqlite/mod.ts";
import { registerNoteEntity } from "../../src/domains/note/cache.ts";
import { NoteRepository } from "../../src/repositories/note.repository.ts";

Deno.test("global search tolerates punctuation tokens", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-search-punct-" });
  const repo = new NoteRepository(dir);

  await repo.create({
    title: "API & Webhooks (v2)",
    content: "integration endpoints",
    project: "MD Planner",
  });
  await repo.create({
    title: "Unrelated topic",
    content: "nothing to see",
    project: "MD Planner",
  });

  registerNoteEntity(repo);

  const db = new CacheDatabase(":memory:");
  const sync = new CacheSync(db);
  sync.init();
  await sync.fullSync({ tables: ["notes"] });
  const engine = new SearchEngine(db);

  const find = (q: string) =>
    engine.search(q, { types: ["note"] }).find((r) => r.type === "note");

  try {
    await t.step("verbatim title with ampersand matches", () => {
      const note = find("API & Webhooks");
      assertExists(note);
      assertEquals(note!.title, "API & Webhooks (v2)");
    });

    await t.step("plain keyword matches", () => {
      const note = find("webhooks");
      assertExists(note);
      assertEquals(note!.title, "API & Webhooks (v2)");
    });

    await t.step("parenthesized token matches its inner word", () => {
      const note = find("(v2)");
      assertExists(note);
      assertEquals(note!.title, "API & Webhooks (v2)");
    });

    await t.step("all-punctuation query is safe and empty", () => {
      const results = engine.search("&", { types: ["note"] });
      assertEquals(results.length, 0);
    });
  } finally {
    db.close();
    await Deno.remove(dir, { recursive: true });
  }
});
