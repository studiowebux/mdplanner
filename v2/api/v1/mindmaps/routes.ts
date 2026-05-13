// Mindmap API routes — OpenAPI CRUD endpoints.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getMindmapService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateMindmapSchema,
  ListMindmapOptionsSchema,
  MindmapSchema,
  UpdateMindmapSchema,
} from "../../../types/mindmap.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const mindmapApiRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Mindmap"],
  summary: "List all mindmaps",
  operationId: "listMindmaps",
  request: { query: ListMindmapOptionsSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(MindmapSchema) },
      },
      description: "List of mindmaps",
    },
  },
});

mindmapApiRouter.openapi(listRoute, async (c) => {
  try {
    const { project, q } = c.req.valid("query");
    const items = await getMindmapService().list({ project, q });
    return c.json(items, 200);
  } catch (err) {
    throw err;
  }
});

// GET /{id}
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Mindmap"],
  summary: "Get mindmap by ID",
  operationId: "getMindmap",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: MindmapSchema } },
      description: "Mindmap",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

mindmapApiRouter.openapi(getRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const item = await getMindmapService().getById(id);
    if (!item) return c.json(notFound("Mindmap", id), 404);
    return c.json(item, 200);
  } catch (err) {
    throw err;
  }
});

// POST /
const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Mindmap"],
  summary: "Create a mindmap",
  operationId: "createMindmap",
  request: {
    body: {
      content: { "application/json": { schema: CreateMindmapSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: MindmapSchema } },
      description: "Created mindmap",
    },
  },
});

mindmapApiRouter.openapi(createRoute_, async (c) => {
  try {
    const data = c.req.valid("json");
    const item = await getMindmapService().create(data);
    publish("mindmap.created");
    return c.json(item, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /{id}
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Mindmap"],
  summary: "Update a mindmap",
  operationId: "updateMindmap",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateMindmapSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: MindmapSchema } },
      description: "Updated mindmap",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

mindmapApiRouter.openapi(updateRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const item = await getMindmapService().update(id, data);
    if (!item) return c.json(notFound("Mindmap", id), 404);
    publish("mindmap.updated");
    return c.json(item, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /{id}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Mindmap"],
  summary: "Delete a mindmap",
  operationId: "deleteMindmap",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

mindmapApiRouter.openapi(deleteRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getMindmapService().delete(id);
    if (!ok) return c.json(notFound("Mindmap", id), 404);
    publish("mindmap.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});
