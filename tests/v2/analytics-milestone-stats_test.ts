/**
 * Milestone analytics stats guard — collectMilestoneStats.
 *
 * Locks the fix for the `doneCount` type hole: the analytics collector used to
 * read `(m as unknown as { doneCount?: number }).doneCount`, a field that does
 * not exist on the enriched `Milestone` (it is `completedCount`). The cast
 * silenced the type error and made `doneCount` always `0`. This asserts the
 * collector now reports the real completed-task count.
 */

import { assertEquals } from "@std/assert";
import { collectMilestoneStats } from "../../src/services/analytics/work.ts";
import {
  getMilestoneService,
  getTaskService,
  initServices,
} from "../../src/singletons/services.ts";

Deno.test("collectMilestoneStats — doneCount reflects completed tasks, not 0", async () => {
  const dir = await Deno.makeTempDir({ prefix: "mdplanner-milestone-stats-" });
  initServices(dir, { cache: false });

  try {
    const milestones = getMilestoneService();
    const tasks = getTaskService();

    await milestones.create({ name: "vGuard", status: "open" });

    // Three tasks linked to the milestone; two completed, one open.
    const a = await tasks.create({
      title: "Done A",
      section: "Todo",
      milestone: "vGuard",
    });
    const b = await tasks.create({
      title: "Done B",
      section: "Todo",
      milestone: "vGuard",
    });
    await tasks.create({
      title: "Open C",
      section: "Todo",
      milestone: "vGuard",
    });
    await tasks.update(a.id, { completed: true });
    await tasks.update(b.id, { completed: true });

    const stats = await collectMilestoneStats({});
    const guard = stats.milestones.find((m) => m.name === "vGuard");

    assertEquals(guard?.taskCount, 3);
    assertEquals(guard?.doneCount, 2); // was always 0 before the fix
    assertEquals(guard?.progress, 67); // round(2/3 * 100)
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
