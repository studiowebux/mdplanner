// Marketing Plan view routes — factory-generated list + custom detail.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { marketingPlanConfig } from "../../domains/marketing-plan/config.tsx";
import {
  getGoalService,
  getMarketingPlanService,
} from "../../singletons/services.ts";
import { MarketingPlanDetailView } from "../marketing-plan-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import type { Goal } from "../../types/goal.types.ts";

export const marketingPlansRouter = createDomainRoutes(marketingPlanConfig);

// Custom detail route — renders full detail page with all nested sections.
marketingPlansRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const plan = await getMarketingPlanService().getById(id);
  if (!plan) return c.notFound();

  // Resolve linked goals for KPI display.
  const goals: Goal[] = [];
  if (plan.linkedGoals?.length) {
    const goalService = getGoalService();
    for (const goalId of plan.linkedGoals) {
      const goal = await goalService.getById(goalId);
      if (goal) goals.push(goal);
    }
  }

  return c.html(
    <MarketingPlanDetailView
      {...viewProps(c, "/marketing-plans")}
      item={plan}
      goals={goals}
    />,
  );
});
