// Goal CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getGoalService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateGoalSchema,
  GoalSchema,
  ListGoalOptionsSchema,
  UpdateGoalSchema,
} from "../../../types/goal.types.ts";
import { ErrorSchema, IdParam } from "../../../types/api.ts";

export const goalsRouter = new OpenAPIHono();

// GET /
const listGoalsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Goals"],
  summary: "List all goals",
  operationId: "listGoals",
  request: { query: ListGoalOptionsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(GoalSchema) } },
      description: "List of goals",
    },
  },
});

goalsRouter.openapi(listGoalsRoute, async (c) => {
  try {
    const { status, type, project } = c.req.valid("query");
    const goals = await getGoalService().list({ status, type, project });
    return c.json(goals, 200);
  } catch (err) {
    throw err;
  }
});

// GET /{id}
const getGoalRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Goals"],
  summary: "Get goal by ID",
  operationId: "getGoal",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: GoalSchema } },
      description: "Goal",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

goalsRouter.openapi(getGoalRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const goal = await getGoalService().getById(id);
    if (!goal) {
      return c.json(
        { error: "GOAL_NOT_FOUND", message: `Goal ${id} not found` },
        404,
      );
    }
    return c.json(goal, 200);
  } catch (err) {
    throw err;
  }
});

// POST /
const createGoalRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Goals"],
  summary: "Create a goal",
  operationId: "createGoal",
  request: {
    body: {
      content: { "application/json": { schema: CreateGoalSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: GoalSchema } },
      description: "Created goal",
    },
  },
});

goalsRouter.openapi(createGoalRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const goal = await getGoalService().create(data);
    publish("goal.created");
    return c.json(goal, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /{id}
const updateGoalRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Goals"],
  summary: "Update a goal",
  operationId: "updateGoal",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateGoalSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: GoalSchema } },
      description: "Updated goal",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

goalsRouter.openapi(updateGoalRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const goal = await getGoalService().update(id, data);
    if (!goal) {
      return c.json(
        { error: "GOAL_NOT_FOUND", message: `Goal ${id} not found` },
        404,
      );
    }
    publish("goal.updated");
    return c.json(goal, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /{id}
const deleteGoalRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Goals"],
  summary: "Delete a goal",
  operationId: "deleteGoal",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

goalsRouter.openapi(deleteGoalRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getGoalService().delete(id);
    if (!ok) {
      return c.json(
        { error: "GOAL_NOT_FOUND", message: `Goal ${id} not found` },
        404,
      );
    }
    publish("goal.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});
