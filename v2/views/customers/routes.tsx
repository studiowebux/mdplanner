// Customer view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { customerConfig } from "../../domains/customer/config.tsx";
import {
  getCustomerService,
  getInvoiceService,
  getQuoteService,
} from "../../singletons/services.ts";
import { CustomerDetailView } from "../customer-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const customersRouter = createDomainRoutes(customerConfig);

customersRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
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

  return c.html(
    <CustomerDetailView
      {...viewProps(c, "/customers")}
      item={customer}
      quotes={quotes}
      invoices={invoicesWithStatus}
    />,
  );
});
