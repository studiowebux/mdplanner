/**
 * Assignee round-trip — Task list + detail.
 *
 * Reproduces task_1780766256427: "Assigning a task to Claude shows
 * 'unassigned'". Locks the end-to-end assign plumbing through the REAL view
 * routes:
 * - POST /tasks/:id/assign persists the person ID (decision note_1778506261317
 *   — task.assignee stores the person ID, not the name).
 * - GET /tasks?view=list renders the assignee <select> with the assigned
 *   person's option marked `selected` (so the row does not fall back to the
 *   "Unassigned" option). Exercised with an AI-agent person (Claude) because
 *   that was the reported case.
 * - GET /tasks/:id detail resolves the assignee to a /people/:id link.
 *
 * Pattern: tests/v2/task-archived-ui_test.ts (viewRouter.request harness).
 */

import { assert, assertEquals } from "@std/assert";
import { tasksRouter as viewRouter } from "../../src/views/tasks/routes.tsx";
import {
  getPeopleService,
  getTaskService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("assignee round-trip — list select + detail link (AI agent)", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-task-assignee-" });
  initServices(dir, { cache: false });
  const tasks = getTaskService();
  const people = getPeopleService();

  try {
    const claude = await people.create({ name: "Claude", agentType: "ai" });
    const task = await tasks.create({
      title: "Assign to Claude",
      section: "Todo",
    });

    await t.step("POST /:id/assign persists the person ID", async () => {
      const res = await viewRouter.request(
        new Request(`http://localhost/${task.id}/assign`, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: `assignee=${encodeURIComponent(claude.id)}`,
        }),
      );
      assertEquals(res.status, 200);
      const stored = await tasks.getById(task.id);
      assert(stored);
      assertEquals(stored!.assignee, claude.id);
    });

    await t.step(
      "GET /?view=list renders the assigned option as selected",
      async () => {
        const res = await viewRouter.request(
          new Request(`http://localhost/?view=list`, { method: "GET" }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        // The Claude option must exist and be selected; the row must NOT fall
        // back to the Unassigned option.
        const selectedClaude = new RegExp(
          `<option[^>]*value="${claude.id}"[^>]*selected`,
        );
        assert(
          selectedClaude.test(html),
          "list assignee select must mark the assigned person's option selected",
        );
      },
    );

    await t.step(
      "GET /view fragment (SSE morph path) renders the assigned option selected",
      async () => {
        // Mirrors the real refresh from the bug report:
        // GET /tasks/view?...&hideCompleted=true (no view param → defaultView "list").
        const res = await viewRouter.request(
          new Request(
            "http://localhost/view?q=&section=&project=&milestone=&assignee=&priority=&tags=&date_from=&date_to=&hideCompleted=true",
            { method: "GET" },
          ),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        const selectedClaude = new RegExp(
          `<option[^>]*value="${claude.id}"[^>]*selected`,
        );
        assert(
          selectedClaude.test(html),
          "/view fragment must mark the assigned person's option selected",
        );
      },
    );

    await t.step(
      "an unassigned task marks the Unassigned option selected (deterministic morph target)",
      async () => {
        const solo = await tasks.create({
          title: "Nobody assigned",
          section: "Todo",
        });
        const res = await viewRouter.request(
          new Request("http://localhost/?view=list", { method: "GET" }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        // The select for the unassigned task must mark its empty option
        // selected so the morph (and select-morph-sync.js) has one clear target.
        assert(
          /<option value=""[^>]*selected[^>]*>\s*Unassigned/.test(html),
          "unassigned task must render the Unassigned option as selected",
        );
        await tasks.hardDelete(solo.id);
      },
    );

    await t.step(
      "GET /:id detail links the assignee to /people/:id",
      async () => {
        const res = await viewRouter.request(
          new Request(`http://localhost/${task.id}`, { method: "GET" }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes(`/people/${claude.id}`),
          "detail must link the resolved assignee to /people/:id",
        );
        assert(html.includes("Claude"), "detail must show the assignee name");
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
