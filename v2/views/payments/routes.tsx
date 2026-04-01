// Payment view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { paymentConfig } from "../../domains/payment/config.tsx";
import { getPaymentService } from "../../singletons/services.ts";
import { PaymentDetailView } from "../payment-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const paymentsRouter = createDomainRoutes(paymentConfig);

paymentsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const payment = await getPaymentService().getById(id);
  if (!payment) return c.notFound();

  return c.html(
    <PaymentDetailView
      {...viewProps(c, "/payments")}
      item={payment}
    />,
  );
});
