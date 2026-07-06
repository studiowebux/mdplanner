// Business Model Canvas API routes — OpenAPI CRUD endpoints.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getBusinessModelService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  BusinessModelSchema,
  CreateBusinessModelSchema,
  ListBusinessModelOptionsSchema,
  UpdateBusinessModelSchema,
} from "../../../types/business-model.types.ts";
import {
  IdParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";

export const businessModelApiRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["BusinessModel"],
  summary: "List all Business Model Canvases",
  operationId: "listBusinessModels",
  request: { query: ListBusinessModelOptionsSchema },
  responses: {
    200: jsonContent(
      z.array(BusinessModelSchema),
      "List of Business Model Canvases",
    ),
  },
});

businessModelApiRouter.openapi(listRoute, async (c) => {
  const { project, q } = c.req.valid("query");
  return c.json(await getBusinessModelService().list({ project, q }), 200);
});

// GET /{id}
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["BusinessModel"],
  summary: "Get Business Model Canvas by ID",
  operationId: "getBusinessModel",
  request: { params: IdParam },
  responses: {
    200: jsonContent(BusinessModelSchema, "Business Model Canvas"),
    404: notFoundContent,
  },
});

businessModelApiRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getBusinessModelService().getById(id);
  if (!item) return c.json(notFound("BusinessModel", id), 404);
  return c.json(item, 200);
});

// POST /
const createBusinessModelRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["BusinessModel"],
  summary: "Create a Business Model Canvas",
  operationId: "createBusinessModel",
  request: {
    body: {
      content: { "application/json": { schema: CreateBusinessModelSchema } },
      required: true,
    },
  },
  responses: {
    201: jsonContent(BusinessModelSchema, "Created Business Model Canvas"),
  },
});

businessModelApiRouter.openapi(createBusinessModelRoute, async (c) => {
  const data = c.req.valid("json");
  const item = await getBusinessModelService().create(data);
  publish("business-model.created");
  return c.json(item, 201);
});

// PUT /{id}
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["BusinessModel"],
  summary: "Update a Business Model Canvas",
  operationId: "updateBusinessModel",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateBusinessModelSchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(BusinessModelSchema, "Updated Business Model Canvas"),
    404: notFoundContent,
  },
});

businessModelApiRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getBusinessModelService().update(id, data);
  if (!item) return c.json(notFound("BusinessModel", id), 404);
  publish("business-model.updated");
  return c.json(item, 200);
});

// DELETE /{id}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["BusinessModel"],
  summary: "Delete a Business Model Canvas",
  operationId: "deleteBusinessModel",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: notFoundContent,
  },
});

businessModelApiRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getBusinessModelService().delete(id);
  if (!ok) return c.json(notFound("BusinessModel", id), 404);
  publish("business-model.deleted");
  return new Response(null, { status: 204 });
});
