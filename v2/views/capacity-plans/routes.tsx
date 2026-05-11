// Capacity plan view routes — factory list/create/edit + custom detail.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { capacityPlanConfig } from "../../domains/capacity-plan/config.tsx";
import { getCapacityPlanService } from "../../singletons/services.ts";
import { CapacityPlanDetailView } from "../capacity-plan-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const capacityPlansViewRouter = createDomainRoutes(capacityPlanConfig);

capacityPlansViewRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getCapacityPlanService().getById(id);
  if (!item) return c.notFound();

  return c.html(
    <CapacityPlanDetailView
      {...viewProps(c, "/capacity-plans")}
      item={item}
    />,
  );
});
