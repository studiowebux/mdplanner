/**
 * Unit tests for src/utils/person-name-match.ts — tolerant free-text name to
 * Person resolution and the name→id map builder.
 *
 * The resolver only touches `.id` and `.name`, so tests use minimal Person-like
 * objects cast through `unknown` (the full Zod-inferred Person has many other
 * required fields irrelevant here).
 */

import { assert, assertEquals } from "@std/assert";
import {
  buildPersonByNameMap,
  resolvePersonByName,
} from "../../src/utils/person-name-match.ts";
import type { Person } from "../../src/types/person.types.ts";

function person(id: string, name: string): Person {
  return { id, name } as unknown as Person;
}

const people = [
  person("person_1", "Alice Martin"),
  person("person_2", "Bob Smith"),
  person("person_3", "Carol Danvers"),
];

Deno.test("resolvePersonByName — exact name match", () => {
  assertEquals(resolvePersonByName("Alice Martin", people)?.id, "person_1");
});

Deno.test("resolvePersonByName — case-insensitive full match", () => {
  assertEquals(resolvePersonByName("alice martin", people)?.id, "person_1");
  assertEquals(resolvePersonByName("BOB SMITH", people)?.id, "person_2");
});

Deno.test("resolvePersonByName — first-word match when unambiguous", () => {
  // "Alice" (participant) drifts from "Alice Martin" (Person) → first-word hit.
  assertEquals(resolvePersonByName("Alice", people)?.id, "person_1");
  assertEquals(resolvePersonByName("carol", people)?.id, "person_3");
});

Deno.test("resolvePersonByName — first-word match skipped when ambiguous", () => {
  const ambiguous = [
    person("p1", "Alice Martin"),
    person("p2", "Alice Johnson"),
  ];
  // Two people share the first name "Alice" → never mis-link.
  assertEquals(resolvePersonByName("Alice", ambiguous), undefined);
});

Deno.test("resolvePersonByName — exact beats first-word ambiguity", () => {
  const list = [
    person("p1", "Alice Martin"),
    person("p2", "Alice Johnson"),
  ];
  assertEquals(resolvePersonByName("Alice Johnson", list)?.id, "p2");
});

Deno.test("resolvePersonByName — no match yields undefined", () => {
  assertEquals(resolvePersonByName("Zoe Quinn", people), undefined);
  assertEquals(resolvePersonByName("", people), undefined);
  assertEquals(resolvePersonByName("   ", people), undefined);
});

Deno.test("buildPersonByNameMap — keys only the resolved names", () => {
  const map = buildPersonByNameMap(
    ["Alice Martin", "Bob", "Unknown Person"],
    people,
  );
  assertEquals(map, {
    "Alice Martin": "person_1",
    "Bob": "person_2",
  });
});

Deno.test("buildPersonByNameMap — omits ambiguous and unresolved names", () => {
  const list = [
    person("p1", "Alice Martin"),
    person("p2", "Alice Johnson"),
  ];
  const map = buildPersonByNameMap(["Alice", "Alice Martin"], list);
  // "Alice" is ambiguous (omitted); "Alice Martin" resolves exactly.
  assertEquals(map, { "Alice Martin": "p1" });
});

Deno.test("buildPersonByNameMap — empty input yields empty map", () => {
  assertEquals(buildPersonByNameMap([], people), {});
});
