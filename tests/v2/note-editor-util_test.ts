/**
 * Unit tests for the DOM-free helpers in src/static/js/note-editor-util.js,
 * extracted during the note-editor god-file split. The module is a classic
 * browser script that assigns globalThis.NoteEditorUtil; importing it for side
 * effects runs the IIFE (no DOM touched at load) so the test can read it.
 *
 * Guards `subBlocksToMarkdown` — the fenced-code restoration that round-trips
 * sub-blocks → raw markdown → (note-markdown parser) → typed blocks on save.
 * A regression here silently corrupts tab/timeline/column content on edit.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import "../../src/static/js/note-editor-util.js";

interface UtilApi {
  genId: (prefix: string) => string;
  subBlocksToMarkdown: (
    blocks: Array<{ type?: string; content?: string; lang?: string }>,
  ) => string;
}

const U = (globalThis as unknown as { NoteEditorUtil: UtilApi }).NoteEditorUtil;

Deno.test("genId — prefixed, unique-ish, no whitespace", () => {
  const a = U.genId("para");
  assert(a.startsWith("para_"), "should keep the prefix");
  assertEquals(/\s/.test(a), false, "no whitespace in id");
  assert(U.genId("x") !== U.genId("x"), "two ids differ");
});

Deno.test("subBlocksToMarkdown — text blocks pass through, blank-line separated", () => {
  const md = U.subBlocksToMarkdown([
    { type: "text", content: "first" },
    { type: "text", content: "second" },
  ]);
  assertEquals(md, "first\n\nsecond");
});

Deno.test("subBlocksToMarkdown — code blocks restore ``` fences with language", () => {
  const md = U.subBlocksToMarkdown([
    { type: "code", content: "const x = 1;", lang: "ts" },
  ]);
  assertStringIncludes(md, "```ts\nconst x = 1;\n```");
});

Deno.test("subBlocksToMarkdown — mixed text + code in order", () => {
  const md = U.subBlocksToMarkdown([
    { type: "text", content: "intro" },
    { type: "code", content: "echo hi", lang: "bash" },
  ]);
  assertEquals(md, "intro\n\n```bash\necho hi\n```");
});

Deno.test("subBlocksToMarkdown — empty list is empty string; defaults to text", () => {
  assertEquals(U.subBlocksToMarkdown([]), "");
  // Missing type defaults to text; missing content tolerated.
  assertEquals(U.subBlocksToMarkdown([{ content: "lone" }]), "lone");
});
