/**
 * Task CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "./context.ts";
import { Task, TaskConfig } from "../../lib/types.ts";
import type { DirectoryMarkdownParser } from "../../lib/parser/directory/parser.ts";
import {
  BatchUpdateSchema,
  CreateTaskSchema,
  SweepStaleClaimsSchema,
  TaskAttachmentsSchema,
  TaskClaimSchema,
  TaskCommentSchema,
  TaskCommentUpdateSchema,
  TaskMoveSchema,
  UpdateTaskSchema,
} from "../schemas.ts";

export const tasksRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const commentParams = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
  commentId: z.string().openapi({
    param: { name: "commentId", in: "path" },
  }),
});

const SuccessSchema = z.object({ success: z.boolean() });

/**
 * Auto-create a milestone file if the given name is not already tracked.
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

// deno-lint-ignore no-explicit-any
function bodyToConfig(body: Record<string, any>): TaskConfig {
  const config: TaskConfig = {};
  if (Array.isArray(body.tags) && body.tags.length) config.tags = body.tags;
  if (body.priority != null) config.priority = Number(body.priority);
  if (body.effort != null) config.effort = Number(body.effort);
  if ("due_date" in body) config.due_date = body.due_date;
  if ("assignee" in body) config.assignee = body.assignee;
  if ("milestone" in body) config.milestone = body.milestone;
  if ("planned_start" in body) config.planned_start = body.planned_start;
  if ("planned_end" in body) config.planned_end = body.planned_end;
  if ("project" in body) config.project = body.project;
  if ("blocked_by" in body) config.blocked_by = body.blocked_by;
  if ("claimed_by" in body) config.claimedBy = body.claimed_by;
  if ("claimed_at" in body) config.claimedAt = body.claimed_at;
  if ("githubRepo" in body) config.githubRepo = body.githubRepo;
  if ("githubIssue" in body) config.githubIssue = body.githubIssue;
  if ("githubPR" in body) config.githubPR = body.githubPR;
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
    if (task.id === id) return task;
    if (task.children) {
      const found = findTaskById(task.children, id);
      if (found) return found;
    }
  }
  return null;
}

// --- Route definitions ---

const listTasksRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Tasks"],
  summary: "List all tasks (hierarchical)",
  operationId: "listTasks",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.object({})) } },
      description: "Hierarchical task list",
    },
  },
});

const getNextTaskRoute = createRoute({
  method: "get",
  path: "/next",
  tags: ["Tasks"],
  summary: "Find highest-priority ready task matching agent skills",
  operationId: "getNextTask",
  request: {
    query: z.object({
      agent_id: z.string().openapi({
        description: "Person ID of the requesting agent (required)",
      }),
      project: z.string().optional().openapi({
        description: "Filter by project name",
      }),
      section: z.string().optional().openapi({
        description: "Section to search (default: Todo)",
      }),
      exclude_tags: z.string().optional().openapi({
        description: "Comma-separated tags to exclude",
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any().openapi({ description: "Best matching task, or null if none found" }) } },
      description: "Best matching task, or null if none found",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Missing agent_id",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Person not found",
    },
  },
});

const getTaskRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Tasks"],
  summary: "Get single task by ID",
  operationId: "getTask",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({}) } },
      description: "Task details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Task not found",
    },
  },
});

const createTaskRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Tasks"],
  summary: "Create task",
  operationId: "createTask",
  request: {
    body: {
      content: { "application/json": { schema: CreateTaskSchema } },
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
      description: "Task created",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
  },
});

const sweepStaleClaimsRoute = createRoute({
  method: "post",
  path: "/sweep-stale-claims",
  tags: ["Tasks"],
  summary: "Release tasks with expired claims",
  operationId: "sweepStaleClaims",
  request: {
    body: {
      content: { "application/json": { schema: SweepStaleClaimsSchema } },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            released: z.array(z.string()),
            count: z.number(),
          }),
        },
      },
      description: "Released task IDs",
    },
  },
});

const batchUpdateRoute = createRoute({
  method: "post",
  path: "/batch",
  tags: ["Tasks"],
  summary: "Batch update multiple tasks",
  operationId: "batchUpdateTasks",
  request: {
    body: {
      content: { "application/json": { schema: BatchUpdateSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            updated: z.number(),
            total: z.number(),
            results: z.array(z.object({
              id: z.string(),
              success: z.boolean(),
              error: z.string().optional(),
            })),
          }),
        },
      },
      description: "Batch results",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
  },
});

const updateTaskRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Tasks"],
  summary: "Update task",
  operationId: "updateTask",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: UpdateTaskSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Task updated",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Task not found",
    },
    409: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Revision conflict or claim guard violation",
    },
  },
});

const deleteTaskRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Tasks"],
  summary: "Delete task",
  operationId: "deleteTask",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Task deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Task not found",
    },
  },
});

const addAttachmentsRoute = createRoute({
  method: "patch",
  path: "/{id}/attachments",
  tags: ["Tasks"],
  summary: "Add file paths to task attachments",
  operationId: "addTaskAttachments",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: TaskAttachmentsSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Attachments added",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Task not found",
    },
  },
});

const moveTaskRoute = createRoute({
  method: "patch",
  path: "/{id}/move",
  tags: ["Tasks"],
  summary: "Move task to section with optional position",
  operationId: "moveTask",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: TaskMoveSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Task moved",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Task not found",
    },
  },
});

const addCommentRoute = createRoute({
  method: "post",
  path: "/{id}/comments",
  tags: ["Tasks"],
  summary: "Add comment to task",
  operationId: "addTaskComment",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: TaskCommentSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.object({}) } },
      description: "Comment added",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Task not found",
    },
  },
});

const deleteCommentRoute = createRoute({
  method: "delete",
  path: "/{id}/comments/{commentId}",
  tags: ["Tasks"],
  summary: "Delete comment from task",
  operationId: "deleteTaskComment",
  request: { params: commentParams },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Comment deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Task or comment not found",
    },
  },
});

const updateCommentRoute = createRoute({
  method: "put",
  path: "/{id}/comments/{commentId}",
  tags: ["Tasks"],
  summary: "Update comment body",
  operationId: "updateTaskComment",
  request: {
    params: commentParams,
    body: {
      content: { "application/json": { schema: TaskCommentUpdateSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({}) } },
      description: "Updated comment",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Task or comment not found",
    },
  },
});

const claimTaskRoute = createRoute({
  method: "post",
  path: "/{id}/claim",
  tags: ["Tasks"],
  summary: "Atomically claim a task",
  operationId: "claimTask",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: TaskClaimSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({}) } },
      description: "Claimed task",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Task not found",
    },
    409: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Claim conflict or revision mismatch",
    },
  },
});

// --- Handlers ---

tasksRouter.openapi(listTasksRoute, async (c) => {
  const parser = getParser(c);
  const tasks = await parser.readTasks();
  return c.json(tasks, 200);
});

tasksRouter.openapi(getNextTaskRoute, async (c) => {
  const parser = getParser(c);
  const { agent_id: agentId, project, section: sectionRaw, exclude_tags } = c
    .req.valid("query");
  const section = sectionRaw ?? "Todo";
  const excludeTags = exclude_tags
    ? exclude_tags.split(",").map((t) => t.trim())
    : [];

  if (!agentId) {
    return c.json(
      { error: "agent_id query parameter is required" },
      400,
    );
  }

  const person = await parser.readPerson(agentId);
  if (!person) return c.json({ error: "Person not found" }, 404);
  const skills = (person.skills ?? []).map((s) => s.toLowerCase());

  const tasks = await parser.readTasks();
  const flat: Task[] = [];
  const flatten = (list: Task[]) => {
    for (const t of list) {
      flat.push(t);
      if (t.children) flatten(t.children);
    }
  };
  flatten(tasks);

  let candidates = flat.filter((t) =>
    t.section.toLowerCase() === section.toLowerCase()
  );

  if (project) {
    candidates = candidates.filter((t) =>
      (t.config?.project ?? "").toLowerCase() === project.toLowerCase()
    );
  }

  const taskById = new Map(flat.map((t) => [t.id, t]));
  candidates = candidates.filter((t) => {
    const blockers = t.config?.blocked_by ?? [];
    if (blockers.length === 0) return true;
    return blockers.every((bid: string) => {
      const blocker = taskById.get(bid);
      return !blocker || blocker.completed ||
        blocker.section.toLowerCase() === "done";
    });
  });

  if (excludeTags.length) {
    const lowerExclude = excludeTags.map((t) => t.toLowerCase());
    candidates = candidates.filter((t) => {
      const taskTags = (t.config?.tags ?? []).map((tag: string) =>
        tag.toLowerCase()
      );
      return !taskTags.some((tag) => lowerExclude.includes(tag));
    });
  }

  candidates.sort((a, b) =>
    (a.config?.priority ?? 5) - (b.config?.priority ?? 5)
  );

  if (skills.length > 0) {
    const skillMatch = candidates.find((t) => {
      const taskTags = (t.config?.tags ?? []).map((tag: string) =>
        tag.toLowerCase()
      );
      return taskTags.some((tag) => skills.includes(tag));
    });
    if (skillMatch) return c.json(skillMatch, 200);
  }

  const untagged = candidates.find((t) => !(t.config?.tags?.length));
  if (untagged) return c.json(untagged, 200);

  if (candidates.length > 0) return c.json(candidates[0], 200);

  return c.json(null, 200);
});

tasksRouter.openapi(getTaskRoute, async (c) => {
  const parser = getParser(c);
  const { id: taskId } = c.req.valid("param");
  const tasks = await parser.readTasks();
  const task = findTaskById(tasks, taskId);
  if (task) return c.json(task, 200);
  return c.json({ error: "Task not found" }, 404);
});

tasksRouter.openapi(createTaskRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const task: Omit<Task, "id" | "revision"> = {
    title: body.title || "Untitled",
    completed: false,
    createdAt: new Date().toISOString(),
    section: body.section || "Todo",
    description: bodyToDescription(body),
    config: bodyToConfig(body),
    ...(body.parentId && { parentId: body.parentId }),
  };
  const taskId = await parser.addTask(task);
  cacheWriteThrough(c, "tasks").catch((e) =>
    console.error("[tasks] background cache sync failed:", e)
  );
  await Promise.all([
    parser.touchLastUpdated(),
    ...(task.config.milestone
      ? [ensureMilestoneExists(parser, task.config.milestone)]
      : []),
  ]);
  return c.json({ id: taskId }, 201);
});

tasksRouter.openapi(sweepStaleClaimsRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const ttl = (body.ttl_minutes ?? 30) * 60 * 1000;
  const now = Date.now();
  const tasks = await parser.readTasks();
  const flat: Task[] = [];
  const flatten = (list: Task[]) => {
    for (const t of list) {
      flat.push(t);
      if (t.children) flatten(t.children);
    }
  };
  flatten(tasks);

  const stale = flat.filter((t) => {
    if (t.section !== "In Progress") return false;
    const claimedAt = t.config?.claimedAt;
    if (!claimedAt) return false;
    return now - new Date(claimedAt).getTime() > ttl;
  });

  const released: string[] = [];
  for (const task of stale) {
    await parser.updateTask(task.id, {
      section: "Todo",
      config: { claimedBy: undefined, claimedAt: undefined },
    });
    await parser.addComment(
      task.id,
      `[system] Claim expired — agent '${task.config.claimedBy}' unresponsive after ${
        body.ttl_minutes ?? 30
      }min TTL`,
    );
    released.push(task.id);
  }

  if (released.length) {
    cacheWriteThrough(c, "tasks").catch((e) =>
      console.error("[tasks] background cache sync failed:", e)
    );
  }
  return c.json({ released, count: released.length }, 200);
});

tasksRouter.openapi(batchUpdateRoute, async (c) => {
  const parser = getParser(c);
  const { updates } = c.req.valid("json");

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const entry of updates) {
    if (!entry.id) {
      results.push({ id: "", success: false, error: "missing task id" });
      continue;
    }

    const needsCurrentTask = entry.expected_revision !== undefined ||
      entry.agent_id;
    const current = needsCurrentTask ? await parser.readTask(entry.id) : null;

    if (needsCurrentTask && !current) {
      results.push({ id: entry.id, success: false, error: "Task not found" });
      continue;
    }

    if (
      entry.expected_revision !== undefined && current &&
      current.revision !== entry.expected_revision
    ) {
      results.push({
        id: entry.id,
        success: false,
        error:
          `REVISION_CONFLICT: expected ${entry.expected_revision}, actual ${current.revision}`,
      });
      continue;
    }

    if (
      entry.agent_id && current &&
      current.section === "In Progress" &&
      current.config.claimedBy &&
      current.config.claimedBy !== entry.agent_id
    ) {
      results.push({
        id: entry.id,
        success: false,
        error:
          `CLAIM_GUARD: task claimed by '${current.config.claimedBy}', caller is '${entry.agent_id}'`,
      });
      continue;
    }

    const taskUpdates: Partial<Task> = {
      ...(entry.title !== undefined && { title: entry.title }),
      ...(entry.section !== undefined && { section: entry.section }),
      ...(entry.completed !== undefined && { completed: entry.completed }),
      ...(entry.description !== undefined && {
        description: bodyToDescription(entry),
      }),
      config: bodyToConfig(entry),
    };

    const success = await parser.updateTask(entry.id, taskUpdates);
    if (!success) {
      results.push({ id: entry.id, success: false, error: "Task not found" });
      continue;
    }

    if (taskUpdates.config?.milestone) {
      await ensureMilestoneExists(parser, taskUpdates.config.milestone).catch(
        () => {},
      );
    }

    if (entry.comment) {
      await parser.addComment(
        entry.id,
        String(entry.comment),
        entry.comment_author ? String(entry.comment_author) : undefined,
        entry.comment_metadata as Record<string, unknown> | undefined,
      );
    }

    results.push({ id: entry.id, success: true });
  }

  const updated = results.filter((r) => r.success).length;
  if (updated > 0) {
    cacheWriteThrough(c, "tasks").catch((e) =>
      console.error("[tasks] background cache sync failed:", e)
    );
    parser.touchLastUpdated().catch((e) =>
      console.error("[lastUpdated] touch failed:", e)
    );
  }
  return c.json({ updated, total: updates.length, results }, 200);
});

tasksRouter.openapi(updateTaskRoute, async (c) => {
  const parser = getParser(c);
  const { id: taskId } = c.req.valid("param");
  const body = c.req.valid("json");

  const needsCurrentTask = body.expected_revision !== undefined ||
    body.agent_id;
  const current = needsCurrentTask ? await parser.readTask(taskId) : null;
  if (needsCurrentTask && !current) {
    return c.json({ error: "Task not found" }, 404);
  }

  if (
    body.expected_revision !== undefined && current &&
    current.revision !== body.expected_revision
  ) {
    return c.json({
      error:
        `REVISION_CONFLICT: expected revision ${body.expected_revision} but task is at revision ${current.revision}`,
    }, 409);
  }

  if (
    body.agent_id && current &&
    current.section === "In Progress" &&
    current.config.claimedBy &&
    current.config.claimedBy !== body.agent_id
  ) {
    return c.json({
      error:
        `CLAIM_GUARD: task claimed by '${current.config.claimedBy}', caller is '${body.agent_id}'`,
    }, 409);
  }

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
    cacheWriteThrough(c, "tasks").catch((e) =>
      console.error("[tasks] background cache sync failed:", e)
    );
    await Promise.all([
      parser.touchLastUpdated(),
      ...(updates.config?.milestone
        ? [ensureMilestoneExists(parser, updates.config.milestone)]
        : []),
    ]);
    return c.json({ success: true }, 200);
  }
  return c.json({ error: "Task not found" }, 404);
});

tasksRouter.openapi(deleteTaskRoute, async (c) => {
  const parser = getParser(c);
  const { id: taskId } = c.req.valid("param");
  const success = await parser.deleteTask(taskId);

  if (success) {
    cachePurge(c, "tasks", taskId);
    parser.touchLastUpdated().catch((e) =>
      console.error("[lastUpdated] touch failed:", e)
    );
    return c.json({ success: true }, 200);
  }
  return c.json({ error: "Task not found" }, 404);
});

tasksRouter.openapi(addAttachmentsRoute, async (c) => {
  const parser = getParser(c);
  const { id: taskId } = c.req.valid("param");
  const { paths } = c.req.valid("json");
  const success = await parser.addAttachmentsToTask(taskId, paths);
  if (success) {
    await cacheWriteThrough(c, "tasks");
    return c.json({ success: true }, 200);
  }
  return c.json({ error: "Task not found" }, 404);
});

tasksRouter.openapi(moveTaskRoute, async (c) => {
  const parser = getParser(c);
  const { id: taskId } = c.req.valid("param");
  const { section, position } = c.req.valid("json");

  if (position !== undefined && position !== null) {
    const success = await parser.reorderTask(taskId, section, position);
    if (success) {
      await cacheWriteThrough(c, "tasks");
      return c.json({ success: true }, 200);
    }
  } else {
    const success = await parser.updateTask(taskId, { section });
    if (success) {
      await cacheWriteThrough(c, "tasks");
      return c.json({ success: true }, 200);
    }
  }
  return c.json({ error: "Task not found" }, 404);
});

tasksRouter.openapi(addCommentRoute, async (c) => {
  const parser = getParser(c);
  const { id: taskId } = c.req.valid("param");
  const { body: commentBody, author, metadata } = c.req.valid("json");
  const comment = await parser.addComment(
    taskId,
    commentBody,
    author,
    metadata as Record<string, unknown> | undefined,
  );
  if (!comment) {
    return c.json({ error: "Task not found" }, 404);
  }
  cacheWriteThrough(c, "tasks").catch((e) =>
    console.error("[tasks] background cache sync failed:", e)
  );
  return c.json(comment, 201);
});

tasksRouter.openapi(deleteCommentRoute, async (c) => {
  const parser = getParser(c);
  const { id: taskId, commentId } = c.req.valid("param");
  const success = await parser.deleteComment(taskId, commentId);
  if (!success) {
    return c.json({ error: "Task or comment not found" }, 404);
  }
  cacheWriteThrough(c, "tasks").catch((e) =>
    console.error("[tasks] background cache sync failed:", e)
  );
  return c.json({ success: true }, 200);
});

tasksRouter.openapi(updateCommentRoute, async (c) => {
  const parser = getParser(c);
  const { id: taskId, commentId } = c.req.valid("param");
  const { body: commentBody, metadata } = c.req.valid("json");
  const comment = await parser.updateComment(
    taskId,
    commentId,
    commentBody,
    metadata as Record<string, unknown> | undefined,
  );
  if (!comment) {
    return c.json({ error: "Task or comment not found" }, 404);
  }
  cacheWriteThrough(c, "tasks").catch((e) =>
    console.error("[tasks] background cache sync failed:", e)
  );
  return c.json(comment, 200);
});

tasksRouter.openapi(claimTaskRoute, async (c) => {
  const parser = getParser(c);
  const { id: taskId } = c.req.valid("param");
  const { assignee, expected_section, expected_revision } = c.req.valid("json");

  if (expected_revision !== undefined) {
    const current = await parser.readTask(taskId);
    if (!current) return c.json({ error: "Task not found" }, 404);
    if (current.revision !== expected_revision) {
      return c.json({
        error:
          `REVISION_CONFLICT: expected revision ${expected_revision} but task is at revision ${current.revision}`,
      }, 409);
    }
  }

  try {
    const task = await parser.claimTask(taskId, assignee, expected_section);
    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }
    await cacheWriteThrough(c, "tasks");
    return c.json(task, 200);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("CLAIM_CONFLICT")) {
      return c.json({ error: e.message }, 409);
    }
    throw e;
  }
});

export { findTaskById };
