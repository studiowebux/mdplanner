// Lean Canvas CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getLeanCanvasService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateLeanCanvasSchema,
  LeanCanvasSchema,
  ListLeanCanvasOptionsSchema,
  UpdateLeanCanvasSchema,
} from "../../../types/lean-canvas.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const leanCanvasesRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Lean Canvases"],
  summary: "List all lean canvases",
  operationId: "listLeanCanvases",
  request: { query: ListLeanCanvasOptionsSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(LeanCanvasSchema) },
      },
      description: "List of lean canvases",
    },
  },
});

leanCanvasesRouter.openapi(listRoute, async (c) => {
  const { q, project } = c.req.valid("query");
  const items = await getLeanCanvasService().list({ q, project });
  return c.json(items, 200);
});

// GET /{id}
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Lean Canvases"],
  summary: "Get lean canvas by ID",
  operationId: "getLeanCanvas",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: LeanCanvasSchema } },
      description: "Lean Canvas",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

leanCanvasesRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getLeanCanvasService().getById(id);
  if (!item) return c.json(notFound("LEAN_CANVAS", id), 404);
  return c.json(item, 200);
});

// POST /
const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Lean Canvases"],
  summary: "Create a lean canvas",
  operationId: "createLeanCanvas",
  request: {
    body: {
      content: { "application/json": { schema: CreateLeanCanvasSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: LeanCanvasSchema } },
      description: "Created lean canvas",
    },
  },
});

leanCanvasesRouter.openapi(createRoute_, async (c) => {
  const data = c.req.valid("json");
  const item = await getLeanCanvasService().create(data);
  publish("lean-canvas.created");
  return c.json(item, 201);
});

// PUT /{id}
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Lean Canvases"],
  summary: "Update a lean canvas",
  operationId: "updateLeanCanvas",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateLeanCanvasSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: LeanCanvasSchema } },
      description: "Updated lean canvas",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

leanCanvasesRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getLeanCanvasService().update(id, data);
  if (!item) return c.json(notFound("LEAN_CANVAS", id), 404);
  publish("lean-canvas.updated");
  return c.json(item, 200);
});

// DELETE /{id}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Lean Canvases"],
  summary: "Delete a lean canvas",
  operationId: "deleteLeanCanvas",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

leanCanvasesRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getLeanCanvasService().delete(id);
  if (!ok) return c.json(notFound("LEAN_CANVAS", id), 404);
  publish("lean-canvas.deleted");
  return new Response(null, { status: 204 });
});
