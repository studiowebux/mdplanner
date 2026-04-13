// MoSCoW API routes — OpenAPI CRUD endpoints.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getMoscowService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateMoscowSchema,
  ListMoscowOptionsSchema,
  MoscowSchema,
  UpdateMoscowSchema,
} from "../../../types/moscow.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const moscowApiRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["MoSCoW"],
  summary: "List all MoSCoW analyses",
  operationId: "listMoscow",
  request: { query: ListMoscowOptionsSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(MoscowSchema) },
      },
      description: "List of MoSCoW analyses",
    },
  },
});

moscowApiRouter.openapi(listRoute, async (c) => {
  try {
    const { project, q } = c.req.valid("query");
    const items = await getMoscowService().list({ project, q });
    return c.json(items, 200);
  } catch (err) {
    throw err;
  }
});

// GET /{id}
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["MoSCoW"],
  summary: "Get MoSCoW analysis by ID",
  operationId: "getMoscow",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: MoscowSchema } },
      description: "MoSCoW analysis",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

moscowApiRouter.openapi(getRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const moscow = await getMoscowService().getById(id);
    if (!moscow) return c.json(notFound("MoSCoW", id), 404);
    return c.json(moscow, 200);
  } catch (err) {
    throw err;
  }
});

// POST /
const createMoscowRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["MoSCoW"],
  summary: "Create a MoSCoW analysis",
  operationId: "createMoscow",
  request: {
    body: {
      content: { "application/json": { schema: CreateMoscowSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: MoscowSchema } },
      description: "Created MoSCoW analysis",
    },
  },
});

moscowApiRouter.openapi(createMoscowRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const moscow = await getMoscowService().create(data);
    publish("moscow.created");
    return c.json(moscow, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /{id}
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["MoSCoW"],
  summary: "Update a MoSCoW analysis",
  operationId: "updateMoscow",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateMoscowSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: MoscowSchema } },
      description: "Updated MoSCoW analysis",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

moscowApiRouter.openapi(updateRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const moscow = await getMoscowService().update(id, data);
    if (!moscow) return c.json(notFound("MoSCoW", id), 404);
    publish("moscow.updated");
    return c.json(moscow, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /{id}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["MoSCoW"],
  summary: "Delete a MoSCoW analysis",
  operationId: "deleteMoscow",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

moscowApiRouter.openapi(deleteRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getMoscowService().delete(id);
    if (!ok) return c.json(notFound("MoSCoW", id), 404);
    publish("moscow.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});
