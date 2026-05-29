/**
 * Regression — factory boolean toolbar toggles must reset on uncheck.
 *
 * Bug: HTML unchecks omit a checkbox from form submission. The factory
 * middleware previously fell back to the saved cookie value via
 * `mergeParams`, so any boolean toggle (archived / showHidden) stayed
 * stuck "on" once enabled. Only `hideCompleted` had a special case that
 * forced htmx-absent params to "false".
 *
 * Fix: `v2/factories/domain-routes.ts` middleware now force-resets every
 * known toolbar boolean toggle to `"false"` on htmx requests when the
 * param is absent (guarded per-domain on whether the toggle is rendered).
 *
 * Covers `archived` + `hideCompleted` on the tasks domain (which renders
 * all three toggles). `showHidden` shares the identical middleware
 * branch — see `v2/factories/domain-routes.ts` for the generalisation.
 */

import { assert, assertEquals } from "@std/assert";
import { tasksRouter as viewRouter } from "../../v2/views/tasks/routes.tsx";
import { getTaskService, initServices } from "../../v2/singletons/services.ts";

const UI_COOKIE = (state: Record<string, unknown>) =>
  `ui_state=${encodeURIComponent(JSON.stringify({ tasks: state }))}`;

Deno.test("factory boolean toggle reset — archived round-trip", async (t) => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-factory-boolean-toggle-archived-",
  });
  initServices(dir, { cache: false });
  const service = getTaskService();

  try {
    const live = await service.create({
      title: "Live archived test",
      section: "Todo",
    });
    const arch = await service.create({
      title: "Archived archived test",
      section: "Todo",
    });
    assertEquals(await service.archive(arch.id, "Tester"), true);

    await t.step(
      "GET /tasks?archived=true renders the archived task (baseline)",
      async () => {
        const res = await viewRouter.request(
          new Request("http://localhost/?archived=true", { method: "GET" }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes("Archived archived test"),
          "archived view must include the archived task",
        );
        assert(
          !html.includes("Live archived test"),
          "archived view must NOT include the live task",
        );
      },
    );

    await t.step(
      "htmx uncheck (no archived param + cookie still says true) returns to default list",
      async () => {
        const res = await viewRouter.request(
          new Request("http://localhost/view", {
            method: "GET",
            headers: {
              "HX-Request": "true",
              "Cookie": UI_COOKIE({ archived: "true" }),
            },
          }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes("Live archived test"),
          "uncheck round-trip must include the live task",
        );
        assert(
          !html.includes("Archived archived test"),
          "uncheck round-trip must NOT include the archived task",
        );
      },
    );

    await t.step(
      "subsequent full-page GET /tasks renders the toolbar archived checkbox UNCHECKED",
      async () => {
        // The uncheck above wrote `archived=false` to the cookie. A
        // subsequent full-page load should now render the toolbar
        // without the `checked` attribute on the archived checkbox.
        const res = await viewRouter.request(
          new Request("http://localhost/", {
            method: "GET",
            headers: { "Cookie": UI_COOKIE({ archived: "false" }) },
          }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        const archivedCheckbox = html.match(
          /<input[^>]*name="archived"[^>]*>/,
        );
        assert(
          archivedCheckbox,
          "toolbar must render the archived checkbox",
        );
        assert(
          !archivedCheckbox![0].includes(" checked"),
          `archived checkbox should be unchecked, got: ${archivedCheckbox![0]}`,
        );
      },
    );

    // Sanity: pretend a third party (URL bookmark) navigates with
    // ?archived=true and no cookie — the param wins, archive view rendered.
    await t.step(
      "URL ?archived=true with empty cookie still works (no regression)",
      async () => {
        const res = await viewRouter.request(
          new Request("http://localhost/?archived=true", { method: "GET" }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes("Archived archived test"),
          "URL ?archived=true must still render the archived view",
        );
      },
    );

    // Cleanup
    await service.hardDelete(live.id);
    await service.hardDelete(arch.id);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("factory boolean toggle reset — hideCompleted round-trip", async (t) => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-factory-boolean-toggle-hide-completed-",
  });
  initServices(dir, { cache: false });
  const service = getTaskService();

  try {
    const open = await service.create({
      title: "Open hide test",
      section: "Todo",
    });
    const done = await service.create({
      title: "Done hide test",
      section: "Todo",
    });
    await service.update(done.id, { completed: true });

    await t.step(
      "GET /tasks?hideCompleted=true hides the completed task (baseline)",
      async () => {
        const res = await viewRouter.request(
          new Request("http://localhost/?hideCompleted=true", {
            method: "GET",
          }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes("Open hide test"),
          "hideCompleted view must include the open task",
        );
        assert(
          !html.includes("Done hide test"),
          "hideCompleted view must NOT include the completed task",
        );
      },
    );

    await t.step(
      "htmx uncheck (no hideCompleted param + cookie says true) shows the completed task again",
      async () => {
        const res = await viewRouter.request(
          new Request("http://localhost/view", {
            method: "GET",
            headers: {
              "HX-Request": "true",
              "Cookie": UI_COOKIE({ hideCompleted: "true" }),
            },
          }),
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(
          html.includes("Done hide test"),
          "uncheck round-trip must surface the completed task",
        );
        assert(
          html.includes("Open hide test"),
          "uncheck round-trip must keep showing the open task",
        );
      },
    );

    // Cleanup
    await service.hardDelete(open.id);
    await service.hardDelete(done.id);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
