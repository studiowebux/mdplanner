// Task view routes — factory-generated + custom detail + quick actions.

import type { Context } from "hono";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { taskConfig } from "../../domains/task/config.tsx";
import type { AppVariables } from "../../types/app.ts";
import { getTaskService } from "../../singletons/services.ts";
import { publish } from "../../singletons/event-bus.ts";
import { resolveTaskDetailProps, TaskDetailView } from "../task-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";

export const tasksRouter = createDomainRoutes(taskConfig);

// deno-lint-ignore no-explicit-any
type Ctx = Context<{ Variables: AppVariables }, any, any>;

// ---------------------------------------------------------------------------
// Shared — fetch task + resolve props + render
// ---------------------------------------------------------------------------

async function renderDetailPage(c: Ctx, id: string) {
  const task = await getTaskService().getById(id);
  if (!task) return c.notFound();
  const props = await resolveTaskDetailProps(task);
  return c.html(
    TaskDetailView({
      ...viewProps(c, "/tasks"),
      task,
      ...props,
    }) as unknown as string,
  );
}

// ---------------------------------------------------------------------------
// GET /:id — detail page
// ---------------------------------------------------------------------------

tasksRouter.get("/:id", async (c) => {
  return renderDetailPage(c, c.req.param("id"));
});

// ---------------------------------------------------------------------------
// POST /:id/complete — mark task complete, move to Done
// ---------------------------------------------------------------------------

tasksRouter.post("/:id/complete", async (c) => {
  const id = c.req.param("id");
  const svc = getTaskService();
  await svc.update(id, { completed: true });
  await svc.moveTask(id, "Done");
  publish("task.updated");
  c.header("HX-Trigger", hxTrigger("success", "Task marked complete"));
  return renderDetailPage(c, id);
});

// ---------------------------------------------------------------------------
// POST /:id/reopen — unmark complete, move to Todo
// ---------------------------------------------------------------------------

tasksRouter.post("/:id/reopen", async (c) => {
  const id = c.req.param("id");
  const svc = getTaskService();
  await svc.update(id, { completed: false });
  await svc.moveTask(id, "Todo");
  publish("task.updated");
  c.header("HX-Trigger", hxTrigger("success", "Task reopened"));
  return renderDetailPage(c, id);
});

// ---------------------------------------------------------------------------
// POST /:id/move — change section
// ---------------------------------------------------------------------------

tasksRouter.post("/:id/move", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const section = String(body.section ?? "");
  if (!section) return c.text("Missing section", 400);

  await getTaskService().moveTask(id, section);
  publish("task.updated");
  c.header("HX-Trigger", hxTrigger("success", `Moved to ${section}`));
  return renderDetailPage(c, id);
});

// ---------------------------------------------------------------------------
// POST /:id/assign — set assignee
// ---------------------------------------------------------------------------

tasksRouter.post("/:id/assign", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const assignee = String(body.assignee ?? "").trim() || undefined;

  await getTaskService().update(id, { assignee });
  publish("task.updated");
  c.header(
    "HX-Trigger",
    hxTrigger("success", assignee ? `Assigned to ${assignee}` : "Unassigned"),
  );
  return renderDetailPage(c, id);
});
