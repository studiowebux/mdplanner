/**
 * Unit tests for src/utils/markdown.ts — markdownToHtml with the custom marked
 * renderer (external links open in a new tab, images get a class, fenced code
 * gets the copy-block wrapper). Assertions use substring checks to stay robust
 * against marked's incidental whitespace/newlines.
 */

import { assert, assertEquals } from "@std/assert";
import { markdownToHtml } from "../../src/utils/markdown.ts";

Deno.test("markdownToHtml — empty/nullish input yields empty string", () => {
  assertEquals(markdownToHtml(""), "");
  assertEquals(markdownToHtml(null), "");
  assertEquals(markdownToHtml(undefined), "");
});

Deno.test("markdownToHtml — headings and emphasis", () => {
  assert(markdownToHtml("# Title").includes("<h1>Title</h1>"));
  assert(markdownToHtml("## Sub").includes("<h2>Sub</h2>"));
  assert(markdownToHtml("**bold**").includes("<strong>bold</strong>"));
  assert(markdownToHtml("*italic*").includes("<em>italic</em>"));
});

Deno.test("markdownToHtml — links open in a new tab with noopener", () => {
  const html = markdownToHtml("[site](https://example.com)");
  assert(html.includes('href="https://example.com"'));
  assert(html.includes('target="_blank"'));
  assert(html.includes('rel="noopener noreferrer"'));
  assert(html.includes(">site</a>"));
});

Deno.test("markdownToHtml — images carry the markdown-image class", () => {
  const html = markdownToHtml("![alt text](pic.png)");
  assert(html.includes('src="pic.png"'));
  assert(html.includes('alt="alt text"'));
  assert(html.includes('class="markdown-image"'));
});

Deno.test("markdownToHtml — fenced code uses the copy-block wrapper", () => {
  const html = markdownToHtml("```js\nconst x = 1;\n```");
  assert(html.includes('class="code-block"'));
  assert(html.includes('class="language-js"'));
  assert(html.includes("const x = 1;"));
  assert(html.includes("Copy"));
});

Deno.test("markdownToHtml — code block escapes HTML special chars", () => {
  const html = markdownToHtml("```\n<script>&\n```");
  assert(html.includes("&lt;script&gt;&amp;"));
  assert(!html.includes("<script>"));
});

Deno.test("markdownToHtml — soft line breaks become <br> (breaks: true)", () => {
  const html = markdownToHtml("line one\nline two");
  assert(html.includes("<br>"));
});

Deno.test("markdownToHtml — unordered lists", () => {
  const html = markdownToHtml("- a\n- b");
  assert(html.includes("<ul>"));
  assert(html.includes("<li>a</li>"));
  assert(html.includes("<li>b</li>"));
});
