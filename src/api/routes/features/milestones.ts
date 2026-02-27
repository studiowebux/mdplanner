/**
 * Milestones CRUD routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  errorResponse,
  getParser,
  jsonResponse,
} from "../context.ts";
import { Task } from "../../../lib/types.ts";

export const milestonesRouter = new Hono<{ Variables: AppVariables }>();

function getTasksByMilestone(tasks: Task[], milestone: string): Task[] {
  const result: Task[] = [];
  const collect = (taskList: Task[]) => {
    for (const task of taskList) {
      if (task.config.milestone === milestone) result.push(task);
      if (task.children) collect(task.children);
    }
  };
  collect(tasks);
  return result;
}

// GET /milestones - list all milestones with progress
milestonesRouter.get("/", async (c) => {
  const parser = getParser(c);
  const milestones = await parser.readMilestones();
  const tasks = await parser.readTasks();
  const result = milestones.map((m) => {
    const linkedTasks = getTasksByMilestone(tasks, m.name);
    const completedCount = linkedTasks.filter((t) => t.completed).length;
    return {
      ...m,
      taskCount: linkedTasks.length,
      completedCount,
      progress: linkedTasks.length > 0
        ? Math.round((completedCount / linkedTasks.length) * 100)
        : 0,
    };
  });
  return jsonResponse(result);
});

// POST /milestones - create milestone
milestonesRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const milestones = await parser.readMilestones();
  const id = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
    /^-|-$/g,
    "",
  );
  milestones.push({
    id,
    name: body.name,
    target: body.target,
    status: body.status || "open",
    description: body.description,
    project: body.project,
  });
  await parser.saveMilestones(milestones);
  await cacheWriteThrough(c, "milestones");
  return jsonResponse({ success: true, id }, 201);
});

// PUT /milestones/:id - update milestone
milestonesRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const milestones = await parser.readMilestones();
  const index = milestones.findIndex((m) => m.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  milestones[index] = { ...milestones[index], ...body };
  await parser.saveMilestones(milestones);
  await cacheWriteThrough(c, "milestones");
  return jsonResponse({ success: true });
});

// DELETE /milestones/:id - delete milestone
milestonesRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const milestones = await parser.readMilestones();
  const filtered = milestones.filter((m) => m.id !== id);
  if (filtered.length === milestones.length) {
    return errorResponse("Not found", 404);
  }
  await parser.saveMilestones(filtered);
  cachePurge(c, "milestones", id);
  return jsonResponse({ success: true });
});
