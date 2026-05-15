// Deal view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { dealConfig } from "../../domains/deal/config.tsx";
import { getDealService } from "../../singletons/services.ts";
import { DealDetailView } from "../deal-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const dealsRouter = createDomainRoutes(dealConfig);

dealsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const deal = await getDealService().getById(id);
  if (!deal) return c.notFound();
  return c.html(
    <DealDetailView {...viewProps(c, "/deals")} item={deal} />,
  );
});
