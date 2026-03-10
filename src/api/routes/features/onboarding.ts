/**
 * Employee Onboarding CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const onboardingRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

// --- Route definitions ---

const listOnboardingRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Onboarding"],
  summary: "List all onboarding records sorted by startDate desc",
  operationId: "listOnboardingRecords",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of onboarding records",
    },
  },
});

const getOnboardingRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Onboarding"],
  summary: "Get a single onboarding record",
  operationId: "getOnboardingRecord",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Onboarding record details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createOnboardingRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Onboarding"],
  summary: "Create onboarding record",
  operationId: "createOnboardingRecord",
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
      description: "Onboarding record created",
    },
  },
});

const updateOnboardingRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Onboarding"],
  summary: "Update onboarding record",
  operationId: "updateOnboardingRecord",
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
      description: "Onboarding record updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteOnboardingRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Onboarding"],
  summary: "Delete onboarding record",
  operationId: "deleteOnboardingRecord",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Onboarding record deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

onboardingRouter.openapi(listOnboardingRoute, async (c) => {
  const parser = getParser(c);
  const records = await parser.readOnboardingRecords();
  return c.json(records, 200);
});

onboardingRouter.openapi(getOnboardingRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const records = await parser.readOnboardingRecords();
  const record = records.find((r) => r.id === id);
  if (!record) return c.json({ error: "Not found" }, 404);
  return c.json(record, 200);
});

onboardingRouter.openapi(createOnboardingRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const record = await parser.addOnboardingRecord({
    employeeName: body.employeeName || "New Employee",
    role: body.role || "",
    startDate: body.startDate || new Date().toISOString().split("T")[0],
    personId: body.personId,
    steps: body.steps ?? [],
    notes: body.notes,
  });
  await cacheWriteThrough(c, "onboarding");
  return c.json({ success: true, id: record.id }, 201);
});

onboardingRouter.openapi(updateOnboardingRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  // Only include fields that were explicitly provided to avoid clobbering
  // existing values with undefined when a partial update is sent.
  const updates: Record<string, unknown> = {};
  if (body.employeeName !== undefined) updates.employeeName = body.employeeName;
  if (body.role !== undefined) updates.role = body.role;
  if (body.startDate !== undefined) updates.startDate = body.startDate;
  if (body.personId !== undefined) updates.personId = body.personId;
  if (body.steps !== undefined) updates.steps = body.steps;
  if (body.notes !== undefined) updates.notes = body.notes;
  const updated = await parser.updateOnboardingRecord(id, updates);
  if (!updated) return c.json({ error: "Not found" }, 404);
  await cacheWriteThrough(c, "onboarding");
  return c.json({ success: true }, 200);
});

onboardingRouter.openapi(deleteOnboardingRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const deleted = await parser.deleteOnboardingRecord(id);
  if (!deleted) return c.json({ error: "Not found" }, 404);
  cachePurge(c, "onboarding", id);
  return c.json({ success: true }, 200);
});
