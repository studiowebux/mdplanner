/**
 * Task CRUD routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  errorResponse,
  getParser,
  jsonResponse,
} from "./context.ts";
import { Task, TaskConfig } from "../../lib/types.ts";
import type { DirectoryMarkdownParser } from "../../lib/parser/directory/parser.ts";

export const tasksRouter = new Hono<{ Variables: AppVariables }>();

/**
 * Auto-create a milestone file if the given name is not already tracked.
 * Called after task create/update so every milestone reference has a backing file.
 */
async function ensureMilestoneExists(
  parser: DirectoryMarkdownParser,
  name: string,
): Promise<void> {
  const milestones = await parser.readMilestones();
  if (!milestones.some((m) => m.name === name)) {
    await parser.addMilestone({ name, status: "open" });
  }
}

/**
 * Map flat request body fields into a TaskConfig object.
 * Undefined/null/empty values produce undefined so callers can distinguish
 * "not provided" from "explicitly cleared" via deep merge in the parser.
 */
// deno-lint-ignore no-explicit-any
function bodyToConfig(body: Record<string, any>): TaskConfig {
  const config: TaskConfig = {};
  if (Array.isArray(body.tags) && body.tags.length) config.tags = body.tags;
  if (body.priority != null) config.priority = Number(body.priority);
  if (body.effort != null) config.effort = Number(body.effort);
  // Clearable string fields: include empty string so the merge layer can
  // overwrite (and the serializer's truthiness check drops them from file).
  if ("due_date" in body) config.due_date = body.due_date;
  if ("assignee" in body) config.assignee = body.assignee;
  if ("milestone" in body) config.milestone = body.milestone;
  if ("planned_start" in body) config.planned_start = body.planned_start;
  if ("planned_end" in body) config.planned_end = body.planned_end;
  if ("project" in body) config.project = body.project;
  if ("blocked_by" in body) config.blocked_by = body.blocked_by;
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
    createdAt: new Date().toISOString(),
    section: body.section || "Todo",
    description: bodyToDescription(body),
    config: bodyToConfig(body),
    ...(body.parentId && { parentId: body.parentId }),
  };
  const taskId = await parser.addTask(task);
  await Promise.all([
    cacheWriteThrough(c, "tasks"),
    parser.touchLastUpdated(),
    ...(task.config.milestone
      ? [ensureMilestoneExists(parser, task.config.milestone)]
      : []),
  ]);
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
    await Promise.all([
      cacheWriteThrough(c, "tasks"),
      parser.touchLastUpdated(),
      ...(updates.config?.milestone
        ? [ensureMilestoneExists(parser, updates.config.milestone)]
        : []),
    ]);
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
    cachePurge(c, "tasks", taskId);
    parser.touchLastUpdated().catch((e) =>
      console.error("[lastUpdated] touch failed:", e)
    );
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
    await cacheWriteThrough(c, "tasks");
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
      await cacheWriteThrough(c, "tasks");
      return jsonResponse({ success: true });
    }
  } else {
    const success = await parser.updateTask(taskId, { section });
    if (success) {
      await cacheWriteThrough(c, "tasks");
      return jsonResponse({ success: true });
    }
  }
  return errorResponse("Task not found", 404);
});

// POST /tasks/:id/comments - add a comment to a task
tasksRouter.post("/:id/comments", async (c) => {
  const parser = getParser(c);
  const taskId = c.req.param("id");
  const body = await c.req.json();
  const commentBody: string = String(body.body ?? "").trim();
  const author: string | undefined = body.author
    ? String(body.author)
    : undefined;

  if (!commentBody) {
    return errorResponse("comment body is required", 400);
  }

  const comment = await parser.addComment(taskId, commentBody, author);
  if (!comment) {
    return errorResponse("Task not found", 404);
  }

  await cacheWriteThrough(c, "tasks");
  return jsonResponse(comment, 201);
});

// DELETE /tasks/:id/comments/:commentId - delete a comment from a task
tasksRouter.delete("/:id/comments/:commentId", async (c) => {
  const parser = getParser(c);
  const taskId = c.req.param("id");
  const commentId = c.req.param("commentId");

  const success = await parser.deleteComment(taskId, commentId);
  if (!success) {
    return errorResponse("Task or comment not found", 404);
  }

  await cacheWriteThrough(c, "tasks");
  return jsonResponse({ success: true });
});

// PUT /tasks/:id/comments/:commentId - update a comment body
tasksRouter.put("/:id/comments/:commentId", async (c) => {
  const parser = getParser(c);
  const taskId = c.req.param("id");
  const commentId = c.req.param("commentId");
  const body = await c.req.json();
  const commentBody: string = String(body.body ?? "").trim();

  if (!commentBody) {
    return errorResponse("comment body is required", 400);
  }

  const comment = await parser.updateComment(taskId, commentId, commentBody);
  if (!comment) {
    return errorResponse("Task or comment not found", 404);
  }

  await cacheWriteThrough(c, "tasks");
  return jsonResponse(comment);
});

// Export for use in billing routes
export { findTaskById };
