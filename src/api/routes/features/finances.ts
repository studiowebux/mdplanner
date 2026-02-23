/**
 * Financial Period CRUD routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  cacheWriteThrough,
  cachePurge,
  errorResponse,
  getParser,
  jsonResponse,
} from "../context.ts";

export const financesRouter = new Hono<{ Variables: AppVariables }>();

// GET /finances - list all periods sorted by date desc
financesRouter.get("/", async (c) => {
  const parser = getParser(c);
  const periods = await parser.readFinancialPeriods();
  return jsonResponse(periods);
});

// GET /finances/:id - single period
financesRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const periods = await parser.readFinancialPeriods();
  const period = periods.find((p) => p.id === id);
  if (!period) return errorResponse("Not found", 404);
  return jsonResponse(period);
});

// POST /finances - create period
financesRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const record = await parser.addFinancialPeriod({
    period: body.period || "",
    cash_on_hand: Number(body.cash_on_hand) || 0,
    revenue: body.revenue ?? [],
    expenses: body.expenses ?? [],
    notes: body.notes,
  });
  await cacheWriteThrough(c, "financial_periods");
  return jsonResponse({ success: true, id: record.id }, 201);
});

// PUT /finances/:id - update period
financesRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  // Only merge fields explicitly provided to avoid clobbering existing values.
  const updates: Record<string, unknown> = {};
  if (body.period !== undefined) updates.period = body.period;
  if (body.cash_on_hand !== undefined) {
    updates.cash_on_hand = Number(body.cash_on_hand) || 0;
  }
  if (body.revenue !== undefined) updates.revenue = body.revenue;
  if (body.expenses !== undefined) updates.expenses = body.expenses;
  if (body.notes !== undefined) updates.notes = body.notes;
  const updated = await parser.updateFinancialPeriod(id, updates);
  if (!updated) return errorResponse("Not found", 404);
  await cacheWriteThrough(c, "financial_periods");
  return jsonResponse({ success: true });
});

// DELETE /finances/:id - delete period
financesRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const deleted = await parser.deleteFinancialPeriod(id);
  if (!deleted) return errorResponse("Not found", 404);
  cachePurge(c, "financial_periods", id);
  return jsonResponse({ success: true });
});
