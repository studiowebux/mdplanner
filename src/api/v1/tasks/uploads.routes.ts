// Task routes — file attachments stored on disk: upload, download, delete.
// Plain Hono routes (multipart / binary), not OpenAPI-documented.

import { getProjectDir, getTaskService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import { badRequest, notFound, payloadTooLarge } from "../../../types/api.ts";
import { FileUploadService } from "../../../services/file-upload.service.ts";
import { taskArchived, type TasksRouter } from "./shared.ts";

// Tasks use the legacy basePath "uploads" to keep existing attachment paths intact.
function taskUploader(): FileUploadService {
  return new FileUploadService(getProjectDir(), "uploads");
}

export function registerTaskUploadRoutes(tasksRouter: TasksRouter): void {
  // POST /:id/upload — multipart file upload, stored at uploads/<taskId>/<filename>
  tasksRouter.post("/:id/upload", async (c) => {
    const id = c.req.param("id");
    const task = await getTaskService().getById(id);
    if (!task) return c.json(notFound("TASK", id), 404);
    if (task.archived === true) return c.json(taskArchived(id), 422);
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!file || typeof file === "string") {
      return c.json(badRequest("No file provided"), 400);
    }
    let stored: { relPath: string; safeName: string };
    try {
      stored = await taskUploader().store(id, file);
    } catch (err) {
      if ((err as { status?: number }).status === 413) {
        return c.json(payloadTooLarge("Max 10 MB per file"), 413);
      }
      throw err;
    }
    const updated = await getTaskService().addAttachments(id, [stored.relPath]);
    if (!updated) return c.json(notFound("TASK", id), 404);
    publish("task.updated");
    return c.json(updated, 200);
  });

  // GET /:id/upload/:filename — serve an uploaded file
  tasksRouter.get("/:id/upload/:filename", async (c) => {
    const id = c.req.param("id");
    const filename = c.req.param("filename");
    const result = await taskUploader().read(id, filename);
    if (!result) return c.json(notFound("FILE", "not found"), 404);
    return new Response(result.bytes, {
      headers: {
        "Content-Disposition": `attachment; filename="${result.safeName}"`,
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
    const removed = await taskUploader().remove(id, filename);
    if (!removed) return c.json(notFound("FILE", "not found"), 404);
    const taskAfter = await getTaskService().getById(id);
    if (taskAfter) {
      const remaining = (taskAfter.attachments ?? []).filter((a) =>
        a !== removed
      );
      await getTaskService().update(id, { attachments: remaining });
    }
    publish("task.updated");
    return new Response(null, { status: 204 });
  });
}
