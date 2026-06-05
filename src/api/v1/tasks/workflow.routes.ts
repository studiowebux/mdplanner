// Task routes — state-mutation workflow: claim, move, reorder, attachments.

import { createRoute } from "@hono/zod-openapi";
import { getTaskService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  AddAttachmentsInputSchema,
  ClaimTaskInputSchema,
  MoveTaskInputSchema,
  ReorderTaskInputSchema,
  TaskSchema,
} from "../../../types/task.types.ts";
import {
  errorContent,
  IdParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";
import { sortTasks } from "../../../domains/task/constants.tsx";
import { deleteUiStateKeys } from "../../../utils/ui-state.ts";
import { ClaimConflictError } from "../../../services/task.service.ts";
import {
  ARCHIVED_RESPONSE_DESC,
  taskArchived,
  type TasksRouter,
} from "./shared.ts";

export function registerTaskWorkflowRoutes(tasksRouter: TasksRouter): void {
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
          content: {
            "application/json": { schema: AddAttachmentsInputSchema },
          },
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
}
