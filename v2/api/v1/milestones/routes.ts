// Milestone CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { getMilestoneService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateMilestoneSchema,
  ListMilestoneOptionsSchema,
  MilestoneSchema,
  UpdateMilestoneSchema,
} from "../../../types/milestone.types.ts";
import { ErrorSchema } from "../../../types/api.ts";

export const milestonesRouter = new OpenAPIHono();

// GET /
const listMilestonesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Milestones"],
  summary: "List all milestones",
  operationId: "listMilestones",
  request: {
    query: ListMilestoneOptionsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(MilestoneSchema) } },
      description: "List of milestones",
    },
  },
});

milestonesRouter.openapi(listMilestonesRoute, async (c) => {
  const { status, project } = c.req.valid("query");
  const milestones = await getMilestoneService().list({ status, project });
  return c.json(milestones, 200);
});

// GET /:id
const getMilestoneRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Milestones"],
  summary: "Get milestone by ID",
  operationId: "getMilestone",
  request: {
    params: z.object({
      id: z.string().openapi({ param: { name: "id", in: "path" } }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: MilestoneSchema } },
      description: "Milestone",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

milestonesRouter.openapi(getMilestoneRoute, async (c) => {
  const { id } = c.req.valid("param");
  const m = await getMilestoneService().getById(id);
  if (!m) {
    return c.json(
      { error: "MILESTONE_NOT_FOUND", message: `Milestone ${id} not found` },
      404,
    );
  }
  return c.json(m, 200);
});

// POST /
const createMilestoneRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Milestones"],
  summary: "Create a milestone",
  operationId: "createMilestone",
  request: {
    body: {
      content: { "application/json": { schema: CreateMilestoneSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: MilestoneSchema } },
      description: "Created milestone",
    },
  },
});

milestonesRouter.openapi(createMilestoneRoute, async (c) => {
  const data = c.req.valid("json");
  const m = await getMilestoneService().create(data);
  publish("milestone.created");
  return c.json(m, 201);
});

// PUT /:id
const updateMilestoneRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Milestones"],
  summary: "Update a milestone",
  operationId: "updateMilestone",
  request: {
    params: z.object({
      id: z.string().openapi({ param: { name: "id", in: "path" } }),
    }),
    body: {
      content: { "application/json": { schema: UpdateMilestoneSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: MilestoneSchema } },
      description: "Updated milestone",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

milestonesRouter.openapi(updateMilestoneRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const m = await getMilestoneService().update(id, data);
  if (!m) {
    return c.json(
      { error: "MILESTONE_NOT_FOUND", message: `Milestone ${id} not found` },
      404,
    );
  }
  publish("milestone.updated");
  return c.json(m, 200);
});

// DELETE /:id
const deleteMilestoneRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Milestones"],
  summary: "Delete a milestone",
  operationId: "deleteMilestone",
  request: {
    params: z.object({
      id: z.string().openapi({ param: { name: "id", in: "path" } }),
    }),
  },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

milestonesRouter.openapi(deleteMilestoneRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getMilestoneService().delete(id);
  if (!ok) {
    return c.json(
      { error: "MILESTONE_NOT_FOUND", message: `Milestone ${id} not found` },
      404,
    );
  }
  publish("milestone.deleted");
  return new Response(null, { status: 204 });
});
