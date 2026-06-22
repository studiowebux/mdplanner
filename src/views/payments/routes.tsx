// Payment view routes — factory-generated list/create/edit + custom detail route.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { paymentConfig } from "../../domains/payment/config.tsx";
import {
  getInvoiceService,
  getPaymentService,
} from "../../singletons/services.ts";
import { PaymentDetailView } from "../payment-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const paymentsRouter = createDomainRoutes(paymentConfig);

/** Render the detail page; `?editing=true` enables in-place notes editing. */
async function renderDetail(c: AppContext, id: string) {
  const payment = await getPaymentService().getById(id);
  if (!payment) return c.notFound();
  const invoice = payment.invoiceId
    ? await getInvoiceService().getById(payment.invoiceId)
    : null;
  const editing = c.req.query("editing") === "true";
  return c.html(
    <PaymentDetailView
      {...viewProps(c, "/payments")}
      item={payment}
      invoiceNumber={invoice?.number}
      editing={editing}
    />,
  );
}

paymentsRouter.get("/:id", (c) => renderDetail(c, c.req.param("id")));

// In-place notes save (Edit Mode). Factory provides edit/delete routes.
paymentsRouter.put("/:id/notes", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const notes = String(body.notes ?? "").trim() || undefined;
  await getPaymentService().update(id, { notes });
  return renderDetail(c, id);
});
