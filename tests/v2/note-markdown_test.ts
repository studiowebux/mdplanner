// Unit tests for the pure client-side markdown→blocks parser
// (src/static/js/note-markdown.js). Importing the classic-script file runs its
// IIFE and populates globalThis.NoteMarkdown. A deterministic genId is injected
// so block ids are stable to assert on.

import { assertEquals } from "@std/assert";
import "../../src/static/js/note-markdown.js";

interface Block {
  id: string;
  type: "text" | "code";
  content: string;
  language?: string;
  order: number;
}
interface NoteMarkdownApi {
  parseMarkdownToBlocks: (
    md: string,
    genId?: (prefix: string) => string,
  ) => Block[];
}

const NoteMarkdown =
  (globalThis as unknown as { NoteMarkdown: NoteMarkdownApi }).NoteMarkdown;

// Deterministic id generator: prefix + incrementing counter.
function counterGenId() {
  let n = 0;
  return (prefix: string) => `${prefix}_${n++}`;
}

Deno.test("note-markdown — single text paragraph", () => {
  const blocks = NoteMarkdown.parseMarkdownToBlocks(
    "Hello world",
    counterGenId(),
  );
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].type, "text");
  assertEquals(blocks[0].content, "Hello world");
  assertEquals(blocks[0].order, 0);
});

Deno.test("note-markdown — fenced code block keeps language", () => {
  const md = '```ts\nconsole.log("hi")\n```';
  const blocks = NoteMarkdown.parseMarkdownToBlocks(md, counterGenId());
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].type, "code");
  assertEquals(blocks[0].language, "ts");
  assertEquals(blocks[0].content, 'console.log("hi")');
});

Deno.test("note-markdown — mixed text + code sequence preserves order", () => {
  const md = "intro text\n```\nplain code\n```\noutro text";
  const blocks = NoteMarkdown.parseMarkdownToBlocks(md, counterGenId());
  assertEquals(blocks.map((b) => b.type), ["text", "code", "text"]);
  assertEquals(blocks.map((b) => b.order), [0, 1, 2]);
  assertEquals(blocks[0].content, "intro text");
  assertEquals(blocks[1].content, "plain code");
  assertEquals(blocks[1].language, undefined);
  assertEquals(blocks[2].content, "outro text");
});

Deno.test("note-markdown — empty input yields no blocks", () => {
  assertEquals(
    NoteMarkdown.parseMarkdownToBlocks("", counterGenId()).length,
    0,
  );
  assertEquals(
    NoteMarkdown.parseMarkdownToBlocks("   \n\n  ", counterGenId()).length,
    0,
  );
});

Deno.test("note-markdown — works without an injected genId (default ids)", () => {
  const blocks = NoteMarkdown.parseMarkdownToBlocks("body");
  assertEquals(blocks.length, 1);
  assertEquals(blocks[0].id.startsWith("block_"), true);
});
