/**
 * Regression — GitHub fragment route on a task with no project.
 *
 * `resolveGitHubRepo` (src/views/tasks/routes.tsx) resolves an inherited
 * portfolio repo from `task.project`. The field is optional; a task with
 * no project must render the fragment (200), never throw on the
 * `task.project.toLowerCase()` path. Guards the non-null-assertion removal
 * (task_1780614240991_r9fo).
 *
 * Bootstrap: initServices(tempdir, { cache: false }) + direct router
 * dispatch via `viewRouter.request(...)`. No HTTP transport needed.
 */

import { assert, assertEquals } from "@std/assert";
import { tasksRouter as viewRouter } from "../../src/views/tasks/routes.tsx";
import { getTaskService, initServices } from "../../src/singletons/services.ts";

Deno.test("GitHub fragment renders for a task with no project", async () => {
  const dir = await Deno.makeTempDir({
    prefix: "mdplanner-task-github-fragment-",
  });
  initServices(dir, { cache: false });
  const service = getTaskService();

  try {
    const task = await service.create({
      title: "No project task",
      section: "Todo",
    });
    assertEquals(task.project, undefined);

    const res = await viewRouter.request(
      `http://localhost/${task.id}/github`,
    );
    assertEquals(res.status, 200, "github fragment should render, not crash");
    const html = await res.text();
    assert(html.length > 0, "fragment body should be non-empty");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
