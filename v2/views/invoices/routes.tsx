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
import { publish } from "../../singletons/event-bus.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";

export const invoicesRouter = createDomainRoutes(invoiceConfig);

invoicesRouter.post("/:id/send", async (c) => {
  const id = c.req.param("id")!;
  const service = getInvoiceService();
  const invoice = await service.getById(id);
  if (!invoice) return c.notFound();
  if (invoice.status !== "draft") {
    return new Response(null, {
      status: 422,
      headers: {
        "HX-Trigger": hxTrigger("error", "Only draft invoices can be sent"),
      },
    });
  }
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { status: "sent", sentAt: now };
  if (!invoice.dueDate && invoice.paymentTerms) {
    const match = invoice.paymentTerms.match(/NET\s+(\d+)/i);
    if (match) {
      const days = parseInt(match[1], 10);
      const due = new Date();
      due.setDate(due.getDate() + days);
      updates.dueDate = due.toISOString().slice(0, 10);
    } else if (invoice.paymentTerms.toLowerCase().includes("due on receipt")) {
      updates.dueDate = now.slice(0, 10);
    }
  }
  await service.update(id, updates);
  publish("invoice.updated");
  return new Response(null, {
    status: 204,
    headers: { "HX-Redirect": `/invoices/${id}` },
  });
});

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
