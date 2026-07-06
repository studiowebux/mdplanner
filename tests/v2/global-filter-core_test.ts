/**
 * Unit tests for the pure global-filter logic (src/static/js/global-filter-core.js).
 *
 * Covers the search-match + visible-values helpers that drive the topbar
 * dropdown's search box and All/None buttons. The module is a classic browser
 * script that assigns globalThis.GlobalFilterCore; importing it for side effects
 * runs the IIFE so the test can read it (mirrors mindmap-layout_test.ts).
 */

import { assert, assertEquals } from "@std/assert";
import "../../src/static/js/global-filter-core.js";

type Core = {
  matchesQuery: (label: unknown, query: unknown) => boolean;
  visibleValues: (
    options: { value: string; label: string }[],
    query: unknown,
  ) => string[];
};

const Core = (globalThis as unknown as { GlobalFilterCore: Core })
  .GlobalFilterCore;

const OPTIONS = [
  { value: "Alice", label: "Alice" },
  { value: "Bob", label: "Bob" },
  { value: "Charlie", label: "Charlie" },
];

Deno.test("matchesQuery — empty/whitespace query matches all", () => {
  assert(Core.matchesQuery("Alice", ""));
  assert(Core.matchesQuery("Alice", "   "));
  assert(Core.matchesQuery("Alice", null));
  assert(Core.matchesQuery("Alice", undefined));
});

Deno.test("matchesQuery — case-insensitive substring", () => {
  assert(Core.matchesQuery("Charlie", "har"));
  assert(Core.matchesQuery("Charlie", "CHARLIE"));
  assert(Core.matchesQuery("Charlie", "  lie "));
  assert(!Core.matchesQuery("Charlie", "xyz"));
});

Deno.test("matchesQuery — null/undefined label never throws, never matches non-empty query", () => {
  assert(!Core.matchesQuery(null, "a"));
  assert(!Core.matchesQuery(undefined, "a"));
  assert(Core.matchesQuery(null, ""));
});

Deno.test("visibleValues — returns all values for empty query", () => {
  assertEquals(Core.visibleValues(OPTIONS, ""), ["Alice", "Bob", "Charlie"]);
});

Deno.test("visibleValues — filters to matching labels only", () => {
  assertEquals(Core.visibleValues(OPTIONS, "li"), ["Alice", "Charlie"]);
  assertEquals(Core.visibleValues(OPTIONS, "bob"), ["Bob"]);
  assertEquals(Core.visibleValues(OPTIONS, "zzz"), []);
});
