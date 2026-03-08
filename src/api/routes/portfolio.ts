/**
 * Portfolio management routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  errorResponse,
  getParser,
  jsonResponse,
} from "./context.ts";
import { DirectoryMarkdownParser } from "../../lib/parser/directory/parser.ts";
import { eventBus } from "../../lib/event-bus.ts";

export const portfolioRouter = new Hono<{ Variables: AppVariables }>();

// GET /portfolio - list all portfolio items
portfolioRouter.get("/", async (c) => {
  const parser = getParser(c);

  // Portfolio only works with directory-based projects
  if (!(parser instanceof DirectoryMarkdownParser)) {
    return jsonResponse([]);
  }

  const hasPortfolio = await parser.hasPortfolio();
  if (!hasPortfolio) {
    return jsonResponse([]);
  }

  const items = await parser.readPortfolioItems();
  return jsonResponse(items);
});

// GET /portfolio/summary - get portfolio summary
portfolioRouter.get("/summary", async (c) => {
  const parser = getParser(c);

  // Portfolio only works with directory-based projects
  if (!(parser instanceof DirectoryMarkdownParser)) {
    return jsonResponse({
      total: 0,
      byStatus: {},
      byCategory: {},
      avgProgress: 0,
      totalRevenue: 0,
      totalExpenses: 0,
    });
  }

  const hasPortfolio = await parser.hasPortfolio();
  if (!hasPortfolio) {
    return jsonResponse({
      total: 0,
      byStatus: {},
      byCategory: {},
      avgProgress: 0,
      totalRevenue: 0,
      totalExpenses: 0,
    });
  }

  const summary = await parser.getPortfolioSummary();
  return jsonResponse(summary);
});

// GET /portfolio/:id - get single portfolio item
portfolioRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");

  if (!(parser instanceof DirectoryMarkdownParser)) {
    return errorResponse("Portfolio requires directory-based project", 400);
  }

  const item = await parser.readPortfolioItem(id);
  if (!item) {
    return errorResponse(`Portfolio item ${id} not found`, 404);
  }

  return jsonResponse(item);
});

// POST /portfolio - create portfolio item
portfolioRouter.post("/", async (c) => {
  const parser = getParser(c);

  if (!(parser instanceof DirectoryMarkdownParser)) {
    return errorResponse("Portfolio requires directory-based project", 400);
  }

  const body = await c.req.json();

  if (!body.name) {
    return errorResponse("Name is required", 400);
  }

  const existing = await parser.readPortfolioItems();
  const duplicate = existing.find(
    (i) => i.name.toLowerCase() === body.name.trim().toLowerCase(),
  );
  if (duplicate) {
    return errorResponse(`A project named "${body.name}" already exists`, 409);
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
  return jsonResponse(item, 201);
});

// PUT /portfolio/:id - update portfolio item
portfolioRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");

  if (!(parser instanceof DirectoryMarkdownParser)) {
    return errorResponse("Portfolio requires directory-based project", 400);
  }

  const updates = await c.req.json();
  const updated = await parser.updatePortfolioItem(id, updates);

  if (!updated) {
    return errorResponse(`Portfolio item ${id} not found`, 404);
  }

  await cacheWriteThrough(c, "portfolio");
  eventBus.emit({ entity: "portfolio", action: "updated", id });
  return jsonResponse(updated);
});

// POST /portfolio/:id/status-updates - add a status update
portfolioRouter.post("/:id/status-updates", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");

  if (!(parser instanceof DirectoryMarkdownParser)) {
    return errorResponse("Portfolio requires directory-based project", 400);
  }

  const body = await c.req.json();
  if (!body.message?.trim()) {
    return errorResponse("message is required", 400);
  }

  const update = await parser.addPortfolioStatusUpdate(id, body.message.trim());
  if (!update) {
    return errorResponse(`Portfolio item ${id} not found`, 404);
  }

  cacheWriteThrough(c, "portfolio");
  return jsonResponse({ success: true, update });
});

// DELETE /portfolio/:id/status-updates/:updateId - delete a status update
portfolioRouter.delete("/:id/status-updates/:updateId", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const updateId = c.req.param("updateId");

  if (!(parser instanceof DirectoryMarkdownParser)) {
    return errorResponse("Portfolio requires directory-based project", 400);
  }

  const ok = await parser.deletePortfolioStatusUpdate(id, updateId);
  if (!ok) {
    return errorResponse(`Portfolio item or update not found`, 404);
  }

  cacheWriteThrough(c, "portfolio");
  return jsonResponse({ success: true });
});

// DELETE /portfolio/:id - delete portfolio item
portfolioRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");

  if (!(parser instanceof DirectoryMarkdownParser)) {
    return errorResponse("Portfolio requires directory-based project", 400);
  }

  const deleted = await parser.deletePortfolioItem(id);

  if (!deleted) {
    return errorResponse(`Portfolio item ${id} not found`, 404);
  }

  cachePurge(c, "portfolio", id);
  eventBus.emit({ entity: "portfolio", action: "deleted", id });
  return jsonResponse({ success: true });
});
