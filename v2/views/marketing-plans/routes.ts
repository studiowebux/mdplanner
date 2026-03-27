// Marketing Plan view routes — factory-generated list + custom detail.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { marketingPlanConfig } from "../../domains/marketing-plan/config.tsx";
import { getMarketingPlanService } from "../../singletons/services.ts";
import { MarketingPlanDetailView } from "../marketing-plan-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const marketingPlansRouter = createDomainRoutes(marketingPlanConfig);

// Custom detail route — renders full detail page with all nested sections.
marketingPlansRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const plan = await getMarketingPlanService().getById(id);
  if (!plan) return c.notFound();

  return c.html(
    MarketingPlanDetailView({
      ...viewProps(c, "/marketing-plans"),
      item: plan,
    }) as unknown as string,
  );
});
