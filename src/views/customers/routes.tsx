// Customer view routes — factory-generated list/create/edit + custom detail route.
// Structured fields edit via the factory sidenav (GET/POST /:id/edit);
// `notes` edits in-place via "Edit Mode" (?editing=true, PUT /:id/notes).

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { customerConfig } from "../../domains/customer/config.tsx";
import {
  getCustomerService,
  getInvoiceService,
  getPaymentService,
  getQuoteService,
} from "../../singletons/services.ts";
import { CustomerDetailView } from "../customer-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const customersRouter = createDomainRoutes(customerConfig);

async function renderDetail(c: AppContext, id: string) {
  const customer = await getCustomerService().getById(id);
  if (!customer) return c.notFound();

  const invoiceService = getInvoiceService();
  const [quotes, invoices] = await Promise.all([
    getQuoteService().list({ customerId: id }),
    invoiceService.list({ customerId: id }),
  ]);

  const invoicesWithStatus = invoices.map((inv) => ({
    ...inv,
    displayStatus: invoiceService.displayStatus(inv),
  }));

  // Payments for this customer = payments against any of the customer's invoices.
  const invoiceIds = new Set(invoices.map((inv) => inv.id));
  const invoiceNumbers = new Map(invoices.map((inv) => [inv.id, inv.number]));
  const allPayments = await getPaymentService().list();
  const payments = allPayments
    .filter((p) => invoiceIds.has(p.invoiceId))
    .sort((a, b) => b.date.localeCompare(a.date));

  const editing = c.req.query("editing") === "true";
  return c.html(
    <CustomerDetailView
      {...viewProps(c, "/customers")}
      item={customer}
      quotes={quotes}
      invoices={invoicesWithStatus}
      payments={payments}
      invoiceNumbers={invoiceNumbers}
      editing={editing}
    />,
  );
}

customersRouter.get(
  "/:id",
  (c: AppContext) => renderDetail(c, c.req.param("id")!),
);

customersRouter.put("/:id/notes", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const notes = String(body.notes ?? "").trim() || undefined;
  await getCustomerService().update(id, { notes });
  return renderDetail(c, id);
});
