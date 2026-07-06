/**
 * Unit tests for src/utils/string.ts — case-insensitive comparison helpers and
 * the search-predicate factory used across services, repositories, and factories.
 */

import { assert, assertEquals } from "@std/assert";
import {
  ciEquals,
  ciIncludes,
  createSearchPredicate,
  uniqueValues,
} from "../../src/utils/string.ts";

Deno.test("ciEquals — case-insensitive equality", () => {
  assert(ciEquals("Alice", "alice"));
  assert(ciEquals("ALICE", "alice"));
  assert(ciEquals("MixedCase", "mIxEdCaSe"));
  assert(!ciEquals("Alice", "Bob"));
  assert(!ciEquals("alice ", "alice")); // whitespace is significant
});

Deno.test("ciEquals — nullish handling", () => {
  assert(ciEquals(null, null));
  assert(ciEquals(undefined, undefined));
  // null and undefined are not === to each other
  assert(!ciEquals(null, undefined));
  assert(!ciEquals("x", null));
  assert(!ciEquals(null, "x"));
  assert(!ciEquals("x", undefined));
});

Deno.test("ciIncludes — case-insensitive substring", () => {
  assert(ciIncludes("Hello World", "world"));
  assert(ciIncludes("Hello World", "HELLO"));
  assert(ciIncludes("Hello World", "o W"));
  assert(ciIncludes("Hello", ""));
  assert(!ciIncludes("Hello", "xyz"));
});

Deno.test("ciIncludes — nullish haystack returns false", () => {
  assert(!ciIncludes(null, "x"));
  assert(!ciIncludes(undefined, "x"));
  assert(!ciIncludes("", "x"));
});

Deno.test("uniqueValues — sorted, de-duplicated, non-empty", () => {
  const items = [
    { tag: "beta" },
    { tag: "alpha" },
    { tag: "beta" },
    { tag: "" },
    { tag: "gamma" },
  ];
  assertEquals(uniqueValues(items, (i) => i.tag), ["alpha", "beta", "gamma"]);
});

Deno.test("uniqueValues — nullish getter results dropped", () => {
  const items = [
    { v: "x" },
    { v: null },
    { v: undefined },
    { v: "y" },
  ];
  assertEquals(uniqueValues(items, (i) => i.v), ["x", "y"]);
});

Deno.test("uniqueValues — empty input yields empty array", () => {
  assertEquals(uniqueValues([], () => "x"), []);
});

Deno.test("createSearchPredicate — string field match", () => {
  type Goal = { title: string; tags: string[] };
  const pred = createSearchPredicate<Goal>([
    { type: "string", get: (g) => g.title },
  ]);
  const goal: Goal = { title: "Ship the release", tags: [] };
  assert(pred(goal, "ship"));
  assert(pred(goal, "RELEASE"));
  assert(!pred(goal, "cancel"));
});

Deno.test("createSearchPredicate — array field match", () => {
  type Goal = { title: string; tags: string[] };
  const pred = createSearchPredicate<Goal>([
    { type: "array", get: (g) => g.tags },
  ]);
  const goal: Goal = { title: "x", tags: ["Backend", "Urgent"] };
  assert(pred(goal, "urgent"));
  assert(pred(goal, "BACK"));
  assert(!pred(goal, "frontend"));
});

Deno.test("createSearchPredicate — matches across multiple fields", () => {
  type Goal = { title: string; tags: string[] | null };
  const pred = createSearchPredicate<Goal>([
    { type: "string", get: (g) => g.title },
    { type: "array", get: (g) => g.tags },
  ]);
  assert(pred({ title: "Alpha", tags: ["x"] }, "alpha"));
  assert(pred({ title: "Alpha", tags: ["beta"] }, "beta"));
  assert(!pred({ title: "Alpha", tags: ["beta"] }, "gamma"));
});

Deno.test("createSearchPredicate — nullish field getters are safe", () => {
  type Row = { name: string | null; tags: string[] | null };
  const pred = createSearchPredicate<Row>([
    { type: "string", get: (r) => r.name },
    { type: "array", get: (r) => r.tags },
  ]);
  assert(!pred({ name: null, tags: null }, "x"));
  assert(pred({ name: null, tags: ["hit"] }, "hit"));
});
