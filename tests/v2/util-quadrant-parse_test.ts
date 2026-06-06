/**
 * Unit tests for src/utils/quadrant-parse.ts — the shared SWOT/MoSCoW body
 * parser (heading→quadrant bucketing + trailing notes accumulation).
 */

import { assert, assertEquals } from "@std/assert";
import { parseQuadrantMarkdown } from "../../src/utils/quadrant-parse.ts";

const SWOT_MAP: Record<string, string> = {
  strengths: "strengths",
  weaknesses: "weaknesses",
  opportunities: "opportunities",
  threats: "threats",
};

Deno.test("parseQuadrantMarkdown — buckets list items under matched headings", () => {
  const body = [
    "# My SWOT",
    "## Strengths",
    "- Strong team",
    "- Good product",
    "## Weaknesses",
    "- Limited budget",
    "## Opportunities",
    "- New market",
    "## Threats",
    "- Competitor X",
  ].join("\n");

  const r = parseQuadrantMarkdown(body, SWOT_MAP, undefined, undefined);
  assertEquals(r.title, "My SWOT");
  assertEquals(r.quadrants.strengths, ["Strong team", "Good product"]);
  assertEquals(r.quadrants.weaknesses, ["Limited budget"]);
  assertEquals(r.quadrants.opportunities, ["New market"]);
  assertEquals(r.quadrants.threats, ["Competitor X"]);
  assertEquals(r.notes, undefined);
});

Deno.test("parseQuadrantMarkdown — all quadrant keys present even when empty", () => {
  const r = parseQuadrantMarkdown("", SWOT_MAP, undefined, undefined);
  assertEquals(r.quadrants, {
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: [],
  });
  assertEquals(r.title, "");
  assertEquals(r.notes, undefined);
});

Deno.test("parseQuadrantMarkdown — heading prefix match tolerates suffixes", () => {
  const body = [
    "## Strengths (internal)",
    "- A",
    "## Weaknesses — internal",
    "- B",
  ].join("\n");
  const r = parseQuadrantMarkdown(body, SWOT_MAP, undefined, undefined);
  assertEquals(r.quadrants.strengths, ["A"]);
  assertEquals(r.quadrants.weaknesses, ["B"]);
});

Deno.test("parseQuadrantMarkdown — both - and * bullets are collected", () => {
  const body = ["## Strengths", "- dash item", "* star item"].join("\n");
  const r = parseQuadrantMarkdown(body, SWOT_MAP, undefined, undefined);
  assertEquals(r.quadrants.strengths, ["dash item", "star item"]);
});

Deno.test("parseQuadrantMarkdown — unmatched heading starts the notes region", () => {
  const body = [
    "## Strengths",
    "- A",
    "## Notes",
    "Some commentary.",
    "More notes.",
  ].join("\n");
  const r = parseQuadrantMarkdown(body, SWOT_MAP, undefined, undefined);
  assertEquals(r.quadrants.strengths, ["A"]);
  assert(r.notes !== undefined);
  assert(r.notes!.includes("## Notes"));
  assert(r.notes!.includes("Some commentary."));
  assert(r.notes!.includes("More notes."));
});

Deno.test("parseQuadrantMarkdown — fmTitle overrides the body heading", () => {
  const body = "# Body Heading\n## Strengths\n- A";
  const r = parseQuadrantMarkdown(
    body,
    SWOT_MAP,
    "Frontmatter Title",
    undefined,
  );
  assertEquals(r.title, "Frontmatter Title");
});

Deno.test("parseQuadrantMarkdown — fmNotes used when the body has no notes", () => {
  const body = "## Strengths\n- A";
  const r = parseQuadrantMarkdown(body, SWOT_MAP, undefined, "fallback notes");
  assertEquals(r.notes, "fallback notes");
});

Deno.test("parseQuadrantMarkdown — body notes win over fmNotes", () => {
  const body = "## Strengths\n- A\n## Extra\nbody note";
  const r = parseQuadrantMarkdown(body, SWOT_MAP, undefined, "fallback");
  assert(r.notes!.includes("body note"));
  assert(!r.notes!.includes("fallback"));
});
