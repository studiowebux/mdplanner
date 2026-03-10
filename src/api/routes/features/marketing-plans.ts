/**
 * Marketing plan builder CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const marketingPlansRouter = new OpenAPIHono<
  { Variables: AppVariables }
>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

// --- Route definitions ---

const listMarketingPlansRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["MarketingPlans"],
  summary: "List all marketing plans",
  operationId: "listMarketingPlans",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of marketing plans",
    },
  },
});

const getMarketingPlanRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["MarketingPlans"],
  summary: "Get a single marketing plan",
  operationId: "getMarketingPlan",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Marketing plan details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createMarketingPlanRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["MarketingPlans"],
  summary: "Create marketing plan",
  operationId: "createMarketingPlan",
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
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), id: z.string() }),
        },
      },
      description: "Marketing plan created",
    },
  },
});

const updateMarketingPlanRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["MarketingPlans"],
  summary: "Update marketing plan",
  operationId: "updateMarketingPlan",
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
      content: { "application/json": { schema: SuccessSchema } },
      description: "Marketing plan updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteMarketingPlanRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["MarketingPlans"],
  summary: "Delete marketing plan",
  operationId: "deleteMarketingPlan",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Marketing plan deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

marketingPlansRouter.openapi(listMarketingPlansRoute, async (c) => {
  const parser = getParser(c);
  const plans = await parser.readMarketingPlans();
  return c.json(plans, 200);
});

marketingPlansRouter.openapi(getMarketingPlanRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const plans = await parser.readMarketingPlans();
  const plan = plans.find((p) => p.id === id);
  if (!plan) return c.json({ error: "Not found" }, 404);
  return c.json(plan, 200);
});

marketingPlansRouter.openapi(createMarketingPlanRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
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
  return c.json({ success: true, id: plan.id }, 201);
});

marketingPlansRouter.openapi(updateMarketingPlanRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
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
  if (!updated) return c.json({ error: "Not found" }, 404);
  await cacheWriteThrough(c, "marketing_plans");
  return c.json({ success: true }, 200);
});

marketingPlansRouter.openapi(deleteMarketingPlanRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const deleted = await parser.deleteMarketingPlan(id);
  if (!deleted) return c.json({ error: "Not found" }, 404);
  cachePurge(c, "marketing_plans", id);
  return c.json({ success: true }, 200);
});
