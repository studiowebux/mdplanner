// Onboarding CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getOnboardingService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateOnboardingSchema,
  ListOnboardingOptionsSchema,
  OnboardingSchema,
  UpdateOnboardingSchema,
} from "../../../types/onboarding.types.ts";
import {
  IdParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";

export const onboardingRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Onboarding"],
  summary: "List all onboarding records",
  operationId: "listOnboarding",
  request: { query: ListOnboardingOptionsSchema },
  responses: {
    200: jsonContent(z.array(OnboardingSchema), "List of onboarding records"),
  },
});

onboardingRouter.openapi(listRoute, async (c) => {
  const { status, role, q } = c.req.valid("query");
  const items = await getOnboardingService().list({ status, role, q });
  return c.json(items, 200);
});

// GET /:id
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Onboarding"],
  summary: "Get onboarding record by ID",
  operationId: "getOnboarding",
  request: { params: IdParam },
  responses: {
    200: jsonContent(OnboardingSchema, "Onboarding record"),
    404: notFoundContent,
  },
});

onboardingRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getOnboardingService().getById(id);
  if (!item) return c.json(notFound("ONBOARDING", id), 404);
  return c.json(item, 200);
});

// POST /
const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Onboarding"],
  summary: "Create an onboarding record",
  operationId: "createOnboarding",
  request: {
    body: {
      content: { "application/json": { schema: CreateOnboardingSchema } },
      required: true,
    },
  },
  responses: {
    201: jsonContent(OnboardingSchema, "Created onboarding record"),
  },
});

onboardingRouter.openapi(createRoute_, async (c) => {
  const data = c.req.valid("json");
  const item = await getOnboardingService().create(data);
  publish("onboarding.created");
  return c.json(item, 201);
});

// PUT /:id
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Onboarding"],
  summary: "Update an onboarding record",
  operationId: "updateOnboarding",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateOnboardingSchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(OnboardingSchema, "Updated onboarding record"),
    404: notFoundContent,
  },
});

onboardingRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getOnboardingService().update(id, data);
  if (!item) return c.json(notFound("ONBOARDING", id), 404);
  publish("onboarding.updated");
  return c.json(item, 200);
});

// DELETE /:id
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Onboarding"],
  summary: "Delete an onboarding record",
  operationId: "deleteOnboarding",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: notFoundContent,
  },
});

onboardingRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getOnboardingService().delete(id);
  if (!ok) return c.json(notFound("ONBOARDING", id), 404);
  publish("onboarding.deleted");
  return new Response(null, { status: 204 });
});
