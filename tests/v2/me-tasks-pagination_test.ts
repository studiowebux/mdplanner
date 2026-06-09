// My Work "My Tasks" card pagination. The card renders only `pageSize` items and
// emits a load-more control (GET /me/tasks/more) while more remain. MyTasksChunk
// is sync-renderable (renderToString); sortMyTasks is asserted directly.

import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import {
  MyTasksChunk,
  sortMyTasks,
} from "../../src/views/components/my-tasks-list.tsx";
import type { Task } from "../../src/types/task.types.ts";

function makeTasks(n: number): Task[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `task_${i}`,
    title: `task ${i}`,
    section: "Todo",
    completed: false,
    revision: 1,
  })) as Task[];
}

function countMatches(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

Deno.test("MyTasksChunk — caps items and emits load-more", () => {
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    MyTasksChunk({ tasks: makeTasks(30), offset: 0, pageSize: 25 }) as any,
  );
  assertEquals(countMatches(html, "me-dashboard__item-link"), 25);
  assertStringIncludes(html, "task-load-more");
  assertStringIncludes(html, "Load 5 more");
  assertStringIncludes(html, "/me/tasks/more?offset=25");
});

Deno.test("MyTasksChunk — no load-more when the page fits", () => {
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    MyTasksChunk({ tasks: makeTasks(10), offset: 0, pageSize: 25 }) as any,
  );
  assertEquals(countMatches(html, "me-dashboard__item-link"), 10);
  assertEquals(countMatches(html, "task-load-more"), 0);
});

Deno.test("MyTasksChunk — label caps at pageSize, not total remaining", () => {
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    MyTasksChunk({ tasks: makeTasks(388), offset: 0, pageSize: 25 }) as any,
  );
  assertStringIncludes(html, "Load 25 more");
  assertEquals(html.includes("Load 363 more"), false);
});

Deno.test("MyTasksChunk — final partial page shows the true remainder", () => {
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    MyTasksChunk({ tasks: makeTasks(27), offset: 25, pageSize: 25 }) as any,
  );
  assertEquals(countMatches(html, "me-dashboard__item-link"), 2);
  assertEquals(countMatches(html, "task-load-more"), 0);
});

Deno.test("sortMyTasks — priority asc, then due_date asc (null last), then title", () => {
  const tasks = [
    {
      id: "a",
      title: "a",
      section: "Todo",
      priority: 3,
      due_date: "2026-01-10",
    },
    {
      id: "b",
      title: "b",
      section: "Todo",
      priority: 1,
      due_date: "2026-02-01",
    },
    {
      id: "c",
      title: "c",
      section: "Todo",
      priority: 1,
      due_date: "2026-01-05",
    },
    { id: "d", title: "d", section: "Todo" },
  ] as Task[];
  const sorted = sortMyTasks(tasks).map((t) => t.id);
  // P1 c (earlier due) before P1 b, then P3 a, then no-priority d last.
  assertEquals(sorted, ["c", "b", "a", "d"]);
});
