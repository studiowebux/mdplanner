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
import { Task, TaskConfig } from "../../lib/types.ts";

export const tasksRouter = new Hono<{ Variables: AppVariables }>();

/**
 * Map flat request body fields into a TaskConfig object.
 * Undefined/null/empty values produce undefined so callers can distinguish
 * "not provided" from "explicitly cleared" via deep merge in the parser.
 */
// deno-lint-ignore no-explicit-any
function bodyToConfig(body: Record<string, any>): TaskConfig {
  const config: TaskConfig = {};
  if (Array.isArray(body.tag) && body.tag.length) config.tag = body.tag;
  if (body.due_date) config.due_date = body.due_date;
  if (body.assignee) config.assignee = body.assignee;
  if (body.priority != null) config.priority = Number(body.priority);
  if (body.effort != null) config.effort = Number(body.effort);
  if (body.milestone) config.milestone = body.milestone;
  if (body.planned_start) config.planned_start = body.planned_start;
  if (body.planned_end) config.planned_end = body.planned_end;
  return config;
}

// deno-lint-ignore no-explicit-any
function bodyToDescription(body: Record<string, any>): string[] | undefined {
  const raw = body.description;
  if (!raw || !String(raw).trim()) return undefined;
  return String(raw).split("\n");
}

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
  const task: Omit<Task, "id"> = {
    title: body.title || "Untitled",
    completed: false,
    section: body.section || "Todo",
    description: bodyToDescription(body),
    config: bodyToConfig(body),
    ...(body.parentId && { parentId: body.parentId }),
  };
  const taskId = await parser.addTask(task);
  return jsonResponse({ id: taskId }, 201);
});

// PUT /tasks/:id - update task
tasksRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const taskId = c.req.param("id");
  const body = await c.req.json();
  const updates: Partial<Task> = {
    ...(body.title !== undefined && { title: body.title }),
    ...(body.section !== undefined && { section: body.section }),
    ...(body.completed !== undefined && { completed: body.completed }),
    ...(body.description !== undefined && {
      description: bodyToDescription(body),
    }),
    config: bodyToConfig(body),
  };
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

// PATCH /tasks/:id/attachments - add file paths to task attachments frontmatter
tasksRouter.patch("/:id/attachments", async (c) => {
  const parser = getParser(c);
  const taskId = c.req.param("id");
  const body = await c.req.json();
  const paths: string[] = Array.isArray(body.paths) ? body.paths : [];
  if (!paths.length) {
    return errorResponse("paths array is required", 400);
  }
  const success = await parser.addAttachmentsToTask(taskId, paths);
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
