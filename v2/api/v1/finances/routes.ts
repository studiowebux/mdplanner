// Finance CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getFinanceService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateFinanceSchema,
  FinanceSchema,
  FinanceSummarySchema,
  ListFinanceOptionsSchema,
  UpdateFinanceSchema,
} from "../../../types/finance.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const financesRouter = new OpenAPIHono();

// GET /summary — must be before /:id
financesRouter.openapi(
  createRoute({
    method: "get",
    path: "/summary",
    tags: ["Finances"],
    summary: "Get income/expense summary",
    operationId: "getFinanceSummary",
    request: {
      query: z.object({
        from: z.string().optional().openapi({
          param: { name: "from", in: "query" },
        }),
        to: z.string().optional().openapi({
          param: { name: "to", in: "query" },
        }),
      }),
    },
    responses: {
      200: {
        content: { "application/json": { schema: FinanceSummarySchema } },
        description: "Finance summary",
      },
    },
  }),
  async (c) => {
    const { from, to } = c.req.valid("query");
    const summary = await getFinanceService().getSummary({ from, to });
    return c.json(summary, 200);
  },
);

// GET /
financesRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Finances"],
    summary: "List all finance entries",
    operationId: "listFinances",
    request: { query: ListFinanceOptionsSchema },
    responses: {
      200: {
        content: { "application/json": { schema: z.array(FinanceSchema) } },
        description: "List of finance entries",
      },
    },
  }),
  async (c) => {
    const { q, type, from, to } = c.req.valid("query");
    const entries = await getFinanceService().list({ q, type, from, to });
    return c.json(entries, 200);
  },
);

// GET /{id}
financesRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Finances"],
    summary: "Get finance entry by ID",
    operationId: "getFinance",
    request: { params: IdParam },
    responses: {
      200: {
        content: { "application/json": { schema: FinanceSchema } },
        description: "Finance entry",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const entry = await getFinanceService().getById(id);
    if (!entry) return c.json(notFound("Finance entry", id), 404);
    return c.json(entry, 200);
  },
);

// POST /
financesRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Finances"],
    summary: "Create a finance entry",
    operationId: "createFinance",
    request: {
      body: {
        content: { "application/json": { schema: CreateFinanceSchema } },
        required: true,
      },
    },
    responses: {
      201: {
        content: { "application/json": { schema: FinanceSchema } },
        description: "Created finance entry",
      },
    },
  }),
  async (c) => {
    const data = c.req.valid("json");
    const entry = await getFinanceService().create(data);
    publish("finance.created");
    return c.json(entry, 201);
  },
);

// PUT /{id}
financesRouter.openapi(
  createRoute({
    method: "put",
    path: "/{id}",
    tags: ["Finances"],
    summary: "Update a finance entry",
    operationId: "updateFinance",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: UpdateFinanceSchema } },
        required: true,
      },
    },
    responses: {
      200: {
        content: { "application/json": { schema: FinanceSchema } },
        description: "Updated finance entry",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const entry = await getFinanceService().update(id, data);
    if (!entry) return c.json(notFound("Finance entry", id), 404);
    publish("finance.updated");
    return c.json(entry, 200);
  },
);

// DELETE /{id}
financesRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["Finances"],
    summary: "Delete a finance entry",
    operationId: "deleteFinance",
    request: { params: IdParam },
    responses: {
      204: { description: "Deleted" },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const ok = await getFinanceService().delete(id);
    if (!ok) return c.json(notFound("Finance entry", id), 404);
    publish("finance.deleted");
    return new Response(null, { status: 204 });
  },
);
