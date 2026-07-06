// Round-trip tests for the extracted enhanced note-content transform
// (utils/note-content.ts). Asserts serialize → parse preserves structure:
// paragraph text/code, and tabs / timeline / split-view sections incl. the
// ids round-tripped through HTML comments. Top-level paragraph ids are NOT
// persisted, so we assert on content/type/order, not paragraph id.

import { assertEquals } from "@std/assert";
import {
  parseEnhancedContent,
  serializeEnhancedContent,
} from "../../src/utils/note-content.ts";
import type {
  CustomSection,
  NoteParagraph,
} from "../../src/types/note.types.ts";

Deno.test("note-content — text + code paragraphs round-trip", () => {
  const paragraphs: NoteParagraph[] = [
    {
      id: "p1",
      type: "text",
      content: "Hello world",
      order: 0,
      globalOrder: 0,
    },
    {
      id: "c1",
      type: "code",
      content: 'console.log("hi")',
      language: "ts",
      order: 1,
      globalOrder: 1,
    },
  ];

  const md = serializeEnhancedContent(paragraphs, []);
  const { paragraphs: out, customSections } = parseEnhancedContent(md);

  assertEquals(customSections.length, 0);
  assertEquals(out.length, 2);
  assertEquals(out[0].type, "text");
  assertEquals(out[0].content, "Hello world");
  assertEquals(out[1].type, "code");
  assertEquals(out[1].content, 'console.log("hi")');
  assertEquals(out[1].language, "ts");
});

Deno.test("note-content — tabs section round-trips ids + content", () => {
  const sections: CustomSection[] = [{
    id: "section_abc",
    type: "tabs",
    title: "My Tabs",
    order: 0,
    globalOrder: 0,
    config: {
      tabs: [
        {
          id: "tab_1",
          title: "First",
          content: [
            { id: "b1", type: "text", content: "tab one body", order: 0 },
          ],
        },
        {
          id: "tab_2",
          title: "Second",
          content: [
            { id: "b2", type: "text", content: "tab two body", order: 0 },
          ],
        },
      ],
    },
  }];

  const md = serializeEnhancedContent([], sections);
  const { customSections: out } = parseEnhancedContent(md);

  assertEquals(out.length, 1);
  assertEquals(out[0].id, "section_abc");
  assertEquals(out[0].type, "tabs");
  assertEquals(out[0].title, "My Tabs");
  const tabs = out[0].config.tabs ?? [];
  assertEquals(tabs.length, 2);
  assertEquals(tabs[0].id, "tab_1");
  assertEquals(tabs[0].title, "First");
  assertEquals(tabs[0].content[0].content, "tab one body");
  assertEquals(tabs[1].id, "tab_2");
  assertEquals(tabs[1].content[0].content, "tab two body");
});

Deno.test("note-content — timeline section round-trips status + date", () => {
  const sections: CustomSection[] = [{
    id: "section_t",
    type: "timeline",
    title: "Releases",
    order: 0,
    globalOrder: 0,
    config: {
      timeline: [
        {
          id: "tl_1",
          title: "v1 shipped",
          status: "success",
          date: "2026-01-01",
          content: [
            { id: "b1", type: "text", content: "all good", order: 0 },
          ],
        },
        { id: "tl_2", title: "v2 attempt", status: "failed", content: [] },
      ],
    },
  }];

  const md = serializeEnhancedContent([], sections);
  const { customSections: out } = parseEnhancedContent(md);

  const tl = out[0].config.timeline ?? [];
  assertEquals(tl.length, 2);
  assertEquals(tl[0].id, "tl_1");
  assertEquals(tl[0].status, "success");
  assertEquals(tl[0].date, "2026-01-01");
  assertEquals(tl[0].content[0].content, "all good");
  assertEquals(tl[1].status, "failed");
  assertEquals(tl[1].date, undefined);
});

Deno.test("note-content — split-view section round-trips columns", () => {
  const sections: CustomSection[] = [{
    id: "section_s",
    type: "split-view",
    title: "Compare",
    order: 0,
    globalOrder: 0,
    config: {
      splitView: {
        columns: [
          [{ id: "l", type: "text", content: "left side", order: 0 }],
          [{ id: "r", type: "text", content: "right side", order: 0 }],
        ],
      },
    },
  }];

  const md = serializeEnhancedContent([], sections);
  const { customSections: out } = parseEnhancedContent(md);

  const cols = out[0].config.splitView?.columns ?? [];
  assertEquals(cols.length, 2);
  assertEquals(cols[0][0].content, "left side");
  assertEquals(cols[1][0].content, "right side");
});

Deno.test("note-content — paragraphs + section interleave by globalOrder", () => {
  const paragraphs: NoteParagraph[] = [
    { id: "p1", type: "text", content: "before", order: 0, globalOrder: 0 },
    { id: "p2", type: "text", content: "after", order: 1, globalOrder: 2 },
  ];
  const sections: CustomSection[] = [{
    id: "s1",
    type: "tabs",
    title: "Mid",
    order: 0,
    globalOrder: 1,
    config: { tabs: [{ id: "t", title: "T", content: [] }] },
  }];

  const md = serializeEnhancedContent(paragraphs, sections);
  const { paragraphs: outP, customSections: outS } = parseEnhancedContent(md);

  assertEquals(outP.map((p) => p.content), ["before", "after"]);
  assertEquals(outS.length, 1);
  // "before" (globalOrder 0) precedes the section (1) precedes "after" (2).
  assertEquals((outP[0].globalOrder ?? 0) < (outS[0].globalOrder ?? 0), true);
  assertEquals((outS[0].globalOrder ?? 0) < (outP[1].globalOrder ?? 0), true);
});
