/**
 * Reflection Templates CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const reflectionTemplatesRouter = new OpenAPIHono<
  { Variables: AppVariables }
>();

const ErrorSchema = z
  .object({ error: z.string(), message: z.string().optional() })
  .openapi("ReflectionTemplateError");
const SuccessSchema = z
  .object({ success: z.boolean() })
  .openapi("ReflectionTemplateSuccess");
const SuccessWithIdSchema = z
  .object({ success: z.boolean(), id: z.string() })
  .openapi("ReflectionTemplateSuccessWithId");
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const ReflectionTemplateSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    questions: z.array(z.string()),
    created: z.string(),
    updated: z.string().optional(),
  })
  .openapi("ReflectionTemplate");

const CreateReflectionTemplateSchema = z
  .object({
    title: z.string().openapi({ description: "Template title" }),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    questions: z.array(z.string()).optional(),
  })
  .openapi("CreateReflectionTemplate");

const UpdateReflectionTemplateSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
    questions: z.array(z.string()).nullish(),
  })
  .openapi("UpdateReflectionTemplate");

// --- Route definitions ---

const listReflectionTemplatesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["ReflectionTemplates"],
  summary: "List all reflection templates",
  operationId: "listReflectionTemplates",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(ReflectionTemplateSchema) },
      },
      description: "List of reflection templates",
    },
  },
});

const getReflectionTemplateRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["ReflectionTemplates"],
  summary: "Get a single reflection template",
  operationId: "getReflectionTemplate",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: ReflectionTemplateSchema } },
      description: "Reflection template found",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createReflectionTemplateRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["ReflectionTemplates"],
  summary: "Create reflection template",
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
      content: { "application/json": { schema: SuccessWithIdSchema } },
      description: "Reflection template created",
    },
  },
});

const updateReflectionTemplateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["ReflectionTemplates"],
  summary: "Update reflection template",
  operationId: "updateReflectionTemplate",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: UpdateReflectionTemplateSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Reflection template updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteReflectionTemplateRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["ReflectionTemplates"],
  summary: "Delete reflection template",
  operationId: "deleteReflectionTemplate",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Reflection template deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

reflectionTemplatesRouter.openapi(listReflectionTemplatesRoute, async (c) => {
  const parser = getParser(c);
  const templates = await parser.readReflectionTemplates();
  return c.json(templates, 200);
});

reflectionTemplatesRouter.openapi(getReflectionTemplateRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const template = await parser.readReflectionTemplate(id);
  if (!template) {
    return c.json(
      {
        error: "Not found",
        message: `Reflection template '${id}' not found`,
      },
      404,
    );
  }
  return c.json(template, 200);
});

reflectionTemplatesRouter.openapi(createReflectionTemplateRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const template = await parser.addReflectionTemplate({
    title: body.title,
    description: body.description,
    tags: body.tags,
    questions: body.questions || [],
  });
  await cacheWriteThrough(c, "reflection_templates");
  return c.json({ success: true, id: template.id }, 201);
});

reflectionTemplatesRouter.openapi(updateReflectionTemplateRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const updates = Object.fromEntries(
    Object.entries(body)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, v === null ? undefined : v]),
  ) as Parameters<typeof parser.updateReflectionTemplate>[1];
  const updated = await parser.updateReflectionTemplate(id, updates);
  if (!updated) {
    return c.json(
      {
        error: "Not found",
        message: `Reflection template '${id}' not found`,
      },
      404,
    );
  }
  await cacheWriteThrough(c, "reflection_templates");
  return c.json({ success: true }, 200);
});

reflectionTemplatesRouter.openapi(deleteReflectionTemplateRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const templates = await parser.readReflectionTemplates();
  const filtered = templates.filter((t) => t.id !== id);
  if (filtered.length === templates.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveReflectionTemplates(filtered);
  cachePurge(c, "reflection_templates", id);
  return c.json({ success: true }, 200);
});
