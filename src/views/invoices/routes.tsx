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

/** Render the detail page; `?editing=true` enables in-place notes/footer editing. */
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
  const editing = c.req.query("editing") === "true";
  return c.html(
    <InvoiceDetailView
      {...viewProps(c, "/invoices")}
      item={invoice}
      displayStatus={service.displayStatus(invoice)}
      billingConfig={billingConfig}
      customerName={customer?.name}
      quoteNumber={quote?.number}
      editing={editing}
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
  return new Response(null, {
    status: 204,
    headers: { "HX-Redirect": `/invoices/${id}` },
  });
});

invoicesRouter.get("/:id", (c) => renderDetail(c, c.req.param("id")));

// In-place description save (Edit Mode).
invoicesRouter.put("/:id/description", async (c) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const description = String(body.description ?? "").trim() || undefined;
  await getInvoiceService().update(id, { description });
  return renderDetail(c, id);
});

// In-place notes save (Edit Mode). Factory provides edit/delete routes.
invoicesRouter.put("/:id/notes", async (c) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const notes = String(body.notes ?? "").trim() || undefined;
  await getInvoiceService().update(id, { notes });
  return renderDetail(c, id);
});

// In-place footer (Terms) save (Edit Mode).
invoicesRouter.put("/:id/footer", async (c) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const footer = String(body.footer ?? "").trim() || undefined;
  await getInvoiceService().update(id, { footer });
  return renderDetail(c, id);
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
