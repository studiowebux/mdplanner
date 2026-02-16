/**
 * Task CRUD routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  errorResponse,
  getParser,
  jsonResponse,
} from "./context.ts";
import { Task } from "../../lib/types.ts";

export const tasksRouter = new Hono<{ Variables: AppVariables }>();

function findTaskById(tasks: Task[], id: string): Task | null {
  for (const task of tasks) {
    if (task.id === id) {
      return task;
    }
    if (task.children) {
      const found = findTaskById(task.children, id);
      if (found) return found;
    }
  }
  return null;
}

// GET /tasks - list all tasks
tasksRouter.get("/", async (c) => {
  const parser = getParser(c);
  const tasks = await parser.readTasks();
  return jsonResponse(tasks);
});

// GET /tasks/:id - get single task
tasksRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const taskId = c.req.param("id");
  const tasks = await parser.readTasks();
  const task = findTaskById(tasks, taskId);

  if (task) {
    return jsonResponse(task);
  }
  return errorResponse("Task not found", 404);
});

// POST /tasks - create task
tasksRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const taskId = await parser.addTask(body);
  return jsonResponse({ id: taskId }, 201);
});

// PUT /tasks/:id - update task
tasksRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const taskId = c.req.param("id");
  const updates = await c.req.json();
  const success = await parser.updateTask(taskId, updates);

  if (success) {
    return jsonResponse({ success: true });
  }
  return errorResponse("Task not found", 404);
});

// DELETE /tasks/:id - delete task
tasksRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const taskId = c.req.param("id");
  const success = await parser.deleteTask(taskId);

  if (success) {
    return jsonResponse({ success: true });
  }
  return errorResponse("Task not found", 404);
});

// PATCH /tasks/:id/move - move task to section with optional position
tasksRouter.patch("/:id/move", async (c) => {
  const parser = getParser(c);
  const taskId = c.req.param("id");
  const { section, position } = await c.req.json();

  // If position is provided, use reorder; otherwise just move section
  if (position !== undefined && position !== null) {
    const success = await parser.reorderTask(taskId, section, position);
    if (success) {
      return jsonResponse({ success: true });
    }
  } else {
    const success = await parser.updateTask(taskId, { section });
    if (success) {
      return jsonResponse({ success: true });
    }
  }
  return errorResponse("Task not found", 404);
});

// Export for use in billing routes
export { findTaskById };
