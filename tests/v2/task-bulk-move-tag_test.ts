/**
 * Bulk move + tag (htmx) suite — Task.
 *
 * Locks the task-list bulk bar Move/Tag actions after the fetch→htmx
 * conversion:
 * - POST /tasks/batch-move sets the section on every checked taskId (skipping
 *   archived) and returns 204 + HX-Refresh.
 * - POST /tasks/batch-tag adds/removes a tag per checked task, computing the
 *   next tag set server-side, and returns 204 + HX-Refresh.
 * - The list view buttons are htmx-wired; the section <select>/tag <input>
 *   carry name attributes so hx-include serializes them.
 *
 * Replaces the former fetch("/tasks/batch") JSON path (bulkMove/bulkTagAction).
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

Deno.test("bulk move/tag — htmx /tasks/batch-move + /tasks/batch-tag", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-task-bulk-ops-" });
  initServices(dir, { cache: false });
  const service = getTaskService();

  try {
    await t.step(
      "batch-move sets section on checked tasks (204 HX-Refresh)",
      async () => {
        const a = await service.create({ title: "Move A", section: "Todo" });
        const b = await service.create({ title: "Move B", section: "Todo" });

        const res = await viewRouter.request(
          formRequest("/batch-move", [
            ["taskId", a.id],
            ["taskId", b.id],
            ["section", "In Progress"],
          ]),
        );
        assertEquals(res.status, 204);
        assertEquals(res.headers.get("HX-Refresh"), "true");
        await res.body?.cancel();

        assertEquals((await service.getById(a.id))!.section, "In Progress");
        assertEquals((await service.getById(b.id))!.section, "In Progress");
      },
    );

    await t.step("batch-move skips archived tasks", async () => {
      const live = await service.create({ title: "Live", section: "Todo" });
      const gone = await service.create({ title: "Gone", section: "Todo" });
      assertEquals(await service.delete(gone.id), true);

      const res = await viewRouter.request(
        formRequest("/batch-move", [
          ["taskId", live.id],
          ["taskId", gone.id],
          ["section", "Done"],
        ]),
      );
      assertEquals(res.status, 204);
      await res.body?.cancel();
      assertEquals((await service.getById(live.id))!.section, "Done");
    });

    await t.step(
      "batch-tag add then remove computes next tags server-side",
      async () => {
        const t1 = await service.create({
          title: "Tag me",
          section: "Todo",
          tags: ["keep"],
        });

        const addRes = await viewRouter.request(
          formRequest("/batch-tag", [
            ["taskId", t1.id],
            ["tag", "urgent"],
            ["mode", "add"],
          ]),
        );
        assertEquals(addRes.status, 204);
        assertEquals(addRes.headers.get("HX-Refresh"), "true");
        await addRes.body?.cancel();
        const afterAdd = (await service.getById(t1.id))!.tags ?? [];
        assert(afterAdd.includes("urgent") && afterAdd.includes("keep"));

        // Adding the same tag again must not duplicate it.
        const dupRes = await viewRouter.request(
          formRequest("/batch-tag", [
            ["taskId", t1.id],
            ["tag", "urgent"],
            ["mode", "add"],
          ]),
        );
        await dupRes.body?.cancel();
        assertEquals(
          ((await service.getById(t1.id))!.tags ?? []).filter((x) =>
            x === "urgent"
          )
            .length,
          1,
        );

        const rmRes = await viewRouter.request(
          formRequest("/batch-tag", [
            ["taskId", t1.id],
            ["tag", "urgent"],
            ["mode", "remove"],
          ]),
        );
        assertEquals(rmRes.status, 204);
        await rmRes.body?.cancel();
        const afterRm = (await service.getById(t1.id))!.tags ?? [];
        assert(!afterRm.includes("urgent") && afterRm.includes("keep"));
      },
    );

    await t.step(
      "list view bulk bar is htmx-wired with named inputs",
      async () => {
        await service.create({ title: "Render", section: "Todo" });
        const res = await viewRouter.request(
          new Request("http://localhost/?view=list", { method: "GET" }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes('hx-post="/tasks/batch-move"'),
          "Move button must htmx-post to /tasks/batch-move",
        );
        // hx-vals JSON is HTML-escaped in the attribute (browser decodes it
        // back to valid JSON before htmx reads it).
        assert(
          html.includes('hx-post="/tasks/batch-tag"') &&
            html.includes("&quot;mode&quot;: &quot;add&quot;") &&
            html.includes("&quot;mode&quot;: &quot;remove&quot;"),
          "Tag buttons must htmx-post to /tasks/batch-tag with add/remove modes",
        );
        assert(
          html.includes('name="section"') && html.includes('name="tag"'),
          "section select + tag input must carry name attrs for hx-include",
        );
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
