// Reflection API routes — OpenAPI CRUD endpoints.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  getReflectionService,
  getReflectionTemplateService,
} from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateReflectionSchema,
  ListReflectionOptionsSchema,
  ReflectionSchema,
  UpdateReflectionSchema,
} from "../../../types/reflection.types.ts";
import {
  errorContent,
  IdParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";

export const reflectionApiRouter = new OpenAPIHono();

const listReflectionsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Reflection"],
  summary: "List all reflections",
  operationId: "listReflections",
  request: { query: ListReflectionOptionsSchema },
  responses: {
    200: jsonContent(z.array(ReflectionSchema), "List of reflections"),
  },
});

reflectionApiRouter.openapi(listReflectionsRoute, async (c) => {
  const { period, tag, from, to, q } = c.req.valid("query");
  const items = await getReflectionService().list({
    period,
    tag,
    from,
    to,
    q,
  });
  return c.json(items, 200);
});

const getReflectionRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Reflection"],
  summary: "Get reflection by ID",
  operationId: "getReflection",
  request: { params: IdParam },
  responses: {
    200: jsonContent(ReflectionSchema, "Reflection"),
    404: notFoundContent,
  },
});

reflectionApiRouter.openapi(getReflectionRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getReflectionService().getById(id);
  if (!item) return c.json(notFound("Reflection", id), 404);
  return c.json(item, 200);
});

const createReflectionRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Reflection"],
  summary: "Create a reflection",
  operationId: "createReflection",
  request: {
    body: {
      content: { "application/json": { schema: CreateReflectionSchema } },
      required: true,
    },
  },
  responses: {
    201: jsonContent(ReflectionSchema, "Created reflection"),
  },
});

reflectionApiRouter.openapi(createReflectionRoute, async (c) => {
  const data = c.req.valid("json");
  const item = await getReflectionService().create(data);
  publish("reflection.created");
  return c.json(item, 201);
});

const updateReflectionRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Reflection"],
  summary: "Update a reflection",
  operationId: "updateReflection",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateReflectionSchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(ReflectionSchema, "Updated reflection"),
    404: notFoundContent,
  },
});

reflectionApiRouter.openapi(updateReflectionRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getReflectionService().update(id, data);
  if (!item) return c.json(notFound("Reflection", id), 404);
  publish("reflection.updated");
  return c.json(item, 200);
});

const deleteReflectionRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Reflection"],
  summary: "Delete a reflection",
  operationId: "deleteReflection",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: notFoundContent,
  },
});

reflectionApiRouter.openapi(deleteReflectionRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getReflectionService().delete(id);
  if (!ok) return c.json(notFound("Reflection", id), 404);
  publish("reflection.deleted");
  return new Response(null, { status: 204 });
});

// POST /:id/apply-template
const applyTemplateBodySchema = z.object({
  templateId: z.string().openapi({ description: "Template ID to apply" }),
});

const applyTemplateRoute = createRoute({
  method: "post",
  path: "/{id}/apply-template",
  tags: ["Reflection"],
  summary: "Apply a reflection template — prepend prompts as content headings",
  operationId: "applyReflectionTemplate",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: applyTemplateBodySchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(
      ReflectionSchema,
      "Updated reflection with template prompts applied",
    ),
    404: errorContent("Reflection or template not found"),
  },
});

reflectionApiRouter.openapi(applyTemplateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { templateId } = c.req.valid("json");

  const reflection = await getReflectionService().getById(id);
  if (!reflection) return c.json(notFound("REFLECTION", id), 404);

  const template = await getReflectionTemplateService().getById(templateId);
  if (!template) {
    return c.json(notFound("REFLECTION_TEMPLATE", templateId), 404);
  }

  const promptBlock = template.prompts
    .map((p) => `## ${p}\n\n`)
    .join("");
  const existingContent = reflection.content ?? "";
  const newContent = existingContent
    ? `${promptBlock}\n---\n\n${existingContent}`
    : promptBlock.trimEnd();

  const updated = await getReflectionService().update(id, {
    content: newContent,
    templateId,
  });
  if (!updated) return c.json(notFound("REFLECTION", id), 404);

  publish("reflection.updated");
  return c.json(updated, 200);
});
