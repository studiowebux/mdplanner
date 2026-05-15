// Invoice view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { invoiceConfig } from "../../domains/invoice/config.tsx";
import {
  getCustomerService,
  getInvoiceService,
  getProjectService,
} from "../../singletons/services.ts";
import { InvoiceDetailView } from "../invoice-detail.tsx";
import { InvoicePrintView } from "../invoice-print.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const invoicesRouter = createDomainRoutes(invoiceConfig);

invoicesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const service = getInvoiceService();
  const [invoice, billingConfig] = await Promise.all([
    service.getById(id),
    getProjectService().getConfig(),
  ]);
  if (!invoice) return c.notFound();

  return c.html(
    <InvoiceDetailView
      {...viewProps(c, "/invoices")}
      item={invoice}
      displayStatus={service.displayStatus(invoice)}
      billingConfig={billingConfig}
    />,
  );
});

invoicesRouter.get("/:id/print", async (c) => {
  const id = c.req.param("id")!;
  const service = getInvoiceService();
  const [invoice, billingConfig] = await Promise.all([
    service.getById(id),
    getProjectService().getConfig(),
  ]);
  if (!invoice) return c.notFound();

  const customer = invoice.customerId
    ? await getCustomerService().getById(invoice.customerId)
    : null;

  return c.html(
    <InvoicePrintView
      invoice={invoice}
      displayStatus={service.displayStatus(invoice)}
      billingConfig={billingConfig}
      customer={customer ?? null}
      nonce={c.get("nonce")}
    />,
  );
});
