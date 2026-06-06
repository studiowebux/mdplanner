/**
 * Unit tests for src/utils/slug.ts — kebab-case slugification for URL segments.
 */

import { assertEquals } from "@std/assert";
import { toKebab } from "../../src/utils/slug.ts";

Deno.test("toKebab — lowercases and dashes words", () => {
  assertEquals(toKebab("Hello World"), "hello-world");
  assertEquals(toKebab("MD Planner"), "md-planner");
  assertEquals(toKebab("Already-kebab"), "already-kebab");
});

Deno.test("toKebab — collapses runs of non-alphanumerics to a single dash", () => {
  assertEquals(toKebab("a   b"), "a-b");
  assertEquals(toKebab("a___b"), "a-b");
  assertEquals(toKebab("a / b & c"), "a-b-c");
  assertEquals(toKebab("foo.bar.baz"), "foo-bar-baz");
});

Deno.test("toKebab — trims leading and trailing dashes", () => {
  assertEquals(toKebab("  spaced  "), "spaced");
  assertEquals(toKebab("!!!loud!!!"), "loud");
  assertEquals(toKebab("---x---"), "x");
});

Deno.test("toKebab — preserves digits", () => {
  assertEquals(toKebab("Version 2.0.0"), "version-2-0-0");
  assertEquals(toKebab("abc123"), "abc123");
});

Deno.test("toKebab — all-symbol input yields empty string", () => {
  assertEquals(toKebab("!!!"), "");
  assertEquals(toKebab("   "), "");
  assertEquals(toKebab(""), "");
});

Deno.test("toKebab — unicode/non-ascii letters are treated as separators", () => {
  // Only [a-z0-9] survive; accented chars collapse to dashes.
  assertEquals(toKebab("café"), "caf");
  assertEquals(toKebab("naïve approach"), "na-ve-approach");
});
