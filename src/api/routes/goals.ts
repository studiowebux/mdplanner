/**
 * Goals CRUD routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  cacheWriteThrough,
  cachePurge,
  errorResponse,
  getParser,
  jsonResponse,
} from "./context.ts";

export const goalsRouter = new Hono<{ Variables: AppVariables }>();

// GET /goals - list all goals
goalsRouter.get("/", async (c) => {
  const parser = getParser(c);
  const projectInfo = await parser.readProjectInfo();
  return jsonResponse(projectInfo.goals);
});

// GET /goals/:id - get single goal
goalsRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const goalId = c.req.param("id");
  const projectInfo = await parser.readProjectInfo();
  const goal = projectInfo.goals.find((g) => g.id === goalId);

  if (goal) {
    return jsonResponse(goal);
  }
  return errorResponse("Goal not found", 404);
});

// POST /goals - create goal
goalsRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const goalId = await parser.addGoal(body);
  await cacheWriteThrough(c, "goals");
  return jsonResponse({ id: goalId }, 201);
});

// PUT /goals/:id - update goal
goalsRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const goalId = c.req.param("id");
  const updates = await c.req.json();
  const success = await parser.updateGoal(goalId, updates);

  if (success) {
    await cacheWriteThrough(c, "goals");
    return jsonResponse({ success: true });
  }
  return errorResponse("Goal not found", 404);
});

// DELETE /goals/:id - delete goal
goalsRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const goalId = c.req.param("id");
  const success = await parser.deleteGoal(goalId);

  if (success) {
    cachePurge(c, "goals", goalId);
    return jsonResponse({ success: true });
  }
  return errorResponse("Goal not found", 404);
});
