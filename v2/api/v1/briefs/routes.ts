// Brief CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getBriefService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  BriefSchema,
  CreateBriefSchema,
  ListBriefOptionsSchema,
  UpdateBriefSchema,
} from "../../../types/brief.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const briefsRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Briefs"],
  summary: "List all briefs",
  operationId: "listBriefs",
  request: { query: ListBriefOptionsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(BriefSchema) } },
      description: "List of briefs",
    },
  },
});

briefsRouter.openapi(listRoute, async (c) => {
  const { q } = c.req.valid("query");
  const items = await getBriefService().list({ q });
  return c.json(items, 200);
});

// GET /{id}
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Briefs"],
  summary: "Get brief by ID",
  operationId: "getBrief",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: BriefSchema } },
      description: "Brief",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

briefsRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getBriefService().getById(id);
  if (!item) return c.json(notFound("BRIEF", id), 404);
  return c.json(item, 200);
});

// POST /
const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Briefs"],
  summary: "Create a brief",
  operationId: "createBrief",
  request: {
    body: {
      content: { "application/json": { schema: CreateBriefSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: BriefSchema } },
      description: "Created brief",
    },
  },
});

briefsRouter.openapi(createRoute_, async (c) => {
  const data = c.req.valid("json");
  const item = await getBriefService().create(data);
  publish("brief.created");
  return c.json(item, 201);
});

// PUT /{id}
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Briefs"],
  summary: "Update a brief",
  operationId: "updateBrief",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateBriefSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: BriefSchema } },
      description: "Updated brief",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

briefsRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getBriefService().update(id, data);
  if (!item) return c.json(notFound("BRIEF", id), 404);
  publish("brief.updated");
  return c.json(item, 200);
});

// DELETE /{id}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Briefs"],
  summary: "Delete a brief",
  operationId: "deleteBrief",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

briefsRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getBriefService().delete(id);
  if (!ok) return c.json(notFound("BRIEF", id), 404);
  publish("brief.deleted");
  return new Response(null, { status: 204 });
});
