/**
 * Goals CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "./context.ts";
import { CreateGoalSchema, UpdateGoalSchema } from "../schemas.ts";

export const goalsRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const SuccessSchema = z.object({ success: z.boolean() });

// --- Route definitions ---

const listGoalsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Goals"],
  summary: "List all goals",
  operationId: "listGoals",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.object({})) } },
      description: "List of goals",
    },
  },
});

const getGoalRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Goals"],
  summary: "Get single goal by ID",
  operationId: "getGoal",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({}) } },
      description: "Goal details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Goal not found",
    },
  },
});

const createGoalRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Goals"],
  summary: "Create goal",
  operationId: "createGoal",
  request: {
    body: {
      content: { "application/json": { schema: CreateGoalSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({ id: z.string() }),
        },
      },
      description: "Goal created",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
  },
});

const updateGoalRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Goals"],
  summary: "Update goal",
  operationId: "updateGoal",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: UpdateGoalSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Goal updated",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Goal not found",
    },
  },
});

const deleteGoalRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Goals"],
  summary: "Delete goal",
  operationId: "deleteGoal",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Goal deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Goal not found",
    },
  },
});

// --- Handlers ---

goalsRouter.openapi(listGoalsRoute, async (c) => {
  const parser = getParser(c);
  const projectInfo = await parser.readProjectInfo();
  return c.json(projectInfo.goals, 200);
});

goalsRouter.openapi(getGoalRoute, async (c) => {
  const parser = getParser(c);
  const { id: goalId } = c.req.valid("param");
  const projectInfo = await parser.readProjectInfo();
  const goal = projectInfo.goals.find((g) => g.id === goalId);

  if (goal) {
    return c.json(goal, 200);
  }
  return c.json({ error: "Goal not found" }, 404);
});

goalsRouter.openapi(createGoalRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const goalId = await parser.addGoal(
    body as Parameters<typeof parser.addGoal>[0],
  );
  await cacheWriteThrough(c, "goals");
  return c.json({ id: goalId }, 201);
});

goalsRouter.openapi(updateGoalRoute, async (c) => {
  const parser = getParser(c);
  const { id: goalId } = c.req.valid("param");
  const body = c.req.valid("json");
  const success = await parser.updateGoal(goalId, body);

  if (success) {
    await cacheWriteThrough(c, "goals");
    return c.json({ success: true }, 200);
  }
  return c.json({ error: "Goal not found" }, 404);
});

goalsRouter.openapi(deleteGoalRoute, async (c) => {
  const parser = getParser(c);
  const { id: goalId } = c.req.valid("param");
  const success = await parser.deleteGoal(goalId);

  if (success) {
    cachePurge(c, "goals", goalId);
    return c.json({ success: true }, 200);
  }
  return c.json({ error: "Goal not found" }, 404);
});
