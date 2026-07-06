// Render tests for TaskRow (src/views/components/task-list.tsx) — the per-row
// project meta added so tasks show their project across 70+ projects.

import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import {
  TaskListView,
  TaskRow,
} from "../../src/views/components/task-list.tsx";
import type { Task } from "../../src/types/task.types.ts";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task_1",
    title: "Ship it",
    section: "Todo",
    priority: 2,
    completed: false,
    revision: 1,
    ...overrides,
  } as Task;
}

function render(node: ReturnType<typeof TaskRow>): string {
  // deno-lint-ignore no-explicit-any
  return renderToString(node as any);
}

Deno.test("TaskRow — shows project in the project meta when set", () => {
  const html = render(
    TaskRow({
      task: task({ project: "MD Planner" }),
      moveSections: [],
      index: 0,
    }),
  );
  assertStringIncludes(html, 'data-col="project"');
  assertStringIncludes(html, "task-list__meta--project");
  assertStringIncludes(html, "MD Planner");
});

Deno.test("TaskRow — project meta renders empty (no badge) when unset", () => {
  const html = render(
    TaskRow({ task: task(), moveSections: [], index: 0 }),
  );
  // span is present (so column-toggle/layout stays aligned) but holds no text
  assertStringIncludes(
    html,
    'class="task-list__meta task-list__meta--project"',
  );
  assertEquals(
    /task-list__meta--project"[^>]*>\s*<\//.test(html) ||
      html.includes('task-list__meta--project"></span>'),
    true,
  );
});

Deno.test("TaskRow — open task shows Mark complete hitting /complete", () => {
  const html = render(
    TaskRow({ task: task(), moveSections: [], index: 0 }),
  );
  assertStringIncludes(html, "Mark complete");
  assertStringIncludes(html, 'hx-post="/tasks/task_1/complete"');
  assertEquals(html.includes("/tasks/task_1/reopen"), false);
});

Deno.test("TaskRow — completed task shows Reopen hitting /reopen", () => {
  const html = render(
    TaskRow({ task: task({ completed: true }), moveSections: [], index: 0 }),
  );
  assertStringIncludes(html, "Reopen");
  assertStringIncludes(html, 'hx-post="/tasks/task_1/reopen"');
  assertEquals(html.includes("/tasks/task_1/complete"), false);
});

Deno.test("TaskListView — every section is a collapse-preserving <details>", () => {
  const html = render(
    TaskListView({
      tasks: [task({ id: "t1", section: "Todo" })],
      moveSections: ["Todo"],
    }),
  );
  // Section is a <details> carrying data-preserve-open (the idiomorph hook
  // marker) with a <summary> header — the toggle is native.
  assertStringIncludes(html, "<details");
  assertStringIncludes(html, "data-preserve-open");
  assertStringIncludes(html, "task-list__section-summary");
  assertStringIncludes(html, "task-list__section-chevron");
});

Deno.test("TaskListView — collapsedSections omits open on that section, others stay open", () => {
  const html = render(
    TaskListView({
      tasks: [
        task({ id: "d1", section: "Done", completed: true }),
        task({ id: "t1", section: "Todo" }),
      ],
      moveSections: ["Todo", "Done"],
      collapsedSections: ["Done"],
    }),
  );
  // Exactly one section is open (Todo); the collapsed Done section omits `open`.
  assertEquals(html.match(/<details[^>]* open/g)?.length, 1);
  // Count stays visible on every section header even when collapsed.
  assertStringIncludes(html, "task-list__section-count");
});

Deno.test("TaskListView — no collapsedSections keeps every section open", () => {
  const html = render(
    TaskListView({
      tasks: [
        task({ id: "d1", section: "Done", completed: true }),
        task({ id: "t1", section: "Todo" }),
      ],
      moveSections: ["Todo", "Done"],
    }),
  );
  assertEquals(html.match(/<details[^>]* open/g)?.length, 2);
});
