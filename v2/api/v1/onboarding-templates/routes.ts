// OnboardingTemplate CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getOnboardingTemplateService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateOnboardingTemplateSchema,
  ListOnboardingTemplateOptionsSchema,
  OnboardingTemplateSchema,
  UpdateOnboardingTemplateSchema,
} from "../../../types/onboarding-template.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const onboardingTemplatesRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["OnboardingTemplates"],
  summary: "List all onboarding templates",
  operationId: "listOnboardingTemplates",
  request: { query: ListOnboardingTemplateOptionsSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(OnboardingTemplateSchema) },
      },
      description: "List of onboarding templates",
    },
  },
});

onboardingTemplatesRouter.openapi(listRoute, async (c) => {
  const { role, tag, q } = c.req.valid("query");
  const items = await getOnboardingTemplateService().list({ role, tag, q });
  return c.json(items, 200);
});

// GET /:id
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["OnboardingTemplates"],
  summary: "Get onboarding template by ID",
  operationId: "getOnboardingTemplate",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: OnboardingTemplateSchema } },
      description: "Onboarding template",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

onboardingTemplatesRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getOnboardingTemplateService().getById(id);
  if (!item) return c.json(notFound("ONBOARDING_TEMPLATE", id), 404);
  return c.json(item, 200);
});

// POST /
const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["OnboardingTemplates"],
  summary: "Create an onboarding template",
  operationId: "createOnboardingTemplate",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateOnboardingTemplateSchema },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: OnboardingTemplateSchema } },
      description: "Created onboarding template",
    },
  },
});

onboardingTemplatesRouter.openapi(createRoute_, async (c) => {
  const data = c.req.valid("json");
  const item = await getOnboardingTemplateService().create(data);
  publish("onboarding-template.created");
  return c.json(item, 201);
});

// PUT /:id
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["OnboardingTemplates"],
  summary: "Update an onboarding template",
  operationId: "updateOnboardingTemplate",
  request: {
    params: IdParam,
    body: {
      content: {
        "application/json": { schema: UpdateOnboardingTemplateSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: OnboardingTemplateSchema } },
      description: "Updated onboarding template",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

onboardingTemplatesRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getOnboardingTemplateService().update(id, data);
  if (!item) return c.json(notFound("ONBOARDING_TEMPLATE", id), 404);
  publish("onboarding-template.updated");
  return c.json(item, 200);
});

// DELETE /:id
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["OnboardingTemplates"],
  summary: "Delete an onboarding template",
  operationId: "deleteOnboardingTemplate",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

onboardingTemplatesRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getOnboardingTemplateService().delete(id);
  if (!ok) return c.json(notFound("ONBOARDING_TEMPLATE", id), 404);
  publish("onboarding-template.deleted");
  return new Response(null, { status: 204 });
});
