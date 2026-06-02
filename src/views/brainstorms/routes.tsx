// Brainstorm view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { brainstormConfig } from "../../domains/brainstorm/config.tsx";
import {
  getBrainstormService,
  getGoalService,
  getTaskService,
} from "../../singletons/services.ts";
import { BrainstormDetailView } from "../brainstorm-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const brainstormsRouter = createDomainRoutes(brainstormConfig);

brainstormsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getBrainstormService().getById(id);
  if (!item) return c.notFound();

  const linkedTaskIds = item.linkedTasks ?? [];
  const resolvedTasks = await Promise.all(
    linkedTaskIds.map((tid) => getTaskService().getById(tid)),
  );
  const taskInfo = new Map<string, { title: string } | null>();
  linkedTaskIds.forEach((tid, i) => {
    const t = resolvedTasks[i];
    taskInfo.set(tid, t ? { title: t.title } : null);
  });

  const linkedGoalIds = item.linkedGoals ?? [];
  const resolvedGoals = await Promise.all(
    linkedGoalIds.map((gid) => getGoalService().getById(gid)),
  );
  const goalInfo = new Map<string, { title: string } | null>();
  linkedGoalIds.forEach((gid, i) => {
    const g = resolvedGoals[i];
    goalInfo.set(gid, g ? { title: g.title } : null);
  });

  return c.html(
    <BrainstormDetailView
      {...viewProps(c, "/brainstorms")}
      item={item}
      taskInfo={taskInfo}
      goalInfo={goalInfo}
    />,
  );
});
