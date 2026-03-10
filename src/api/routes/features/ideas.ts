/**
 * Ideas CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const ideasRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

// --- Route definitions ---

const listIdeasRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Ideas"],
  summary: "List all ideas with backlinks",
  operationId: "listIdeas",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of ideas",
    },
  },
});

const createIdeaRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Ideas"],
  summary: "Create idea",
  operationId: "createIdea",
  request: {
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), id: z.string() }),
        },
      },
      description: "Idea created",
    },
  },
});

const updateIdeaRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Ideas"],
  summary: "Update idea",
  operationId: "updateIdea",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Idea updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteIdeaRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Ideas"],
  summary: "Delete idea",
  operationId: "deleteIdea",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Idea deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

ideasRouter.openapi(listIdeasRoute, async (c) => {
  const parser = getParser(c);
  const ideas = await parser.readIdeasWithBacklinks();
  return c.json(ideas, 200);
});

ideasRouter.openapi(createIdeaRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const ideas = await parser.readIdeas();
  const id = crypto.randomUUID().substring(0, 8);
  ideas.push({
    id,
    title: body.title,
    status: body.status || "new",
    category: body.category,
    created: new Date().toISOString().split("T")[0],
    description: body.description,
    implementedAt: body.implementedAt,
    cancelledAt: body.cancelledAt,
  });
  await parser.saveIdeas(ideas);
  await cacheWriteThrough(c, "ideas");
  return c.json({ success: true, id }, 201);
});

ideasRouter.openapi(updateIdeaRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const ideas = await parser.readIdeas();
  const index = ideas.findIndex((i) => i.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  ideas[index] = { ...ideas[index], ...body };
  await parser.saveIdeas(ideas);
  await cacheWriteThrough(c, "ideas");
  return c.json({ success: true }, 200);
});

ideasRouter.openapi(deleteIdeaRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const ideas = await parser.readIdeas();
  const filtered = ideas.filter((i) => i.id !== id);
  if (filtered.length === ideas.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveIdeas(filtered);
  cachePurge(c, "ideas", id);
  return c.json({ success: true }, 200);
});
