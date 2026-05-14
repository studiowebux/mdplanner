// Strategic Levels API routes — OpenAPI CRUD endpoints.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getStrategicLevelsService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateStrategicLevelsBuildersSchema,
  ListStrategicLevelsOptionsSchema,
  StrategicLevelsBuildersSchema,
  UpdateStrategicLevelsBuildersSchema,
} from "../../../types/strategic-levels.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const strategicLevelsApiRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Strategic Levels"],
  summary: "List all strategic levels builders",
  operationId: "listStrategicLevels",
  request: { query: ListStrategicLevelsOptionsSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(StrategicLevelsBuildersSchema) },
      },
      description: "List of strategic levels builders",
    },
  },
});

strategicLevelsApiRouter.openapi(listRoute, async (c) => {
  const { q, date } = c.req.valid("query");
  const items = await getStrategicLevelsService().list({ q, date });
  return c.json(items, 200);
});

// GET /:id
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Strategic Levels"],
  summary: "Get strategic levels builder by ID",
  operationId: "getStrategicLevels",
  request: { params: IdParam },
  responses: {
    200: {
      content: {
        "application/json": { schema: StrategicLevelsBuildersSchema },
      },
      description: "Strategic levels builder",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

strategicLevelsApiRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getStrategicLevelsService().getById(id);
  if (!item) return c.json(notFound("Strategic levels builder", id), 404);
  return c.json(item, 200);
});

// POST /
const createStrategicLevelsRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Strategic Levels"],
  summary: "Create a strategic levels builder",
  operationId: "createStrategicLevels",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateStrategicLevelsBuildersSchema },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        "application/json": { schema: StrategicLevelsBuildersSchema },
      },
      description: "Created strategic levels builder",
    },
  },
});

strategicLevelsApiRouter.openapi(createStrategicLevelsRoute, async (c) => {
  const data = c.req.valid("json");
  const item = await getStrategicLevelsService().create(data);
  publish("strategic-levels.created");
  return c.json(item, 201);
});

// PUT /:id
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Strategic Levels"],
  summary: "Update a strategic levels builder",
  operationId: "updateStrategicLevels",
  request: {
    params: IdParam,
    body: {
      content: {
        "application/json": { schema: UpdateStrategicLevelsBuildersSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: StrategicLevelsBuildersSchema },
      },
      description: "Updated strategic levels builder",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

strategicLevelsApiRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getStrategicLevelsService().update(id, data);
  if (!item) return c.json(notFound("Strategic levels builder", id), 404);
  publish("strategic-levels.updated");
  return c.json(item, 200);
});

// DELETE /:id
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Strategic Levels"],
  summary: "Delete a strategic levels builder",
  operationId: "deleteStrategicLevels",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

strategicLevelsApiRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getStrategicLevelsService().delete(id);
  if (!ok) return c.json(notFound("Strategic levels builder", id), 404);
  publish("strategic-levels.deleted");
  return new Response(null, { status: 204 });
});
