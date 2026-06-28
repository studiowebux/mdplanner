/**
 * Inline note wiki-links (`[[id|name]]`). Covers the render side
 * (src/views/components/wiki-link-text.tsx) — id→href mapping, tokenization,
 * and the JSX render — plus the client-side token builder
 * (src/static/js/note-wikilink.js) exposed via globalThis. The autocomplete
 * dropdown DOM is browser-verified.
 */

import { assert, assertEquals } from "@std/assert";
import {
  tokenizeWikiLinks,
  wikiLinkHref,
  WikiLinkText,
} from "../../src/views/components/wiki-link-text.tsx";
import "../../src/static/js/note-wikilink.js";

async function render(node: ReturnType<typeof WikiLinkText>): Promise<string> {
  if (node == null) return "";
  return String(await node.toString());
}

Deno.test("wikiLinkHref maps each id prefix to its detail route", () => {
  assertEquals(wikiLinkHref("task_123"), "/tasks/task_123");
  assertEquals(wikiLinkHref("person_9"), "/people/person_9");
  assertEquals(wikiLinkHref("portfolio_x"), "/portfolio/portfolio_x");
  assertEquals(wikiLinkHref("note_abc"), "/notes/note_abc");
});

Deno.test("wikiLinkHref returns null for an unknown or prefix-less id", () => {
  assertEquals(wikiLinkHref("widget_1"), null);
  assertEquals(wikiLinkHref("nounderscore"), null);
});

Deno.test("tokenizeWikiLinks splits prose and link tokens in order", () => {
  const segs = tokenizeWikiLinks(
    "see [[task_1|Build]] then [[note_2|Spec]] end",
  );
  assertEquals(segs.length, 5);
  assertEquals(segs[0], { kind: "text", text: "see " });
  assertEquals(segs[1], { kind: "link", id: "task_1", name: "Build" });
  assertEquals(segs[3], { kind: "link", id: "note_2", name: "Spec" });
  assertEquals(segs[4], { kind: "text", text: " end" });
});

Deno.test("WikiLinkText renders a known token as an anchor to the entity", async () => {
  const html = await render(WikiLinkText({ text: "ref [[task_42|Do it]]" }));
  assert(html.includes('href="/tasks/task_42"'), "links to the task detail");
  assert(html.includes("Do it"), "shows the display name");
  assert(html.includes('class="wiki-link"'));
});

Deno.test("WikiLinkText renders an unknown prefix as plain text, not a broken link", async () => {
  const html = await render(WikiLinkText({ text: "x [[widget_1|Gadget]] y" }));
  assert(html.includes("Gadget"), "keeps the display name");
  assert(!html.includes("href="), "emits no anchor for an unknown prefix");
});

const { buildToken } = (globalThis as unknown as {
  NoteWikilink: { buildToken: (id: string, name: string) => string };
}).NoteWikilink;

Deno.test("buildToken forms a [[id|name]] token and strips ] from the title", () => {
  assertEquals(buildToken("task_1", "Build it"), "[[task_1|Build it]]");
  assertEquals(buildToken("note_2", "a]b"), "[[note_2|ab]]");
});
