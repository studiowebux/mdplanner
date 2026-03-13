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

const ErrorSchema = z
  .object({ error: z.string(), message: z.string().optional() })
  .openapi("IdeaError");
const SuccessSchema = z
  .object({ success: z.boolean() })
  .openapi("IdeaSuccess");
const SuccessWithIdSchema = z
  .object({ success: z.boolean(), id: z.string() })
  .openapi("IdeaSuccessWithId");
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const ideaStatus = z.enum([
  "new",
  "considering",
  "planned",
  "approved",
  "rejected",
  "implemented",
  "cancelled",
]);

const IdeaSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    status: ideaStatus,
    category: z.string().optional(),
    priority: z.enum(["high", "medium", "low"]).optional(),
    project: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    resources: z.string().optional(),
    subtasks: z.array(z.string()).optional(),
    created: z.string(),
    description: z.string().optional(),
    links: z.array(z.string()).optional(),
    implementedAt: z.string().optional(),
    cancelledAt: z.string().optional(),
  })
  .openapi("Idea");

const CreateIdeaSchema = z
  .object({
    title: z.string().openapi({ description: "Idea title" }),
    status: ideaStatus.optional(),
    category: z.string().optional(),
    priority: z.enum(["high", "medium", "low"]).optional(),
    project: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    resources: z.string().optional(),
    subtasks: z.array(z.string()).optional(),
    description: z.string().optional(),
    links: z.array(z.string()).optional(),
    implementedAt: z.string().optional(),
    cancelledAt: z.string().optional(),
  })
  .openapi("CreateIdea");

// Update schema accepts null to clear optional fields (frontend sends null for empty values).
const UpdateIdeaSchema = z
  .object({
    title: z.string().optional(),
    status: ideaStatus.optional(),
    category: z.string().nullish(),
    priority: z.enum(["high", "medium", "low"]).nullish(),
    project: z.string().nullish(),
    startDate: z.string().nullish(),
    endDate: z.string().nullish(),
    resources: z.string().nullish(),
    subtasks: z.array(z.string()).nullish(),
    description: z.string().nullish(),
    links: z.array(z.string()).nullish(),
    implementedAt: z.string().nullish(),
    cancelledAt: z.string().nullish(),
  })
  .openapi("UpdateIdea");

// --- Route definitions ---

const listIdeasRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Ideas"],
  summary: "List all ideas with backlinks",
  operationId: "listIdeas",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(IdeaSchema) } },
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
      content: { "application/json": { schema: CreateIdeaSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuccessWithIdSchema } },
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
      content: { "application/json": { schema: UpdateIdeaSchema } },
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
  // null means "clear this field" — convert to undefined so the spread removes it
  const updates = Object.fromEntries(
    Object.entries(body)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, v === null ? undefined : v]),
  ) as Parameters<typeof parser.updateIdea>[1];
  const updated = await parser.updateIdea(id, updates);
  if (!updated) {
    return c.json(
      { error: "Not found", message: `Idea '${id}' not found` },
      404,
    );
  }
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
