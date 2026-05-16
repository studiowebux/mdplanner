// Quote CRUD + status transition routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  getInvoiceService,
  getQuoteService,
} from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateQuoteSchema,
  ListQuoteOptionsSchema,
  QuoteRevisionSchema,
  QuoteSchema,
  UpdateQuoteSchema,
} from "../../../types/quote.types.ts";
import {
  ErrorSchema,
  IdParam,
  invalidState,
  notFound,
} from "../../../types/api.ts";

export const quotesRouter = new OpenAPIHono();

// GET /
const listQuotesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Quotes"],
  summary: "List all quotes",
  operationId: "listQuotes",
  request: { query: ListQuoteOptionsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(QuoteSchema) } },
      description: "List of quotes",
    },
  },
});

quotesRouter.openapi(listQuotesRoute, async (c) => {
  try {
    const { status, customerId, q } = c.req.valid("query");
    const quotes = await getQuoteService().list({ status, customerId, q });
    return c.json(quotes, 200);
  } catch (err) {
    throw err;
  }
});

// GET /{id}
const getQuoteRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Quotes"],
  summary: "Get quote by ID",
  operationId: "getQuote",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: QuoteSchema } },
      description: "Quote",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

quotesRouter.openapi(getQuoteRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const quote = await getQuoteService().getById(id);
    if (!quote) return c.json(notFound("QUOTE", id), 404);
    return c.json(quote, 200);
  } catch (err) {
    throw err;
  }
});

// POST /
const createQuoteRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Quotes"],
  summary: "Create a quote",
  operationId: "createQuote",
  request: {
    body: {
      content: { "application/json": { schema: CreateQuoteSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: QuoteSchema } },
      description: "Created quote",
    },
  },
});

quotesRouter.openapi(createQuoteRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const quote = await getQuoteService().create(data);
    publish("quote.created");
    return c.json(quote, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /{id}
const updateQuoteRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Quotes"],
  summary: "Update a quote",
  operationId: "updateQuote",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateQuoteSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: QuoteSchema } },
      description: "Updated quote",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

quotesRouter.openapi(updateQuoteRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const quote = await getQuoteService().update(id, data);
    if (!quote) return c.json(notFound("QUOTE", id), 404);
    publish("quote.updated");
    return c.json(quote, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /{id}
const deleteQuoteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Quotes"],
  summary: "Delete a quote",
  operationId: "deleteQuote",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

quotesRouter.openapi(deleteQuoteRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getQuoteService().delete(id);
    if (!ok) return c.json(notFound("QUOTE", id), 404);
    publish("quote.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

// POST /{id}/submit-approval — draft → pending_approval
quotesRouter.post("/:id/submit-approval", async (c) => {
  const id = c.req.param("id");
  const service = getQuoteService();
  const quote = await service.getById(id);
  if (!quote) return c.json(notFound("QUOTE", id), 404);
  if (quote.status !== "draft") {
    return c.json(
      invalidState("Only draft quotes can be submitted for approval"),
      422,
    );
  }
  const updated = await service.update(id, {
    status: "pending_approval",
    submittedForApprovalAt: new Date().toISOString(),
  });
  if (!updated) return c.json(notFound("QUOTE", id), 404);
  publish("quote.updated");
  return c.json(updated, 200);
});

// POST /{id}/approve — pending_approval → approved
quotesRouter.post("/:id/approve", async (c) => {
  const id = c.req.param("id");
  const service = getQuoteService();
  const quote = await service.getById(id);
  if (!quote) return c.json(notFound("QUOTE", id), 404);
  if (quote.status !== "pending_approval") {
    return c.json(
      invalidState("Only quotes pending approval can be approved"),
      422,
    );
  }
  const body = await c.req.json().catch(() => ({})) as {
    notes?: string;
    approver?: string;
  };
  const actor = c.get("actor" as never) as { name?: string } | undefined;
  const updated = await service.update(id, {
    status: "approved",
    approvedBy: body.approver ?? actor?.name ?? "Unknown",
    approvedAt: new Date().toISOString(),
    approvalNotes: body.notes ?? null,
  });
  if (!updated) return c.json(notFound("QUOTE", id), 404);
  publish("quote.updated");
  return c.json(updated, 200);
});

// POST /{id}/reject-approval — pending_approval → draft
quotesRouter.post("/:id/reject-approval", async (c) => {
  const id = c.req.param("id");
  const service = getQuoteService();
  const quote = await service.getById(id);
  if (!quote) return c.json(notFound("QUOTE", id), 404);
  if (quote.status !== "pending_approval") {
    return c.json(
      invalidState("Only quotes pending approval can be rejected"),
      422,
    );
  }
  const body = await c.req.json().catch(() => ({})) as { notes?: string };
  const updated = await service.update(id, {
    status: "draft",
    approvalNotes: body.notes ?? null,
    submittedForApprovalAt: null,
  });
  if (!updated) return c.json(notFound("QUOTE", id), 404);
  publish("quote.updated");
  return c.json(updated, 200);
});

// GET /{id}/revisions
const getQuoteRevisionsRoute = createRoute({
  method: "get",
  path: "/{id}/revisions",
  tags: ["Quotes"],
  summary: "Get revision history for a quote",
  operationId: "getQuoteRevisions",
  request: { params: IdParam },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(QuoteRevisionSchema) },
      },
      description: "Revision history (oldest first)",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

quotesRouter.openapi(getQuoteRevisionsRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const quote = await getQuoteService().getById(id);
    if (!quote) return c.json(notFound("QUOTE", id), 404);
    const revisions = await getQuoteService().getRevisions(id);
    return c.json(revisions, 200);
  } catch (err) {
    throw err;
  }
});

// POST /{id}/send
quotesRouter.post("/:id/send", async (c) => {
  const id = c.req.param("id");
  const service = getQuoteService();
  const quote = await service.getById(id);
  if (!quote) return c.json(notFound("QUOTE", id), 404);
  if (quote.status !== "approved") {
    return c.json(invalidState("Only approved quotes can be sent"), 422);
  }
  const updated = await service.sendQuote(quote);
  if (!updated) return c.json(notFound("QUOTE", id), 404);
  publish("quote.updated");
  return c.json(updated, 200);
});

// POST /{id}/accept
quotesRouter.post("/:id/accept", async (c) => {
  const id = c.req.param("id");
  const service = getQuoteService();
  const quote = await service.getById(id);
  if (!quote) return c.json(notFound("QUOTE", id), 404);
  if (quote.status !== "sent") {
    return c.json(invalidState("Only sent quotes can be accepted"), 422);
  }
  const updated = await service.update(id, {
    status: "accepted",
    acceptedAt: new Date().toISOString(),
  });
  if (!updated) return c.json(notFound("QUOTE", id), 404);
  publish("quote.updated");
  return c.json(updated, 200);
});

// POST /{id}/reject
quotesRouter.post("/:id/reject", async (c) => {
  const id = c.req.param("id");
  const service = getQuoteService();
  const quote = await service.getById(id);
  if (!quote) return c.json(notFound("QUOTE", id), 404);
  if (quote.status !== "sent") {
    return c.json(invalidState("Only sent quotes can be rejected"), 422);
  }
  const updated = await service.update(id, {
    status: "rejected",
  });
  if (!updated) return c.json(notFound("QUOTE", id), 404);
  publish("quote.updated");
  return c.json(updated, 200);
});

// POST /{id}/to-invoice — convert accepted quote to invoice
// Depends on Invoice domain — returns 501 until InvoiceService is available
quotesRouter.post("/:id/to-invoice", async (c) => {
  const id = c.req.param("id");
  const service = getQuoteService();
  const quote = await service.getById(id);
  if (!quote) return c.json(notFound("QUOTE", id), 404);
  if (quote.status !== "accepted") {
    return c.json(invalidState("Only accepted quotes can be converted"), 422);
  }
  if (quote.convertedToInvoice) {
    return c.json(invalidState("Quote already converted to invoice"), 422);
  }

  const nonOptionalItems = quote.lineItems
    .filter((li) => !li.optional)
    .map(({ optional: _, ...rest }) => rest);

  const invoice = await getInvoiceService().create({
    customerId: quote.customerId,
    quoteId: quote.id,
    title: quote.title,
    lineItems: nonOptionalItems,
    currency: quote.currency,
    taxRate: quote.taxRate,
  });

  await service.update(id, {
    convertedToInvoice: invoice.id,
  });

  publish("quote.updated");
  publish("invoice.created");
  return c.json(invoice, 201);
});
