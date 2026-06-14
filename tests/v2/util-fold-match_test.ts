/**
 * Autocomplete matching must be accent-, space-, and punctuation-insensitive.
 * foldText/foldIncludes (utils/string.ts) back every autocomplete source's
 * search filter (views/mod.tsx), so "genie" matches "Génie" and "mdplanner"
 * matches "MD Planner".
 */

import { assert, assertEquals } from "@std/assert";
import { foldIncludes, foldText } from "../../src/utils/string.ts";

Deno.test("foldText strips diacritics, case, spaces, and punctuation", () => {
  assertEquals(foldText("Génie"), "genie");
  assertEquals(foldText("MD Planner"), "mdplanner");
  assertEquals(foldText("md-planner"), "mdplanner");
  assertEquals(foldText("Crème Brûlée!"), "cremebrulee");
  assertEquals(foldText("INV-2026-001"), "inv2026001");
  assertEquals(foldText(""), "");
});

Deno.test("foldIncludes — accent-insensitive", () => {
  assert(foldIncludes("Génie Logiciel", "genie"));
  assert(foldIncludes("Crème", "creme"));
  assert(foldIncludes("genie", "Géni"));
});

Deno.test("foldIncludes — space/punctuation-insensitive", () => {
  assert(foldIncludes("MD Planner", "mdplanner"));
  assert(foldIncludes("MD Planner", "md planner"));
  assert(foldIncludes("MD-Planner", "mdplanner"));
  assert(foldIncludes("md.planner", "mdplanner"));
});

Deno.test("foldIncludes — substring + empty + nullish", () => {
  assert(foldIncludes("Acme Corporation", "corp"));
  assert(foldIncludes("anything", ""), "empty needle matches (shows all)");
  assert(!foldIncludes(null, "x"));
  assert(!foldIncludes(undefined, "x"));
  assert(!foldIncludes("Acme", "zzz"));
});
