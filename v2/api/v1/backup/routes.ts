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

  const backupVersion =
    typeof (parsed as Record<string, unknown>).version === "string"
      ? ((parsed as Record<string, unknown>).version as string)
      : null;
  const versionWarning = backupVersion && backupVersion !== APP_VERSION
    ? `Backup version ${backupVersion} differs from current version ${APP_VERSION} — some fields may not have been restored correctly.`
    : null;

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

  if (c.req.header("HX-Request")) {
    const rows = Object.values(imported)
      .map(
        (r) =>
          `<tr><td>${r.label}</td><td>${r.count}</td><td>${
            r.errors.length > 0 ? r.errors.join(", ") : "—"
          }</td></tr>`,
      )
      .join("");
    const warning = versionWarning
      ? `<p class="settings-data__warning">${versionWarning}</p>`
      : "";
    const html =
      `${warning}<p class="settings-data__result-summary">Restored <strong>${totalCount}</strong> records across ${
        Object.keys(imported).length
      } domains (${totalErrors} error${
        totalErrors !== 1 ? "s" : ""
      }).</p><table class="settings-data__result-table"><thead><tr><th>Domain</th><th>Restored</th><th>Errors</th></tr></thead><tbody>${rows}</tbody></table>`;
    return c.html(html);
  }

  return c.json({ imported, totalCount, totalErrors, versionWarning }, 200);
});
