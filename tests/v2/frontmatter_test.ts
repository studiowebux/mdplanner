/**
 * Unit tests for v2/utils/frontmatter.ts — parseFrontmatter/serializeFrontmatter
 * round-trip coverage. Originally added with the recursive-nesting fix for
 * `serializeFrontmatter` (depth-2+ objects previously serialized as the
 * literal `[object Object]`).
 */

import { assertEquals } from "@std/assert";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../../src/utils/frontmatter.ts";

function roundTrip(
  fm: Record<string, unknown>,
  body = "",
): Record<string, unknown> {
  const serialized = serializeFrontmatter(fm, body);
  const parsed = parseFrontmatter(serialized);
  assertEquals(parsed.body, body);
  return parsed.frontmatter;
}

Deno.test("frontmatter - round-trips flat scalars", () => {
  const fm = {
    title: "Hello",
    count: 42,
    enabled: true,
    disabled: false,
  };
  assertEquals(roundTrip(fm), fm);
});

Deno.test("frontmatter - round-trips arrays of scalars", () => {
  const fm = {
    tags: ["a", "b", "c"],
    ids: [1, 2, 3],
    empty: [] as string[],
  };
  assertEquals(roundTrip(fm), fm);
});

Deno.test("frontmatter - round-trips arrays of objects", () => {
  const fm = {
    models: [
      { name: "claude-sonnet-4-5", provider: "anthropic" },
      { name: "gpt-4", provider: "openai" },
    ],
  };
  assertEquals(roundTrip(fm), fm);
});

Deno.test("frontmatter - round-trips depth-1 object (flat Record)", () => {
  const fm = {
    accounts: { github: "octocat", asana: "rt" },
  };
  assertEquals(roundTrip(fm), fm);
});

Deno.test("frontmatter - round-trips depth-2 nested object", () => {
  // Regression: previously serialized as `[object Object]` and dropped on parse.
  const fm = {
    preferences: {
      viewPrefs: { tasks: "board", goals: "grid" },
      pinnedNav: ["/tasks", "/goals"],
    },
  };
  assertEquals(roundTrip(fm), fm);
});

Deno.test("frontmatter - round-trips depth-3 nested object", () => {
  const fm = {
    preferences: {
      filterDefaults: {
        tasks: { section: "In Progress", priority: "high" },
        goals: { status: "active" },
      },
    },
  };
  assertEquals(roundTrip(fm), fm);
});

Deno.test("frontmatter - round-trips mixed depth-1 and depth-2 siblings", () => {
  const fm = {
    name: "Mixed",
    accounts: { github: "octocat" },
    preferences: {
      viewPrefs: { tasks: "board" },
    },
    skills: ["typescript", "go"],
  };
  assertEquals(roundTrip(fm), fm);
});

Deno.test("frontmatter - round-trips empty nested object", () => {
  const fm = {
    preferences: {},
  };
  assertEquals(roundTrip(fm), fm);
});

Deno.test("frontmatter - drops undefined and null at top level", () => {
  const fm = {
    title: "Kept",
    skipped: undefined,
    nulled: null,
  };
  const result = roundTrip(fm);
  assertEquals(result, { title: "Kept" });
});

Deno.test("frontmatter - quotes strings containing colon/hash/quote", () => {
  const fm = {
    note: "Contains: a colon",
    tag: "with#hash",
  };
  assertEquals(roundTrip(fm), fm);
});

Deno.test("frontmatter - preserves array inside nested object", () => {
  const fm = {
    config: {
      hosts: ["a", "b"],
      env: { NODE_ENV: "production" },
    },
  };
  assertEquals(roundTrip(fm), fm);
});

Deno.test("frontmatter - parses body after frontmatter", () => {
  const fm = { title: "Doc" };
  const body = "# Heading\n\nParagraph here.";
  const serialized = serializeFrontmatter(fm, body);
  const parsed = parseFrontmatter(serialized);
  assertEquals(parsed.frontmatter, fm);
  assertEquals(parsed.body, body);
});
