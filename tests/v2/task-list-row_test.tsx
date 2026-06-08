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

Deno.test("TaskListView — collapsedSections renders the section as a closed <details> with count", () => {
  const html = render(
    TaskListView({
      tasks: [
        task({ id: "d1", section: "Done", completed: true }),
        task({ id: "d2", section: "Done", completed: true }),
        task({ id: "t1", section: "Todo" }),
      ],
      moveSections: ["Todo", "Done"],
      collapsedSections: ["Done"],
    }),
  );
  // Done is a collapsed <details> with NO open attr (asserting the exact
  // opening tag proves both class and the closed state) carrying its count.
  // Closing `">` right after the class proves there is no `open` attr.
  assertStringIncludes(html, "<details ");
  assertStringIncludes(html, 'task-list__section--collapsed">');
  assertStringIncludes(html, "task-list__section-count");
  // Todo stays a normal (non-details) section
  assertStringIncludes(html, 'class="task-list__section">');
});

Deno.test("TaskListView — no collapsedSections keeps every section open", () => {
  const html = render(
    TaskListView({
      tasks: [task({ id: "d1", section: "Done", completed: true })],
      moveSections: ["Done"],
    }),
  );
  assertEquals(html.includes("task-list__section--collapsed"), false);
});
