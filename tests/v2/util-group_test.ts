/**
 * Unit tests for src/utils/group.ts — groupBy with optional group ordering.
 */

import { assertEquals } from "@std/assert";
import { groupBy } from "../../src/utils/group.ts";

type Task = { id: string; section: string };

const tasks: Task[] = [
  { id: "1", section: "done" },
  { id: "2", section: "todo" },
  { id: "3", section: "done" },
  { id: "4", section: "in_progress" },
  { id: "5", section: "todo" },
];

Deno.test("groupBy — buckets items by key", () => {
  const g = groupBy(tasks, (t) => t.section);
  assertEquals(g.done.map((t) => t.id), ["1", "3"]);
  assertEquals(g.todo.map((t) => t.id), ["2", "5"]);
  assertEquals(g.in_progress.map((t) => t.id), ["4"]);
});

Deno.test("groupBy — no order returns groups in first-seen order", () => {
  const g = groupBy(tasks, (t) => t.section);
  assertEquals(Object.keys(g), ["done", "todo", "in_progress"]);
});

Deno.test("groupBy — order array places ordered groups first", () => {
  const g = groupBy(tasks, (t) => t.section, [
    "todo",
    "in_progress",
    "done",
  ]);
  assertEquals(Object.keys(g), ["todo", "in_progress", "done"]);
});

Deno.test("groupBy — groups missing from order appear after ordered ones", () => {
  const g = groupBy(tasks, (t) => t.section, ["todo"]);
  // "todo" first (ordered), then remaining in first-seen order.
  assertEquals(Object.keys(g), ["todo", "done", "in_progress"]);
});

Deno.test("groupBy — order keys with no items are skipped", () => {
  const g = groupBy(tasks, (t) => t.section, [
    "backlog", // no items
    "todo",
    "review", // no items
    "done",
  ]);
  assertEquals(Object.keys(g), ["todo", "done", "in_progress"]);
});

Deno.test("groupBy — empty input yields empty object", () => {
  assertEquals(groupBy([] as Task[], (t) => t.section), {});
  assertEquals(groupBy([] as Task[], (t) => t.section, ["a", "b"]), {});
});
