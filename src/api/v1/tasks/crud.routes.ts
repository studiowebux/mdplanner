// Task routes — core CRUD + collection-level operations.
// Registered FIRST so the static paths (/next, /sweep-stale-claims, /batch)
// precede /{id} for correct Hono matching.

import { createRoute, z } from "@hono/zod-openapi";
import { getTaskService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  BatchUpdateItemSchema,
  BatchUpdateResultSchema,
  CreateTaskSchema,
  GetNextTaskQuerySchema,
  ListTaskOptionsSchema,
  SweepStaleClaimsInputSchema,
  SweepStaleClaimsResultSchema,
  TaskSchema,
  UpdateTaskSchema,
} from "../../../types/task.types.ts";
import {
  errorContent,
  IdParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";
import {
  ClaimGuardError,
  RevisionConflictError,
} from "../../../services/task.service.ts";
import {
  ARCHIVED_RESPONSE_DESC,
  taskArchived,
  type TasksRouter,
} from "./shared.ts";

export function registerTaskCrudRoutes(tasksRouter: TasksRouter): void {
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
      const agentSkills = skills?.split(",").map((s) => s.trim()).filter(
        Boolean,
      );
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
          archivedFailures.push({
            id: u.id,
            error: `Task ${u.id} is archived`,
          });
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
}
