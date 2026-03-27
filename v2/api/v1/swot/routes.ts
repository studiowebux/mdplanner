// SWOT API routes — OpenAPI CRUD endpoints.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getSwotService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateSwotSchema,
  ListSwotOptionsSchema,
  SwotSchema,
  UpdateSwotSchema,
} from "../../../types/swot.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const swotApiRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["SWOT"],
  summary: "List all SWOT analyses",
  operationId: "listSwot",
  request: { query: ListSwotOptionsSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(SwotSchema) },
      },
      description: "List of SWOT analyses",
    },
  },
});

swotApiRouter.openapi(listRoute, async (c) => {
  const { project, q } = c.req.valid("query");
  const items = await getSwotService().list({ project, q });
  return c.json(items, 200);
});

// GET /{id}
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["SWOT"],
  summary: "Get SWOT analysis by ID",
  operationId: "getSwot",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: SwotSchema } },
      description: "SWOT analysis",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

swotApiRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const swot = await getSwotService().getById(id);
  if (!swot) return c.json(notFound("SWOT", id), 404);
  return c.json(swot, 200);
});

// POST /
const createSwotRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["SWOT"],
  summary: "Create a SWOT analysis",
  operationId: "createSwot",
  request: {
    body: {
      content: { "application/json": { schema: CreateSwotSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SwotSchema } },
      description: "Created SWOT analysis",
    },
  },
});

swotApiRouter.openapi(createSwotRoute, async (c) => {
  const data = c.req.valid("json");
  const swot = await getSwotService().create(data);
  publish("swot.created");
  return c.json(swot, 201);
});

// PUT /{id}
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["SWOT"],
  summary: "Update a SWOT analysis",
  operationId: "updateSwot",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateSwotSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SwotSchema } },
      description: "Updated SWOT analysis",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

swotApiRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const swot = await getSwotService().update(id, data);
  if (!swot) return c.json(notFound("SWOT", id), 404);
  publish("swot.updated");
  return c.json(swot, 200);
});

// DELETE /{id}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["SWOT"],
  summary: "Delete a SWOT analysis",
  operationId: "deleteSwot",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

swotApiRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getSwotService().delete(id);
  if (!ok) return c.json(notFound("SWOT", id), 404);
  publish("swot.deleted");
  return new Response(null, { status: 204 });
});
