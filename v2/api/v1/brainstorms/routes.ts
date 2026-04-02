// Brainstorm CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getBrainstormService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  BrainstormSchema,
  CreateBrainstormSchema,
  ListBrainstormOptionsSchema,
  UpdateBrainstormSchema,
} from "../../../types/brainstorm.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const brainstormsRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Brainstorms"],
  summary: "List all brainstorms",
  operationId: "listBrainstorms",
  request: { query: ListBrainstormOptionsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(BrainstormSchema) } },
      description: "List of brainstorms",
    },
  },
});

brainstormsRouter.openapi(listRoute, async (c) => {
  const { tag, q } = c.req.valid("query");
  const items = await getBrainstormService().list({ tag, q });
  return c.json(items, 200);
});

// GET /{id}
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Brainstorms"],
  summary: "Get brainstorm by ID",
  operationId: "getBrainstorm",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: BrainstormSchema } },
      description: "Brainstorm",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

brainstormsRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getBrainstormService().getById(id);
  if (!item) return c.json(notFound("BRAINSTORM", id), 404);
  return c.json(item, 200);
});

// POST /
const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Brainstorms"],
  summary: "Create a brainstorm",
  operationId: "createBrainstorm",
  request: {
    body: {
      content: { "application/json": { schema: CreateBrainstormSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: BrainstormSchema } },
      description: "Created brainstorm",
    },
  },
});

brainstormsRouter.openapi(createRoute_, async (c) => {
  const data = c.req.valid("json");
  const item = await getBrainstormService().create(data);
  publish("brainstorm.created");
  return c.json(item, 201);
});

// PUT /{id}
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Brainstorms"],
  summary: "Update a brainstorm",
  operationId: "updateBrainstorm",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateBrainstormSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: BrainstormSchema } },
      description: "Updated brainstorm",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

brainstormsRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getBrainstormService().update(id, data);
  if (!item) return c.json(notFound("BRAINSTORM", id), 404);
  publish("brainstorm.updated");
  return c.json(item, 200);
});

// DELETE /{id}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Brainstorms"],
  summary: "Delete a brainstorm",
  operationId: "deleteBrainstorm",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

brainstormsRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getBrainstormService().delete(id);
  if (!ok) return c.json(notFound("BRAINSTORM", id), 404);
  publish("brainstorm.deleted");
  return new Response(null, { status: 204 });
});
