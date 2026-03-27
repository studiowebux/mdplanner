// Idea CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getIdeaService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateIdeaSchema,
  IdeaSchema,
  ListIdeaOptionsSchema,
  UpdateIdeaSchema,
} from "../../../types/idea.types.ts";
import {
  ErrorSchema,
  IdParam,
  IdWithTargetIdParam,
  notFound,
} from "../../../types/api.ts";

export const ideasRouter = new OpenAPIHono();

// GET /
const listIdeasRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Ideas"],
  summary: "List all ideas",
  operationId: "listIdeas",
  request: { query: ListIdeaOptionsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(IdeaSchema) } },
      description: "List of ideas",
    },
  },
});

ideasRouter.openapi(listIdeasRoute, async (c) => {
  const { status, category, priority, q } = c.req.valid("query");
  const ideas = await getIdeaService().list({ status, category, priority, q });
  return c.json(ideas, 200);
});

// GET /{id}
const getIdeaRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Ideas"],
  summary: "Get idea by ID",
  operationId: "getIdea",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: IdeaSchema } },
      description: "Idea",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

ideasRouter.openapi(getIdeaRoute, async (c) => {
  const { id } = c.req.valid("param");
  const idea = await getIdeaService().getById(id);
  if (!idea) return c.json(notFound("IDEA", id), 404);
  return c.json(idea, 200);
});

// POST /
const createIdeaRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Ideas"],
  summary: "Create an idea",
  operationId: "createIdea",
  request: {
    body: {
      content: { "application/json": { schema: CreateIdeaSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: IdeaSchema } },
      description: "Created idea",
    },
  },
});

ideasRouter.openapi(createIdeaRoute, async (c) => {
  const data = c.req.valid("json");
  const idea = await getIdeaService().create(data);
  publish("idea.created");
  return c.json(idea, 201);
});

// PUT /{id}
const updateIdeaRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Ideas"],
  summary: "Update an idea",
  operationId: "updateIdea",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateIdeaSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: IdeaSchema } },
      description: "Updated idea",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

ideasRouter.openapi(updateIdeaRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const idea = await getIdeaService().update(id, data);
  if (!idea) return c.json(notFound("IDEA", id), 404);
  publish("idea.updated");
  return c.json(idea, 200);
});

// DELETE /{id}
const deleteIdeaRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Ideas"],
  summary: "Delete an idea",
  operationId: "deleteIdea",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

ideasRouter.openapi(deleteIdeaRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getIdeaService().delete(id);
  if (!ok) return c.json(notFound("IDEA", id), 404);
  publish("idea.deleted");
  return new Response(null, { status: 204 });
});

// POST /{id}/link/{targetId}
const linkIdeasRoute = createRoute({
  method: "post",
  path: "/{id}/link/{targetId}",
  tags: ["Ideas"],
  summary: "Link two ideas (bidirectional)",
  operationId: "linkIdeas",
  request: { params: IdWithTargetIdParam },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
      description: "Linked",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "One or both ideas not found",
    },
  },
});

ideasRouter.openapi(linkIdeasRoute, async (c) => {
  const { id, targetId } = c.req.valid("param");
  const ok = await getIdeaService().linkIdeas(id, targetId);
  if (!ok) {
    return c.json(
      { error: "IDEA_NOT_FOUND", message: "One or both ideas not found" },
      404,
    );
  }
  publish("idea.updated");
  return c.json({ success: true }, 200);
});

// DELETE /{id}/link/{targetId}
const unlinkIdeasRoute = createRoute({
  method: "delete",
  path: "/{id}/link/{targetId}",
  tags: ["Ideas"],
  summary: "Unlink two ideas (bidirectional)",
  operationId: "unlinkIdeas",
  request: { params: IdWithTargetIdParam },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
      description: "Unlinked",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "One or both ideas not found",
    },
  },
});

ideasRouter.openapi(unlinkIdeasRoute, async (c) => {
  const { id, targetId } = c.req.valid("param");
  const ok = await getIdeaService().unlinkIdeas(id, targetId);
  if (!ok) {
    return c.json(
      { error: "IDEA_NOT_FOUND", message: "One or both ideas not found" },
      404,
    );
  }
  publish("idea.updated");
  return c.json({ success: true }, 200);
});
