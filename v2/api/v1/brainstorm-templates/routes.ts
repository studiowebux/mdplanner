// BrainstormTemplate CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getBrainstormTemplateService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  BrainstormTemplateSchema,
  CreateBrainstormTemplateSchema,
  ListBrainstormTemplateOptionsSchema,
  UpdateBrainstormTemplateSchema,
} from "../../../types/brainstorm-template.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const brainstormTemplatesRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["BrainstormTemplates"],
  summary: "List all brainstorm templates",
  operationId: "listBrainstormTemplates",
  request: { query: ListBrainstormTemplateOptionsSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(BrainstormTemplateSchema) },
      },
      description: "List of brainstorm templates",
    },
  },
});

brainstormTemplatesRouter.openapi(listRoute, async (c) => {
  const { category, q } = c.req.valid("query");
  const items = await getBrainstormTemplateService().list({ category, q });
  return c.json(items, 200);
});

// GET /:id
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["BrainstormTemplates"],
  summary: "Get brainstorm template by ID",
  operationId: "getBrainstormTemplate",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: BrainstormTemplateSchema } },
      description: "Brainstorm template",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

brainstormTemplatesRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getBrainstormTemplateService().getById(id);
  if (!item) return c.json(notFound("BRAINSTORM_TEMPLATE", id), 404);
  return c.json(item, 200);
});

// POST /
const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["BrainstormTemplates"],
  summary: "Create a brainstorm template",
  operationId: "createBrainstormTemplate",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateBrainstormTemplateSchema },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: BrainstormTemplateSchema } },
      description: "Created brainstorm template",
    },
  },
});

brainstormTemplatesRouter.openapi(createRoute_, async (c) => {
  const data = c.req.valid("json");
  const item = await getBrainstormTemplateService().create(data);
  publish("btemplate.created");
  return c.json(item, 201);
});

// PUT /:id
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["BrainstormTemplates"],
  summary: "Update a brainstorm template",
  operationId: "updateBrainstormTemplate",
  request: {
    params: IdParam,
    body: {
      content: {
        "application/json": { schema: UpdateBrainstormTemplateSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: BrainstormTemplateSchema } },
      description: "Updated brainstorm template",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

brainstormTemplatesRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getBrainstormTemplateService().update(id, data);
  if (!item) return c.json(notFound("BRAINSTORM_TEMPLATE", id), 404);
  publish("btemplate.updated");
  return c.json(item, 200);
});

// DELETE /:id
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["BrainstormTemplates"],
  summary: "Delete a brainstorm template",
  operationId: "deleteBrainstormTemplate",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

brainstormTemplatesRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getBrainstormTemplateService().delete(id);
  if (!ok) return c.json(notFound("BRAINSTORM_TEMPLATE", id), 404);
  publish("btemplate.deleted");
  return new Response(null, { status: 204 });
});
