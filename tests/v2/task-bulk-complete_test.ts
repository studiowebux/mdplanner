/**
 * Bulk "Mark complete & move to Done" (htmx) suite — Task.
 *
 * Locks the task-list bulk bar Mark-complete action:
 * - POST /tasks/batch-complete sets completed:true AND moves every checked
 *   taskId to Done (skipping archived), returning 204 (refresh via SSE morph).
 * - The action is distinct from /batch-move: it sets completed, not just the
 *   section. Idempotent for already-done/already-completed tasks.
 * - The list view button is htmx-wired to /tasks/batch-complete.
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

Deno.test("bulk complete — htmx /tasks/batch-complete", async (t) => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-task-bulk-complete-",
  });
  initServices(dir, { cache: false });
  const service = getTaskService();

  try {
    await t.step(
      "batch-complete sets completed + moves to Done (204, no HX-Refresh)",
      async () => {
        const a = await service.create({ title: "Done A", section: "Todo" });
        const b = await service.create({
          title: "Done B",
          section: "In Progress",
        });

        const res = await viewRouter.request(
          formRequest("/batch-complete", [
            ["taskId", a.id],
            ["taskId", b.id],
          ]),
        );
        assertEquals(res.status, 204);
        assertEquals(res.headers.get("HX-Refresh"), null);
        await res.body?.cancel();

        const ra = (await service.getById(a.id))!;
        const rb = (await service.getById(b.id))!;
        assertEquals(ra.section, "Done");
        assertEquals(ra.completed, true);
        assertEquals(rb.section, "Done");
        assertEquals(rb.completed, true);
      },
    );

    await t.step("batch-complete skips archived tasks", async () => {
      const live = await service.create({ title: "Live", section: "Todo" });
      const gone = await service.create({ title: "Gone", section: "Todo" });
      assertEquals(await service.delete(gone.id), true);

      const res = await viewRouter.request(
        formRequest("/batch-complete", [
          ["taskId", live.id],
          ["taskId", gone.id],
        ]),
      );
      assertEquals(res.status, 204);
      await res.body?.cancel();
      const rl = (await service.getById(live.id))!;
      assertEquals(rl.section, "Done");
      assertEquals(rl.completed, true);
    });

    await t.step(
      "batch-complete is idempotent for already-done tasks",
      async () => {
        const t1 = await service.create({ title: "Already", section: "Done" });
        await service.update(t1.id, { completed: true });

        const res = await viewRouter.request(
          formRequest("/batch-complete", [["taskId", t1.id]]),
        );
        assertEquals(res.status, 204);
        await res.body?.cancel();
        const r = (await service.getById(t1.id))!;
        assertEquals(r.section, "Done");
        assertEquals(r.completed, true);
      },
    );

    await t.step(
      "list view bulk bar is htmx-wired to /tasks/batch-complete",
      async () => {
        await service.create({ title: "Render", section: "Todo" });
        const res = await viewRouter.request(
          new Request("http://localhost/?view=list", { method: "GET" }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes('hx-post="/tasks/batch-complete"'),
          "Mark-complete button must htmx-post to /tasks/batch-complete",
        );
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
