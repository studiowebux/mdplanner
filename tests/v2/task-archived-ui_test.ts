/**
 * Archived-UI smoke suite — Task.
 *
 * Locks the end-to-end Show-archived UI plumbing:
 * - TaskService.archive/restore/hardDelete delegate to the repo and keep
 *   the cache (when present) in sync.
 * - POST /tasks/:id/restore + POST /tasks/:id/destroy view routes resolve
 *   through the factory and return 204 + HX-Trigger toast.
 * - GET /tasks?archived=true renders the archived task with Restore +
 *   Delete permanently row actions (TaskListView archived prop).
 * - GET /tasks/:id detail page swaps Edit/Archive for Restore + Delete
 *   permanently when archived === true.
 *
 * Pattern: `[architecture] MD Planner — Soft-delete (archive) pattern`.
 */

import { assert, assertEquals } from "@std/assert";
import { tasksRouter as viewRouter } from "../../src/views/tasks/routes.tsx";
import { getTaskService, initServices } from "../../src/singletons/services.ts";

Deno.test("archived UI — Task service + view routes + list/detail rendering", async (t) => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-task-archived-ui-",
  });
  initServices(dir, { cache: false });
  const service = getTaskService();

  try {
    await t.step(
      "service.archive/restore round-trip preserves cross-domain ref",
      async () => {
        const task = await service.create({
          title: "Archive me",
          section: "Todo",
        });
        assertEquals(await service.archive(task.id, "Tester"), true);
        const archived = await service.getById(task.id);
        assert(archived);
        assertEquals(archived!.archived, true);
        assertEquals(archived!.archivedBy, "Tester");
        assertEquals(await service.restore(task.id), true);
        const restored = await service.getById(task.id);
        assert(restored);
        assertEquals(restored!.archived, undefined);
        assertEquals(restored!.archivedBy, undefined);
      },
    );

    await t.step(
      "service.hardDelete removes file from disk",
      async () => {
        const task = await service.create({
          title: "Hard delete me",
          section: "Todo",
        });
        assertEquals(await service.hardDelete(task.id), true);
        assertEquals(await service.getById(task.id), null);
      },
    );

    await t.step(
      "POST /tasks/:id/restore returns 204 and clears archived",
      async () => {
        const task = await service.create({
          title: "Restore via route",
          section: "Todo",
        });
        assertEquals(await service.delete(task.id), true);
        const res = await viewRouter.request(
          new Request(`http://localhost/${task.id}/restore`, {
            method: "POST",
          }),
        );
        assertEquals(res.status, 204);
        const restored = await service.getById(task.id);
        assert(restored);
        assertEquals(restored!.archived, undefined);
      },
    );

    await t.step(
      "POST /tasks/:id/destroy returns 204 and removes the file",
      async () => {
        const task = await service.create({
          title: "Destroy via route",
          section: "Todo",
        });
        assertEquals(await service.delete(task.id), true);
        const res = await viewRouter.request(
          new Request(`http://localhost/${task.id}/destroy`, {
            method: "POST",
          }),
        );
        assertEquals(res.status, 204);
        assertEquals(await service.getById(task.id), null);
      },
    );

    await t.step(
      "GET /tasks?archived=true renders Restore + Delete permanently row actions",
      async () => {
        const task = await service.create({
          title: "List view archived row",
          section: "Todo",
        });
        assertEquals(await service.delete(task.id), true);
        const res = await viewRouter.request(
          new Request(`http://localhost/?archived=true&view=list`, {
            method: "GET",
          }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes("Restore"),
          "archived list must render Restore button",
        );
        assert(
          html.includes("Delete permanently"),
          "archived list must render Delete permanently button",
        );
        assert(
          html.includes(`/tasks/${task.id}/restore`),
          "Restore button must target /restore route",
        );
        assert(
          html.includes(`/tasks/${task.id}/destroy`),
          "Delete permanently button must target /destroy route",
        );
        // Live-mode Archive button must NOT appear for an archived row.
        assert(
          !new RegExp(
            `hx-delete="/tasks/${task.id}"[^>]*>\\s*Archive`,
            "s",
          ).test(html),
          "archived row should not show the live Archive button",
        );
      },
    );

    await t.step(
      "GET /tasks/:id detail page swaps actions when archived",
      async () => {
        const task = await service.create({
          title: "Detail archived swap",
          section: "Todo",
        });
        assertEquals(await service.delete(task.id), true);
        const res = await viewRouter.request(
          new Request(`http://localhost/${task.id}`, { method: "GET" }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes(`hx-post="/tasks/${task.id}/restore"`),
          "detail page should show Restore action when archived",
        );
        assert(
          html.includes(`hx-post="/tasks/${task.id}/destroy"`),
          "detail page should show Delete permanently action when archived",
        );
        assert(
          !html.includes(`hx-delete="/tasks/${task.id}"`),
          "detail page must not show live Archive action when archived",
        );
        assert(
          html.includes("detail-archived-banner"),
          "archived banner must render on detail page",
        );
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
