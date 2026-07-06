/**
 * Creating a habit must refresh the heatmap on the list view. The heatmap lives
 * in the page topSlot, OUTSIDE the SSE-refreshed `#habits-view` container, so a
 * hidden SSE node re-fetches `GET /habits/heatmap` on `habit.updated`/`.deleted`
 * (create publishes `<prefix>.updated`) and morphs `#habits-heatmap`.
 *
 * This locks the fragment contract: the route is reachable (registered before
 * `/:id`), returns a `#habits-heatmap` wrapper, and lists the current habits.
 */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { habitRouter } from "../../src/views/habits/routes.tsx";
import {
  getHabitService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("GET /habits/heatmap returns the heatmap fragment with current habits", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-habit-heatmap-" });
  initServices(dir, { cache: false });
  try {
    await getHabitService().create({
      title: "Drink water",
      frequency: "daily",
    });

    const res = await habitRouter.request("http://localhost/heatmap");
    assertEquals(res.status, 200, "heatmap route is reachable (not /:id)");
    const html = await res.text();
    assertStringIncludes(
      html,
      'id="habits-heatmap"',
      "fragment carries the morph target id",
    );
    assertStringIncludes(html, "Drink water", "lists the created habit");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("heatmap fragment reflects a newly created habit", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-habit-heatmap2-" });
  initServices(dir, { cache: false });
  try {
    const before = await habitRouter.request("http://localhost/heatmap");
    const beforeHtml = await before.text();
    assert(
      !beforeHtml.includes("Meditate"),
      "habit absent before creation",
    );

    await getHabitService().create({ title: "Meditate", frequency: "daily" });

    const after = await habitRouter.request("http://localhost/heatmap");
    const afterHtml = await after.text();
    assertStringIncludes(
      afterHtml,
      "Meditate",
      "re-fetched heatmap includes the new habit",
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
