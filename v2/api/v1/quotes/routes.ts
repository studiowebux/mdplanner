// Quote CRUD + status transition routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getQuoteService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateQuoteSchema,
  ListQuoteOptionsSchema,
  QuoteSchema,
  UpdateQuoteSchema,
} from "../../../types/quote.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

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

// POST /{id}/send
quotesRouter.post("/:id/send", async (c) => {
  const id = c.req.param("id");
  const service = getQuoteService();
  const quote = await service.getById(id);
  if (!quote) return c.json(notFound("QUOTE", id), 404);
  if (quote.status !== "draft") {
    return c.json({ error: "Only draft quotes can be sent" }, 400);
  }
  const now = new Date().toISOString();
  const updated = await service.update(id, {
    status: "sent",
    sentAt: now,
    revision: (quote.revision ?? 0) + 1,
  } as Record<string, unknown>);
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
    return c.json({ error: "Only sent quotes can be accepted" }, 400);
  }
  const updated = await service.update(id, {
    status: "accepted",
    acceptedAt: new Date().toISOString(),
  } as Record<string, unknown>);
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
    return c.json({ error: "Only sent quotes can be rejected" }, 400);
  }
  const updated = await service.update(id, {
    status: "rejected",
  } as Record<string, unknown>);
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
    return c.json({ error: "Only accepted quotes can be converted" }, 400);
  }
  if (quote.convertedToInvoice) {
    return c.json({ error: "Quote already converted to invoice" }, 400);
  }
  // Invoice creation will be wired in the Invoice domain task
  return c.json(
    { error: "Invoice domain not yet available" },
    501,
  );
});
