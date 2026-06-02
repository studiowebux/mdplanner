// Task CRUD + workflow routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  getPeopleService,
  getProjectDir,
  getTaskService,
} from "../../../singletons/services.ts";
import { parseMentions } from "../../../utils/mentions.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  AddAttachmentsInputSchema,
  AddCommentInputSchema,
  ApproveTaskInputSchema,
  BatchUpdateItemSchema,
  BatchUpdateResultSchema,
  ClaimTaskInputSchema,
  CreateTaskSchema,
  GetNextTaskQuerySchema,
  IdAndCommentIdParam,
  IdAndEntryIdParam,
  ListTaskOptionsSchema,
  MoveTaskInputSchema,
  RejectTaskInputSchema,
  ReorderTaskInputSchema,
  RequestApprovalInputSchema,
  SweepStaleClaimsInputSchema,
  SweepStaleClaimsResultSchema,
  TaskCommentSchema,
  TaskSchema,
  TimeEntrySchema,
  UpdateCommentInputSchema,
  UpdateTaskSchema,
} from "../../../types/task.types.ts";
import {
  badRequest,
  errorContent,
  IdParam,
  invalidState,
  jsonContent,
  notFound,
  notFoundContent,
  payloadTooLarge,
} from "../../../types/api.ts";
import { sortTasks } from "../../../domains/task/constants.tsx";
import { deleteUiStateKeys } from "../../../utils/ui-state.ts";
import type { AppVariables } from "../../../types/app.ts";
import {
  ClaimConflictError,
  ClaimGuardError,
  RevisionConflictError,
} from "../../../services/task.service.ts";

export const tasksRouter = new OpenAPIHono<{ Variables: AppVariables }>();

/** Canonical 422 payload for archived-task mutations. */
const taskArchived = (id: string) => invalidState(`Task ${id} is archived`);

/** Canonical 422 response schema shared by every guarded mutation route.
 * Inlined per-route to keep OpenAPIHono's literal-type inference happy —
 * a spread loses the 422 literal across the createRoute boundary. */
const ARCHIVED_RESPONSE_DESC = "Task is archived";

// GET /
tasksRouter.openapi(
  createRoute({
    method: "get",
    path: "/",
    tags: ["Tasks"],
    summary: "List tasks",
    operationId: "listTasks",
    request: { query: ListTaskOptionsSchema },
    responses: {
      200: jsonContent(z.array(TaskSchema), "List of tasks"),
    },
  }),
  async (c) => {
    const tasks = await getTaskService().list(c.req.valid("query"));
    return c.json(tasks, 200);
  },
);

// GET /next
tasksRouter.openapi(
  createRoute({
    method: "get",
    path: "/next",
    tags: ["Tasks"],
    summary: "Get next available task for an agent",
    operationId: "getNextTask",
    request: { query: GetNextTaskQuerySchema },
    responses: {
      200: jsonContent(TaskSchema, "Next task"),
      204: { description: "No tasks available" },
    },
  }),
  async (c) => {
    const { agentId, skills } = c.req.valid("query");
    const agentSkills = skills?.split(",").map((s) => s.trim()).filter(Boolean);
    const task = await getTaskService().getNextTask(agentId, agentSkills);
    if (!task) return new Response(null, { status: 204 });
    return c.json(task, 200);
  },
);

// POST /sweep-stale-claims
tasksRouter.openapi(
  createRoute({
    method: "post",
    path: "/sweep-stale-claims",
    tags: ["Tasks"],
    summary: "Release stale task claims",
    operationId: "sweepStaleClaims",
    request: {
      body: {
        content: {
          "application/json": { schema: SweepStaleClaimsInputSchema },
        },
      },
    },
    responses: {
      200: jsonContent(SweepStaleClaimsResultSchema, "Swept task IDs"),
    },
  }),
  async (c) => {
    const { ttlMinutes } = c.req.valid("json");
    const swept = await getTaskService().sweepStaleClaims(ttlMinutes);
    return c.json({ swept }, 200);
  },
);

// POST /batch
tasksRouter.openapi(
  createRoute({
    method: "post",
    path: "/batch",
    tags: ["Tasks"],
    summary: "Batch update multiple tasks",
    operationId: "batchUpdateTasks",
    request: {
      body: {
        content: {
          "application/json": { schema: z.array(BatchUpdateItemSchema) },
        },
        required: true,
      },
    },
    responses: {
      200: jsonContent(BatchUpdateResultSchema, "Batch result"),
    },
  }),
  async (c) => {
    // Per-id archive guard: archived ids fail with a clear error; the rest
    // flow through service.batchUpdate normally. Mirrors the MCP
    // batch_update_tasks behavior.
    const items = c.req.valid("json");
    const svc = getTaskService();
    const archivedFailures: { id: string; error: string }[] = [];
    const live: typeof items = [];
    for (const u of items) {
      const current = await svc.getById(u.id);
      if (current && current.archived === true) {
        archivedFailures.push({ id: u.id, error: `Task ${u.id} is archived` });
      } else {
        live.push(u);
      }
    }
    const result = live.length > 0
      ? await svc.batchUpdate(live)
      : { succeeded: [], failed: [] };
    publish("task.updated");
    return c.json({
      succeeded: result.succeeded,
      failed: [...result.failed, ...archivedFailures],
    }, 200);
  },
);

// GET /:id
tasksRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}",
    tags: ["Tasks"],
    summary: "Get task by ID",
    operationId: "getTask",
    request: { params: IdParam },
    responses: {
      200: jsonContent(TaskSchema, "Task"),
      404: notFoundContent,
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const task = await getTaskService().getById(id);
    if (!task) {
      return c.json(notFound("TASK", id), 404);
    }
    return c.json(task, 200);
  },
);

// POST /
tasksRouter.openapi(
  createRoute({
    method: "post",
    path: "/",
    tags: ["Tasks"],
    summary: "Create a task",
    operationId: "createTask",
    request: {
      body: {
        content: { "application/json": { schema: CreateTaskSchema } },
        required: true,
      },
    },
    responses: {
      201: jsonContent(TaskSchema, "Created task"),
    },
  }),
  async (c) => {
    const task = await getTaskService().create(c.req.valid("json"));
    publish("task.created");
    return c.json(task, 201);
  },
);

// PUT /:id
tasksRouter.openapi(
  createRoute({
    method: "put",
    path: "/{id}",
    tags: ["Tasks"],
    summary: "Update a task",
    operationId: "updateTask",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: UpdateTaskSchema } },
        required: true,
      },
    },
    responses: {
      200: jsonContent(TaskSchema, "Updated task"),
      404: notFoundContent,
      409: errorContent("Revision conflict or claim guard"),
      422: errorContent(ARCHIVED_RESPONSE_DESC),
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const expectedRevision = c.req.header("X-Expected-Revision")
      ? Number(c.req.header("X-Expected-Revision"))
      : undefined;
    const agentId = c.req.header("X-Agent-Id") ?? undefined;
    const existing = await getTaskService().getById(id);
    if (!existing) return c.json(notFound("TASK", id), 404);
    if (existing.archived === true) return c.json(taskArchived(id), 422);
    try {
      const task = await getTaskService().update(
        id,
        c.req.valid("json"),
        expectedRevision,
        agentId,
      );
      if (!task) {
        return c.json(notFound("TASK", id), 404);
      }
      publish("task.updated");
      return c.json(task, 200);
    } catch (err) {
      if (
        err instanceof RevisionConflictError || err instanceof ClaimGuardError
      ) {
        return c.json(
          { error: err.code, message: err.message, status: 409 },
          409,
        );
      }
      throw err;
    }
  },
);

// DELETE /:id
tasksRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["Tasks"],
    summary: "Delete a task",
    operationId: "deleteTask",
    request: { params: IdParam },
    responses: {
      204: { description: "Deleted" },
      404: notFoundContent,
      422: errorContent(ARCHIVED_RESPONSE_DESC),
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const existing = await getTaskService().getById(id);
    if (!existing) return c.json(notFound("TASK", id), 404);
    if (existing.archived === true) return c.json(taskArchived(id), 422);
    const ok = await getTaskService().delete(id);
    if (!ok) {
      return c.json(notFound("TASK", id), 404);
    }
    publish("task.deleted");
    return new Response(null, { status: 204 });
  },
);

// POST /:id/claim
tasksRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/claim",
    tags: ["Tasks"],
    summary: "Claim a task (atomic move to In Progress)",
    operationId: "claimTask",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: ClaimTaskInputSchema } },
        required: true,
      },
    },
    responses: {
      200: jsonContent(TaskSchema, "Claimed task"),
      404: notFoundContent,
      409: errorContent("Claim conflict"),
      422: errorContent(ARCHIVED_RESPONSE_DESC),
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { assignee, expectedSection } = c.req.valid("json");
    const existing = await getTaskService().getById(id);
    if (!existing) return c.json(notFound("TASK", id), 404);
    if (existing.archived === true) return c.json(taskArchived(id), 422);
    try {
      const task = await getTaskService().claimTask(
        id,
        assignee,
        expectedSection,
      );
      if (!task) {
        return c.json(notFound("TASK", id), 404);
      }
      publish("task.updated");
      return c.json(task, 200);
    } catch (err) {
      if (err instanceof ClaimConflictError) {
        return c.json(
          { error: err.code, message: err.message, status: 409 },
          409,
        );
      }
      throw err;
    }
  },
);

// PATCH /:id/move
tasksRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}/move",
    tags: ["Tasks"],
    summary: "Move task to a different section",
    operationId: "moveTask",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: MoveTaskInputSchema } },
        required: true,
      },
    },
    responses: {
      200: jsonContent(TaskSchema, "Moved task"),
      404: notFoundContent,
      422: errorContent(ARCHIVED_RESPONSE_DESC),
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { section } = c.req.valid("json");
    const existing = await getTaskService().getById(id);
    if (!existing) return c.json(notFound("TASK", id), 404);
    if (existing.archived === true) return c.json(taskArchived(id), 422);
    const task = await getTaskService().moveTask(id, section);
    if (!task) {
      return c.json(notFound("TASK", id), 404);
    }
    publish("task.updated");
    return c.json(task, 200);
  },
);

// POST /:id/reorder
tasksRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/reorder",
    tags: ["Tasks"],
    summary: "Reorder task within its section",
    operationId: "reorderTask",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: ReorderTaskInputSchema } },
        required: true,
      },
    },
    responses: {
      200: jsonContent(TaskSchema, "Reordered task"),
      404: notFoundContent,
      422: errorContent(ARCHIVED_RESPONSE_DESC),
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { afterId } = c.req.valid("json");

    const task = await getTaskService().getById(id);
    if (!task) {
      return c.json(notFound("TASK", id), 404);
    }
    if (task.archived === true) return c.json(taskArchived(id), 422);

    // Build the current display order for the section, then splice the
    // dragged task to the position indicated by afterId.
    const all = await getTaskService().list();
    const section = task.section;
    // Sort by the same logic the view uses: order asc, priority asc, title asc.
    const sectionTasks = sortTasks(all.filter((t) => t.section === section));

    // Remove the dragged task from its current position.
    const without = sectionTasks.filter((t) => t.id !== id);

    // Insert after afterId (null = beginning).
    let insertIdx = 0;
    if (afterId != null) {
      const afterIdx = without.findIndex((t) => t.id === afterId);
      insertIdx = afterIdx === -1 ? without.length : afterIdx + 1;
    }
    without.splice(insertIdx, 0, task);

    // Renormalize all tasks in the section to 10, 20, 30, …
    await Promise.all(
      without.map((t, i) => {
        const normalized = (i + 1) * 10;
        if (t.order !== normalized) {
          return getTaskService().update(t.id, { order: normalized });
        }
        return Promise.resolve();
      }),
    );

    const updated = await getTaskService().getById(id);
    if (!updated) {
      return c.json(notFound("TASK", id), 404);
    }

    // Clear any column sort from the cookie so F5 respects drag order.
    deleteUiStateKeys(c, "tasks", ["sort", "order"]);

    publish("task.updated");
    return c.json(updated, 200);
  },
);

// POST /:id/comments
tasksRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/comments",
    tags: ["Tasks"],
    summary: "Add a comment to a task",
    operationId: "addTaskComment",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: AddCommentInputSchema } },
        required: true,
      },
    },
    responses: {
      201: jsonContent(TaskCommentSchema, "Created comment"),
      404: notFoundContent,
      422: errorContent(ARCHIVED_RESPONSE_DESC),
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { body, author, metadata } = c.req.valid("json");
    const existing = await getTaskService().getById(id);
    if (!existing) return c.json(notFound("TASK", id), 404);
    if (existing.archived === true) return c.json(taskArchived(id), 422);

    const names = parseMentions(body);
    let resolvedMetadata = metadata;
    if (names.length > 0) {
      const people = await getPeopleService().list();
      const mentionedIds = names
        .map((name) => {
          const lower = name.toLowerCase();
          return people.find((p) => p.name.toLowerCase() === lower) ??
            people.find(
              (p) =>
                p.name.toLowerCase().replace(/\s+/g, "-") === lower ||
                p.name.toLowerCase().replace(/\s+/g, "") === lower,
            );
        })
        .filter(Boolean)
        .map((p) => p!.id);
      if (mentionedIds.length > 0) {
        resolvedMetadata = { ...metadata, mentionedIds };
      }
    }

    const comment = await getTaskService().addComment(
      id,
      body,
      author,
      resolvedMetadata,
    );
    if (!comment) {
      return c.json(notFound("TASK", id), 404);
    }
    publish("task.updated");
    return c.json(comment, 201);
  },
);

// PUT /:id/comments/:commentId
tasksRouter.openapi(
  createRoute({
    method: "put",
    path: "/{id}/comments/{commentId}",
    tags: ["Tasks"],
    summary: "Update a task comment",
    operationId: "updateTaskComment",
    request: {
      params: IdAndCommentIdParam,
      body: {
        content: { "application/json": { schema: UpdateCommentInputSchema } },
        required: true,
      },
    },
    responses: {
      200: jsonContent(TaskCommentSchema, "Updated comment"),
      404: notFoundContent,
      422: errorContent(ARCHIVED_RESPONSE_DESC),
    },
  }),
  async (c) => {
    const { id, commentId } = c.req.valid("param");
    const { body } = c.req.valid("json");
    const task = await getTaskService().getById(id);
    if (!task) {
      return c.json(notFound("TASK", id), 404);
    }
    if (task.archived === true) return c.json(taskArchived(id), 422);
    const comment = task.comments?.find((cm) => cm.id === commentId);
    if (!comment) {
      return c.json(notFound("COMMENT", commentId), 404);
    }
    const updated = { ...comment, body };
    const comments = (task.comments ?? []).map((cm) =>
      cm.id === commentId ? updated : cm
    );
    await getTaskService().update(id, { comments });
    publish("task.updated");
    return c.json(updated, 200);
  },
);

// DELETE /:id/comments/:commentId
tasksRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}/comments/{commentId}",
    tags: ["Tasks"],
    summary: "Delete a task comment",
    operationId: "deleteTaskComment",
    request: { params: IdAndCommentIdParam },
    responses: {
      204: { description: "Deleted" },
      404: notFoundContent,
      422: errorContent(ARCHIVED_RESPONSE_DESC),
    },
  }),
  async (c) => {
    const { id, commentId } = c.req.valid("param");
    const task = await getTaskService().getById(id);
    if (!task) {
      return c.json(notFound("TASK", id), 404);
    }
    if (task.archived === true) return c.json(taskArchived(id), 422);
    if (!task.comments?.find((cm) => cm.id === commentId)) {
      return c.json(notFound("COMMENT", commentId), 404);
    }
    const comments = (task.comments ?? []).filter((cm) => cm.id !== commentId);
    await getTaskService().update(id, { comments });
    publish("task.updated");
    return new Response(null, { status: 204 });
  },
);

// PATCH /:id/attachments
tasksRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{id}/attachments",
    tags: ["Tasks"],
    summary: "Add attachments to a task",
    operationId: "addTaskAttachments",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: AddAttachmentsInputSchema } },
        required: true,
      },
    },
    responses: {
      200: jsonContent(TaskSchema, "Updated task"),
      404: notFoundContent,
      422: errorContent(ARCHIVED_RESPONSE_DESC),
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { paths } = c.req.valid("json");
    const existing = await getTaskService().getById(id);
    if (!existing) return c.json(notFound("TASK", id), 404);
    if (existing.archived === true) return c.json(taskArchived(id), 422);
    const task = await getTaskService().addAttachments(id, paths);
    if (!task) {
      return c.json(notFound("TASK", id), 404);
    }
    publish("task.updated");
    return c.json(task, 200);
  },
);

// POST /:id/request-approval
tasksRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/request-approval",
    tags: ["Tasks"],
    summary: "Submit task for approval",
    operationId: "requestTaskApproval",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: RequestApprovalInputSchema } },
        required: true,
      },
    },
    responses: {
      200: jsonContent(TaskSchema, "Task moved to Pending Review"),
      404: notFoundContent,
      422: errorContent(ARCHIVED_RESPONSE_DESC),
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { requestedBy, summary, commitHash, artifactUrls } = c.req.valid(
      "json",
    );
    const existing = await getTaskService().getById(id);
    if (!existing) return c.json(notFound("TASK", id), 404);
    if (existing.archived === true) return c.json(taskArchived(id), 422);
    const task = await getTaskService().requestApproval(
      id,
      requestedBy,
      summary,
      commitHash,
      artifactUrls,
    );
    if (!task) {
      return c.json(notFound("TASK", id), 404);
    }
    publish("task.updated");
    return c.json(task, 200);
  },
);

// POST /:id/approve
tasksRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/approve",
    tags: ["Tasks"],
    summary: "Approve a task",
    operationId: "approveTask",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: ApproveTaskInputSchema } },
        required: true,
      },
    },
    responses: {
      200: jsonContent(TaskSchema, "Approved task"),
      404: notFoundContent,
      422: errorContent(ARCHIVED_RESPONSE_DESC),
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { decidedBy, feedback } = c.req.valid("json");
    const existing = await getTaskService().getById(id);
    if (!existing) return c.json(notFound("TASK", id), 404);
    if (existing.archived === true) return c.json(taskArchived(id), 422);
    const task = await getTaskService().approveTask(id, decidedBy, feedback);
    if (!task) {
      return c.json(notFound("TASK", id), 404);
    }
    publish("task.updated");
    return c.json(task, 200);
  },
);

// POST /:id/reject
tasksRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/reject",
    tags: ["Tasks"],
    summary: "Reject a task",
    operationId: "rejectTask",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: RejectTaskInputSchema } },
        required: true,
      },
    },
    responses: {
      200: jsonContent(TaskSchema, "Rejected task"),
      404: notFoundContent,
      422: errorContent(ARCHIVED_RESPONSE_DESC),
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { decidedBy, feedback, rejectionType } = c.req.valid("json");
    const existing = await getTaskService().getById(id);
    if (!existing) return c.json(notFound("TASK", id), 404);
    if (existing.archived === true) return c.json(taskArchived(id), 422);
    const task = await getTaskService().rejectTask(
      id,
      decidedBy,
      feedback,
      rejectionType,
    );
    if (!task) {
      return c.json(notFound("TASK", id), 404);
    }
    publish("task.updated");
    return c.json(task, 200);
  },
);

// ---------------------------------------------------------------------------
// Time entries
// ---------------------------------------------------------------------------

const AddTimeEntryInputSchema = TimeEntrySchema.omit({ id: true });

// POST /:id/time-entries
tasksRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/time-entries",
    tags: ["Tasks"],
    summary: "Log time on a task",
    operationId: "addTaskTimeEntry",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: AddTimeEntryInputSchema } },
        required: true,
      },
    },
    responses: {
      201: jsonContent(TimeEntrySchema, "Created time entry"),
      404: notFoundContent,
      422: errorContent(ARCHIVED_RESPONSE_DESC),
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const existing = await getTaskService().getById(id);
    if (!existing) return c.json(notFound("TASK", id), 404);
    if (existing.archived === true) return c.json(taskArchived(id), 422);
    const entry = await getTaskService().addTimeEntry(id, data);
    if (!entry) {
      return c.json(notFound("TASK", id), 404);
    }
    publish("task.updated");
    return c.json(entry, 201);
  },
);

// DELETE /:id/time-entries/:entryId
tasksRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}/time-entries/{entryId}",
    tags: ["Tasks"],
    summary: "Delete a time entry from a task",
    operationId: "deleteTaskTimeEntry",
    request: { params: IdAndEntryIdParam },
    responses: {
      204: { description: "Deleted" },
      404: notFoundContent,
      422: errorContent(ARCHIVED_RESPONSE_DESC),
    },
  }),
  async (c) => {
    const { id, entryId } = c.req.valid("param");
    const existing = await getTaskService().getById(id);
    if (!existing) return c.json(notFound("TASK", id), 404);
    if (existing.archived === true) return c.json(taskArchived(id), 422);
    const ok = await getTaskService().deleteTimeEntry(id, entryId);
    if (!ok) {
      return c.json(notFound("TIME_ENTRY", entryId), 404);
    }
    publish("task.updated");
    return new Response(null, { status: 204 });
  },
);

// ---------------------------------------------------------------------------
// File upload / download / delete
// ---------------------------------------------------------------------------

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

// POST /:id/upload — multipart file upload, stored at uploads/<taskId>/<filename>
tasksRouter.post("/:id/upload", async (c) => {
  const id = c.req.param("id");
  const task = await getTaskService().getById(id);
  if (!task) {
    return c.json(notFound("TASK", id), 404);
  }
  if (task.archived === true) return c.json(taskArchived(id), 422);
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file || typeof file === "string") {
    return c.json(badRequest("No file provided"), 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return c.json(payloadTooLarge("Max 10 MB per file"), 413);
  }
  const uploadsDir = `${getProjectDir()}/uploads/${id}`;
  await Deno.mkdir(uploadsDir, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dest = `${uploadsDir}/${safeName}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  await Deno.writeFile(dest, bytes);
  const relPath = `uploads/${id}/${safeName}`;
  const updated = await getTaskService().addAttachments(id, [relPath]);
  if (!updated) {
    return c.json(notFound("TASK", id), 404);
  }
  publish("task.updated");
  return c.json(updated, 200);
});

// GET /:id/upload/:filename — serve an uploaded file
tasksRouter.get("/:id/upload/:filename", async (c) => {
  const id = c.req.param("id");
  const filename = c.req.param("filename");
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${getProjectDir()}/uploads/${id}/${safeName}`;
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = await Deno.readFile(filePath) as Uint8Array<ArrayBuffer>;
  } catch {
    return c.json(notFound("FILE", "not found"), 404);
  }
  return new Response(bytes, {
    headers: {
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Content-Type": "application/octet-stream",
    },
  });
});

// DELETE /:id/upload/:filename — remove an uploaded file and its attachment entry
tasksRouter.delete("/:id/upload/:filename", async (c) => {
  const id = c.req.param("id");
  const filename = c.req.param("filename");
  const existing = await getTaskService().getById(id);
  if (!existing) return c.json(notFound("TASK", id), 404);
  if (existing.archived === true) return c.json(taskArchived(id), 422);
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${getProjectDir()}/uploads/${id}/${safeName}`;
  try {
    await Deno.remove(filePath);
  } catch {
    return c.json(notFound("FILE", "not found"), 404);
  }
  const taskAfter = await getTaskService().getById(id);
  if (taskAfter) {
    const relPath = `uploads/${id}/${safeName}`;
    const remaining = (taskAfter.attachments ?? []).filter((a) =>
      a !== relPath
    );
    await getTaskService().update(id, { attachments: remaining });
  }
  publish("task.updated");
  return new Response(null, { status: 204 });
});
