/**
 * Unit tests for src/utils/html.ts — escaping, FTS5 snippet handling, and the
 * toHtml render-boundary helper.
 */

import { assert, assertEquals } from "@std/assert";
import {
  escapeHtml,
  escapeSnippetHtml,
  parseSnippet,
  toHtml,
} from "../../src/utils/html.ts";

Deno.test("escapeHtml — escapes &, <, >, and double quotes", () => {
  assertEquals(escapeHtml('<>&"'), "&lt;&gt;&amp;&quot;");
  assertEquals(
    escapeHtml('<a href="x">link</a>'),
    "&lt;a href=&quot;x&quot;&gt;link&lt;/a&gt;",
  );
});

Deno.test("escapeHtml — ampersand is escaped first (no double-escaping)", () => {
  assertEquals(escapeHtml("a & b"), "a &amp; b");
  assertEquals(escapeHtml("&lt;"), "&amp;lt;");
});

Deno.test("escapeHtml — leaves single quotes and plain text alone", () => {
  assertEquals(escapeHtml("it's fine"), "it's fine");
  assertEquals(escapeHtml("plain"), "plain");
});

Deno.test("escapeSnippetHtml — escapes everything except <mark> tags", () => {
  assertEquals(
    escapeSnippetHtml("a <mark>hit</mark> b"),
    "a <mark>hit</mark> b",
  );
  assertEquals(
    escapeSnippetHtml("<b>x</b> <mark>y</mark>"),
    "&lt;b&gt;x&lt;/b&gt; <mark>y</mark>",
  );
});

Deno.test("parseSnippet — splits text and mark segments", () => {
  assertEquals(parseSnippet("a <mark>hit</mark> b"), [
    { text: "a ", mark: false },
    { text: "hit", mark: true },
    { text: " b", mark: false },
  ]);
});

Deno.test("parseSnippet — leading and consecutive marks", () => {
  assertEquals(parseSnippet("<mark>x</mark>y"), [
    { text: "x", mark: true },
    { text: "y", mark: false },
  ]);
  assertEquals(parseSnippet("<mark>a</mark><mark>b</mark>"), [
    { text: "a", mark: true },
    { text: "b", mark: true },
  ]);
});

Deno.test("parseSnippet — no marks yields a single text segment", () => {
  assertEquals(parseSnippet("plain text"), [
    { text: "plain text", mark: false },
  ]);
});

Deno.test("parseSnippet — empty string yields no segments", () => {
  assertEquals(parseSnippet(""), []);
});

Deno.test("toHtml — null/undefined collapse to empty string", () => {
  assertEquals(toHtml(null), "");
  assertEquals(toHtml(undefined), "");
});

Deno.test("toHtml — strings pass through unchanged", () => {
  assertEquals(toHtml("<div>ok</div>"), "<div>ok</div>");
  assertEquals(toHtml(""), "");
});

Deno.test("toHtml — a promise is returned as-is", () => {
  const p = Promise.resolve("later");
  assert(toHtml(p) === p);
});
