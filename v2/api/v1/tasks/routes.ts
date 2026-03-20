// Task CRUD + workflow routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getTaskService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  AddAttachmentsInputSchema,
  AddCommentInputSchema,
  ApproveTaskInputSchema,
  BatchUpdateItemSchema,
  BatchUpdateResultSchema,
  ClaimTaskInputSchema,
  GetNextTaskQuerySchema,
  IdAndCommentIdParam,
  ListTaskOptionsSchema,
  MoveTaskInputSchema,
  RejectTaskInputSchema,
  RequestApprovalInputSchema,
  CreateTaskSchema,
  SweepStaleClaimsInputSchema,
  SweepStaleClaimsResultSchema,
  TaskCommentSchema,
  TaskSchema,
  UpdateCommentInputSchema,
  UpdateTaskSchema,
} from "../../../types/task.types.ts";
import { ErrorSchema, IdParam } from "../../../types/api.ts";
import {
  ClaimConflictError,
  ClaimGuardError,
  RevisionConflictError,
} from "../../../services/task.service.ts";

export const tasksRouter = new OpenAPIHono();

// GET /
tasksRouter.openapi(
  createRoute({
    method: "get", path: "/", tags: ["Tasks"],
    summary: "List tasks", operationId: "listTasks",
    request: { query: ListTaskOptionsSchema },
    responses: {
      200: { content: { "application/json": { schema: z.array(TaskSchema) } }, description: "List of tasks" },
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
    method: "get", path: "/next", tags: ["Tasks"],
    summary: "Get next available task for an agent", operationId: "getNextTask",
    request: { query: GetNextTaskQuerySchema },
    responses: {
      200: { content: { "application/json": { schema: TaskSchema } }, description: "Next task" },
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
    method: "post", path: "/sweep-stale-claims", tags: ["Tasks"],
    summary: "Release stale task claims", operationId: "sweepStaleClaims",
    request: { body: { content: { "application/json": { schema: SweepStaleClaimsInputSchema } } } },
    responses: {
      200: { content: { "application/json": { schema: SweepStaleClaimsResultSchema } }, description: "Swept task IDs" },
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
    method: "post", path: "/batch", tags: ["Tasks"],
    summary: "Batch update multiple tasks", operationId: "batchUpdateTasks",
    request: { body: { content: { "application/json": { schema: z.array(BatchUpdateItemSchema) } }, required: true } },
    responses: {
      200: { content: { "application/json": { schema: BatchUpdateResultSchema } }, description: "Batch result" },
    },
  }),
  async (c) => {
    const result = await getTaskService().batchUpdate(c.req.valid("json"));
    publish("task.updated");
    return c.json(result, 200);
  },
);

// GET /:id
tasksRouter.openapi(
  createRoute({
    method: "get", path: "/{id}", tags: ["Tasks"],
    summary: "Get task by ID", operationId: "getTask",
    request: { params: IdParam },
    responses: {
      200: { content: { "application/json": { schema: TaskSchema } }, description: "Task" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const task = await getTaskService().getById(id);
    if (!task) return c.json({ error: "TASK_NOT_FOUND", message: `Task ${id} not found` }, 404);
    return c.json(task, 200);
  },
);

// POST /
tasksRouter.openapi(
  createRoute({
    method: "post", path: "/", tags: ["Tasks"],
    summary: "Create a task", operationId: "createTask",
    request: { body: { content: { "application/json": { schema: CreateTaskSchema } }, required: true } },
    responses: {
      201: { content: { "application/json": { schema: TaskSchema } }, description: "Created task" },
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
    method: "put", path: "/{id}", tags: ["Tasks"],
    summary: "Update a task", operationId: "updateTask",
    request: {
      params: IdParam,
      body: { content: { "application/json": { schema: UpdateTaskSchema } }, required: true },
    },
    responses: {
      200: { content: { "application/json": { schema: TaskSchema } }, description: "Updated task" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
      409: { content: { "application/json": { schema: ErrorSchema } }, description: "Revision conflict or claim guard" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const expectedRevision = c.req.header("X-Expected-Revision")
      ? Number(c.req.header("X-Expected-Revision"))
      : undefined;
    const agentId = c.req.header("X-Agent-Id") ?? undefined;
    try {
      const task = await getTaskService().update(id, c.req.valid("json"), expectedRevision, agentId);
      if (!task) return c.json({ error: "TASK_NOT_FOUND", message: `Task ${id} not found` }, 404);
      publish("task.updated");
      return c.json(task, 200);
    } catch (err) {
      if (err instanceof RevisionConflictError || err instanceof ClaimGuardError) {
        return c.json({ error: err.code, message: err.message }, 409);
      }
      throw err;
    }
  },
);

// DELETE /:id
tasksRouter.openapi(
  createRoute({
    method: "delete", path: "/{id}", tags: ["Tasks"],
    summary: "Delete a task", operationId: "deleteTask",
    request: { params: IdParam },
    responses: {
      204: { description: "Deleted" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const ok = await getTaskService().delete(id);
    if (!ok) return c.json({ error: "TASK_NOT_FOUND", message: `Task ${id} not found` }, 404);
    publish("task.deleted");
    return new Response(null, { status: 204 });
  },
);

// POST /:id/claim
tasksRouter.openapi(
  createRoute({
    method: "post", path: "/{id}/claim", tags: ["Tasks"],
    summary: "Claim a task (atomic move to In Progress)", operationId: "claimTask",
    request: {
      params: IdParam,
      body: { content: { "application/json": { schema: ClaimTaskInputSchema } }, required: true },
    },
    responses: {
      200: { content: { "application/json": { schema: TaskSchema } }, description: "Claimed task" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
      409: { content: { "application/json": { schema: ErrorSchema } }, description: "Claim conflict" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { assignee, expectedSection } = c.req.valid("json");
    try {
      const task = await getTaskService().claimTask(id, assignee, expectedSection);
      if (!task) return c.json({ error: "TASK_NOT_FOUND", message: `Task ${id} not found` }, 404);
      publish("task.updated");
      return c.json(task, 200);
    } catch (err) {
      if (err instanceof ClaimConflictError) {
        return c.json({ error: err.code, message: err.message }, 409);
      }
      throw err;
    }
  },
);

// PATCH /:id/move
tasksRouter.openapi(
  createRoute({
    method: "patch", path: "/{id}/move", tags: ["Tasks"],
    summary: "Move task to a different section", operationId: "moveTask",
    request: {
      params: IdParam,
      body: { content: { "application/json": { schema: MoveTaskInputSchema } }, required: true },
    },
    responses: {
      200: { content: { "application/json": { schema: TaskSchema } }, description: "Moved task" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { section } = c.req.valid("json");
    const task = await getTaskService().moveTask(id, section);
    if (!task) return c.json({ error: "TASK_NOT_FOUND", message: `Task ${id} not found` }, 404);
    publish("task.updated");
    return c.json(task, 200);
  },
);

// POST /:id/comments
tasksRouter.openapi(
  createRoute({
    method: "post", path: "/{id}/comments", tags: ["Tasks"],
    summary: "Add a comment to a task", operationId: "addTaskComment",
    request: {
      params: IdParam,
      body: { content: { "application/json": { schema: AddCommentInputSchema } }, required: true },
    },
    responses: {
      201: { content: { "application/json": { schema: TaskCommentSchema } }, description: "Created comment" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { body, author, metadata } = c.req.valid("json");
    const comment = await getTaskService().addComment(id, body, author, metadata);
    if (!comment) return c.json({ error: "TASK_NOT_FOUND", message: `Task ${id} not found` }, 404);
    publish("task.updated");
    return c.json(comment, 201);
  },
);

// PUT /:id/comments/:commentId
tasksRouter.openapi(
  createRoute({
    method: "put", path: "/{id}/comments/{commentId}", tags: ["Tasks"],
    summary: "Update a task comment", operationId: "updateTaskComment",
    request: {
      params: IdAndCommentIdParam,
      body: { content: { "application/json": { schema: UpdateCommentInputSchema } }, required: true },
    },
    responses: {
      200: { content: { "application/json": { schema: TaskCommentSchema } }, description: "Updated comment" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
    },
  }),
  async (c) => {
    const { id, commentId } = c.req.valid("param");
    const { body } = c.req.valid("json");
    const task = await getTaskService().getById(id);
    if (!task) return c.json({ error: "TASK_NOT_FOUND", message: `Task ${id} not found` }, 404);
    const comment = task.comments?.find((cm) => cm.id === commentId);
    if (!comment) return c.json({ error: "COMMENT_NOT_FOUND", message: `Comment ${commentId} not found` }, 404);
    const updated = { ...comment, body };
    const comments = (task.comments ?? []).map((cm) => cm.id === commentId ? updated : cm);
    await getTaskService().update(id, { comments });
    publish("task.updated");
    return c.json(updated, 200);
  },
);

// DELETE /:id/comments/:commentId
tasksRouter.openapi(
  createRoute({
    method: "delete", path: "/{id}/comments/{commentId}", tags: ["Tasks"],
    summary: "Delete a task comment", operationId: "deleteTaskComment",
    request: { params: IdAndCommentIdParam },
    responses: {
      204: { description: "Deleted" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
    },
  }),
  async (c) => {
    const { id, commentId } = c.req.valid("param");
    const task = await getTaskService().getById(id);
    if (!task) return c.json({ error: "TASK_NOT_FOUND", message: `Task ${id} not found` }, 404);
    if (!task.comments?.find((cm) => cm.id === commentId)) {
      return c.json({ error: "COMMENT_NOT_FOUND", message: `Comment ${commentId} not found` }, 404);
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
    method: "patch", path: "/{id}/attachments", tags: ["Tasks"],
    summary: "Add attachments to a task", operationId: "addTaskAttachments",
    request: {
      params: IdParam,
      body: { content: { "application/json": { schema: AddAttachmentsInputSchema } }, required: true },
    },
    responses: {
      200: { content: { "application/json": { schema: TaskSchema } }, description: "Updated task" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { paths } = c.req.valid("json");
    const task = await getTaskService().addAttachments(id, paths);
    if (!task) return c.json({ error: "TASK_NOT_FOUND", message: `Task ${id} not found` }, 404);
    publish("task.updated");
    return c.json(task, 200);
  },
);

// POST /:id/request-approval
tasksRouter.openapi(
  createRoute({
    method: "post", path: "/{id}/request-approval", tags: ["Tasks"],
    summary: "Submit task for approval", operationId: "requestTaskApproval",
    request: {
      params: IdParam,
      body: { content: { "application/json": { schema: RequestApprovalInputSchema } }, required: true },
    },
    responses: {
      200: { content: { "application/json": { schema: TaskSchema } }, description: "Task moved to Pending Review" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { requestedBy, summary, commitHash, artifactUrls } = c.req.valid("json");
    const task = await getTaskService().requestApproval(id, requestedBy, summary, commitHash, artifactUrls);
    if (!task) return c.json({ error: "TASK_NOT_FOUND", message: `Task ${id} not found` }, 404);
    publish("task.updated");
    return c.json(task, 200);
  },
);

// POST /:id/approve
tasksRouter.openapi(
  createRoute({
    method: "post", path: "/{id}/approve", tags: ["Tasks"],
    summary: "Approve a task", operationId: "approveTask",
    request: {
      params: IdParam,
      body: { content: { "application/json": { schema: ApproveTaskInputSchema } }, required: true },
    },
    responses: {
      200: { content: { "application/json": { schema: TaskSchema } }, description: "Approved task" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { decidedBy, feedback } = c.req.valid("json");
    const task = await getTaskService().approveTask(id, decidedBy, feedback);
    if (!task) return c.json({ error: "TASK_NOT_FOUND", message: `Task ${id} not found` }, 404);
    publish("task.updated");
    return c.json(task, 200);
  },
);

// POST /:id/reject
tasksRouter.openapi(
  createRoute({
    method: "post", path: "/{id}/reject", tags: ["Tasks"],
    summary: "Reject a task", operationId: "rejectTask",
    request: {
      params: IdParam,
      body: { content: { "application/json": { schema: RejectTaskInputSchema } }, required: true },
    },
    responses: {
      200: { content: { "application/json": { schema: TaskSchema } }, description: "Rejected task" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not found" },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { decidedBy, feedback, rejectionType } = c.req.valid("json");
    const task = await getTaskService().rejectTask(id, decidedBy, feedback, rejectionType);
    if (!task) return c.json({ error: "TASK_NOT_FOUND", message: `Task ${id} not found` }, 404);
    publish("task.updated");
    return c.json(task, 200);
  },
);
