// Render tests for the task GRID action column (src/domains/task/constants.tsx)
// — the per-row Complete/Reopen toggle added alongside View/Edit/Archive.

import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "hono/jsx/dom/server";
import { TASK_TABLE_COLUMNS } from "../../src/domains/task/constants.tsx";

const actionsCol = TASK_TABLE_COLUMNS.find((c) => c.key === "_actions")!;

function renderActions(row: Record<string, unknown>): string {
  // deno-lint-ignore no-explicit-any
  return renderToString(actionsCol.render!(undefined, row) as any);
}

Deno.test("task grid actions — open row shows Mark complete hitting /complete", () => {
  const html = renderActions({ id: "task_1", title: "Ship", completed: false });
  assertStringIncludes(html, "Mark complete");
  assertStringIncludes(html, 'hx-post="/tasks/task_1/complete"');
  assertEquals(html.includes("/tasks/task_1/reopen"), false);
});

Deno.test("task grid actions — completed row shows Reopen hitting /reopen", () => {
  const html = renderActions({ id: "task_1", title: "Ship", completed: true });
  assertStringIncludes(html, "Reopen");
  assertStringIncludes(html, 'hx-post="/tasks/task_1/reopen"');
  assertEquals(html.includes("/tasks/task_1/complete"), false);
});

Deno.test("task grid actions — keeps View/Edit/Archive controls", () => {
  const html = renderActions({ id: "task_1", title: "Ship", completed: false });
  assertStringIncludes(html, 'href="/tasks/task_1"');
  assertStringIncludes(html, 'hx-get="/tasks/task_1/edit"');
  assertStringIncludes(html, 'hx-delete="/tasks/task_1"');
});
