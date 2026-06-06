// Render tests for the task-detail sections extracted from task-detail.tsx.
// These are sync-renderable sub-components (renderToString), so we assert the
// critical htmx/SSE element ids + structure survive the split-out.

import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import {
  TaskBlockedBySection,
  TaskMetaHeader,
  TaskQuickActions,
  TaskSubtasksSection,
} from "../../src/views/components/task-detail-sections.tsx";
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

Deno.test("TaskQuickActions — keeps move/assign/complete htmx wiring", () => {
  // deno-lint-ignore no-explicit-any
  const html = renderToString(
    TaskQuickActions({
      task: task(),
      sections: ["Todo", "In Progress", "Done"],
      assigneeDisplayName: "Ada",
      // deno-lint-ignore no-explicit-any
    }) as any,
  );
  assertStringIncludes(html, 'id="move-section"');
  assertStringIncludes(html, "/tasks/task_1/move");
  assertStringIncludes(html, "/tasks/task_1/assign");
  assertStringIncludes(html, "/tasks/task_1/complete");
  assertStringIncludes(html, 'id="assign-hidden"');
});

Deno.test("TaskQuickActions — archived task shows restore + destroy", () => {
  const html = renderToString(
    TaskQuickActions({
      task: task({ archived: true }),
      sections: ["Todo"],
      assigneeDisplayName: "",
      // deno-lint-ignore no-explicit-any
    }) as any,
  );
  assertStringIncludes(html, "/tasks/task_1/restore");
  assertStringIncludes(html, "/tasks/task_1/destroy");
});

Deno.test("TaskMetaHeader — renders title, section badge, copy buttons", () => {
  const html = renderToString(
    TaskMetaHeader({
      task: task({ project: "MD Planner" }),
      milestonEntity: null,
      assigneePerson: null,
      // deno-lint-ignore no-explicit-any
    }) as any,
  );
  assertStringIncludes(html, "Ship it");
  assertStringIncludes(html, 'data-copy-value="task_1"');
  assertStringIncludes(html, "/portfolio/md-planner");
});

Deno.test("TaskSubtasksSection — null when empty, list when present", () => {
  assertEquals(
    // deno-lint-ignore no-explicit-any
    renderToString(TaskSubtasksSection({ subtasks: [] }) as any),
    "",
  );
  const html = renderToString(
    TaskSubtasksSection({
      subtasks: [task({ id: "c1", title: "Sub A", completed: true })],
      // deno-lint-ignore no-explicit-any
    }) as any,
  );
  assertStringIncludes(html, "Sub A");
  assertStringIncludes(html, "Subtasks");
});

Deno.test("TaskBlockedBySection — links each blocker", () => {
  const html = renderToString(
    TaskBlockedBySection({
      blockedByTasks: [task({ id: "b1", title: "Blocker" })],
      // deno-lint-ignore no-explicit-any
    }) as any,
  );
  assertStringIncludes(html, "/tasks/b1");
  assertStringIncludes(html, "Blocker");
});
