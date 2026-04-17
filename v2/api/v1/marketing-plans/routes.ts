// Marketing Plan API routes — OpenAPI CRUD endpoints.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getMarketingPlanService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateMarketingPlanSchema,
  ListMarketingPlanOptionsSchema,
  MarketingPlanSchema,
  UpdateMarketingPlanSchema,
} from "../../../types/marketing-plan.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const marketingPlansRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Marketing Plans"],
  summary: "List all marketing plans",
  operationId: "listMarketingPlans",
  request: { query: ListMarketingPlanOptionsSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(MarketingPlanSchema) },
      },
      description: "List of marketing plans",
    },
  },
});

marketingPlansRouter.openapi(listRoute, async (c) => {
  try {
    const { status, q } = c.req.valid("query");
    const plans = await getMarketingPlanService().list({ status, q });
    return c.json(plans, 200);
  } catch (err) {
    throw err;
  }
});

// GET /{id}
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Marketing Plans"],
  summary: "Get marketing plan by ID",
  operationId: "getMarketingPlan",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: MarketingPlanSchema } },
      description: "Marketing plan",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

marketingPlansRouter.openapi(getRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const plan = await getMarketingPlanService().getById(id);
    if (!plan) return c.json(notFound("MARKETING_PLAN", id), 404);
    return c.json(plan, 200);
  } catch (err) {
    throw err;
  }
});

// POST /
const createMktPlanRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Marketing Plans"],
  summary: "Create a marketing plan",
  operationId: "createMarketingPlan",
  request: {
    body: {
      content: { "application/json": { schema: CreateMarketingPlanSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: MarketingPlanSchema } },
      description: "Created marketing plan",
    },
  },
});

marketingPlansRouter.openapi(createMktPlanRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const plan = await getMarketingPlanService().create(data);
    publish("marketing-plan.created");
    return c.json(plan, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /{id}
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Marketing Plans"],
  summary: "Update a marketing plan",
  operationId: "updateMarketingPlan",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateMarketingPlanSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: MarketingPlanSchema } },
      description: "Updated marketing plan",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

marketingPlansRouter.openapi(updateRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const plan = await getMarketingPlanService().update(id, data);
    if (!plan) return c.json(notFound("MARKETING_PLAN", id), 404);
    publish("marketing-plan.updated");
    return c.json(plan, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /{id}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Marketing Plans"],
  summary: "Delete a marketing plan",
  operationId: "deleteMarketingPlan",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

marketingPlansRouter.openapi(deleteRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getMarketingPlanService().delete(id);
    if (!ok) return c.json(notFound("MARKETING_PLAN", id), 404);
    publish("marketing-plan.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});
