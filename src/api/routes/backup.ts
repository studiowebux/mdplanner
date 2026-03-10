/**
 * Backup API — export, import, trigger, and status endpoints.
 * Pattern: RESTful resource handler using Hono + ProjectManager context.
 *
 * GET  /api/backup/export  — stream project as TAR (or encrypted TAR)
 * POST /api/backup/import  — accept TAR body, extract to project dir
 * POST /api/backup/trigger — write backup to --backup-dir on demand
 * GET  /api/backup/status  — last backup time, size, encryption flag
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { AppVariables, getProjectManager } from "./context.ts";
import { packProject, unpackToDir } from "../../lib/backup/archive.ts";
import { decryptPayload, encryptPayload } from "../../lib/backup/crypto.ts";
import { getScheduler } from "../../lib/backup/scheduler.ts";

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

export const backupRouter = new OpenAPIHono<{ Variables: AppVariables }>();

// --- Route definitions ---

const exportRoute = createRoute({
  method: "get",
  path: "/export",
  tags: ["Backup"],
  summary: "Export project as TAR archive",
  operationId: "exportBackup",
  request: {
    query: z.object({
      plain: z.string().optional().openapi({
        description: "Set to 'true' to skip encryption",
      }),
    }),
  },
  responses: {
    200: {
      description: "TAR archive (possibly encrypted)",
    },
  },
});

const importRoute = createRoute({
  method: "post",
  path: "/import",
  tags: ["Backup"],
  summary: "Import project from TAR archive",
  operationId: "importBackup",
  request: {
    query: z.object({
      overwrite: z.string().optional().openapi({
        description: "Set to 'true' to overwrite existing files",
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Import result",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Bad request",
    },
    422: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Archive extraction failed",
    },
  },
});

const triggerRoute = createRoute({
  method: "post",
  path: "/trigger",
  tags: ["Backup"],
  summary: "Trigger a manual backup to --backup-dir",
  operationId: "triggerBackup",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ file: z.string(), size: z.number() }),
        },
      },
      description: "Backup result",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Backup failed",
    },
    503: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Backup not configured",
    },
  },
});

const statusRoute = createRoute({
  method: "get",
  path: "/status",
  tags: ["Backup"],
  summary: "Get backup status",
  operationId: "getBackupStatus",
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Backup status",
    },
  },
});

// --- Handlers ---

/** GET /api/backup/export — ?plain=true skips encryption even if public key is configured */
backupRouter.openapi(exportRoute, async (c) => {
  const pm = getProjectManager(c);
  const projectDir = pm.getActiveProjectDir();
  const publicKeyHex = pm.getBackupPublicKey();
  const { plain } = c.req.valid("query");
  const forcePlain = plain === "true";

  let payload = await packProject({ projectDir });

  const encrypted = !!publicKeyHex && !forcePlain;
  if (encrypted && publicKeyHex) {
    payload = await encryptPayload(publicKeyHex, payload);
  }

  const filename = encrypted ? "backup.tar.enc" : "backup.tar";
  const contentType = "application/octet-stream";

  return new Response(payload.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": payload.length.toString(),
      "X-Backup-Encrypted": encrypted ? "true" : "false",
    },
  });
});

/** POST /api/backup/import */
// @ts-expect-error: handler returns raw Response for binary import
backupRouter.openapi(importRoute, async (c) => {
  const pm = getProjectManager(c);
  const projectDir = pm.getActiveProjectDir();

  const { overwrite: overwriteParam } = c.req.valid("query");
  const overwrite = overwriteParam === "true";
  const privateKeyHex = c.req.header("X-Backup-Private-Key");

  const body = await c.req.arrayBuffer();
  if (!body || body.byteLength === 0) {
    return c.json({ error: "Empty request body" }, 400);
  }

  let data: Uint8Array = new Uint8Array(body);

  // Decrypt if private key provided
  if (privateKeyHex) {
    try {
      const decrypted = await decryptPayload(privateKeyHex, data);
      data = new Uint8Array(decrypted.length);
      data.set(decrypted);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ error: `Decryption failed: ${msg}` }, 400);
    }
  }

  let result: { extracted: string[]; skipped: string[] };
  try {
    result = await unpackToDir({ data, targetDir: projectDir, overwrite });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: `Archive extraction failed: ${msg}` }, 422);
  }

  return new Response(
    JSON.stringify({
      extracted: result.extracted.length,
      skipped: result.skipped.length,
      files: result.extracted,
      skippedFiles: result.skipped,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});

/** POST /api/backup/trigger — manual backup to --backup-dir */
// @ts-expect-error: handler returns raw Response for binary trigger
backupRouter.openapi(triggerRoute, async (c) => {
  const scheduler = getScheduler();
  if (!scheduler) {
    return c.json(
      { error: "Automated backup not configured (--backup-dir not set)" },
      503,
    );
  }

  try {
    const result = await scheduler.runBackup();
    return new Response(
      JSON.stringify({ file: result.file, size: result.size }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: `Backup failed: ${msg}` }, 500);
  }
});

/** GET /api/backup/status */
// @ts-expect-error: handler returns raw Response for status
backupRouter.openapi(statusRoute, async (c) => {
  const pm = getProjectManager(c);
  const scheduler = getScheduler();

  const base = scheduler ? scheduler.getStatus() : {
    enabled: false,
    backupDir: null,
    intervalHours: null,
    encrypted: !!pm.getBackupPublicKey(),
    lastBackupTime: null,
    lastBackupSize: null,
    lastBackupFile: null,
    lastError: null,
    nextBackupTime: null,
  };

  // Count backup files in backupDir
  let backupCount = 0;
  if (base.backupDir) {
    try {
      for await (const entry of Deno.readDir(base.backupDir)) {
        if (
          entry.isFile &&
          (entry.name.endsWith(".tar") || entry.name.endsWith(".tar.enc"))
        ) {
          backupCount++;
        }
      }
    } catch {
      // Directory doesn't exist yet — count stays 0
    }
  }

  return new Response(JSON.stringify({ ...base, backupCount }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
