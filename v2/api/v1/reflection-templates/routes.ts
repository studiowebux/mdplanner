// ReflectionTemplate CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getReflectionTemplateService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateReflectionTemplateSchema,
  ListReflectionTemplateOptionsSchema,
  ReflectionTemplateSchema,
  UpdateReflectionTemplateSchema,
} from "../../../types/reflection-template.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const reflectionTemplatesRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["ReflectionTemplates"],
  summary: "List all reflection templates",
  operationId: "listReflectionTemplates",
  request: { query: ListReflectionTemplateOptionsSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(ReflectionTemplateSchema) },
      },
      description: "List of reflection templates",
    },
  },
});

reflectionTemplatesRouter.openapi(listRoute, async (c) => {
  const { category, period, q } = c.req.valid("query");
  const items = await getReflectionTemplateService().list({
    category,
    period,
    q,
  });
  return c.json(items, 200);
});

// GET /:id
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["ReflectionTemplates"],
  summary: "Get reflection template by ID",
  operationId: "getReflectionTemplate",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: ReflectionTemplateSchema } },
      description: "Reflection template",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

reflectionTemplatesRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getReflectionTemplateService().getById(id);
  if (!item) return c.json(notFound("REFLECTION_TEMPLATE", id), 404);
  return c.json(item, 200);
});

// POST /
const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["ReflectionTemplates"],
  summary: "Create a reflection template",
  operationId: "createReflectionTemplate",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateReflectionTemplateSchema },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ReflectionTemplateSchema } },
      description: "Created reflection template",
    },
  },
});

reflectionTemplatesRouter.openapi(createRoute_, async (c) => {
  const data = c.req.valid("json");
  const item = await getReflectionTemplateService().create(data);
  publish("rtemplate.created");
  return c.json(item, 201);
});

// PUT /:id
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["ReflectionTemplates"],
  summary: "Update a reflection template",
  operationId: "updateReflectionTemplate",
  request: {
    params: IdParam,
    body: {
      content: {
        "application/json": { schema: UpdateReflectionTemplateSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ReflectionTemplateSchema } },
      description: "Updated reflection template",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

reflectionTemplatesRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getReflectionTemplateService().update(id, data);
  if (!item) return c.json(notFound("REFLECTION_TEMPLATE", id), 404);
  publish("rtemplate.updated");
  return c.json(item, 200);
});

// DELETE /:id
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["ReflectionTemplates"],
  summary: "Delete a reflection template",
  operationId: "deleteReflectionTemplate",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

reflectionTemplatesRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getReflectionTemplateService().delete(id);
  if (!ok) return c.json(notFound("REFLECTION_TEMPLATE", id), 404);
  publish("rtemplate.deleted");
  return new Response(null, { status: 204 });
});
