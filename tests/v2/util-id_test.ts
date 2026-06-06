/**
 * Unit tests for src/utils/id.ts — canonical entity id generation.
 *
 * The random suffix is `Math.random().toString(36).slice(2, 8)`, which yields
 * up to 6 base36 chars (trailing-zero trimming can make it shorter), so the
 * length assertions allow 1..6. Uniqueness is probabilistic over a ~2.2e9 space;
 * 100 draws keep the collision chance negligible (~2e-6).
 */

import { assert, assertEquals, assertMatch } from "@std/assert";
import { generateId } from "../../src/utils/id.ts";

Deno.test("generateId — matches the <prefix>_<epochMs>_<base36> shape", () => {
  assertMatch(generateId("task"), /^task_\d+_[a-z0-9]{1,6}$/);
});

Deno.test("generateId — preserves the given prefix", () => {
  assert(generateId("person").startsWith("person_"));
  assert(generateId("note").startsWith("note_"));
  assert(generateId("milestone_x").startsWith("milestone_x_"));
});

Deno.test("generateId — timestamp segment is the current epoch ms", () => {
  const before = Date.now();
  const id = generateId("x");
  const after = Date.now();
  // prefix has no underscore here, so segment [1] is the timestamp.
  const ts = Number(id.split("_")[1]);
  assert(
    ts >= before && ts <= after,
    `ts ${ts} not within [${before}, ${after}]`,
  );
});

Deno.test("generateId — random suffix is 1..6 base36 chars", () => {
  for (let i = 0; i < 50; i++) {
    const suffix = generateId("e").split("_")[2];
    assert(suffix.length >= 1 && suffix.length <= 6, `bad length: "${suffix}"`);
    assertMatch(suffix, /^[a-z0-9]+$/);
  }
});

Deno.test("generateId — draws are effectively unique", () => {
  const ids = new Set<string>();
  for (let i = 0; i < 100; i++) ids.add(generateId("e"));
  assertEquals(ids.size, 100);
});
