/**
 * Unit tests for the pure helpers in src/utils/repo-helpers.ts —
 * buildFrontmatter (entity → frontmatter record) and mergeFields (update merge).
 * The FS helpers (readMarkdownDir/findFileById) are exercised by the repository
 * test suites; these cover the dependency-free logic.
 */

import { assertEquals } from "@std/assert";
import { buildFrontmatter, mergeFields } from "../../src/utils/repo-helpers.ts";

Deno.test("buildFrontmatter — copies all keys except excluded ones", () => {
  const entity = { id: "g1", title: "Goal", body: "long text", status: "open" };
  assertEquals(buildFrontmatter(entity, ["body"]), {
    id: "g1",
    title: "Goal",
    status: "open",
  });
});

Deno.test("buildFrontmatter — empty exclude list keeps everything", () => {
  const entity = { a: 1, b: 2 };
  assertEquals(buildFrontmatter(entity, []), { a: 1, b: 2 });
});

Deno.test("buildFrontmatter — excluding all keys yields empty record", () => {
  const entity = { a: 1, b: 2 };
  assertEquals(buildFrontmatter(entity, ["a", "b"]), {});
});

Deno.test("buildFrontmatter — preserves null/undefined (serializer strips later)", () => {
  const entity = { id: "x", maybe: null, gone: undefined };
  assertEquals(buildFrontmatter(entity, []), {
    id: "x",
    maybe: null,
    gone: undefined,
  });
});

Deno.test("mergeFields — applies defined source fields onto the target", () => {
  const target = { title: "old", status: "open", count: 1 };
  const merged = mergeFields(target, { title: "new", count: 2 });
  assertEquals(merged, { title: "new", status: "open", count: 2 });
});

Deno.test("mergeFields — undefined source keys are skipped (no overwrite)", () => {
  const target = { title: "keep", status: "open" };
  const merged = mergeFields(target, { title: undefined, status: "closed" });
  assertEquals(merged, { title: "keep", status: "closed" });
});

Deno.test("mergeFields — null source clears the field to undefined", () => {
  const target: Record<string, unknown> = { title: "x", note: "present" };
  const merged = mergeFields(target, { note: null });
  assertEquals(merged.note, undefined);
  assertEquals("note" in merged, true); // key remains, value cleared
});

Deno.test("mergeFields — mutates and returns the same target reference", () => {
  const target = { a: 1 };
  const result = mergeFields(target, { a: 2 });
  assertEquals(result === target, true);
  assertEquals(target.a, 2);
});

Deno.test("mergeFields — empty source is a no-op", () => {
  const target = { a: 1, b: 2 };
  assertEquals(mergeFields(target, {}), { a: 1, b: 2 });
});
