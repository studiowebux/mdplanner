/**
 * Regression — factory boolean toolbar toggles must reset on uncheck.
 *
 * Bug: HTML unchecks omit a checkbox from form submission. The factory
 * middleware previously fell back to the saved value via `mergeParams`, so any
 * boolean toggle (archived / showHidden / hideCompleted) stayed stuck "on" once
 * enabled. Fix: the middleware force-resets every rendered toolbar boolean
 * toggle to `"false"` on htmx requests when the param is absent.
 *
 * Saved filter state now lives in the user's ACCOUNT (preferences.uiState), not
 * the ui_state cookie. Domain routers are tested in isolation, so the app-level
 * context middleware that sets actor/activePerson isn't present — this suite
 * injects an authenticated person (with a per-domain saved uiState) via a
 * wrapper app, replacing the former `ui_state` cookie header.
 */

import { assert, assertEquals } from "@std/assert";
import { Hono } from "hono";
import { tasksRouter } from "../../src/views/tasks/routes.tsx";
import {
  getPeopleRepository,
  getPeopleService,
  getTaskService,
  initServices,
} from "../../src/singletons/services.ts";
import type { AppVariables } from "../../src/types/app.ts";

// Inject an actor + activePerson carrying the given saved uiState for `tasks`.
// The fake person id makes the middleware's account write a harmless no-op
// (updatePreferences returns null when the person isn't found).
function appWithSavedState(tasksState: Record<string, string>) {
  const app = new Hono<{ Variables: AppVariables }>();
  app.use("*", async (c, next) => {
    c.set("actor", { id: "person_test_toggle" } as never);
    c.set(
      "activePerson",
      {
        id: "person_test_toggle",
        name: "Toggle Tester",
        preferences: { uiState: { tasks: tasksState } },
      } as never,
    );
    await next();
  });
  app.route("/", tasksRouter);
  return app;
}

Deno.test("factory boolean toggle reset — archived round-trip (account uiState)", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-toggle-archived-" });
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
      "GET /tasks?archived=true renders the archived task",
      async () => {
        const res = await appWithSavedState({}).request(
          "http://localhost/?archived=true",
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(html.includes("Archived archived test"));
        assert(!html.includes("Live archived test"));
      },
    );

    await t.step(
      "htmx uncheck (no param + saved says true) returns to default list",
      async () => {
        const res = await appWithSavedState({ archived: "true" }).request(
          "http://localhost/view",
          { headers: { "HX-Request": "true" } },
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
      "full-page GET with saved archived=false renders the checkbox UNCHECKED",
      async () => {
        const res = await appWithSavedState({ archived: "false" }).request(
          "http://localhost/",
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        const cb = html.match(/<input[^>]*name="archived"[^>]*>/);
        assert(cb, "toolbar must render the archived checkbox");
        assert(
          !cb![0].includes(" checked"),
          `archived checkbox should be unchecked, got: ${cb![0]}`,
        );
      },
    );

    await t.step(
      "URL ?archived=true with empty saved still works",
      async () => {
        const res = await appWithSavedState({}).request(
          "http://localhost/?archived=true",
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(html.includes("Archived archived test"));
      },
    );

    await service.hardDelete(live.id);
    await service.hardDelete(arch.id);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("factory boolean toggle reset — hideCompleted round-trip (account uiState)", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-toggle-hide-" });
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
      "GET /tasks?hideCompleted=true hides the completed task",
      async () => {
        const res = await appWithSavedState({}).request(
          "http://localhost/?hideCompleted=true",
        );
        assertEquals(res.status, 200);
        const html = await res.text();
        assert(html.includes("Open hide test"));
        assert(!html.includes("Done hide test"));
      },
    );

    await t.step(
      "htmx uncheck (no param + saved says true) shows the completed task again",
      async () => {
        const res = await appWithSavedState({ hideCompleted: "true" }).request(
          "http://localhost/view",
          { headers: { "HX-Request": "true" } },
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

    await service.hardDelete(open.id);
    await service.hardDelete(done.id);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("filter selection persists to the user account (uiState)", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-filter-persist-" });
  initServices(dir, { cache: false });
  const person = await getPeopleRepository().create({ name: "Filter Saver" });

  try {
    await getTaskService().create({ title: "Persist me", section: "Todo" });

    // A request carrying an active filter must write it to the account.
    const app = new Hono<{ Variables: AppVariables }>();
    app.use("*", async (c, next) => {
      c.set("actor", { id: person.id } as never);
      c.set(
        "activePerson",
        { id: person.id, name: person.name, preferences: {} } as never,
      );
      await next();
    });
    app.route("/", tasksRouter);

    const res = await app.request("http://localhost/?archived=true");
    assertEquals(res.status, 200);
    await res.text();

    const saved = await getPeopleService().getById(person.id);
    assertEquals(
      saved?.preferences?.uiState?.tasks?.archived,
      "true",
      "the archived filter must be saved to the person's account uiState",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
