// Milestone routes — factory-generated + custom detail route.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { milestoneConfig } from "../../domains/milestone/config.tsx";
import {
  getMilestoneService,
  getPeopleService,
} from "../../singletons/services.ts";
import { MilestoneDetailView } from "../milestone-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { publish } from "../../singletons/event-bus.ts";

export const milestonesRouter = createDomainRoutes(milestoneConfig);

/** Render the detail page; `?editing=true` enables in-place description editing. */
async function renderDetail(c: AppContext, id: string) {
  const svc = getMilestoneService();
  const milestone = await svc.getById(id);
  if (!milestone) return c.notFound();
  const tasks = await svc.getTasksForMilestone(milestone.name);
  // task.assignee stores a person id — map id→name so the task list shows the
  // name, not the raw id (falls back to the raw value for legacy free-text).
  const personById: Record<string, string> = {};
  for (const p of await getPeopleService().list()) personById[p.id] = p.name;
  const editing = c.req.query("editing") === "true";
  return c.html(
    <MilestoneDetailView
      {...viewProps(c, "/milestones")}
      milestone={milestone}
      tasks={tasks}
      personById={personById}
      editing={editing}
    />,
  );
}

// Detail view — needs tasks, so it stays custom.
milestonesRouter.get("/:id", (c) => renderDetail(c, c.req.param("id")));

// In-place description save (Edit Mode). Factory provides edit/delete routes.
milestonesRouter.put("/:id/description", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const description = String(body.description ?? "").trim() || undefined;
  await getMilestoneService().update(id, { description });
  publish("milestone.updated");
  return renderDetail(c, id);
});
