/**
 * Brainstorms CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const brainstormsRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z
  .object({ error: z.string(), message: z.string().optional() })
  .openapi("BrainstormError");
const SuccessSchema = z
  .object({ success: z.boolean() })
  .openapi("BrainstormSuccess");
const SuccessWithIdSchema = z
  .object({ success: z.boolean(), id: z.string() })
  .openapi("BrainstormSuccessWithId");
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const QuestionSchema = z.object({
  question: z.string(),
  answer: z.string().optional(),
});

const BrainstormSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    created: z.string(),
    updated: z.string().optional(),
    tags: z.array(z.string()).optional(),
    linkedProjects: z.array(z.string()).optional(),
    linkedTasks: z.array(z.string()).optional(),
    linkedGoals: z.array(z.string()).optional(),
    questions: z.array(QuestionSchema),
  })
  .openapi("Brainstorm");

const CreateBrainstormSchema = z
  .object({
    title: z.string().openapi({ description: "Brainstorm title" }),
    tags: z.array(z.string()).optional(),
    linkedProjects: z.array(z.string()).optional(),
    linkedTasks: z.array(z.string()).optional(),
    linkedGoals: z.array(z.string()).optional(),
    questions: z.array(QuestionSchema).optional(),
  })
  .openapi("CreateBrainstorm");

const UpdateBrainstormSchema = z
  .object({
    title: z.string().optional(),
    tags: z.array(z.string()).nullish(),
    linkedProjects: z.array(z.string()).nullish(),
    linkedTasks: z.array(z.string()).nullish(),
    linkedGoals: z.array(z.string()).nullish(),
    questions: z.array(QuestionSchema).nullish(),
  })
  .openapi("UpdateBrainstorm");

// --- Route definitions ---

const listBrainstormsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Brainstorms"],
  summary: "List all brainstorms",
  operationId: "listBrainstorms",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(BrainstormSchema) },
      },
      description: "List of brainstorms",
    },
  },
});

const getBrainstormRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Brainstorms"],
  summary: "Get a single brainstorm",
  operationId: "getBrainstorm",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: BrainstormSchema } },
      description: "Brainstorm found",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createBrainstormRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Brainstorms"],
  summary: "Create brainstorm",
  operationId: "createBrainstorm",
  request: {
    body: {
      content: { "application/json": { schema: CreateBrainstormSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuccessWithIdSchema } },
      description: "Brainstorm created",
    },
  },
});

const updateBrainstormRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Brainstorms"],
  summary: "Update brainstorm",
  operationId: "updateBrainstorm",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: UpdateBrainstormSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Brainstorm updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteBrainstormRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Brainstorms"],
  summary: "Delete brainstorm",
  operationId: "deleteBrainstorm",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Brainstorm deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

brainstormsRouter.openapi(listBrainstormsRoute, async (c) => {
  const parser = getParser(c);
  const brainstorms = await parser.readBrainstorms();
  return c.json(brainstorms, 200);
});

brainstormsRouter.openapi(getBrainstormRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const brainstorm = await parser.readBrainstorm(id);
  if (!brainstorm) {
    return c.json(
      { error: "Not found", message: `Brainstorm '${id}' not found` },
      404,
    );
  }
  return c.json(brainstorm, 200);
});

brainstormsRouter.openapi(createBrainstormRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const brainstorm = await parser.addBrainstorm({
    title: body.title,
    tags: body.tags,
    linkedProjects: body.linkedProjects,
    linkedTasks: body.linkedTasks,
    linkedGoals: body.linkedGoals,
    questions: body.questions || [],
  });
  await cacheWriteThrough(c, "brainstorms");
  return c.json({ success: true, id: brainstorm.id }, 201);
});

brainstormsRouter.openapi(updateBrainstormRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const updates = Object.fromEntries(
    Object.entries(body)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, v === null ? undefined : v]),
  ) as Parameters<typeof parser.updateBrainstorm>[1];
  const updated = await parser.updateBrainstorm(id, updates);
  if (!updated) {
    return c.json(
      { error: "Not found", message: `Brainstorm '${id}' not found` },
      404,
    );
  }
  await cacheWriteThrough(c, "brainstorms");
  return c.json({ success: true }, 200);
});

brainstormsRouter.openapi(deleteBrainstormRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const brainstorms = await parser.readBrainstorms();
  const filtered = brainstorms.filter((b) => b.id !== id);
  if (filtered.length === brainstorms.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveBrainstorms(filtered);
  cachePurge(c, "brainstorms", id);
  return c.json({ success: true }, 200);
});
