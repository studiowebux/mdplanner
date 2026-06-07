// Per-section pagination for the task list/board. The views render only
// `pageSize` tasks per section and emit a SectionLoadMore control (GET
// /tasks/more-section) while more remain. These are sync-renderable components
// (renderToString). buildSectionMoreUrl is asserted directly.

import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { TaskListView } from "../../src/views/components/task-list.tsx";
import { TaskBoardView } from "../../src/views/components/task-board.tsx";
import { buildSectionMoreUrl } from "../../src/views/components/task-pagination.tsx";
import type { Task } from "../../src/types/task.types.ts";
import type { DomainFilterState } from "../../src/factories/domain.types.ts";

function makeTasks(section: string, n: number): Task[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `task_${section}_${i}`,
    title: `${section} task ${i}`,
    section,
    completed: false,
    revision: 1,
    order: i,
  })) as Task[];
}

function countMatches(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

// Tasks store their extra view modes ("list"/"board") in `view`, which the app
// assigns via runtime casts (ViewMode is "grid"|"table"|"canvas"); mirror that.
const listState = { view: "list" } as unknown as DomainFilterState;
const boardState = { view: "board" } as unknown as DomainFilterState;

Deno.test("TaskListView — caps rows per section and emits load-more", () => {
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    TaskListView({
      tasks: makeTasks("Todo", 30),
      pageSize: 25,
      state: listState,
      // deno-lint-ignore no-explicit-any
    }) as any,
  );
  // Only the first 25 rows render (title anchor is unique per row).
  assertEquals(countMatches(html, "task-list__row-title"), 25);
  // Load-more control pages this section's remainder.
  assertStringIncludes(html, "task-load-more");
  assertStringIncludes(html, "Load 5 more");
  assertStringIncludes(html, "/tasks/more-section?");
  assertStringIncludes(html, "section=Todo");
  assertStringIncludes(html, "view=list");
  assertStringIncludes(html, "offset=25");
});

Deno.test("TaskListView — no load-more when the section fits", () => {
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    TaskListView({
      tasks: makeTasks("Todo", 10),
      pageSize: 25,
      state: listState,
      // deno-lint-ignore no-explicit-any
    }) as any,
  );
  assertEquals(countMatches(html, "task-list__row-title"), 10);
  assertEquals(countMatches(html, "task-load-more"), 0);
});

Deno.test("TaskBoardView — caps cards per column and emits load-more", () => {
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    TaskBoardView({
      tasks: makeTasks("In Progress", 12),
      pageSize: 5,
      state: boardState,
      // deno-lint-ignore no-explicit-any
    }) as any,
  );
  assertEquals(countMatches(html, "task-board__card-title"), 5);
  assertStringIncludes(html, "task-load-more--board");
  assertStringIncludes(html, "Load 7 more");
  assertStringIncludes(html, "section=In+Progress");
  assertStringIncludes(html, "view=board");
  assertStringIncludes(html, "offset=5");
});

Deno.test("TaskListView — pageSize unset renders every row (no regression)", () => {
  const html = renderToString(
    // deno-lint-ignore no-explicit-any
    TaskListView({ tasks: makeTasks("Todo", 40), state: listState }) as any,
  );
  assertEquals(countMatches(html, "task-list__row-title"), 40);
  assertEquals(countMatches(html, "task-load-more"), 0);
});

Deno.test("buildSectionMoreUrl — carries filter state, overrides section/view", () => {
  const state = {
    view: "list",
    q: "bug fix",
    project: "MD Planner",
    section: "Done", // must be overridden by the explicit section arg
    sort: "due_date",
    order: "desc",
  } as unknown as DomainFilterState;
  const url = buildSectionMoreUrl(state, "Todo", "board", 50);
  assertStringIncludes(url, "/tasks/more-section?");
  // Explicit args win.
  assertStringIncludes(url, "section=Todo");
  assertStringIncludes(url, "view=board");
  assertStringIncludes(url, "offset=50");
  assertEquals(url.includes("section=Done"), false);
  // Filters carried forward.
  assertStringIncludes(url, "q=bug+fix");
  assertStringIncludes(url, "project=MD+Planner");
  assertStringIncludes(url, "sort=due_date");
  assertStringIncludes(url, "order=desc");
});
