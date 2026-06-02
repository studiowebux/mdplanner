// Eisenhower API routes — OpenAPI CRUD endpoints.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getEisenhowerService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateEisenhowerSchema,
  EisenhowerSchema,
  ListEisenhowerOptionsSchema,
  UpdateEisenhowerSchema,
} from "../../../types/eisenhower.types.ts";
import {
  IdParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";

export const eisenhowerApiRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Eisenhower"],
  summary: "List all Eisenhower matrices",
  operationId: "listEisenhower",
  request: { query: ListEisenhowerOptionsSchema },
  responses: {
    200: jsonContent(z.array(EisenhowerSchema), "List of Eisenhower matrices"),
  },
});

eisenhowerApiRouter.openapi(listRoute, async (c) => {
  try {
    const { project, q } = c.req.valid("query");
    const items = await getEisenhowerService().list({ project, q });
    return c.json(items, 200);
  } catch (err) {
    throw err;
  }
});

// GET /{id}
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Eisenhower"],
  summary: "Get Eisenhower matrix by ID",
  operationId: "getEisenhower",
  request: { params: IdParam },
  responses: {
    200: jsonContent(EisenhowerSchema, "Eisenhower matrix"),
    404: notFoundContent,
  },
});

eisenhowerApiRouter.openapi(getRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const item = await getEisenhowerService().getById(id);
    if (!item) return c.json(notFound("Eisenhower", id), 404);
    return c.json(item, 200);
  } catch (err) {
    throw err;
  }
});

// POST /
const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Eisenhower"],
  summary: "Create an Eisenhower matrix",
  operationId: "createEisenhower",
  request: {
    body: {
      content: { "application/json": { schema: CreateEisenhowerSchema } },
      required: true,
    },
  },
  responses: {
    201: jsonContent(EisenhowerSchema, "Created Eisenhower matrix"),
  },
});

eisenhowerApiRouter.openapi(createRoute_, async (c) => {
  try {
    const data = c.req.valid("json");
    const item = await getEisenhowerService().create(data);
    publish("eisenhower.created");
    return c.json(item, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /{id}
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Eisenhower"],
  summary: "Update an Eisenhower matrix",
  operationId: "updateEisenhower",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateEisenhowerSchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(EisenhowerSchema, "Updated Eisenhower matrix"),
    404: notFoundContent,
  },
});

eisenhowerApiRouter.openapi(updateRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const item = await getEisenhowerService().update(id, data);
    if (!item) return c.json(notFound("Eisenhower", id), 404);
    publish("eisenhower.updated");
    return c.json(item, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /{id}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Eisenhower"],
  summary: "Delete an Eisenhower matrix",
  operationId: "deleteEisenhower",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: notFoundContent,
  },
});

eisenhowerApiRouter.openapi(deleteRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getEisenhowerService().delete(id);
    if (!ok) return c.json(notFound("Eisenhower", id), 404);
    publish("eisenhower.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});
