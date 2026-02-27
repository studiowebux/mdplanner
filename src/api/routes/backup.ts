/**
 * Backup API — export, import, trigger, and status endpoints.
 * Pattern: RESTful resource handler using Hono + ProjectManager context.
 *
 * GET  /api/backup/export  — stream project as TAR (or encrypted TAR)
 * POST /api/backup/import  — accept TAR body, extract to project dir
 * POST /api/backup/trigger — write backup to --backup-dir on demand
 * GET  /api/backup/status  — last backup time, size, encryption flag
 */

import { Hono } from "hono";
import { AppVariables, errorResponse, getProjectManager } from "./context.ts";
import { packProject, unpackToDir } from "../../lib/backup/archive.ts";
import { decryptPayload, encryptPayload } from "../../lib/backup/crypto.ts";
import { getScheduler } from "../../lib/backup/scheduler.ts";

export const backupRouter = new Hono<{ Variables: AppVariables }>();

/** GET /api/backup/export */
backupRouter.get("/export", async (c) => {
  const pm = getProjectManager(c);
  const projectDir = pm.getActiveProjectDir();
  const publicKeyHex = pm.getBackupPublicKey();

  let payload = await packProject({ projectDir });

  const encrypted = !!publicKeyHex;
  if (publicKeyHex) {
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
backupRouter.post("/import", async (c) => {
  const pm = getProjectManager(c);
  const projectDir = pm.getActiveProjectDir();

  const overwrite = c.req.query("overwrite") === "true";
  const privateKeyHex = c.req.header("X-Backup-Private-Key");

  const body = await c.req.arrayBuffer();
  if (!body || body.byteLength === 0) {
    return errorResponse("Empty request body", 400);
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
      return errorResponse(`Decryption failed: ${msg}`, 400);
    }
  }

  let result: { extracted: string[]; skipped: string[] };
  try {
    result = await unpackToDir({ data, targetDir: projectDir, overwrite });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Archive extraction failed: ${msg}`, 422);
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
backupRouter.post("/trigger", async (c) => {
  const scheduler = getScheduler();
  if (!scheduler) {
    return errorResponse(
      "Automated backup not configured (--backup-dir not set)",
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
    return errorResponse(`Backup failed: ${msg}`, 500);
  }
});

/** GET /api/backup/status */
backupRouter.get("/status", (c) => {
  const pm = getProjectManager(c);
  const scheduler = getScheduler();

  const status = scheduler ? scheduler.getStatus() : {
    enabled: false,
    backupDir: null,
    intervalHours: null,
    encrypted: !!pm.getBackupPublicKey(),
    lastBackupTime: null,
    lastBackupSize: null,
    lastBackupFile: null,
    lastError: null,
  };

  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
