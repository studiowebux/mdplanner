// Invoice view routes — factory-generated list/create/edit + custom detail route.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { invoiceConfig } from "../../domains/invoice/config.tsx";
import {
  getCustomerService,
  getInvoiceService,
  getProjectService,
  getQuoteService,
} from "../../singletons/services.ts";
import { InvoiceDetailView } from "../invoice-detail.tsx";
import { InvoicePrintView } from "../invoice-print.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";
import { sha256Hex } from "../../utils/checksum.ts";

export const invoicesRouter = createDomainRoutes(invoiceConfig);

/** Render the invoice detail page. Editing is via the standard Edit form. */
async function renderDetail(c: AppContext, id: string) {
  const service = getInvoiceService();
  const [invoice, billingConfig] = await Promise.all([
    service.getById(id),
    getProjectService().getConfig(),
  ]);
  if (!invoice) return c.notFound();
  const [customer, quote] = await Promise.all([
    invoice.customerId
      ? getCustomerService().getById(invoice.customerId)
      : null,
    invoice.quoteId ? getQuoteService().getById(invoice.quoteId) : null,
  ]);
  return c.html(
    <InvoiceDetailView
      {...viewProps(c, "/invoices")}
      item={invoice}
      displayStatus={service.displayStatus(invoice)}
      billingConfig={billingConfig}
      customerName={customer?.name}
      quoteNumber={quote?.number}
    />,
  );
}

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
  // Derive a due date from the payment terms if one wasn't set, then issue the
  // invoice — issue() freezes the quote snapshot and marks it sent (status,
  // sentAt, frozenAt). The due-date update must land before the freeze.
  const now = new Date().toISOString();
  if (!invoice.dueDate && invoice.paymentTerms) {
    const match = invoice.paymentTerms.match(/NET\s+(\d+)/i);
    if (match) {
      const days = parseInt(match[1], 10);
      const due = new Date();
      due.setDate(due.getDate() + days);
      await service.update(id, { dueDate: due.toISOString().slice(0, 10) });
    } else if (invoice.paymentTerms.toLowerCase().includes("due on receipt")) {
      await service.update(id, { dueDate: now.slice(0, 10) });
    }
  }
  await service.issue(id);
  return new Response(null, {
    status: 204,
    headers: { "HX-Redirect": `/invoices/${id}` },
  });
});

invoicesRouter.get("/:id", (c) => renderDetail(c, c.req.param("id")));

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

  // Checksum the on-disk markdown so the exported PDF carries a fingerprint
  // that tracks the local invoice state, alongside the generation date.
  const raw = await service.getRawMarkdown(id);
  const checksum = raw ? await sha256Hex(raw) : null;

  return c.html(
    <InvoicePrintView
      invoice={invoice}
      displayStatus={service.displayStatus(invoice)}
      billingConfig={billingConfig}
      customer={customer ?? null}
      checksum={checksum}
      generatedAt={new Date().toISOString()}
      nonce={c.get("nonce")}
    />,
  );
});
