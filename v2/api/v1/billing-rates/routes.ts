// BillingRate CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getBillingRateService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  BillingRateSchema,
  CreateBillingRateSchema,
  ListBillingRateOptionsSchema,
  UpdateBillingRateSchema,
} from "../../../types/billing-rate.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const billingRatesRouter = new OpenAPIHono();

// GET /
const listBillingRatesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Billing Rates"],
  summary: "List all billing rates",
  operationId: "listBillingRates",
  request: { query: ListBillingRateOptionsSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(BillingRateSchema) },
      },
      description: "List of billing rates",
    },
  },
});

billingRatesRouter.openapi(listBillingRatesRoute, async (c) => {
  try {
    const { q } = c.req.valid("query");
    const rates = await getBillingRateService().list({ q });
    return c.json(rates, 200);
  } catch (err) {
    throw err;
  }
});

// GET /{id}
const getBillingRateRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Billing Rates"],
  summary: "Get billing rate by ID",
  operationId: "getBillingRate",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: BillingRateSchema } },
      description: "Billing rate",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

billingRatesRouter.openapi(getBillingRateRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const rate = await getBillingRateService().getById(id);
    if (!rate) return c.json(notFound("BILLING_RATE", id), 404);
    return c.json(rate, 200);
  } catch (err) {
    throw err;
  }
});

// POST /
const createBillingRateRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Billing Rates"],
  summary: "Create a billing rate",
  operationId: "createBillingRate",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateBillingRateSchema },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: BillingRateSchema } },
      description: "Created billing rate",
    },
  },
});

billingRatesRouter.openapi(createBillingRateRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const rate = await getBillingRateService().create(data);
    publish("billing-rate.created");
    return c.json(rate, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /{id}
const updateBillingRateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Billing Rates"],
  summary: "Update a billing rate",
  operationId: "updateBillingRate",
  request: {
    params: IdParam,
    body: {
      content: {
        "application/json": { schema: UpdateBillingRateSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: BillingRateSchema } },
      description: "Updated billing rate",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

billingRatesRouter.openapi(updateBillingRateRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const rate = await getBillingRateService().update(id, data);
    if (!rate) return c.json(notFound("BILLING_RATE", id), 404);
    publish("billing-rate.updated");
    return c.json(rate, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /{id}
const deleteBillingRateRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Billing Rates"],
  summary: "Delete a billing rate",
  operationId: "deleteBillingRate",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

billingRatesRouter.openapi(deleteBillingRateRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getBillingRateService().delete(id);
    if (!ok) return c.json(notFound("BILLING_RATE", id), 404);
    publish("billing-rate.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});
