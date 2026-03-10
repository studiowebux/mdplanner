/**
 * Portfolio management routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "./context.ts";
import { DirectoryMarkdownParser } from "../../lib/parser/directory/parser.ts";
import { eventBus } from "../../lib/event-bus.ts";

export const portfolioRouter = new OpenAPIHono<{
  Variables: AppVariables;
}>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

const statusUpdateParams = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
  updateId: z.string().openapi({ param: { name: "updateId", in: "path" } }),
});

// --- Route definitions ---

const listPortfolioRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Portfolio"],
  summary: "List all portfolio items",
  operationId: "listPortfolioItems",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of portfolio items",
    },
  },
});

const getPortfolioSummaryRoute = createRoute({
  method: "get",
  path: "/summary",
  tags: ["Portfolio"],
  summary: "Get portfolio summary with totals by status and category",
  operationId: "getPortfolioSummary",
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Portfolio summary",
    },
  },
});

const getPortfolioItemRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Portfolio"],
  summary: "Get single portfolio item",
  operationId: "getPortfolioItem",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Portfolio item details",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Requires directory-based project",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createPortfolioItemRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Portfolio"],
  summary: "Create portfolio item",
  operationId: "createPortfolioItem",
  request: {
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "Portfolio item created",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
    409: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Duplicate name",
    },
  },
});

const updatePortfolioItemRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Portfolio"],
  summary: "Update portfolio item",
  operationId: "updatePortfolioItem",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Updated portfolio item",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Requires directory-based project",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const addStatusUpdateRoute = createRoute({
  method: "post",
  path: "/{id}/status-updates",
  tags: ["Portfolio"],
  summary: "Add a status update to a portfolio item",
  operationId: "addPortfolioStatusUpdate",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Status update added",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Portfolio item not found",
    },
  },
});

const deleteStatusUpdateRoute = createRoute({
  method: "delete",
  path: "/{id}/status-updates/{updateId}",
  tags: ["Portfolio"],
  summary: "Delete a status update from a portfolio item",
  operationId: "deletePortfolioStatusUpdate",
  request: { params: statusUpdateParams },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Status update deleted",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Requires directory-based project",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deletePortfolioItemRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Portfolio"],
  summary: "Delete portfolio item",
  operationId: "deletePortfolioItem",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Portfolio item deleted",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Requires directory-based project",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

portfolioRouter.openapi(listPortfolioRoute, async (c) => {
  const parser = getParser(c);
  if (!(parser instanceof DirectoryMarkdownParser)) {
    return c.json([], 200);
  }
  const hasPortfolio = await parser.hasPortfolio();
  if (!hasPortfolio) {
    return c.json([], 200);
  }
  const items = await parser.readPortfolioItems();
  return c.json(items, 200);
});

portfolioRouter.openapi(getPortfolioSummaryRoute, async (c) => {
  const parser = getParser(c);
  const empty = {
    total: 0,
    byStatus: {},
    byCategory: {},
    avgProgress: 0,
    totalRevenue: 0,
    totalExpenses: 0,
  };
  if (!(parser instanceof DirectoryMarkdownParser)) {
    return c.json(empty, 200);
  }
  const hasPortfolio = await parser.hasPortfolio();
  if (!hasPortfolio) {
    return c.json(empty, 200);
  }
  const summary = await parser.getPortfolioSummary();
  return c.json(summary, 200);
});

portfolioRouter.openapi(getPortfolioItemRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  if (!(parser instanceof DirectoryMarkdownParser)) {
    return c.json(
      { error: "Portfolio requires directory-based project" },
      400,
    );
  }
  const item = await parser.readPortfolioItem(id);
  if (!item) {
    return c.json({ error: `Portfolio item ${id} not found` }, 404);
  }
  return c.json(item, 200);
});

portfolioRouter.openapi(createPortfolioItemRoute, async (c) => {
  const parser = getParser(c);
  if (!(parser instanceof DirectoryMarkdownParser)) {
    return c.json(
      { error: "Portfolio requires directory-based project" },
      400,
    );
  }
  const body = c.req.valid("json");
  if (!body.name) {
    return c.json({ error: "Name is required" }, 400);
  }
  const existing = await parser.readPortfolioItems();
  const duplicate = existing.find(
    (i) => i.name.toLowerCase() === body.name.trim().toLowerCase(),
  );
  if (duplicate) {
    return c.json(
      { error: `A project named "${body.name}" already exists` },
      409,
    );
  }
  const item = await parser.createPortfolioItem({
    name: body.name,
    category: body.category || "Uncategorized",
    status: body.status || "active",
    client: body.client,
    revenue: body.revenue,
    expenses: body.expenses,
    progress: body.progress,
    description: body.description,
    startDate: body.startDate,
    endDate: body.endDate,
    team: body.team,
    kpis: body.kpis,
    urls: body.urls,
    logo: body.logo,
    license: body.license,
    techStack: body.techStack,
    billingCustomerId: body.billingCustomerId,
    githubRepo: body.githubRepo,
    brainManaged: body.brainManaged,
  });
  await cacheWriteThrough(c, "portfolio");
  eventBus.emit({ entity: "portfolio", action: "created", id: item.id });
  return c.json(item, 201);
});

portfolioRouter.openapi(updatePortfolioItemRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  if (!(parser instanceof DirectoryMarkdownParser)) {
    return c.json(
      { error: "Portfolio requires directory-based project" },
      400,
    );
  }
  const updates = c.req.valid("json");
  const updated = await parser.updatePortfolioItem(id, updates);
  if (!updated) {
    return c.json({ error: `Portfolio item ${id} not found` }, 404);
  }
  await cacheWriteThrough(c, "portfolio");
  eventBus.emit({ entity: "portfolio", action: "updated", id });
  return c.json(updated, 200);
});

portfolioRouter.openapi(addStatusUpdateRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  if (!(parser instanceof DirectoryMarkdownParser)) {
    return c.json(
      { error: "Portfolio requires directory-based project" },
      400,
    );
  }
  const body = c.req.valid("json");
  if (!body.message?.trim()) {
    return c.json({ error: "message is required" }, 400);
  }
  const update = await parser.addPortfolioStatusUpdate(id, body.message.trim());
  if (!update) {
    return c.json({ error: `Portfolio item ${id} not found` }, 404);
  }
  cacheWriteThrough(c, "portfolio");
  return c.json({ success: true, update }, 200);
});

portfolioRouter.openapi(deleteStatusUpdateRoute, async (c) => {
  const parser = getParser(c);
  const { id, updateId } = c.req.valid("param");
  if (!(parser instanceof DirectoryMarkdownParser)) {
    return c.json(
      { error: "Portfolio requires directory-based project" },
      400,
    );
  }
  const ok = await parser.deletePortfolioStatusUpdate(id, updateId);
  if (!ok) {
    return c.json({ error: "Portfolio item or update not found" }, 404);
  }
  cacheWriteThrough(c, "portfolio");
  return c.json({ success: true }, 200);
});

portfolioRouter.openapi(deletePortfolioItemRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  if (!(parser instanceof DirectoryMarkdownParser)) {
    return c.json(
      { error: "Portfolio requires directory-based project" },
      400,
    );
  }
  const deleted = await parser.deletePortfolioItem(id);
  if (!deleted) {
    return c.json({ error: `Portfolio item ${id} not found` }, 404);
  }
  cachePurge(c, "portfolio", id);
  eventBus.emit({ entity: "portfolio", action: "deleted", id });
  return c.json({ success: true }, 200);
});
