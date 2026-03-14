/**
 * Reflections CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const reflectionsRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z
  .object({ error: z.string(), message: z.string().optional() })
  .openapi("ReflectionError");
const SuccessSchema = z
  .object({ success: z.boolean() })
  .openapi("ReflectionSuccess");
const SuccessWithIdSchema = z
  .object({ success: z.boolean(), id: z.string() })
  .openapi("ReflectionSuccessWithId");
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const ReflectionQuestionSchema = z.object({
  question: z.string(),
  answer: z.string().optional(),
});

const ReflectionSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    created: z.string(),
    updated: z.string().optional(),
    tags: z.array(z.string()).optional(),
    templateId: z.string().optional(),
    linkedProjects: z.array(z.string()).optional(),
    linkedTasks: z.array(z.string()).optional(),
    linkedGoals: z.array(z.string()).optional(),
    questions: z.array(ReflectionQuestionSchema),
  })
  .openapi("Reflection");

const CreateReflectionSchema = z
  .object({
    title: z.string().openapi({ description: "Reflection title" }),
    tags: z.array(z.string()).optional(),
    templateId: z.string().optional(),
    linkedProjects: z.array(z.string()).optional(),
    linkedTasks: z.array(z.string()).optional(),
    linkedGoals: z.array(z.string()).optional(),
    questions: z.array(ReflectionQuestionSchema).optional(),
  })
  .openapi("CreateReflection");

const UpdateReflectionSchema = z
  .object({
    title: z.string().optional(),
    tags: z.array(z.string()).nullish(),
    templateId: z.string().nullish(),
    linkedProjects: z.array(z.string()).nullish(),
    linkedTasks: z.array(z.string()).nullish(),
    linkedGoals: z.array(z.string()).nullish(),
    questions: z.array(ReflectionQuestionSchema).nullish(),
  })
  .openapi("UpdateReflection");

// --- Route definitions ---

const listReflectionsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Reflections"],
  summary: "List all reflections",
  operationId: "listReflections",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(ReflectionSchema) },
      },
      description: "List of reflections",
    },
  },
});

const getReflectionRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Reflections"],
  summary: "Get a single reflection",
  operationId: "getReflection",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: ReflectionSchema } },
      description: "Reflection found",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createReflectionRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Reflections"],
  summary: "Create reflection",
  operationId: "createReflection",
  request: {
    body: {
      content: { "application/json": { schema: CreateReflectionSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuccessWithIdSchema } },
      description: "Reflection created",
    },
  },
});

const updateReflectionRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Reflections"],
  summary: "Update reflection",
  operationId: "updateReflection",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: UpdateReflectionSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Reflection updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteReflectionRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Reflections"],
  summary: "Delete reflection",
  operationId: "deleteReflection",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Reflection deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

reflectionsRouter.openapi(listReflectionsRoute, async (c) => {
  const parser = getParser(c);
  const reflections = await parser.readReflections();
  return c.json(reflections, 200);
});

reflectionsRouter.openapi(getReflectionRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const reflection = await parser.readReflection(id);
  if (!reflection) {
    return c.json(
      { error: "Not found", message: `Reflection '${id}' not found` },
      404,
    );
  }
  return c.json(reflection, 200);
});

reflectionsRouter.openapi(createReflectionRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const reflection = await parser.addReflection({
    title: body.title,
    tags: body.tags,
    templateId: body.templateId,
    linkedProjects: body.linkedProjects,
    linkedTasks: body.linkedTasks,
    linkedGoals: body.linkedGoals,
    questions: body.questions || [],
  });
  await cacheWriteThrough(c, "reflections");
  return c.json({ success: true, id: reflection.id }, 201);
});

reflectionsRouter.openapi(updateReflectionRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const updates = Object.fromEntries(
    Object.entries(body)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, v === null ? undefined : v]),
  ) as Parameters<typeof parser.updateReflection>[1];
  const updated = await parser.updateReflection(id, updates);
  if (!updated) {
    return c.json(
      { error: "Not found", message: `Reflection '${id}' not found` },
      404,
    );
  }
  await cacheWriteThrough(c, "reflections");
  return c.json({ success: true }, 200);
});

reflectionsRouter.openapi(deleteReflectionRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const reflections = await parser.readReflections();
  const filtered = reflections.filter((r) => r.id !== id);
  if (filtered.length === reflections.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveReflections(filtered);
  cachePurge(c, "reflections", id);
  return c.json({ success: true }, 200);
});
