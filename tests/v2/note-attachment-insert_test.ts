/**
 * Unit tests for the pure splice behind "insert attachment markdown into the
 * note body at the cursor" (src/static/js/note-attachment-insert.js).
 *
 * The module is a classic browser script that assigns
 * globalThis.NoteAttachmentInsert; importing it for side effects runs the IIFE.
 * Its DOM wiring is guarded by `typeof document`, so importing under Deno only
 * exposes the pure function — exactly what these tests exercise. DOM behavior
 * (focus tracking, button click, input dispatch) is browser-verified.
 */

import { assertEquals } from "@std/assert";
import "../../src/static/js/note-attachment-insert.js";

const { spliceAtCursor } = (globalThis as unknown as {
  NoteAttachmentInsert: {
    spliceAtCursor: (
      value: string,
      start: number,
      end: number,
      text: string,
    ) => { value: string; cursor: number };
  };
}).NoteAttachmentInsert;

const MD = "![pic.png](/notes/n1/upload/pic.png)";

Deno.test("inserts into empty textarea without a leading space", () => {
  const r = spliceAtCursor("", 0, 0, MD);
  assertEquals(r.value, MD);
  assertEquals(r.cursor, MD.length);
});

Deno.test("adds a separating space when the cursor follows a word", () => {
  const r = spliceAtCursor("see this", 8, 8, MD);
  assertEquals(r.value, "see this " + MD);
  assertEquals(r.cursor, ("see this " + MD).length);
});

Deno.test("no extra space when the preceding char is already whitespace", () => {
  const r = spliceAtCursor("see \n", 5, 5, MD);
  assertEquals(r.value, "see \n" + MD);
});

Deno.test("replaces the active selection in place", () => {
  const r = spliceAtCursor("abXYZcd", 2, 5, MD);
  // "ab" precedes (no whitespace) → a space is added before the insert.
  assertEquals(r.value, "ab " + MD + "cd");
  assertEquals(r.cursor, ("ab " + MD).length);
});

Deno.test("inserts mid-text preserving the trailing remainder", () => {
  const r = spliceAtCursor("start  end", 6, 6, MD);
  // char before cursor is a space → no extra separator
  assertEquals(r.value, "start " + MD + " end");
});
