// Task routes — file attachments stored on disk: upload, download, delete.
// Plain Hono routes (multipart / binary), not OpenAPI-documented.

import { getProjectDir, getTaskService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import { badRequest, notFound, payloadTooLarge } from "../../../types/api.ts";
import { taskArchived, type TasksRouter } from "./shared.ts";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export function registerTaskUploadRoutes(tasksRouter: TasksRouter): void {
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
}
