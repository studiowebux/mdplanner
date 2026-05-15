// Backup routes — GET /export streams a full JSON backup; POST /import restores it.
// Domain coverage is driven by the registry in registry.ts + domains.ts.

import { OpenAPIHono } from "@hono/zod-openapi";
import { APP_VERSION } from "../../../constants/mod.ts";
import { registerBackupDomains } from "./domains.ts";
import { getDomains, type ImportDomainResult } from "./registry.ts";

registerBackupDomains();

export const backupRouter = new OpenAPIHono();

// GET /export — streams full JSON backup as a file download
backupRouter.get("/export", async (c) => {
  const domains: Record<string, unknown[]> = {};
  for (const d of getDomains()) {
    try {
      domains[d.key] = await d.export();
    } catch (err) {
      console.error(`[backup] export failed for ${d.key}:`, err);
      domains[d.key] = [];
    }
  }

  const payload = JSON.stringify(
    { version: APP_VERSION, exportedAt: new Date().toISOString(), domains },
    null,
    2,
  );
  const date = new Date().toISOString().split("T")[0];

  return new Response(payload, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition":
        `attachment; filename="mdplanner-backup-${date}.json"`,
    },
  });
});

// POST /import — accepts multipart/form-data with a 'file' field or raw JSON body
backupRouter.post("/import", async (c) => {
  let text: string;
  const contentType = c.req.header("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!file || !(file instanceof File)) {
      return c.json({ error: "Missing 'file' field in multipart body" }, 400);
    }
    text = await file.text();
  } else if (contentType.includes("application/json")) {
    text = await c.req.text();
  } else {
    return c.json(
      { error: "Expected multipart/form-data or application/json" },
      400,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("domains" in parsed) ||
    typeof (parsed as Record<string, unknown>).domains !== "object"
  ) {
    return c.json({ error: "Backup must contain a 'domains' object" }, 400);
  }

  const backupDomains = (parsed as Record<string, unknown>).domains as Record<
    string,
    unknown
  >;

  const imported: Record<string, ImportDomainResult> = {};
  let totalCount = 0;
  let totalErrors = 0;

  for (const d of getDomains()) {
    const items = backupDomains[d.key];
    if (!Array.isArray(items)) continue;
    const result = await d.import(items);
    imported[d.key] = {
      label: d.label,
      count: result.count,
      errors: result.errors,
    };
    totalCount += result.count;
    totalErrors += result.errors.length;
  }

  return c.json({ imported, totalCount, totalErrors }, 200);
});
