// Fishbone API routes — OpenAPI CRUD endpoints.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getFishboneService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateFishboneSchema,
  FishboneSchema,
  ListFishboneOptionsSchema,
  UpdateFishboneSchema,
} from "../../../types/fishbone.types.ts";
import {
  IdParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";

export const fishboneApiRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Fishbone"],
  summary: "List all fishbone diagrams",
  operationId: "listFishbone",
  request: { query: ListFishboneOptionsSchema },
  responses: {
    200: jsonContent(z.array(FishboneSchema), "List of fishbone diagrams"),
  },
});

fishboneApiRouter.openapi(listRoute, async (c) => {
  try {
    const { project, q } = c.req.valid("query");
    const items = await getFishboneService().list({ project, q });
    return c.json(items, 200);
  } catch (err) {
    throw err;
  }
});

// GET /{id}
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Fishbone"],
  summary: "Get fishbone diagram by ID",
  operationId: "getFishbone",
  request: { params: IdParam },
  responses: {
    200: jsonContent(FishboneSchema, "Fishbone diagram"),
    404: notFoundContent,
  },
});

fishboneApiRouter.openapi(getRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const item = await getFishboneService().getById(id);
    if (!item) return c.json(notFound("Fishbone", id), 404);
    return c.json(item, 200);
  } catch (err) {
    throw err;
  }
});

// POST /
const createFishboneRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Fishbone"],
  summary: "Create a fishbone diagram",
  operationId: "createFishbone",
  request: {
    body: {
      content: { "application/json": { schema: CreateFishboneSchema } },
      required: true,
    },
  },
  responses: {
    201: jsonContent(FishboneSchema, "Created fishbone diagram"),
  },
});

fishboneApiRouter.openapi(createFishboneRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const item = await getFishboneService().create(data);
    publish("fishbone.created");
    return c.json(item, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /{id}
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Fishbone"],
  summary: "Update a fishbone diagram",
  operationId: "updateFishbone",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateFishboneSchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(FishboneSchema, "Updated fishbone diagram"),
    404: notFoundContent,
  },
});

fishboneApiRouter.openapi(updateRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const item = await getFishboneService().update(id, data);
    if (!item) return c.json(notFound("Fishbone", id), 404);
    publish("fishbone.updated");
    return c.json(item, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /{id}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Fishbone"],
  summary: "Delete a fishbone diagram",
  operationId: "deleteFishbone",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: notFoundContent,
  },
});

fishboneApiRouter.openapi(deleteRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getFishboneService().delete(id);
    if (!ok) return c.json(notFound("Fishbone", id), 404);
    publish("fishbone.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});
