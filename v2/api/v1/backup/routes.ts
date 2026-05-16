// Backup routes — GET /export streams a full JSON backup; POST /import restores it.
// Domain coverage is driven by the registry in registry.ts + domains.ts.
//
// Import uses a line-streaming parser: the export writes each domain's items array
// on a single line via JSON.stringify(items), so we can process one domain at a time
// without ever buffering the full JSON in memory.

import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { APP_VERSION } from "../../../constants/mod.ts";
import { registerBackupDomains } from "./domains.ts";
import { getDomain, getDomains, type ImportDomainResult } from "./registry.ts";

function errorResponse(c: Context, message: string) {
  if (c.req.header("HX-Request")) {
    return c.html(`<p class="settings-data__warning">${message}</p>`, 400);
  }
  return c.json({ error: message }, 400);
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
          console.error(`[backup] export failed for ${d.key}:`, err);
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

// Yield lines from a ReadableStream<Uint8Array> without buffering the full body.
async function* streamLines(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) yield line;
  }
  if (buf) yield buf;
}

// POST /import — accepts multipart/form-data with a 'file' field or raw JSON body.
// Streams the body line by line — each domain array occupies one line in the
// exported format, so the full JSON is never loaded into memory at once.
backupRouter.post("/import", async (c) => {
  const contentType = c.req.header("content-type") ?? "";

  let bodyStream: ReadableStream<Uint8Array>;

  if (contentType.includes("multipart/form-data")) {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!file || !(file instanceof File)) {
      return errorResponse(c, "Missing 'file' field in multipart body");
    }
    bodyStream = file.stream();
  } else if (contentType.includes("application/json")) {
    if (!c.req.raw.body) {
      return errorResponse(c, "Empty request body");
    }
    bodyStream = c.req.raw.body;
  } else {
    return errorResponse(c, "Expected multipart/form-data or application/json");
  }

  // Domain key regex — matches lines written by the exporter:
  //   `    "key": [...]`
  const domainLineRe = /^\s+"([^"]+)":\s*(\[.*)/;
  // Version line — `  "version": "x.y.z",`
  const versionLineRe = /^\s+"version":\s*"([^"]+)"/;

  let backupVersion: string | null = null;
  const imported: Record<string, ImportDomainResult> = {};
  let totalCount = 0;
  let totalErrors = 0;
  let foundDomains = false;

  for await (const line of streamLines(bodyStream)) {
    // Extract version before domains section
    if (!foundDomains) {
      const vm = versionLineRe.exec(line);
      if (vm) {
        backupVersion = vm[1];
        continue;
      }
      if (line.includes('"domains"')) {
        foundDomains = true;
        continue;
      }
      continue;
    }

    const dm = domainLineRe.exec(line);
    if (!dm) continue;

    const key = dm[1];
    // Strip trailing comma if present (all but the last domain line have none,
    // but be defensive)
    const rawArray = dm[2].replace(/,\s*$/, "");

    const domain = getDomain(key);
    if (!domain) continue; // unknown domain in backup — skip

    let items: unknown[];
    try {
      items = JSON.parse(rawArray);
    } catch {
      console.warn(`[backup] failed to parse domain "${key}" — skipping`);
      continue;
    }
    if (!Array.isArray(items)) continue;

    const result = await domain.import(items);
    imported[key] = {
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

  const versionWarning = backupVersion && backupVersion !== APP_VERSION
    ? `Backup version ${backupVersion} differs from current version ${APP_VERSION} — some fields may not have been restored correctly.`
    : null;

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
