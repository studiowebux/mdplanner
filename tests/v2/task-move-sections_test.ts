/**
 * Move-target sections (custom-aware) suite — Task.
 *
 * Locks the fix for "move dropdowns omit custom sections": a task in a custom
 * board section (beyond the configured defaults) must still be movable, and any
 * section must be reachable as a move target.
 *
 * - getMoveSectionOrder() returns every configured section (even empty) PLUS
 *   any custom section present on the tasks, custom appended + sorted.
 * - The list view per-row + bulk "move" dropdowns render the custom section as
 *   an <option>.
 * - The detail page move dropdown renders the custom section as an <option>.
 */

import { assert, assertEquals } from "@std/assert";
import { getMoveSectionOrder } from "../../src/domains/task/constants.tsx";
import { getSectionOrder } from "../../src/constants/mod.ts";
import { tasksRouter as viewRouter } from "../../src/views/tasks/routes.tsx";
import { getTaskService, initServices } from "../../src/singletons/services.ts";
import type { Task } from "../../src/types/task.types.ts";

Deno.test("getMoveSectionOrder — configured + custom, no duplicates", () => {
  const defaults = [...getSectionOrder()];
  const tasks = [
    { section: "Todo" },
    { section: "Icebox" },
    { section: "Done" },
    { section: "Archive box" },
    { section: "Icebox" },
  ] as Task[];

  const result = getMoveSectionOrder(tasks);

  // Every configured default is present, in order, at the front.
  assertEquals(result.slice(0, defaults.length), defaults);
  // Custom sections are appended, sorted, de-duplicated.
  assertEquals(result.slice(defaults.length), ["Archive box", "Icebox"]);
  // No section appears twice (Todo/Done were already configured).
  assertEquals(new Set(result).size, result.length);
});

Deno.test("getMoveSectionOrder — keeps empty configured sections", () => {
  // No tasks at all: still offers every configured section as a move target.
  assertEquals(getMoveSectionOrder([]), [...getSectionOrder()]);
});

Deno.test("move dropdowns render custom sections", async (t) => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-task-move-sections-",
  });
  initServices(dir, { cache: false });
  const service = getTaskService();

  try {
    const custom = await service.create({ title: "In box", section: "Icebox" });

    await t.step(
      "list view per-row + bulk move offer the custom section",
      async () => {
        const res = await viewRouter.request(
          new Request("http://localhost/?view=list", { method: "GET" }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes(">Icebox</option>"),
          "list move dropdowns must include the custom 'Icebox' section",
        );
      },
    );

    await t.step(
      "detail page move dropdown offers the custom section",
      async () => {
        const res = await viewRouter.request(
          new Request(`http://localhost/${custom.id}`, { method: "GET" }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes(">Icebox</option>"),
          "detail move dropdown must include the custom 'Icebox' section",
        );
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
