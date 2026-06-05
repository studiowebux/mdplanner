// Task routes — time tracking: log + delete time entries.

import { createRoute } from "@hono/zod-openapi";
import { getTaskService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  IdAndEntryIdParam,
  TimeEntrySchema,
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

const AddTimeEntryInputSchema = TimeEntrySchema.omit({ id: true });

export function registerTaskTimeRoutes(tasksRouter: TasksRouter): void {
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
}
