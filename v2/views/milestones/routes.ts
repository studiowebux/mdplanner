// Milestone routes — factory-generated + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { milestoneConfig } from "../../domains/milestone/config.tsx";
import { getMilestoneService } from "../../singletons/services.ts";
import { MilestoneDetailView } from "../milestone-detail.tsx";

export const milestonesRouter = createDomainRoutes(milestoneConfig);

// Detail view — needs tasks, so it stays custom.
milestonesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const svc = getMilestoneService();
  const milestone = await svc.getById(id);
  if (!milestone) return c.notFound();
  const tasks = await svc.getTasksForMilestone(milestone.name);
  return c.html(
    MilestoneDetailView({
      milestone,
      tasks,
      nonce: c.get("nonce"),
      activePath: "/milestones",
      enabledFeatures: c.get("enabledFeatures"),
    }) as unknown as string,
  );
});
