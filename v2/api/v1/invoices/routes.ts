// Invoice CRUD + status transition routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getInvoiceService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateInvoiceSchema,
  InvoiceSchema,
  ListInvoiceOptionsSchema,
  UpdateInvoiceSchema,
} from "../../../types/invoice.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const invoicesRouter = new OpenAPIHono();

// GET /
const listInvoicesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Invoices"],
  summary: "List all invoices",
  operationId: "listInvoices",
  request: { query: ListInvoiceOptionsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(InvoiceSchema) } },
      description: "List of invoices",
    },
  },
});

invoicesRouter.openapi(listInvoicesRoute, async (c) => {
  try {
    const { status, customerId, q } = c.req.valid("query");
    const invoices = await getInvoiceService().list({
      status,
      customerId,
      q,
    });
    return c.json(invoices, 200);
  } catch (err) {
    throw err;
  }
});

// GET /{id}
const getInvoiceRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Invoices"],
  summary: "Get invoice by ID",
  operationId: "getInvoice",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: InvoiceSchema } },
      description: "Invoice",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

invoicesRouter.openapi(getInvoiceRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const invoice = await getInvoiceService().getById(id);
    if (!invoice) return c.json(notFound("INVOICE", id), 404);
    return c.json(invoice, 200);
  } catch (err) {
    throw err;
  }
});

// POST /
const createInvoiceRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Invoices"],
  summary: "Create an invoice",
  operationId: "createInvoice",
  request: {
    body: {
      content: { "application/json": { schema: CreateInvoiceSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: InvoiceSchema } },
      description: "Created invoice",
    },
  },
});

invoicesRouter.openapi(createInvoiceRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const invoice = await getInvoiceService().create(data);
    publish("invoice.created");
    return c.json(invoice, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /{id}
const updateInvoiceRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Invoices"],
  summary: "Update an invoice",
  operationId: "updateInvoice",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateInvoiceSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: InvoiceSchema } },
      description: "Updated invoice",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

invoicesRouter.openapi(updateInvoiceRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const invoice = await getInvoiceService().update(id, data);
    if (!invoice) return c.json(notFound("INVOICE", id), 404);
    publish("invoice.updated");
    return c.json(invoice, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /{id}
const deleteInvoiceRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Invoices"],
  summary: "Delete an invoice",
  operationId: "deleteInvoice",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

invoicesRouter.openapi(deleteInvoiceRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getInvoiceService().delete(id);
    if (!ok) return c.json(notFound("INVOICE", id), 404);
    publish("invoice.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

// POST /{id}/send
invoicesRouter.post("/:id/send", async (c) => {
  const id = c.req.param("id");
  const service = getInvoiceService();
  const invoice = await service.getById(id);
  if (!invoice) return c.json(notFound("INVOICE", id), 404);
  if (invoice.status !== "draft") {
    return c.json({ error: "Only draft invoices can be sent" }, 400);
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: "sent",
    sentAt: now,
  };

  // Auto-calculate dueDate from paymentTerms if not manually set
  if (!invoice.dueDate && invoice.paymentTerms) {
    const match = invoice.paymentTerms.match(/NET\s+(\d+)/i);
    if (match) {
      const days = parseInt(match[1], 10);
      const due = new Date();
      due.setDate(due.getDate() + days);
      updates.dueDate = due.toISOString().slice(0, 10);
    } else if (
      invoice.paymentTerms.toLowerCase().includes("due on receipt")
    ) {
      updates.dueDate = now.slice(0, 10);
    }
  }

  const updated = await service.update(id, updates);
  if (!updated) return c.json(notFound("INVOICE", id), 404);
  publish("invoice.updated");
  return c.json(updated, 200);
});
