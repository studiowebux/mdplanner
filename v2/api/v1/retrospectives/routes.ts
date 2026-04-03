// Retrospective CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getRetrospectiveService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateRetrospectiveSchema,
  ListRetrospectiveOptionsSchema,
  RetrospectiveSchema,
  UpdateRetrospectiveSchema,
} from "../../../types/retrospective.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const retrospectivesRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Retrospectives"],
  summary: "List all retrospectives",
  operationId: "listRetrospectives",
  request: { query: ListRetrospectiveOptionsSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(RetrospectiveSchema) },
      },
      description: "List of retrospectives",
    },
  },
});

retrospectivesRouter.openapi(listRoute, async (c) => {
  const { q, status } = c.req.valid("query");
  const items = await getRetrospectiveService().list({ q, status });
  return c.json(items, 200);
});

// GET /{id}
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Retrospectives"],
  summary: "Get retrospective by ID",
  operationId: "getRetrospective",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: RetrospectiveSchema } },
      description: "Retrospective",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

retrospectivesRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getRetrospectiveService().getById(id);
  if (!item) return c.json(notFound("RETROSPECTIVE", id), 404);
  return c.json(item, 200);
});

// POST /
const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Retrospectives"],
  summary: "Create a retrospective",
  operationId: "createRetrospective",
  request: {
    body: {
      content: { "application/json": { schema: CreateRetrospectiveSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: RetrospectiveSchema } },
      description: "Created retrospective",
    },
  },
});

retrospectivesRouter.openapi(createRoute_, async (c) => {
  const data = c.req.valid("json");
  const item = await getRetrospectiveService().create(data);
  publish("retrospective.created");
  return c.json(item, 201);
});

// PUT /{id}
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Retrospectives"],
  summary: "Update a retrospective",
  operationId: "updateRetrospective",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateRetrospectiveSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: RetrospectiveSchema } },
      description: "Updated retrospective",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

retrospectivesRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getRetrospectiveService().update(id, data);
  if (!item) return c.json(notFound("RETROSPECTIVE", id), 404);
  publish("retrospective.updated");
  return c.json(item, 200);
});

// DELETE /{id}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Retrospectives"],
  summary: "Delete a retrospective",
  operationId: "deleteRetrospective",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

retrospectivesRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getRetrospectiveService().delete(id);
  if (!ok) return c.json(notFound("RETROSPECTIVE", id), 404);
  publish("retrospective.deleted");
  return new Response(null, { status: 204 });
});
