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

const ErrorSchema = z
  .object({ error: z.string(), message: z.string().optional() })
  .openapi("MarketingPlanError");
const SuccessSchema = z
  .object({ success: z.boolean() })
  .openapi("MarketingPlanSuccess");
const SuccessWithIdSchema = z
  .object({ success: z.boolean(), id: z.string() })
  .openapi("MarketingPlanSuccessWithId");
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const channelStatus = z.enum(["planned", "active", "paused", "completed"]);

const MarketingTargetAudienceSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  size: z.string().optional(),
});

const MarketingChannelSchema = z.object({
  name: z.string(),
  budget: z.number().optional(),
  goals: z.string().optional(),
  status: channelStatus.optional(),
});

const MarketingCampaignSchema = z.object({
  name: z.string(),
  channel: z.string().optional(),
  budget: z.number().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: channelStatus.optional(),
  goals: z.string().optional(),
});

const MarketingKPITargetSchema = z.object({
  metric: z.string(),
  target: z.number(),
  current: z.number().optional(),
});

const MarketingPlanSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    status: z.enum(["draft", "active", "completed", "archived"]),
    budgetTotal: z.number().optional(),
    budgetCurrency: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    targetAudiences: z.array(MarketingTargetAudienceSchema).optional(),
    channels: z.array(MarketingChannelSchema).optional(),
    campaigns: z.array(MarketingCampaignSchema).optional(),
    kpiTargets: z.array(MarketingKPITargetSchema).optional(),
    notes: z.string().optional(),
    created: z.string(),
    updated: z.string(),
  })
  .openapi("MarketingPlan");

const CreateMarketingPlanSchema = z
  .object({
    name: z.string().optional().openapi({ description: "Plan name" }),
    description: z.string().optional(),
    status: z.enum(["draft", "active", "completed", "archived"]).optional(),
    budgetTotal: z.number().optional(),
    budgetCurrency: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    targetAudiences: z.array(MarketingTargetAudienceSchema).optional(),
    channels: z.array(MarketingChannelSchema).optional(),
    campaigns: z.array(MarketingCampaignSchema).optional(),
    kpiTargets: z.array(MarketingKPITargetSchema).optional(),
    notes: z.string().optional(),
  })
  .openapi("CreateMarketingPlan");

const UpdateMarketingPlanSchema = CreateMarketingPlanSchema.openapi(
  "UpdateMarketingPlan",
);

// --- Route definitions ---

const listMarketingPlansRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["MarketingPlans"],
  summary: "List all marketing plans",
  operationId: "listMarketingPlans",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(MarketingPlanSchema) },
      },
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
      content: { "application/json": { schema: MarketingPlanSchema } },
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
      content: { "application/json": { schema: CreateMarketingPlanSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuccessWithIdSchema } },
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
      content: { "application/json": { schema: UpdateMarketingPlanSchema } },
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
