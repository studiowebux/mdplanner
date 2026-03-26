// Goal view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { goalConfig } from "../../domains/goal/config.tsx";
import {
  getGoalService,
  getPortfolioService,
} from "../../singletons/services.ts";
import { GoalDetailView } from "../goal-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const goalsRouter = createDomainRoutes(goalConfig);

goalsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const goal = await getGoalService().getById(id);
  if (!goal) return c.notFound();

  const portfolioItems = goal.linkedPortfolioItems?.length
    ? await getPortfolioService().list()
    : [];

  return c.html(
    GoalDetailView({
      ...viewProps(c, "/goals"),
      item: goal,
      portfolioItems,
    }) as unknown as string,
  );
});
