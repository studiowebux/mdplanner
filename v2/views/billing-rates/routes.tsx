// BillingRate view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { billingRateConfig } from "../../domains/billing-rate/config.tsx";
import { getBillingRateService } from "../../singletons/services.ts";
import { BillingRateDetailView } from "../billing-rate-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const billingRatesRouter = createDomainRoutes(billingRateConfig);

billingRatesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const rate = await getBillingRateService().getById(id);
  if (!rate) return c.notFound();

  return c.html(
    <BillingRateDetailView
      {...viewProps(c, "/billing-rates")}
      item={rate}
    />,
  );
});
