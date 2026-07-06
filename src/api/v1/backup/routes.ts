// Backup routes:
//   GET  /export   — streams a full JSON backup as a file download.
//   POST /preview  — read-only: parses an uploaded backup and returns per-domain
//                    New/Overwrite counts diffed against current data. No writes.
//   POST /import   — restores a backup (upsert — never deletes existing records).
//
// Domain coverage is driven by the registry in registry.ts + domains.ts.
// Import/preview share the line-streaming parser in parser.ts — the export
// writes each domain's items array on a single line, so neither route ever
// buffers the full JSON in memory.

import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { APP_VERSION } from "../../../constants/mod.ts";
import { log } from "../../../singletons/logger.ts";
import { badRequest } from "../../../types/api.ts";
import { registerBackupDomains } from "./domains.ts";
import {
  getDomain,
  getDomains,
  type ImportDomainResult,
  type PreviewDomainResult,
} from "./registry.ts";
import { parseBackupStream, readBackupBody } from "./parser.ts";

function errorResponse(c: Context, message: string) {
  if (c.req.header("HX-Request")) {
    return c.html(`<p class="settings-data__warning">${message}</p>`, 400);
  }
  return c.json(badRequest(message), 400);
}

// Escape strings that originate from the uploaded file (domain keys, version,
// exportedAt) before interpolating into HTML.
function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch] ?? ch,
  );
}

function versionMismatchWarning(version: string | null): string | null {
  return version && version !== APP_VERSION
    ? `Backup version ${version} differs from current version ${APP_VERSION} — some fields may not be restored correctly.`
    : null;
}

registerBackupDomains();

export const backupRouter = new OpenAPIHono();

// GET /export — streams full JSON backup as a file download.
// Each domain is fetched and serialized incrementally to avoid loading all
// 39 domains into memory at once before responding.
backupRouter.get("/export", (c) => {
  const date = new Date().toISOString().split("T")[0];
  const exportedAt = new Date().toISOString();
  const allDomains = getDomains();

  const stream = new ReadableStream({
    async start(ctrl) {
      const enc = new TextEncoder();
      const write = (s: string) => ctrl.enqueue(enc.encode(s));

      write(
        `{\n  "version": ${JSON.stringify(APP_VERSION)},\n  "exportedAt": ${
          JSON.stringify(exportedAt)
        },\n  "domains": {\n`,
      );

      let first = true;
      for (const d of allDomains) {
        let items: unknown[];
        try {
          items = await d.export();
        } catch (err) {
          log.error(`[backup] export failed for ${d.key}:`, err);
          items = [];
        }
        if (!first) write(",\n");
        write(`    ${JSON.stringify(d.key)}: ${JSON.stringify(items)}`);
        first = false;
      }

      write("\n  }\n}\n");
      ctrl.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition":
        `attachment; filename="mdplanner-backup-${date}.json"`,
    },
  });
});

// POST /preview — read-only. Parses the uploaded backup and reports, per domain,
// how many records would be created (New) vs overwritten (Overwrite), diffed by
// id against current data. Writes nothing. Import is upsert-only, so records in
// current data but absent from the backup are never deleted.
backupRouter.post("/preview", async (c) => {
  const bodyOrErr = await readBackupBody(c);
  if ("error" in bodyOrErr) return errorResponse(c, bodyOrErr.error);

  let version: string | null = null;
  let exportedAt: string | null = null;
  let foundDomains = false;
  const preview: PreviewDomainResult[] = [];
  let totalAdd = 0;
  let totalUpdate = 0;
  let unknownDomains = 0;

  for await (const ev of parseBackupStream(bodyOrErr.stream)) {
    if (ev.type === "meta") {
      if (ev.key === "version") version = ev.value;
      else exportedAt = ev.value;
      continue;
    }
    if (ev.type === "domains-start") {
      foundDomains = true;
      continue;
    }

    // ev.type === "domain"
    const domain = getDomain(ev.key);
    if (!domain) {
      unknownDomains++;
      preview.push({
        key: ev.key,
        label: ev.key,
        known: false,
        backupCount: ev.items.length,
        add: 0,
        update: 0,
      });
      continue;
    }

    let currentItems: unknown[];
    try {
      currentItems = await domain.export();
    } catch {
      currentItems = [];
    }
    const currentIds = new Set(
      currentItems
        .map((it) => (it as { id?: string }).id)
        .filter((id): id is string => typeof id === "string"),
    );

    let add = 0;
    let update = 0;
    for (const it of ev.items) {
      const id = (it as { id?: string }).id;
      if (id && currentIds.has(id)) update++;
      else add++;
    }

    preview.push({
      key: ev.key,
      label: domain.label,
      known: true,
      backupCount: ev.items.length,
      add,
      update,
    });
    totalAdd += add;
    totalUpdate += update;
  }

  if (!foundDomains) {
    return errorResponse(c, "Backup must contain a 'domains' object");
  }

  const versionWarning = versionMismatchWarning(version);

  if (c.req.header("HX-Request")) {
    return c.html(
      renderPreviewHtml({
        preview,
        version,
        exportedAt,
        totalAdd,
        totalUpdate,
        unknownDomains,
        versionWarning,
      }),
    );
  }

  return c.json(
    {
      preview,
      version,
      exportedAt,
      totalAdd,
      totalUpdate,
      unknownDomains,
      versionWarning,
    },
    200,
  );
});

function renderPreviewHtml(p: {
  preview: PreviewDomainResult[];
  version: string | null;
  exportedAt: string | null;
  totalAdd: number;
  totalUpdate: number;
  unknownDomains: number;
  versionWarning: string | null;
}): string {
  const warning = p.versionWarning
    ? `<p class="settings-data__warning">${p.versionWarning}</p>`
    : "";

  const unknownNote = p.unknownDomains > 0
    ? `<p class="settings-data__warning">${p.unknownDomains} unknown domain${
      p.unknownDomains !== 1 ? "s" : ""
    } in this backup will be skipped (no matching module).</p>`
    : "";

  const meta = [
    p.version ? `version <strong>${esc(p.version)}</strong>` : null,
    p.exportedAt ? `created <strong>${esc(p.exportedAt)}</strong>` : null,
  ].filter(Boolean).join(" · ");
  const metaLine = meta
    ? `<p class="settings-data__result-summary">Backup ${meta}.</p>`
    : "";

  const rows = p.preview
    .map((r) =>
      `<tr><td>${esc(r.label)}${
        r.known ? "" : " <em>(skipped)</em>"
      }</td><td>${r.backupCount}</td><td>${r.known ? r.add : "—"}</td><td>${
        r.known ? r.update : "—"
      }</td></tr>`
    )
    .join("");

  const summary =
    `<p class="settings-data__result-summary"><strong>${p.totalAdd}</strong> new, <strong>${p.totalUpdate}</strong> overwrite. Records in your current data but not in this backup are kept — import never deletes.</p>`;

  const confirm =
    `<div class="settings-data__confirm-row"><button type="button" class="btn btn--primary" hx-post="/api/v1/backup/import" hx-include="#backup-import-form" hx-encoding="multipart/form-data" hx-target="#backup-import-result" hx-swap="innerHTML">Confirm &amp; Restore</button></div>`;

  return `${warning}${unknownNote}${metaLine}${summary}<table class="settings-data__result-table"><thead><tr><th scope="col">Domain</th><th scope="col">In backup</th><th scope="col">New</th><th scope="col">Overwrite</th></tr></thead><tbody>${rows}</tbody></table>${confirm}`;
}

// POST /import — accepts multipart/form-data with a 'file' field or raw JSON.
// Upserts every record from the backup; existing records with the same id are
// overwritten and records absent from the backup are left untouched.
backupRouter.post("/import", async (c) => {
  const bodyOrErr = await readBackupBody(c);
  if ("error" in bodyOrErr) return errorResponse(c, bodyOrErr.error);

  let backupVersion: string | null = null;
  let foundDomains = false;
  const imported: Record<string, ImportDomainResult> = {};
  let totalCount = 0;
  let totalErrors = 0;

  for await (const ev of parseBackupStream(bodyOrErr.stream)) {
    if (ev.type === "meta") {
      if (ev.key === "version") backupVersion = ev.value;
      continue;
    }
    if (ev.type === "domains-start") {
      foundDomains = true;
      continue;
    }

    // ev.type === "domain"
    const domain = getDomain(ev.key);
    if (!domain) continue; // unknown domain in backup — skip

    const result = await domain.import(ev.items);
    imported[ev.key] = {
      label: domain.label,
      count: result.count,
      errors: result.errors,
    };
    totalCount += result.count;
    totalErrors += result.errors.length;
  }

  if (!foundDomains) {
    return errorResponse(c, "Backup must contain a 'domains' object");
  }

  const versionWarning = versionMismatchWarning(backupVersion);

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
      }).</p><table class="settings-data__result-table"><thead><tr><th scope="col">Domain</th><th scope="col">Restored</th><th scope="col">Errors</th></tr></thead><tbody>${rows}</tbody></table>`;
    return c.html(html);
  }

  return c.json({ imported, totalCount, totalErrors, versionWarning }, 200);
});
