// Reflection API routes — OpenAPI CRUD endpoints.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getReflectionService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateReflectionSchema,
  ListReflectionOptionsSchema,
  ReflectionSchema,
  UpdateReflectionSchema,
} from "../../../types/reflection.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const reflectionApiRouter = new OpenAPIHono();

const listReflectionsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Reflection"],
  summary: "List all reflections",
  operationId: "listReflections",
  request: { query: ListReflectionOptionsSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(ReflectionSchema) },
      },
      description: "List of reflections",
    },
  },
});

reflectionApiRouter.openapi(listReflectionsRoute, async (c) => {
  const { period, tag, from, to, q } = c.req.valid("query");
  const items = await getReflectionService().list({
    period,
    tag,
    from,
    to,
    q,
  });
  return c.json(items, 200);
});

const getReflectionRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Reflection"],
  summary: "Get reflection by ID",
  operationId: "getReflection",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: ReflectionSchema } },
      description: "Reflection",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

reflectionApiRouter.openapi(getReflectionRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getReflectionService().getById(id);
  if (!item) return c.json(notFound("Reflection", id), 404);
  return c.json(item, 200);
});

const createReflectionRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Reflection"],
  summary: "Create a reflection",
  operationId: "createReflection",
  request: {
    body: {
      content: { "application/json": { schema: CreateReflectionSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ReflectionSchema } },
      description: "Created reflection",
    },
  },
});

reflectionApiRouter.openapi(createReflectionRoute, async (c) => {
  const data = c.req.valid("json");
  const item = await getReflectionService().create(data);
  publish("reflection.created");
  return c.json(item, 201);
});

const updateReflectionRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Reflection"],
  summary: "Update a reflection",
  operationId: "updateReflection",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateReflectionSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ReflectionSchema } },
      description: "Updated reflection",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

reflectionApiRouter.openapi(updateReflectionRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getReflectionService().update(id, data);
  if (!item) return c.json(notFound("Reflection", id), 404);
  publish("reflection.updated");
  return c.json(item, 200);
});

const deleteReflectionRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Reflection"],
  summary: "Delete a reflection",
  operationId: "deleteReflection",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

reflectionApiRouter.openapi(deleteReflectionRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getReflectionService().delete(id);
  if (!ok) return c.json(notFound("Reflection", id), 404);
  publish("reflection.deleted");
  return new Response(null, { status: 204 });
});
