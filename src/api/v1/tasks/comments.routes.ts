// Task routes — comment thread: add, update, delete.

import { createRoute } from "@hono/zod-openapi";
import {
  getPeopleService,
  getTaskService,
} from "../../../singletons/services.ts";
import { parseMentions } from "../../../utils/mentions.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  AddCommentInputSchema,
  IdAndCommentIdParam,
  TaskCommentSchema,
  UpdateCommentInputSchema,
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

export function registerTaskCommentRoutes(tasksRouter: TasksRouter): void {
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
          .filter((p): p is NonNullable<typeof p> => p != null)
          .map((p) => p.id);
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
      const comments = (task.comments ?? []).filter((cm) =>
        cm.id !== commentId
      );
      await getTaskService().update(id, { comments });
      publish("task.updated");
      return new Response(null, { status: 204 });
    },
  );
}
