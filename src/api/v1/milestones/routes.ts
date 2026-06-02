// Milestone CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getMilestoneService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateMilestoneSchema,
  ListMilestoneOptionsSchema,
  MilestoneSchema,
  UpdateMilestoneSchema,
} from "../../../types/milestone.types.ts";
import {
  IdParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";

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
    200: jsonContent(z.array(MilestoneSchema), "List of milestones"),
  },
});

milestonesRouter.openapi(listMilestonesRoute, async (c) => {
  try {
    const { status, project } = c.req.valid("query");
    const milestones = await getMilestoneService().list({ status, project });
    return c.json(milestones, 200);
  } catch (err) {
    throw err;
  }
});

// GET /:id
const getMilestoneRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Milestones"],
  summary: "Get milestone by ID",
  operationId: "getMilestone",
  request: {
    params: IdParam,
  },
  responses: {
    200: jsonContent(MilestoneSchema, "Milestone"),
    404: notFoundContent,
  },
});

milestonesRouter.openapi(getMilestoneRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const m = await getMilestoneService().getById(id);
    if (!m) {
      return c.json(
        notFound("MILESTONE", id),
        404,
      );
    }
    return c.json(m, 200);
  } catch (err) {
    throw err;
  }
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
    201: jsonContent(MilestoneSchema, "Created milestone"),
  },
});

milestonesRouter.openapi(createMilestoneRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const m = await getMilestoneService().create(data);
    publish("milestone.created");
    return c.json(m, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /:id
const updateMilestoneRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Milestones"],
  summary: "Update a milestone",
  operationId: "updateMilestone",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateMilestoneSchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(MilestoneSchema, "Updated milestone"),
    404: notFoundContent,
  },
});

milestonesRouter.openapi(updateMilestoneRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const m = await getMilestoneService().update(id, data);
    if (!m) {
      return c.json(
        notFound("MILESTONE", id),
        404,
      );
    }
    publish("milestone.updated");
    return c.json(m, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /:id
const deleteMilestoneRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Milestones"],
  summary: "Delete a milestone",
  operationId: "deleteMilestone",
  request: {
    params: IdParam,
  },
  responses: {
    204: { description: "Deleted" },
    404: notFoundContent,
  },
});

milestonesRouter.openapi(deleteMilestoneRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getMilestoneService().delete(id);
    if (!ok) {
      return c.json(
        notFound("MILESTONE", id),
        404,
      );
    }
    publish("milestone.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});
