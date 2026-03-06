/**
 * Marketing plan builder CRUD routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  errorResponse,
  getParser,
  jsonResponse,
} from "../context.ts";

export const marketingPlansRouter = new Hono<{ Variables: AppVariables }>();

// GET /marketing-plans - list all plans
marketingPlansRouter.get("/", async (c) => {
  const parser = getParser(c);
  const plans = await parser.readMarketingPlans();
  return jsonResponse(plans);
});

// GET /marketing-plans/:id - single plan
marketingPlansRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const plans = await parser.readMarketingPlans();
  const plan = plans.find((p) => p.id === id);
  if (!plan) return errorResponse("Not found", 404);
  return jsonResponse(plan);
});

// POST /marketing-plans - create plan
marketingPlansRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const plan = await parser.addMarketingPlan({
    name: body.name || "",
    description: body.description,
    status: body.status ?? "draft",
    budgetTotal: body.budgetTotal,
    budgetCurrency: body.budgetCurrency,
    startDate: body.startDate,
    endDate: body.endDate,
    targetAudiences: body.targetAudiences,
    channels: body.channels,
    campaigns: body.campaigns,
    kpiTargets: body.kpiTargets,
    notes: body.notes,
  });
  await cacheWriteThrough(c, "marketing_plans");
  return jsonResponse({ success: true, id: plan.id }, 201);
});

// PUT /marketing-plans/:id - update plan
marketingPlansRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await parser.updateMarketingPlan(id, {
    name: body.name,
    description: body.description,
    status: body.status,
    budgetTotal: body.budgetTotal,
    budgetCurrency: body.budgetCurrency,
    startDate: body.startDate,
    endDate: body.endDate,
    targetAudiences: body.targetAudiences,
    channels: body.channels,
    campaigns: body.campaigns,
    kpiTargets: body.kpiTargets,
    notes: body.notes,
  });
  if (!updated) return errorResponse("Not found", 404);
  await cacheWriteThrough(c, "marketing_plans");
  return jsonResponse({ success: true });
});

// DELETE /marketing-plans/:id - delete plan
marketingPlansRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const deleted = await parser.deleteMarketingPlan(id);
  if (!deleted) return errorResponse("Not found", 404);
  cachePurge(c, "marketing_plans", id);
  return jsonResponse({ success: true });
});
