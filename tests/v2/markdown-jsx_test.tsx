// Render tests for MarkdownJsx (src/utils/markdown-jsx.tsx). Covers the
// markdown→HTML rendering used by the task-detail description and the
// renderText hook that linkifies prose leaves (e.g. @mentions) without
// touching code spans/blocks.

import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { MarkdownJsx } from "../../src/utils/markdown-jsx.tsx";

function render(node: ReturnType<typeof MarkdownJsx>): string {
  // deno-lint-ignore no-explicit-any
  return renderToString(node as any);
}

Deno.test("MarkdownJsx — bold renders to <strong>", () => {
  const html = render(MarkdownJsx({ markdown: "a **bold** word", bare: true }));
  assertStringIncludes(html, "<strong>bold</strong>");
});

Deno.test("MarkdownJsx — unordered list renders to <ul><li>", () => {
  const html = render(MarkdownJsx({ markdown: "- one\n- two", bare: true }));
  assertStringIncludes(html, "<ul>");
  assertStringIncludes(html, ">one</li>");
  assertStringIncludes(html, ">two</li>");
});

Deno.test("MarkdownJsx — link renders to <a href> with safe rel", () => {
  const html = render(
    MarkdownJsx({ markdown: "[site](https://example.com)", bare: true }),
  );
  assertStringIncludes(html, 'href="https://example.com"');
  assertStringIncludes(html, 'rel="noopener noreferrer"');
});

Deno.test("MarkdownJsx — raw HTML token is dropped (XSS guard)", () => {
  const html = render(
    MarkdownJsx({ markdown: "<script>alert(1)</script>", bare: true }),
  );
  assertEquals(html.includes("<script>"), false);
});

Deno.test("MarkdownJsx — renderText hook wraps prose leaves but not code spans", () => {
  const html = render(
    MarkdownJsx({
      markdown: "see abc1234 and `def5678`",
      bare: true,
      renderText: (t) => <mark>{t}</mark>,
    }),
  );
  // prose text is passed through the hook
  assertStringIncludes(html, "<mark>see abc1234 and </mark>");
  // code span content stays literal inside <code>, never marked
  assertStringIncludes(html, "<code>def5678</code>");
  assertEquals(html.includes("<mark>def5678"), false);
});

Deno.test("MarkdownJsx — renderText also applies inside formatting", () => {
  const html = render(
    MarkdownJsx({
      markdown: "**task_42**",
      bare: true,
      renderText: (t) => <mark>{t}</mark>,
    }),
  );
  assertStringIncludes(html, "<strong><mark>task_42</mark></strong>");
});

Deno.test("MarkdownJsx — no markdown yields null (empty render)", () => {
  assertEquals(render(MarkdownJsx({ markdown: "", bare: true })), "");
  assertEquals(render(MarkdownJsx({ markdown: null, bare: true })), "");
});
