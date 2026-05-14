// Risk API routes — OpenAPI CRUD endpoints.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getRiskService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateRiskSchema,
  ListRiskOptionsSchema,
  RiskSchema,
  UpdateRiskSchema,
} from "../../../types/risk.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const riskApiRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Risk"],
  summary: "List all risks",
  operationId: "listRisks",
  request: { query: ListRiskOptionsSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(RiskSchema) },
      },
      description: "List of risks",
    },
  },
});

riskApiRouter.openapi(listRoute, async (c) => {
  try {
    const { category, status, project, q } = c.req.valid("query");
    const items = await getRiskService().list({ category, status, project, q });
    return c.json(items, 200);
  } catch (err) {
    throw err;
  }
});

// GET /{id}
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Risk"],
  summary: "Get risk by ID",
  operationId: "getRisk",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: RiskSchema } },
      description: "Risk",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

riskApiRouter.openapi(getRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const risk = await getRiskService().getById(id);
    if (!risk) return c.json(notFound("Risk", id), 404);
    return c.json(risk, 200);
  } catch (err) {
    throw err;
  }
});

// POST /
const createRiskRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Risk"],
  summary: "Create a risk",
  operationId: "createRisk",
  request: {
    body: {
      content: { "application/json": { schema: CreateRiskSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: RiskSchema } },
      description: "Created risk",
    },
  },
});

riskApiRouter.openapi(createRiskRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const risk = await getRiskService().create(data);
    publish("risk.created");
    return c.json(risk, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /{id}
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Risk"],
  summary: "Update a risk",
  operationId: "updateRisk",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateRiskSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: RiskSchema } },
      description: "Updated risk",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

riskApiRouter.openapi(updateRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const risk = await getRiskService().update(id, data);
    if (!risk) return c.json(notFound("Risk", id), 404);
    publish("risk.updated");
    return c.json(risk, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /{id}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Risk"],
  summary: "Delete a risk",
  operationId: "deleteRisk",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

riskApiRouter.openapi(deleteRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getRiskService().delete(id);
    if (!ok) return c.json(notFound("Risk", id), 404);
    publish("risk.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});
