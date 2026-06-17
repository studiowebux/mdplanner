/**
 * WebDAV XML + content-type helpers — MIME guessing, XML escaping, date
 * formatting, single-tag extraction, and PROPPATCH body parsing. All pure.
 */

const MIME: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  txt: "text/plain",
  md: "text/markdown",
  css: "text/css",
  js: "application/javascript",
  mjs: "application/javascript",
  ts: "application/typescript",
  json: "application/json",
  xml: "application/xml",
  yaml: "text/yaml",
  yml: "text/yaml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  webp: "image/webp",
  avif: "image/avif",
  pdf: "application/pdf",
  zip: "application/zip",
  gz: "application/gzip",
  tar: "application/x-tar",
  bz2: "application/x-bzip2",
  xz: "application/x-xz",
  "7z": "application/x-7z-compressed",
  rar: "application/x-rar-compressed",
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  flac: "audio/flac",
  wav: "audio/wav",
  m4a: "audio/mp4",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  doc: "application/msword",
  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx:
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
};

export function guessMime(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

export function xe(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function xmlDate(d: Date | null | undefined): string {
  return (d ?? new Date()).toUTCString();
}

export function iso8601(d: Date | null | undefined): string {
  return (d ?? new Date()).toISOString();
}

export function xmlTagValue(xml: string, tag: string): string | undefined {
  return xml.match(
    new RegExp(`<[^/]*?:?${tag}[^>]*>(.*?)<\\/[^>]*?:?${tag}>`, "s"),
  )?.[1];
}

export interface PropPatchOp {
  type: "set" | "remove";
  ns: string;
  local: string;
  value: string;
}

import { corsHeaders } from "./http.ts";
import type { Lock } from "./locks.ts";

export function lockXmlResponse(
  lock: Lock,
  href: string,
  _isNew = false,
): Response {
  const secs = Math.max(
    0,
    Math.floor((lock.timeout - Date.now()) / 1000),
  );
  return new Response(
    `<?xml version="1.0" encoding="utf-8"?>
<D:prop xmlns:D="DAV:">
  <D:lockdiscovery>
    <D:activelock>
      <D:locktype><D:write/></D:locktype>
      <D:lockscope><D:${lock.scope}/></D:lockscope>
      <D:depth>${lock.depth}</D:depth>
      <D:owner>${xe(lock.owner)}</D:owner>
      <D:timeout>Second-${secs}</D:timeout>
      <D:locktoken><D:href>${lock.token}</D:href></D:locktoken>
      <D:lockroot><D:href>${xe(href)}</D:href></D:lockroot>
    </D:activelock>
  </D:lockdiscovery>
</D:prop>`,
    {
      status: 200,
      headers: {
        "Content-Type": "application/xml;charset=utf-8",
        "Lock-Token": `<${lock.token}>`,
        DAV: "1, 2, 3",
        ...corsHeaders(),
      },
    },
  );
}

export function parsePropPatch(body: string): PropPatchOp[] {
  const ops: PropPatchOp[] = [];
  const ns: Record<string, string> = {};
  for (const m of body.matchAll(/xmlns:(\w+)="([^"]+)"/g)) ns[m[1]] = m[2];
  for (const s of body.matchAll(/<(?:\w+:)?set>(.*?)<\/(?:\w+:)?set>/gs)) {
    for (
      const p of s[1].matchAll(/<(\w+):(\w+)(?:[^>]*)>(.*?)<\/\1:\2>/gs)
    ) {
      ops.push({ type: "set", ns: ns[p[1]] ?? p[1], local: p[2], value: p[3] });
    }
  }
  for (
    const r of body.matchAll(/<(?:\w+:)?remove>(.*?)<\/(?:\w+:)?remove>/gs)
  ) {
    for (const p of r[1].matchAll(/<(\w+):(\w+)/g)) {
      ops.push({
        type: "remove",
        ns: ns[p[1]] ?? p[1],
        local: p[2],
        value: "",
      });
    }
  }
  return ops;
}
