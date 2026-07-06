// Brainstorm CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  getBrainstormService,
  getBrainstormTemplateService,
} from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  BrainstormSchema,
  CreateBrainstormSchema,
  ListBrainstormOptionsSchema,
  UpdateBrainstormSchema,
} from "../../../types/brainstorm.types.ts";
import {
  errorContent,
  IdParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";

export const brainstormsRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Brainstorms"],
  summary: "List all brainstorms",
  operationId: "listBrainstorms",
  request: { query: ListBrainstormOptionsSchema },
  responses: {
    200: jsonContent(z.array(BrainstormSchema), "List of brainstorms"),
  },
});

brainstormsRouter.openapi(listRoute, async (c) => {
  const { tag, q } = c.req.valid("query");
  const items = await getBrainstormService().list({ tag, q });
  return c.json(items, 200);
});

// GET /{id}
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Brainstorms"],
  summary: "Get brainstorm by ID",
  operationId: "getBrainstorm",
  request: { params: IdParam },
  responses: {
    200: jsonContent(BrainstormSchema, "Brainstorm"),
    404: notFoundContent,
  },
});

brainstormsRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getBrainstormService().getById(id);
  if (!item) return c.json(notFound("BRAINSTORM", id), 404);
  return c.json(item, 200);
});

// POST /
const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Brainstorms"],
  summary: "Create a brainstorm",
  operationId: "createBrainstorm",
  request: {
    body: {
      content: { "application/json": { schema: CreateBrainstormSchema } },
      required: true,
    },
  },
  responses: {
    201: jsonContent(BrainstormSchema, "Created brainstorm"),
  },
});

brainstormsRouter.openapi(createRoute_, async (c) => {
  const data = c.req.valid("json");
  const item = await getBrainstormService().create(data);
  publish("brainstorm.created");
  return c.json(item, 201);
});

// PUT /{id}
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Brainstorms"],
  summary: "Update a brainstorm",
  operationId: "updateBrainstorm",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateBrainstormSchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(BrainstormSchema, "Updated brainstorm"),
    404: notFoundContent,
  },
});

brainstormsRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getBrainstormService().update(id, data);
  if (!item) return c.json(notFound("BRAINSTORM", id), 404);
  publish("brainstorm.updated");
  return c.json(item, 200);
});

// DELETE /{id}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Brainstorms"],
  summary: "Delete a brainstorm",
  operationId: "deleteBrainstorm",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: notFoundContent,
  },
});

brainstormsRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getBrainstormService().delete(id);
  if (!ok) return c.json(notFound("BRAINSTORM", id), 404);
  publish("brainstorm.deleted");
  return new Response(null, { status: 204 });
});

// POST /:id/apply-template
const applyTemplateBodySchema = z.object({
  templateId: z.string().openapi({ description: "Template ID to apply" }),
});

const applyTemplateRoute = createRoute({
  method: "post",
  path: "/{id}/apply-template",
  tags: ["Brainstorms"],
  summary: "Append template questions to a brainstorm session",
  operationId: "applyBrainstormTemplate",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: applyTemplateBodySchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(
      BrainstormSchema,
      "Updated brainstorm with appended questions",
    ),
    404: errorContent("Brainstorm or template not found"),
  },
});

brainstormsRouter.openapi(applyTemplateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { templateId } = c.req.valid("json");

  const brainstorm = await getBrainstormService().getById(id);
  if (!brainstorm) return c.json(notFound("BRAINSTORM", id), 404);

  const template = await getBrainstormTemplateService().getById(templateId);
  if (!template) {
    return c.json(notFound("BRAINSTORM_TEMPLATE", templateId), 404);
  }

  const newQuestions = template.questions.map((q) => ({
    question: q,
    answer: null,
  }));
  const updated = await getBrainstormService().update(id, {
    questions: [...brainstorm.questions, ...newQuestions],
  });
  if (!updated) return c.json(notFound("BRAINSTORM", id), 404);

  publish("brainstorm.updated");
  return c.json(updated, 200);
});
