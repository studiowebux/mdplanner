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
import {
  BatchUpdateSchema,
  CreateTaskSchema,
  parseBody,
  SweepStaleClaimsSchema,
  TaskAttachmentsSchema,
  TaskClaimSchema,
  TaskCommentSchema,
  TaskCommentUpdateSchema,
  TaskMoveSchema,
  UpdateTaskSchema,
} from "../schemas.ts";

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
  if ("claimed_by" in body) config.claimedBy = body.claimed_by;
  if ("claimed_at" in body) config.claimedAt = body.claimed_at;
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

// GET /tasks/next - find highest-priority ready task matching agent skills
tasksRouter.get("/next", async (c) => {
  const parser = getParser(c);
  const agentId = c.req.query("agent_id");
  const project = c.req.query("project");
  const section = c.req.query("section") ?? "Todo";
  const excludeTagsRaw = c.req.query("exclude_tags");
  const excludeTags = excludeTagsRaw
    ? excludeTagsRaw.split(",").map((t) => t.trim())
    : [];

  if (!agentId) {
    return errorResponse("agent_id query parameter is required", 400);
  }

  const person = await parser.readPerson(agentId);
  if (!person) return errorResponse("Person not found", 404);
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

  // Filter by section
  let candidates = flat.filter((t) =>
    t.section.toLowerCase() === section.toLowerCase()
  );

  // Filter by project
  if (project) {
    candidates = candidates.filter((t) =>
      (t.config?.project ?? "").toLowerCase() === project.toLowerCase()
    );
  }

  // Filter ready: all blocked_by resolved
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

  // Exclude tags
  if (excludeTags.length) {
    const lowerExclude = excludeTags.map((t) => t.toLowerCase());
    candidates = candidates.filter((t) => {
      const taskTags = (t.config?.tags ?? []).map((tag: string) =>
        tag.toLowerCase()
      );
      return !taskTags.some((tag) => lowerExclude.includes(tag));
    });
  }

  // Sort by priority (1 = highest, undefined defaults to 5)
  candidates.sort((a, b) =>
    (a.config?.priority ?? 5) - (b.config?.priority ?? 5)
  );

  // Skill match
  if (skills.length > 0) {
    const skillMatch = candidates.find((t) => {
      const taskTags = (t.config?.tags ?? []).map((tag: string) =>
        tag.toLowerCase()
      );
      return taskTags.some((tag) => skills.includes(tag));
    });
    if (skillMatch) return jsonResponse(skillMatch);
  }

  // Fallback 1: untagged task
  const untagged = candidates.find((t) => !(t.config?.tags?.length));
  if (untagged) return jsonResponse(untagged);

  // Fallback 2: any remaining
  if (candidates.length > 0) return jsonResponse(candidates[0]);

  return jsonResponse(null);
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
  const raw = await c.req.json();
  const parsed = parseBody(CreateTaskSchema, raw);
  if (!parsed.success) return errorResponse(parsed.error, 400);
  const body = parsed.data;
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
  // Cache sync is fire-and-forget — GET /tasks reads from files, not cache.
  // Blocking on a full table re-sync delays the response unnecessarily.
  cacheWriteThrough(c, "tasks").catch((e) =>
    console.error("[tasks] background cache sync failed:", e)
  );
  await Promise.all([
    parser.touchLastUpdated(),
    ...(task.config.milestone
      ? [ensureMilestoneExists(parser, task.config.milestone)]
      : []),
  ]);
  return jsonResponse({ id: taskId }, 201);
});

// POST /tasks/sweep-stale-claims - release tasks with expired claims
tasksRouter.post("/sweep-stale-claims", async (c) => {
  const parser = getParser(c);
  const raw = await c.req.json().catch(() => ({}));
  const parsed = parseBody(SweepStaleClaimsSchema, raw);
  if (!parsed.success) return errorResponse(parsed.error, 400);
  const body = parsed.data;
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
  return jsonResponse({ released, count: released.length });
});

// POST /tasks/batch - batch update multiple tasks
tasksRouter.post("/batch", async (c) => {
  const parser = getParser(c);
  const raw = await c.req.json();
  const parsed = parseBody(BatchUpdateSchema, raw);
  if (!parsed.success) return errorResponse(parsed.error, 400);
  const updates = parsed.data.updates;

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const entry of updates) {
    if (!entry.id) {
      results.push({ id: "", success: false, error: "missing task id" });
      continue;
    }

    // Read current task for revision/claim checks
    const needsCurrentTask = entry.expected_revision !== undefined ||
      entry.agent_id;
    const current = needsCurrentTask ? await parser.readTask(entry.id) : null;

    if (needsCurrentTask && !current) {
      results.push({
        id: entry.id,
        success: false,
        error: "Task not found",
      });
      continue;
    }

    // Optimistic locking
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

    // Claim guard
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
      results.push({
        id: entry.id,
        success: false,
        error: "Task not found",
      });
      continue;
    }

    // Auto-create milestone if referenced
    if (taskUpdates.config?.milestone) {
      await ensureMilestoneExists(parser, taskUpdates.config.milestone).catch(
        () => {},
      );
    }

    // Optional inline comment
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
  return jsonResponse({ updated, total: updates.length, results });
});

// PUT /tasks/:id - update task
tasksRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const taskId = c.req.param("id");
  const raw = await c.req.json();
  const parsed = parseBody(UpdateTaskSchema, raw);
  if (!parsed.success) return errorResponse(parsed.error, 400);
  const body = parsed.data;

  // Read current task for revision/claim checks (only if needed)
  const needsCurrentTask = body.expected_revision !== undefined ||
    body.agent_id;
  const current = needsCurrentTask ? await parser.readTask(taskId) : null;
  if (needsCurrentTask && !current) {
    return errorResponse("Task not found", 404);
  }

  // Optimistic locking: reject stale updates
  if (
    body.expected_revision !== undefined && current &&
    current.revision !== body.expected_revision
  ) {
    return errorResponse(
      `REVISION_CONFLICT: expected revision ${body.expected_revision} but task is at revision ${current.revision}`,
      409,
    );
  }

  // Claim guard: reject updates from non-owner agents on claimed tasks
  if (
    body.agent_id && current &&
    current.section === "In Progress" &&
    current.config.claimedBy &&
    current.config.claimedBy !== body.agent_id
  ) {
    return errorResponse(
      `CLAIM_GUARD: task claimed by '${current.config.claimedBy}', caller is '${body.agent_id}'`,
      409,
    );
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
  const raw = await c.req.json();
  const parsed = parseBody(TaskAttachmentsSchema, raw);
  if (!parsed.success) return errorResponse(parsed.error, 400);
  const paths = parsed.data.paths;
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
  const raw = await c.req.json();
  const parsed = parseBody(TaskMoveSchema, raw);
  if (!parsed.success) return errorResponse(parsed.error, 400);
  const { section, position } = parsed.data;

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
  const raw = await c.req.json();
  const parsed = parseBody(TaskCommentSchema, raw);
  if (!parsed.success) return errorResponse(parsed.error, 400);
  const commentBody = parsed.data.body;
  const author = parsed.data.author;
  const metadata = parsed.data.metadata as
    | Record<string, unknown>
    | undefined;
  const comment = await parser.addComment(
    taskId,
    commentBody,
    author,
    metadata,
  );
  if (!comment) {
    return errorResponse("Task not found", 404);
  }

  cacheWriteThrough(c, "tasks").catch((e) =>
    console.error("[tasks] background cache sync failed:", e)
  );
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

  cacheWriteThrough(c, "tasks").catch((e) =>
    console.error("[tasks] background cache sync failed:", e)
  );
  return jsonResponse({ success: true });
});

// PUT /tasks/:id/comments/:commentId - update a comment body
tasksRouter.put("/:id/comments/:commentId", async (c) => {
  const parser = getParser(c);
  const taskId = c.req.param("id");
  const commentId = c.req.param("commentId");
  const raw = await c.req.json();
  const parsed = parseBody(TaskCommentUpdateSchema, raw);
  if (!parsed.success) return errorResponse(parsed.error, 400);
  const commentBody = parsed.data.body;
  const metadata = parsed.data.metadata as
    | Record<string, unknown>
    | undefined;
  const comment = await parser.updateComment(
    taskId,
    commentId,
    commentBody,
    metadata,
  );
  if (!comment) {
    return errorResponse("Task or comment not found", 404);
  }

  cacheWriteThrough(c, "tasks").catch((e) =>
    console.error("[tasks] background cache sync failed:", e)
  );
  return jsonResponse(comment);
});

// POST /tasks/:id/claim - atomically claim a task
tasksRouter.post("/:id/claim", async (c) => {
  const parser = getParser(c);
  const taskId = c.req.param("id");
  const raw = await c.req.json();
  const parsed = parseBody(TaskClaimSchema, raw);
  if (!parsed.success) return errorResponse(parsed.error, 400);
  const assignee = parsed.data.assignee;
  const expectedSection = parsed.data.expected_section;
  const expectedRevision = parsed.data.expected_revision;

  // Optimistic locking: reject stale claims
  if (expectedRevision !== undefined) {
    const current = await parser.readTask(taskId);
    if (!current) return errorResponse("Task not found", 404);
    if (current.revision !== expectedRevision) {
      return errorResponse(
        `REVISION_CONFLICT: expected revision ${expectedRevision} but task is at revision ${current.revision}`,
        409,
      );
    }
  }

  try {
    const task = await parser.claimTask(taskId, assignee, expectedSection);
    if (!task) {
      return errorResponse("Task not found", 404);
    }
    await cacheWriteThrough(c, "tasks");
    return jsonResponse(task);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("CLAIM_CONFLICT")) {
      return errorResponse(e.message, 409);
    }
    throw e;
  }
});

// Export for use in billing routes
export { findTaskById };
