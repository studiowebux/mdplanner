// Render tests for TaskRow (src/views/components/task-list.tsx) — the per-row
// project meta added so tasks show their project across 70+ projects.

import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { TaskRow } from "../../src/views/components/task-list.tsx";
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
