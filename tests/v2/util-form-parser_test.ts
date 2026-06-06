/**
 * Unit tests for src/utils/form-parser.ts — FieldDef-driven form body parsing,
 * including indexed array-table sections.
 */

import { assertEquals } from "@std/assert";
import { parseFormBody } from "../../src/utils/form-parser.ts";
import type { FieldDef } from "../../src/components/ui/form-builder.tsx";

Deno.test("parseFormBody — scalar field types coerce by type", () => {
  const fields: FieldDef[] = [
    { type: "text", name: "title", label: "Title" },
    { type: "number", name: "amount", label: "Amount" },
    { type: "boolean", name: "active", label: "Active" },
    { type: "date", name: "due", label: "Due" },
    { type: "hidden", name: "id" },
  ];
  const out = parseFormBody(fields, {
    title: "  Hello  ",
    amount: "42",
    active: "true",
    due: "2026-06-01",
    id: "x_1",
  });
  assertEquals(out, {
    title: "Hello", // trimmed
    amount: 42, // Number
    active: true, // === "true"
    due: "2026-06-01",
    id: "x_1",
  });
});

Deno.test("parseFormBody — boolean is true only for the literal 'true'", () => {
  const fields: FieldDef[] = [{ type: "boolean", name: "b", label: "B" }];
  assertEquals(parseFormBody(fields, { b: "true" }), { b: true });
  assertEquals(parseFormBody(fields, { b: "false" }), { b: false });
  assertEquals(parseFormBody(fields, { b: "on" }), { b: false });
});

Deno.test("parseFormBody — tags split, trim, and drop empties", () => {
  const fields: FieldDef[] = [{ type: "tags", name: "tags", label: "Tags" }];
  assertEquals(parseFormBody(fields, { tags: "a, b ,, c " }), {
    tags: ["a", "b", "c"],
  });
});

Deno.test("parseFormBody — textarea is a string, or split lines when requested", () => {
  const fields: FieldDef[] = [
    { type: "textarea", name: "body", label: "Body" },
  ];
  assertEquals(parseFormBody(fields, { body: "line1\nline2" }), {
    body: "line1\nline2",
  });
  assertEquals(
    parseFormBody(fields, { body: "line1\nline2" }, { splitTextarea: true }),
    { body: ["line1", "line2"] },
  );
});

Deno.test("parseFormBody — empty values are omitted by default", () => {
  const fields: FieldDef[] = [
    { type: "text", name: "title", label: "Title" },
    { type: "text", name: "note", label: "Note" },
  ];
  assertEquals(parseFormBody(fields, { title: "x", note: "" }), { title: "x" });
  // whitespace-only counts as empty
  assertEquals(parseFormBody(fields, { title: "x", note: "   " }), {
    title: "x",
  });
});

Deno.test("parseFormBody — clearEmpty sets empty values to null (for updates)", () => {
  const fields: FieldDef[] = [
    { type: "text", name: "title", label: "Title" },
    { type: "text", name: "note", label: "Note" },
  ];
  assertEquals(
    parseFormBody(fields, { title: "x", note: "" }, { clearEmpty: true }),
    { title: "x", note: null },
  );
});

Deno.test("parseFormBody — File values are ignored", () => {
  const fields: FieldDef[] = [{ type: "text", name: "title", label: "Title" }];
  const out = parseFormBody(fields, { title: new File([], "a.png") });
  assertEquals(out, {});
});

Deno.test("parseFormBody — array-table builds structured object arrays", () => {
  const fields: FieldDef[] = [
    {
      type: "array-table",
      name: "channels",
      label: "Channels",
      section: "channels",
      itemFields: [
        { type: "text", name: "name", label: "Name" },
        { type: "number", name: "budget", label: "Budget" },
      ],
    },
  ];
  const out = parseFormBody(fields, {
    "channels[0].name": "TV",
    "channels[0].budget": "1000",
    "channels[1].name": "Radio",
    "channels[1].budget": "500",
  });
  assertEquals(out, {
    channels: [
      { name: "TV", budget: 1000 },
      { name: "Radio", budget: 500 },
    ],
  });
});

Deno.test("parseFormBody — array-table sorts rows by index and skips empty rows", () => {
  const fields: FieldDef[] = [
    {
      type: "array-table",
      name: "items",
      label: "Items",
      section: "items",
      itemFields: [{ type: "text", name: "name", label: "Name" }],
    },
  ];
  const out = parseFormBody(fields, {
    "items[2].name": "third",
    "items[0].name": "first",
    "items[1].name": "", // empty row → skipped
  });
  assertEquals(out, { items: [{ name: "first" }, { name: "third" }] });
});

Deno.test("parseFormBody — array-table with no rows yields an empty array", () => {
  const fields: FieldDef[] = [
    {
      type: "array-table",
      name: "items",
      label: "Items",
      section: "items",
      itemFields: [{ type: "text", name: "name", label: "Name" }],
    },
  ];
  assertEquals(parseFormBody(fields, { title: "ignored" }), { items: [] });
});

Deno.test("parseFormBody — indexed keys for unknown sections are ignored", () => {
  const fields: FieldDef[] = [
    {
      type: "array-table",
      name: "items",
      label: "Items",
      section: "items",
      itemFields: [{ type: "text", name: "name", label: "Name" }],
    },
  ];
  const out = parseFormBody(fields, {
    "items[0].name": "kept",
    "other[0].name": "dropped",
  });
  assertEquals(out, { items: [{ name: "kept" }] });
});
