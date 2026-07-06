/**
 * UI-state backend round-trip suite.
 *
 * ui-state.ts persists per-user UI state in PersonPreferences.uiState (the
 * backend store), NOT a browser cookie (migration commit 333d01af). These
 * tests exercise the real read/write/delete helpers against a real
 * PeopleService and lock in:
 *  - per-domain round-trip (write → re-read sees the value)
 *  - CROSS-DOMAIN PRESERVATION: writing one domain leaves the others intact —
 *    the regression that bit for weeks when the single ui_state cookie hit the
 *    ~4KB ceiling and silently truncated other domains' state.
 *  - deleteUiStateKeys removes only the named keys
 *  - global-filter helpers round-trip the _global key (string-array values)
 *  - anonymous requests (no activePerson) write as a safe no-op
 *  - ui-state.ts no longer touches cookies (regression guard)
 *
 * Helpers read c.var.activePerson; the hand-built stub is sufficient because
 * ui-state.ts only reads that one field (writes go through the people-service
 * singleton, not the context). After each async write we re-fetch the person so
 * the read path observes persisted state, mirroring how a fresh request reloads
 * activePerson via contextMiddleware.
 */

import { assert, assertEquals } from "@std/assert";
import {
  deleteUiStateKeys,
  readGlobalAssignees,
  readGlobalProjects,
  readUiState,
  writeGlobalFilters,
  writeUiState,
} from "../../src/utils/ui-state.ts";
import {
  getPeopleService,
  initServices,
} from "../../src/singletons/services.ts";
import type { AppContext } from "../../src/types/app.ts";
import type { Person } from "../../src/types/person.types.ts";

function ctx(activePerson: Person | undefined): AppContext {
  return { var: { activePerson } } as unknown as AppContext;
}

Deno.test("ui-state backend round-trip", async (t) => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-ui-state-" });
  initServices(dir, { cache: false });

  // Re-fetch the person so a read sees the latest persisted preferences.
  async function fresh(id: string): Promise<Person> {
    const p = await getPeopleService().getById(id);
    assert(p, "person must still exist");
    return p;
  }

  try {
    const person = await getPeopleService().create({ name: "Tester" });

    await t.step("read returns empty for a domain with no saved state", () => {
      assertEquals(readUiState(ctx(person), "tasks"), {});
    });

    await t.step("write then read round-trips a domain", async () => {
      await writeUiState(ctx(person), "tasks", { sort: "due", order: "asc" });
      const got = readUiState<{ sort?: string; order?: string }>(
        ctx(await fresh(person.id)),
        "tasks",
      );
      assertEquals(got.sort, "due");
      assertEquals(got.order, "asc");
    });

    await t.step("writing one domain preserves the others", async () => {
      await writeUiState(ctx(await fresh(person.id)), "analytics", {
        analyticsHiddenSections: ["finances", "habits"],
      });
      const p = await fresh(person.id);
      assertEquals(
        readUiState<{ analyticsHiddenSections?: string[] }>(ctx(p), "analytics")
          .analyticsHiddenSections,
        ["finances", "habits"],
      );
      // The 'tasks' state written in the previous step must be untouched — this
      // is the cross-domain truncation bug the migration fixes.
      assertEquals(readUiState<{ sort?: string }>(ctx(p), "tasks").sort, "due");
    });

    await t.step(
      "global-filter helpers round-trip the _global key",
      async () => {
        await writeGlobalFilters(
          ctx(await fresh(person.id)),
          ["Alpha", "Beta"],
          ["Alice"],
        );
        const p = await fresh(person.id);
        assertEquals(readGlobalProjects(ctx(p)), ["Alpha", "Beta"]);
        assertEquals(readGlobalAssignees(ctx(p)), ["Alice"]);
        // Earlier domains still present alongside _global.
        assertEquals(
          readUiState<{ sort?: string }>(ctx(p), "tasks").sort,
          "due",
        );
      },
    );

    await t.step("deleteUiStateKeys removes only the named keys", async () => {
      await writeUiState(ctx(await fresh(person.id)), "tasks", {
        sort: "due",
        order: "asc",
        view: "board",
      });
      await deleteUiStateKeys(ctx(await fresh(person.id)), "tasks", [
        "sort",
        "order",
      ]);
      const got = readUiState<{ sort?: string; order?: string; view?: string }>(
        ctx(await fresh(person.id)),
        "tasks",
      );
      assertEquals(got.sort, undefined);
      assertEquals(got.order, undefined);
      assertEquals(got.view, "board");
    });

    await t.step(
      "anonymous request (no activePerson) writes a no-op",
      async () => {
        await writeUiState(ctx(undefined), "tasks", { sort: "x" });
        await writeGlobalFilters(ctx(undefined), ["Y"], ["Z"]);
        await deleteUiStateKeys(ctx(undefined), "tasks", ["view"]);
        // The person's state is unchanged by anonymous writes.
        const p = await fresh(person.id);
        assertEquals(
          readUiState<{ view?: string }>(ctx(p), "tasks").view,
          "board",
        );
        assertEquals(readGlobalProjects(ctx(p)), ["Alpha", "Beta"]);
      },
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("ui-state.ts no longer touches cookies", async () => {
  const src = await Deno.readTextFile(
    new URL("../../src/utils/ui-state.ts", import.meta.url),
  );
  assert(!src.includes("getCookie"), "ui-state.ts must not read cookies");
  assert(!src.includes("setCookie"), "ui-state.ts must not write cookies");
  assert(
    !src.includes("COOKIE_NAME"),
    "ui-state.ts cookie constant must be gone",
  );
});
