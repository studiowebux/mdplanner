// Shared backup body reader + streaming parser.
// Used by both POST /import (writes) and POST /preview (read-only diff).
//
// The exporter writes each domain's items array on a single line via
// JSON.stringify(items), so the parser processes one domain at a time without
// ever buffering the full JSON in memory.

import type { Context } from "hono";
import { log } from "../../../singletons/logger.ts";

export type BackupParseEvent =
  | { type: "meta"; key: "version" | "exportedAt"; value: string }
  | { type: "domains-start" }
  | { type: "domain"; key: string; items: unknown[] };

// Read the import body as a byte stream from a multipart 'file' field or a raw
// JSON body. Returns the stream, or an error message for the caller to render.
export async function readBackupBody(
  c: Context,
): Promise<{ stream: ReadableStream<Uint8Array> } | { error: string }> {
  const contentType = c.req.header("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!file || !(file instanceof File)) {
      return { error: "Missing 'file' field in multipart body" };
    }
    return { stream: file.stream() };
  }
  if (contentType.includes("application/json")) {
    if (!c.req.raw.body) return { error: "Empty request body" };
    return { stream: c.req.raw.body };
  }
  return { error: "Expected multipart/form-data or application/json" };
}

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

// Domain key line — `    "key": [...]`
const domainLineRe = /^\s+"([^"]+)":\s*(\[.*)/;
// Version line — `  "version": "x.y.z",`
const versionLineRe = /^\s+"version":\s*"([^"]+)"/;
// Exported-at line — `  "exportedAt": "<iso>",`
const exportedAtLineRe = /^\s+"exportedAt":\s*"([^"]+)"/;

// Parse the backup stream into ordered events. version/exportedAt arrive before
// the domains object; each domain array is parsed from a single line.
export async function* parseBackupStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<BackupParseEvent> {
  let foundDomains = false;

  for await (const line of streamLines(body)) {
    if (!foundDomains) {
      const vm = versionLineRe.exec(line);
      if (vm) {
        yield { type: "meta", key: "version", value: vm[1] };
        continue;
      }
      const em = exportedAtLineRe.exec(line);
      if (em) {
        yield { type: "meta", key: "exportedAt", value: em[1] };
        continue;
      }
      if (line.includes('"domains"')) {
        foundDomains = true;
        yield { type: "domains-start" };
      }
      continue;
    }

    const dm = domainLineRe.exec(line);
    if (!dm) continue;

    const key = dm[1];
    // Strip trailing comma if present (all but the last domain line have none,
    // but be defensive).
    const rawArray = dm[2].replace(/,\s*$/, "");

    let items: unknown[];
    try {
      items = JSON.parse(rawArray);
    } catch {
      log.warn(`[backup] failed to parse domain "${key}" — skipping`);
      continue;
    }
    if (!Array.isArray(items)) continue;

    yield { type: "domain", key, items };
  }
}
