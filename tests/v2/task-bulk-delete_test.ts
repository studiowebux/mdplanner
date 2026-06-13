/**
 * Bulk-delete (htmx) suite — Task.
 *
 * Locks the task-list bulk bar delete:
 * - POST /tasks/batch-delete archives every checked taskId (soft-delete),
 *   skips missing/already-archived, returns 204 (list refreshes via SSE morph).
 * - The list view delete button is htmx-wired (hx-post + hx-include) and row
 *   checkboxes carry name="taskId" value=<id> for hx-include serialization.
 *
 * Regression: task-list.js previously fetch'd DELETE /tasks/:id, which had no
 * view route — bulk delete silently 404'd and archived nothing.
 *
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { assert, assertEquals } from "@std/assert";
import { tasksRouter as viewRouter } from "../../src/views/tasks/routes.tsx";
import { getTaskService, initServices } from "../../src/singletons/services.ts";

function batchDeleteRequest(ids: string[]): Request {
  const form = new URLSearchParams();
  for (const id of ids) form.append("taskId", id);
  return new Request("http://localhost/batch-delete", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

Deno.test("bulk-delete — POST /tasks/batch-delete archives checked tasks", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-task-bulk-delete-" });
  initServices(dir, { cache: false });
  const service = getTaskService();

  try {
    await t.step(
      "archives every checked taskId + returns 204 (no HX-Refresh)",
      async () => {
        const a = await service.create({ title: "Bulk A", section: "Todo" });
        const b = await service.create({ title: "Bulk B", section: "Todo" });
        const keep = await service.create({ title: "Keep", section: "Todo" });

        const res = await viewRouter.request(
          batchDeleteRequest([a.id, b.id]),
        );
        assertEquals(res.status, 204);
        assertEquals(res.headers.get("HX-Refresh"), null);
        await res.body?.cancel();

        assertEquals((await service.getById(a.id))!.archived, true);
        assertEquals((await service.getById(b.id))!.archived, true);
        // Untouched task stays live.
        assertEquals((await service.getById(keep.id))!.archived, undefined);
      },
    );

    await t.step(
      "skips already-archived and missing ids without error",
      async () => {
        const live = await service.create({ title: "Live", section: "Todo" });
        const gone = await service.create({ title: "Gone", section: "Todo" });
        assertEquals(await service.delete(gone.id), true);

        const res = await viewRouter.request(
          batchDeleteRequest([live.id, gone.id, "task_does_not_exist"]),
        );
        assertEquals(res.status, 204);
        await res.body?.cancel();
        assertEquals((await service.getById(live.id))!.archived, true);
      },
    );

    await t.step(
      "allSection resolves every task in the section server-side (beyond page size)",
      async () => {
        // More tasks than any page size — none of these are sent as taskId, the
        // server must resolve them from the `allSection` flag alone.
        const ids: string[] = [];
        for (let i = 0; i < 30; i++) {
          const tk = await service.create({
            title: `Sweep ${i}`,
            section: "Backlog",
          });
          ids.push(tk.id);
        }
        const other = await service.create({
          title: "Other section",
          section: "Todo",
        });

        const form = new URLSearchParams();
        form.append("allSection", "Backlog");
        const res = await viewRouter.request(
          new Request("http://localhost/batch-delete", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: form.toString(),
          }),
        );
        assertEquals(res.status, 204);
        await res.body?.cancel();

        for (const id of ids) {
          assertEquals((await service.getById(id))!.archived, true);
        }
        // A task outside the section is untouched.
        assertEquals((await service.getById(other.id))!.archived, undefined);
      },
    );

    await t.step(
      "list view delete button is htmx-wired + checkbox carries name/value",
      async () => {
        const task = await service.create({
          title: "Render check",
          section: "Todo",
        });
        const res = await viewRouter.request(
          new Request("http://localhost/?view=list", { method: "GET" }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes('hx-post="/tasks/batch-delete"'),
          "delete button must POST to /tasks/batch-delete via htmx",
        );
        assert(
          html.includes(
            'hx-include=".task-list__select:checked, #task-bulk-extra, #tasks-toolbar"',
          ),
          "delete button must include checked row checkboxes + the per-section " +
            "select-all (#task-bulk-extra) + the toolbar filter state",
        );
        assert(
          html.includes('name="taskId"') &&
            html.includes(`value="${task.id}"`),
          "row checkbox must carry name=taskId + value=<id> for hx-include",
        );
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
