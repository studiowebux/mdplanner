// Task routes — human review workflow: request-approval, approve, reject.

import { createRoute } from "@hono/zod-openapi";
import { getTaskService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  ApproveTaskInputSchema,
  RejectTaskInputSchema,
  RequestApprovalInputSchema,
  TaskSchema,
} from "../../../types/task.types.ts";
import {
  errorContent,
  IdParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";
import {
  ARCHIVED_RESPONSE_DESC,
  taskArchived,
  type TasksRouter,
} from "./shared.ts";

export function registerTaskApprovalRoutes(tasksRouter: TasksRouter): void {
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
          content: {
            "application/json": { schema: RequestApprovalInputSchema },
          },
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
}
