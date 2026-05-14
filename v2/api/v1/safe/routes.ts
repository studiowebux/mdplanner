// SAFe API routes — OpenAPI CRUD endpoints.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getSafeService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateSafeSchema,
  ListSafeOptionsSchema,
  SafeSchema,
  UpdateSafeSchema,
} from "../../../types/safe.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const safeApiRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Safe"],
  summary: "List all SAFE agreements",
  operationId: "listSafe",
  request: { query: ListSafeOptionsSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(SafeSchema) },
      },
      description: "List of SAFE agreements",
    },
  },
});

safeApiRouter.openapi(listRoute, async (c) => {
  const { status, type, q } = c.req.valid("query");
  const items = await getSafeService().list({ status, type, q });
  return c.json(items, 200);
});

// GET /{id}
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Safe"],
  summary: "Get SAFE agreement by ID",
  operationId: "getSafe",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: SafeSchema } },
      description: "SAFE agreement",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

safeApiRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getSafeService().getById(id);
  if (!item) return c.json(notFound("Safe", id), 404);
  return c.json(item, 200);
});

// POST /
const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Safe"],
  summary: "Create a SAFE agreement",
  operationId: "createSafe",
  request: {
    body: {
      content: { "application/json": { schema: CreateSafeSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SafeSchema } },
      description: "Created SAFE agreement",
    },
  },
});

safeApiRouter.openapi(createRoute_, async (c) => {
  const data = c.req.valid("json");
  const item = await getSafeService().create(data);
  publish("safe.created");
  return c.json(item, 201);
});

// PUT /{id}
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Safe"],
  summary: "Update a SAFE agreement",
  operationId: "updateSafe",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateSafeSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SafeSchema } },
      description: "Updated SAFE agreement",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

safeApiRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getSafeService().update(id, data);
  if (!item) return c.json(notFound("Safe", id), 404);
  publish("safe.updated");
  return c.json(item, 200);
});

// DELETE /{id}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Safe"],
  summary: "Delete a SAFE agreement",
  operationId: "deleteSafe",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

safeApiRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getSafeService().delete(id);
  if (!ok) return c.json(notFound("Safe", id), 404);
  publish("safe.deleted");
  return new Response(null, { status: 204 });
});
