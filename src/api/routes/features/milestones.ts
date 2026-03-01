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
import { eventBus } from "../../../lib/event-bus.ts";

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

// GET /milestones - list all milestones with progress, including names inferred from tasks
milestonesRouter.get("/", async (c) => {
  const parser = getParser(c);
  const [milestones, tasks] = await Promise.all([
    parser.readMilestones(),
    parser.readTasks(),
  ]);

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

  // Auto-create milestone files for any names referenced in tasks but missing a file.
  // This handles projects created before this feature was added.
  const existingNames = new Set(milestones.map((m) => m.name));
  const inferredNames = new Set<string>();
  const collectNames = (taskList: Task[]) => {
    for (const task of taskList) {
      if (task.config.milestone && !existingNames.has(task.config.milestone)) {
        inferredNames.add(task.config.milestone);
      }
      if (task.children) collectNames(task.children);
    }
  };
  collectNames(tasks);

  for (const name of inferredNames) {
    const created = await parser.addMilestone({ name, status: "open" });
    const linkedTasks = getTasksByMilestone(tasks, name);
    const completedCount = linkedTasks.filter((t) => t.completed).length;
    result.push({
      ...created,
      taskCount: linkedTasks.length,
      completedCount,
      progress: linkedTasks.length > 0
        ? Math.round((completedCount / linkedTasks.length) * 100)
        : 0,
    });
  }

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
  eventBus.emit({ entity: "milestones", action: "created", id });
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
  eventBus.emit({ entity: "milestones", action: "updated", id });
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
  eventBus.emit({ entity: "milestones", action: "deleted", id });
  return jsonResponse({ success: true });
});
