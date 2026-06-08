// Unit test for the hideCompleted `exceptField`/`exceptValue` exemption added
// to applyFilters (src/factories/domain-routes-helpers.ts). Tasks exempt the
// Done section so the filter keeps it (the view collapses it) instead of
// silently emptying the section, while still hiding stray completed tasks in
// other sections.

import { assertEquals } from "@std/assert";
import { resolveDomainHelpers } from "../../src/factories/domain-routes.ts";
import { taskConfig } from "../../src/domains/task/config.tsx";
import type { Task } from "../../src/types/task.types.ts";
import type { DomainFilterState } from "../../src/factories/domain.types.ts";

function task(overrides: Partial<Task>): Task {
  return {
    id: crypto.randomUUID(),
    title: "t",
    section: "Todo",
    completed: false,
    revision: 1,
    ...overrides,
  } as Task;
}

Deno.test("applyFilters — hideCompleted exempts the Done section, strips elsewhere", () => {
  const { helpers } = resolveDomainHelpers(taskConfig);
  const items: Task[] = [
    task({ id: "done1", section: "Done", completed: true }),
    task({ id: "stray", section: "In Progress", completed: true }),
    task({ id: "open1", section: "Todo", completed: false }),
  ];

  const result = helpers.applyFilters(
    items,
    { hideCompleted: true } as DomainFilterState,
  );
  const ids = result.map((t) => t.id).sort();

  // Done task kept (exempt) + open task kept; stray completed-in-progress stripped
  assertEquals(ids, ["done1", "open1"]);
});

Deno.test("applyFilters — hideCompleted off keeps everything", () => {
  const { helpers } = resolveDomainHelpers(taskConfig);
  const items: Task[] = [
    task({ id: "done1", section: "Done", completed: true }),
    task({ id: "stray", section: "In Progress", completed: true }),
  ];
  const result = helpers.applyFilters(items, {} as DomainFilterState);
  assertEquals(result.length, 2);
});
