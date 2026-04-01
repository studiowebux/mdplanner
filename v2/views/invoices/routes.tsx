// Invoice view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { invoiceConfig } from "../../domains/invoice/config.tsx";
import { getInvoiceService } from "../../singletons/services.ts";
import { InvoiceDetailView } from "../invoice-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const invoicesRouter = createDomainRoutes(invoiceConfig);

invoicesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const service = getInvoiceService();
  const invoice = await service.getById(id);
  if (!invoice) return c.notFound();

  return c.html(
    <InvoiceDetailView
      {...viewProps(c, "/invoices")}
      item={invoice}
      displayStatus={service.displayStatus(invoice)}
    />,
  );
});
