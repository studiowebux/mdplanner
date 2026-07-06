/**
 * Guards the analytics category-tab grouping (88hv). Every section in
 * ALL_SECTIONS must belong to exactly one CATEGORY_DEFS tab — otherwise a
 * section would be permanently hidden (no tab reveals it) or appear twice.
 * This is the regression guard for "added a section but forgot to categorize
 * it".
 */

import { assert, assertEquals } from "@std/assert";
import { ALL_SECTIONS, CATEGORY_DEFS } from "../../src/views/analytics.tsx";

Deno.test("every analytics section belongs to exactly one category", () => {
  const sectionKeys = ALL_SECTIONS.map((s) => s.key);

  for (const key of sectionKeys) {
    const owning = CATEGORY_DEFS.filter((c) => c.sections.includes(key));
    assertEquals(
      owning.length,
      1,
      `section "${key}" must be in exactly one category, found ${owning.length}`,
    );
  }
});

Deno.test("categories reference only known sections", () => {
  const known = new Set(ALL_SECTIONS.map((s) => s.key));
  for (const cat of CATEGORY_DEFS) {
    for (const s of cat.sections) {
      assert(
        known.has(s),
        `category "${cat.key}" references unknown section "${s}"`,
      );
    }
  }
});

Deno.test("category set fully partitions the sections", () => {
  const grouped = CATEGORY_DEFS.flatMap((c) => c.sections).sort();
  const all = ALL_SECTIONS.map((s) => s.key).sort();
  assertEquals(grouped, all, "categories must cover all sections, no extras");
});
