/**
 * Portfolio management routes.
 */

import { Hono } from "hono";
import { AppVariables, getParser, jsonResponse, errorResponse } from "./context.ts";
import { DirectoryMarkdownParser } from "../../lib/parser/directory/parser.ts";

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

  return jsonResponse(updated);
});
