/**
 * Uploads API — store and delete user-uploaded files.
 * Files are written to {projectPath}/uploads/YYYY/MM/DD/{timestamp}_{filename}.
 * Pattern: RESTful resource handler using Hono + ProjectManager context.
 */

import { Hono } from "hono";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import {
  AppVariables,
  errorResponse,
  getProjectManager,
  jsonResponse,
} from "./context.ts";

export const uploadsRouter = new Hono<{ Variables: AppVariables }>();

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

/** DELETE /api/uploads/:year/:month/:day/:filename */
uploadsRouter.delete("/:year/:month/:day/:filename", async (c) => {
  const pm = getProjectManager(c);
  const projectDir = pm.getActiveProjectDir();

  const { year, month, day, filename } = c.req.param();

  // Reject path traversal attempts
  if (
    [year, month, day, filename].some((s) =>
      s.includes("..") || s.includes("/")
    )
  ) {
    return errorResponse("Invalid path", 400);
  }

  const filePath = join(projectDir, "uploads", year, month, day, filename);

  try {
    await Deno.remove(filePath);
    return jsonResponse({ success: true });
  } catch {
    return errorResponse("File not found", 404);
  }
});
