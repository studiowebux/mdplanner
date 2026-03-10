/**
 * Uploads API — store and delete user-uploaded files.
 * Files are written to {projectPath}/uploads/YYYY/MM/DD/{timestamp}_{filename}.
 * Pattern: RESTful resource handler using Hono + ProjectManager context.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { join, relative } from "@std/path";
import { ensureDir, walk } from "@std/fs";
import {
  AppVariables,
  errorResponse,
  getParser,
  getProjectManager,
  jsonResponse,
} from "./context.ts";

export const uploadsRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const SuccessSchema = z.object({ success: z.boolean() });

function sanitizeFilename(name: string): string {
  return name
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 200);
}

function datePath(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
}

/** POST /api/uploads — accept multipart/form-data with a "file" field */
// Keep as plain .post() — multipart/form-data is not well-supported by zod-openapi
uploadsRouter.post("/", async (c) => {
  const pm = getProjectManager(c);
  const projectDir = pm.getActiveProjectDir();

  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return errorResponse("Expected multipart/form-data", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse("Missing file field", 400);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return errorResponse(`File type not allowed: ${file.type}`, 415);
  }

  if (file.size > MAX_BYTES) {
    return errorResponse("File exceeds 10 MB limit", 413);
  }

  const sanitized = sanitizeFilename(file.name);
  if (!sanitized) {
    return errorResponse("Invalid filename", 400);
  }

  const filename = `${Date.now()}_${sanitized}`;
  const subdir = datePath();
  const dirPath = join(projectDir, "uploads", subdir);
  const filePath = join(dirPath, filename);

  await ensureDir(dirPath);
  const buffer = await file.arrayBuffer();
  await Deno.writeFile(filePath, new Uint8Array(buffer));

  const relativePath = `uploads/${subdir}/${filename}`;

  return jsonResponse({ path: relativePath, filename, size: file.size }, 201);
});

type UploadFileEntry = { path: string; size: number; modified: string };

async function listUploadFiles(
  projectDir: string,
): Promise<UploadFileEntry[]> {
  const uploadsDir = join(projectDir, "uploads");
  const files: UploadFileEntry[] = [];

  try {
    for await (const entry of walk(uploadsDir, { includeDirs: false })) {
      const stat = await Deno.stat(entry.path);
      files.push({
        path: relative(projectDir, entry.path),
        size: stat.size,
        modified: stat.mtime?.toISOString() ?? "",
      });
    }
  } catch (error) {
    if ((error as Deno.errors.NotFound)?.name !== "NotFound") throw error;
  }

  return files;
}

/** GET /api/uploads — list all uploaded files */
const listUploadsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Uploads"],
  summary: "List all uploaded files",
  operationId: "listUploads",
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "List of uploaded files with total size",
    },
  },
});

uploadsRouter.openapi(listUploadsRoute, async (c) => {
  const pm = getProjectManager(c);
  const files = await listUploadFiles(pm.getActiveProjectDir());
  const total_size = files.reduce((sum, f) => sum + f.size, 0);
  return c.json({ files, total_size }, 200);
});

/** GET /api/uploads/orphans — files not referenced in any task's attachments */
const listOrphansRoute = createRoute({
  method: "get",
  path: "/orphans",
  tags: ["Uploads"],
  summary: "List orphaned upload files not referenced by any task",
  operationId: "listOrphanUploads",
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "List of orphaned files with total orphan size",
    },
  },
});

uploadsRouter.openapi(listOrphansRoute, async (c) => {
  const pm = getProjectManager(c);
  const parser = getParser(c);
  const files = await listUploadFiles(pm.getActiveProjectDir());

  const tasks = await parser.readTasks();
  const referenced = new Set<string>();
  for (const task of tasks) {
    for (const p of task.config.attachments ?? []) {
      referenced.add(p);
    }
  }

  const orphans = files.filter((f) => !referenced.has(f.path));
  const total_orphan_size = orphans.reduce((sum, f) => sum + f.size, 0);
  return c.json({ orphans, total_orphan_size }, 200);
});

/** DELETE /api/uploads/:year/:month/:day/:filename */
const deleteUploadRoute = createRoute({
  method: "delete",
  path: "/{year}/{month}/{day}/{filename}",
  tags: ["Uploads"],
  summary: "Delete an uploaded file",
  operationId: "deleteUpload",
  request: {
    params: z.object({
      year: z.string().openapi({
        param: { name: "year", in: "path" },
      }),
      month: z.string().openapi({
        param: { name: "month", in: "path" },
      }),
      day: z.string().openapi({
        param: { name: "day", in: "path" },
      }),
      filename: z.string().openapi({
        param: { name: "filename", in: "path" },
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "File deleted",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid path",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "File not found",
    },
  },
});

uploadsRouter.openapi(deleteUploadRoute, async (c) => {
  const pm = getProjectManager(c);
  const projectDir = pm.getActiveProjectDir();

  const { year, month, day, filename } = c.req.valid("param");

  // Reject path traversal attempts
  if (
    [year, month, day, filename].some((s) =>
      s.includes("..") || s.includes("/")
    )
  ) {
    return c.json({ error: "INVALID_PATH", message: "Invalid path" }, 400);
  }

  const filePath = join(projectDir, "uploads", year, month, day, filename);

  try {
    await Deno.remove(filePath);
    return c.json({ success: true }, 200);
  } catch {
    return c.json({ error: "NOT_FOUND", message: "File not found" }, 404);
  }
});
