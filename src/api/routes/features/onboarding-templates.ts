/**
 * Onboarding Templates CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const onboardingTemplatesRouter = new OpenAPIHono<
  { Variables: AppVariables }
>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

// --- Route definitions ---

const listOnboardingTemplatesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["OnboardingTemplates"],
  summary: "List all onboarding templates sorted by name",
  operationId: "listOnboardingTemplates",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of onboarding templates",
    },
  },
});

const getOnboardingTemplateRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["OnboardingTemplates"],
  summary: "Get a single onboarding template",
  operationId: "getOnboardingTemplate",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Onboarding template details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createOnboardingTemplateRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["OnboardingTemplates"],
  summary: "Create onboarding template",
  operationId: "createOnboardingTemplate",
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
      description: "Onboarding template created",
    },
  },
});

const updateOnboardingTemplateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["OnboardingTemplates"],
  summary: "Update onboarding template",
  operationId: "updateOnboardingTemplate",
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
      description: "Onboarding template updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteOnboardingTemplateRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["OnboardingTemplates"],
  summary: "Delete onboarding template",
  operationId: "deleteOnboardingTemplate",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Onboarding template deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

onboardingTemplatesRouter.openapi(
  listOnboardingTemplatesRoute,
  async (c) => {
    const parser = getParser(c);
    const templates = await parser.readOnboardingTemplates();
    return c.json(templates, 200);
  },
);

onboardingTemplatesRouter.openapi(
  getOnboardingTemplateRoute,
  async (c) => {
    const parser = getParser(c);
    const { id } = c.req.valid("param");
    const templates = await parser.readOnboardingTemplates();
    const template = templates.find((t) => t.id === id);
    if (!template) return c.json({ error: "Not found" }, 404);
    return c.json(template, 200);
  },
);

onboardingTemplatesRouter.openapi(
  createOnboardingTemplateRoute,
  async (c) => {
    const parser = getParser(c);
    const body = c.req.valid("json");
    const template = await parser.addOnboardingTemplate({
      name: body.name || "New Template",
      description: body.description,
      steps: body.steps ?? [],
    });
    await cacheWriteThrough(c, "onboarding_templates");
    return c.json({ success: true, id: template.id }, 201);
  },
);

onboardingTemplatesRouter.openapi(
  updateOnboardingTemplateRoute,
  async (c) => {
    const parser = getParser(c);
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const updated = await parser.updateOnboardingTemplate(id, {
      name: body.name,
      description: body.description,
      steps: body.steps,
    });
    if (!updated) return c.json({ error: "Not found" }, 404);
    await cacheWriteThrough(c, "onboarding_templates");
    return c.json({ success: true }, 200);
  },
);

onboardingTemplatesRouter.openapi(
  deleteOnboardingTemplateRoute,
  async (c) => {
    const parser = getParser(c);
    const { id } = c.req.valid("param");
    const deleted = await parser.deleteOnboardingTemplate(id);
    if (!deleted) return c.json({ error: "Not found" }, 404);
    cachePurge(c, "onboarding_templates", id);
    return c.json({ success: true }, 200);
  },
);
