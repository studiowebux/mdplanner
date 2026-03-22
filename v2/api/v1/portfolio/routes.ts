// Portfolio CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getPortfolioService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  AddStatusUpdateSchema,
  CreatePortfolioItemSchema,
  PortfolioItemSchema,
  PortfolioStatusUpdateSchema,
  PortfolioSummarySchema,
  UpdatePortfolioItemSchema,
} from "../../../types/portfolio.types.ts";
import {
  ErrorSchema,
  IdParam,
  IdWithUpdateIdParam,
  notFound,
} from "../../../types/api.ts";

export const portfolioRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Portfolio"],
  summary: "List portfolio items, optionally filtered by status or search",
  operationId: "listPortfolio",
  request: {
    query: z.object({
      q: z.string().optional().openapi({ description: "Search query" }),
      status: z.string().optional().openapi({
        description: "Filter by status",
      }),
      category: z.string().optional().openapi({
        description: "Filter by category",
      }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(PortfolioItemSchema) },
      },
      description: "List of portfolio items",
    },
  },
});

portfolioRouter.openapi(listRoute, async (c) => {
  const { q, status, category } = c.req.valid("query");
  const svc = getPortfolioService();
  let items = q ? await svc.search(q) : await svc.list();
  if (status) items = items.filter((i) => i.status === status);
  if (category) items = items.filter((i) => i.category === category);
  return c.json(items, 200);
});

// GET /summary
const summaryRoute = createRoute({
  method: "get",
  path: "/summary",
  tags: ["Portfolio"],
  summary: "Get aggregated portfolio statistics",
  operationId: "getPortfolioSummary",
  responses: {
    200: {
      content: { "application/json": { schema: PortfolioSummarySchema } },
      description: "Portfolio summary",
    },
  },
});

portfolioRouter.openapi(summaryRoute, async (c) => {
  const items = await getPortfolioService().list();
  const byStatus: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let totalRevenue = 0;
  let totalExpenses = 0;
  let progressSum = 0;

  for (const item of items) {
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
    totalRevenue += item.revenue ?? 0;
    totalExpenses += item.expenses ?? 0;
    progressSum += item.progress ?? 0;
  }

  return c.json(
    {
      total: items.length,
      byStatus,
      byCategory,
      avgProgress: items.length > 0
        ? Math.round(progressSum / items.length)
        : 0,
      totalRevenue,
      totalExpenses,
    },
    200,
  );
});

// GET /:id
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Portfolio"],
  summary: "Get portfolio item by ID",
  operationId: "getPortfolioItem",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: PortfolioItemSchema } },
      description: "Portfolio item",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

portfolioRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getPortfolioService().getById(id);
  if (!item) return c.json(notFound("PORTFOLIO_ITEM", id), 404);
  return c.json(item, 200);
});

// POST /
const createItemRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Portfolio"],
  summary: "Create a portfolio item",
  operationId: "createPortfolioItem",
  request: {
    body: {
      content: { "application/json": { schema: CreatePortfolioItemSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: PortfolioItemSchema } },
      description: "Created portfolio item",
    },
    409: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Duplicate name",
    },
  },
});

portfolioRouter.openapi(createItemRoute, async (c) => {
  const data = c.req.valid("json");
  const svc = getPortfolioService();
  const existing = await svc.getByName(data.name);
  if (existing) {
    return c.json(
      {
        error: "PORTFOLIO_ITEM_DUPLICATE",
        message: `Portfolio item '${data.name}' already exists`,
      },
      409,
    );
  }
  const item = await svc.create(data);
  publish("portfolio.created");
  return c.json(item, 201);
});

// PUT /:id
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Portfolio"],
  summary: "Update a portfolio item",
  operationId: "updatePortfolioItem",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdatePortfolioItemSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: PortfolioItemSchema } },
      description: "Updated portfolio item",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

portfolioRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getPortfolioService().update(id, data);
  if (!item) return c.json(notFound("PORTFOLIO_ITEM", id), 404);
  publish("portfolio.updated");
  return c.json(item, 200);
});

// DELETE /:id
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Portfolio"],
  summary: "Delete a portfolio item",
  operationId: "deletePortfolioItem",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

portfolioRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getPortfolioService().delete(id);
  if (!ok) return c.json(notFound("PORTFOLIO_ITEM", id), 404);
  publish("portfolio.deleted");
  return new Response(null, { status: 204 });
});

// POST /:id/status-updates
const addStatusUpdateRoute = createRoute({
  method: "post",
  path: "/{id}/status-updates",
  tags: ["Portfolio"],
  summary: "Add a status update to a portfolio item",
  operationId: "addPortfolioStatusUpdate",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: AddStatusUpdateSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        "application/json": { schema: PortfolioStatusUpdateSchema },
      },
      description: "Created status update",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Portfolio item not found",
    },
  },
});

portfolioRouter.openapi(addStatusUpdateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { message } = c.req.valid("json");
  const update = await getPortfolioService().addStatusUpdate(id, message);
  if (!update) return c.json(notFound("PORTFOLIO_ITEM", id), 404);
  publish("portfolio.updated");
  return c.json(update, 201);
});

// DELETE /:id/status-updates/:updateId
const deleteStatusUpdateRoute = createRoute({
  method: "delete",
  path: "/{id}/status-updates/{updateId}",
  tags: ["Portfolio"],
  summary: "Delete a status update from a portfolio item",
  operationId: "deletePortfolioStatusUpdate",
  request: {
    params: IdWithUpdateIdParam,
  },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

portfolioRouter.openapi(deleteStatusUpdateRoute, async (c) => {
  const { id, updateId } = c.req.valid("param");
  const ok = await getPortfolioService().deleteStatusUpdate(id, updateId);
  if (!ok) return c.json(notFound("STATUS_UPDATE", updateId), 404);
  publish("portfolio.updated");
  return new Response(null, { status: 204 });
});
