/**
 * Unit tests for src/utils/mentions.ts — @mention parsing/resolution and the
 * HTML mention renderer (task IDs, person badges, commit links).
 */

import { assert, assertEquals } from "@std/assert";
import {
  parseMentions,
  renderMentions,
  resolveMentions,
} from "../../src/utils/mentions.ts";
import type { Person } from "../../src/types/person.types.ts";

function person(id: string, name: string): Person {
  return { id, name } as unknown as Person;
}

Deno.test("parseMentions — extracts @names without the @ prefix", () => {
  assertEquals(parseMentions("hey @alice and @bob-smith"), [
    "alice",
    "bob-smith",
  ]);
  assertEquals(parseMentions("@solo"), ["solo"]);
});

Deno.test("parseMentions — no mentions yields empty array", () => {
  assertEquals(parseMentions("nothing here"), []);
  assertEquals(parseMentions(""), []);
});

Deno.test("resolveMentions — exact (case-insensitive) single-word name", () => {
  const people = [person("p2", "Bob")];
  assertEquals(resolveMentions("ping @bob please", people), "ping p2 please");
  assertEquals(resolveMentions("ping @BOB", people), "ping p2");
});

Deno.test("resolveMentions — dash and no-space variants of a full name", () => {
  const people = [person("person_1", "Alice Martin")];
  assertEquals(resolveMentions("@alice-martin", people), "person_1");
  assertEquals(resolveMentions("@alicemartin", people), "person_1");
});

Deno.test("resolveMentions — unresolved mentions stay as plain @name", () => {
  const people = [person("p2", "Bob")];
  assertEquals(resolveMentions("@carol here", people), "@carol here");
  // "@alice martin" only matches "@alice" (space breaks the token) → unresolved.
  assertEquals(
    resolveMentions("@alice martin", [person("p1", "Alice Martin")]),
    "@alice martin",
  );
});

Deno.test("renderMentions — task IDs become detail links", () => {
  assertEquals(
    renderMentions("see task_abc123 done"),
    'see <a href="/tasks/task_abc123" class="mention mention--task">task_abc123</a> done',
  );
});

Deno.test("renderMentions — person IDs become name badges via personMap", () => {
  const out = renderMentions("owner person_1", {
    personMap: new Map([["person_1", "Alice"]]),
  });
  assertEquals(
    out,
    'owner <span class="mention mention--person" title="person_1">Alice</span>',
  );
});

Deno.test("renderMentions — unmapped person ID falls back to the raw id", () => {
  assertEquals(
    renderMentions("person_9"),
    '<span class="mention mention--person" title="person_9">person_9</span>',
  );
});

Deno.test("renderMentions — commit hashes link only when githubRepo is set", () => {
  assertEquals(renderMentions("fix abc1234"), "fix abc1234"); // no repo → untouched
  assertEquals(
    renderMentions("fix abc1234", { githubRepo: "studiowebux/mdplanner" }),
    'fix <a href="https://github.com/studiowebux/mdplanner/commit/abc1234" ' +
      'class="mention mention--commit" target="_blank" rel="noopener noreferrer">abc1234</a>',
  );
});

Deno.test("renderMentions — only text nodes are processed, not tag attributes", () => {
  // task_zzz lives inside an attribute value → must NOT be linked.
  const input = '<a href="/x?ref=task_zzz">label</a>';
  assertEquals(renderMentions(input), input);
});

Deno.test("renderMentions — plain text with nothing to link is unchanged", () => {
  assert(renderMentions("just words") === "just words");
});
