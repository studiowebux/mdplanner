/**
 * Bulk field-edit (htmx) suite — Task.
 *
 * Locks the task-list bulk bar "Edit fields" popover endpoints:
 * - POST /tasks/batch-<field> sets that single field on every checked taskId
 *   (skipping archived) and returns 204 (no HX-Refresh — the list refreshes via
 *   SSE morph, identical to /batch-move).
 * - An empty value is a server-side no-op: the field is never clobbered.
 * - effort/priority are coerced + range-validated; invalid values are ignored.
 * - The list view popover is htmx-wired with named controls so hx-include
 *   serializes them.
 */

import { assert, assertEquals } from "@std/assert";
import { tasksRouter as viewRouter } from "../../src/views/tasks/routes.tsx";
import { getTaskService, initServices } from "../../src/singletons/services.ts";

function formRequest(path: string, fields: [string, string][]): Request {
  const form = new URLSearchParams();
  for (const [k, v] of fields) form.append(k, v);
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

Deno.test("bulk field-edit — htmx /tasks/batch-<field>", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-task-bulk-fields-" });
  initServices(dir, { cache: false });
  const service = getTaskService();

  try {
    await t.step(
      "batch-priority sets priority on checked tasks (204, no HX-Refresh)",
      async () => {
        const a = await service.create({ title: "Prio A", section: "Todo" });
        const b = await service.create({ title: "Prio B", section: "Todo" });

        const res = await viewRouter.request(
          formRequest("/batch-priority", [
            ["taskId", a.id],
            ["taskId", b.id],
            ["priority", "1"],
          ]),
        );
        assertEquals(res.status, 204);
        assertEquals(res.headers.get("HX-Refresh"), null);
        await res.body?.cancel();

        assertEquals((await service.getById(a.id))!.priority, 1);
        assertEquals((await service.getById(b.id))!.priority, 1);
      },
    );

    await t.step("batch-priority ignores out-of-range value", async () => {
      const t1 = await service.create({
        title: "Keep prio",
        section: "Todo",
        priority: 3,
      });
      const res = await viewRouter.request(
        formRequest("/batch-priority", [
          ["taskId", t1.id],
          ["priority", "9"],
        ]),
      );
      assertEquals(res.status, 204);
      await res.body?.cancel();
      assertEquals((await service.getById(t1.id))!.priority, 3);
    });

    await t.step(
      "batch-assignee sets assignee; empty value is a no-op",
      async () => {
        const t1 = await service.create({
          title: "Assign me",
          section: "Todo",
          assignee: "person_keep",
        });

        const setRes = await viewRouter.request(
          formRequest("/batch-assignee", [
            ["taskId", t1.id],
            ["assignee", "person_new"],
          ]),
        );
        assertEquals(setRes.status, 204);
        await setRes.body?.cancel();
        assertEquals((await service.getById(t1.id))!.assignee, "person_new");

        // Empty value must not clobber the existing assignee.
        const emptyRes = await viewRouter.request(
          formRequest("/batch-assignee", [
            ["taskId", t1.id],
            ["assignee", ""],
          ]),
        );
        assertEquals(emptyRes.status, 204);
        await emptyRes.body?.cancel();
        assertEquals((await service.getById(t1.id))!.assignee, "person_new");
      },
    );

    await t.step("batch-effort coerces numeric value", async () => {
      const t1 = await service.create({ title: "Effort", section: "Todo" });
      const res = await viewRouter.request(
        formRequest("/batch-effort", [
          ["taskId", t1.id],
          ["effort", "2.5"],
        ]),
      );
      assertEquals(res.status, 204);
      await res.body?.cancel();
      assertEquals((await service.getById(t1.id))!.effort, 2.5);
    });

    await t.step("batch-milestone skips archived tasks", async () => {
      const live = await service.create({ title: "Live", section: "Todo" });
      const gone = await service.create({ title: "Gone", section: "Todo" });
      assertEquals(await service.delete(gone.id), true);

      const res = await viewRouter.request(
        formRequest("/batch-milestone", [
          ["taskId", live.id],
          ["taskId", gone.id],
          ["milestone", "v2.0.0"],
        ]),
      );
      assertEquals(res.status, 204);
      await res.body?.cancel();
      assertEquals((await service.getById(live.id))!.milestone, "v2.0.0");
    });

    await t.step(
      "list view bulk popover is htmx-wired with named controls",
      async () => {
        await service.create({ title: "Render", section: "Todo" });
        const res = await viewRouter.request(
          new Request("http://localhost/?view=list", { method: "GET" }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        for (
          const ep of [
            "/tasks/batch-priority",
            "/tasks/batch-milestone",
            "/tasks/batch-assignee",
            "/tasks/batch-project",
            "/tasks/batch-due-date",
            "/tasks/batch-planned-start",
            "/tasks/batch-planned-end",
            "/tasks/batch-effort",
          ]
        ) {
          assert(
            html.includes(`hx-post="${ep}"`),
            `Apply button must htmx-post to ${ep}`,
          );
        }
        assert(
          html.includes('name="priority"') && html.includes('name="effort"') &&
            html.includes('name="due_date"'),
          "field controls must carry name attrs for hx-include",
        );
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
