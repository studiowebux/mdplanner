/**
 * WebDAV GET/HEAD helpers — directory index renderer, conditional header
 * evaluator, range server, full-file streamer, and the handleGet/handleHead
 * method handlers. Extracted from methods.ts to keep that file under 400 LOC.
 */

import { corsHeaders, httpErr } from "./http.ts";
import { fileEtag, fsStat } from "./fs-ops.ts";
import { guessMime, xe, xmlDate } from "./xml.ts";

/** Render the HTML directory index for a GET on a collection. */
async function renderDirIndex(
  fsPath: string,
  reqPath: string,
): Promise<Response> {
  const entries: Deno.DirEntry[] = [];
  for await (const e of Deno.readDir(fsPath)) entries.push(e);
  entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const base = reqPath.endsWith("/") ? reqPath : reqPath + "/";
  const parent = base === "/"
    ? null
    : base.slice(0, base.slice(0, -1).lastIndexOf("/") + 1) || "/";
  const rows = entries
    .map((e) => {
      const href = base + encodeURIComponent(e.name) +
        (e.isDirectory ? "/" : "");
      return `<tr><td><a href="${href}">${xe(e.name)}${
        e.isDirectory ? "/" : ""
      }</a></td></tr>`;
    })
    .join("\n");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Index of ${xe(reqPath)}</title>
<style>body{font-family:monospace;margin:2rem;max-width:800px}
h2{margin-bottom:1rem}table{width:100%;border-collapse:collapse}
td,th{padding:6px 12px;text-align:left;border-bottom:1px solid #eee}
a{text-decoration:none;color:#0070f3}a:hover{text-decoration:underline}</style>
</head><body><h2>Index of ${xe(reqPath)}</h2><table>
<tr><th scope="col">Name</th></tr>
${parent !== null ? `<tr><td><a href="${parent}">..</a></td></tr>` : ""}
${rows}</table></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html;charset=utf-8",
      DAV: "1, 2, 3",
      ...corsHeaders(),
    },
  });
}

/**
 * Evaluate GET conditional headers. Returns the short-circuit response
 * (412 Precondition Failed / 304 Not Modified) or null to serve the body.
 */
function evaluateConditionals(
  req: Request,
  info: Deno.FileInfo,
  tag: string,
): Response | null {
  const notModified = () =>
    new Response(null, {
      status: 304,
      headers: { ETag: tag, ...corsHeaders() },
    });

  const ifMatch = req.headers.get("If-Match");
  if (ifMatch && ifMatch !== "*" && ifMatch !== tag) {
    return httpErr(412, "Precondition Failed");
  }
  const ifNoneMatch = req.headers.get("If-None-Match");
  if (ifNoneMatch && (ifNoneMatch === "*" || ifNoneMatch === tag)) {
    return notModified();
  }
  const ifModifiedSince = req.headers.get("If-Modified-Since");
  if (
    ifModifiedSince && info.mtime && new Date(ifModifiedSince) >= info.mtime
  ) {
    return notModified();
  }
  const ifUnmodifiedSince = req.headers.get("If-Unmodified-Since");
  if (
    ifUnmodifiedSince && info.mtime && new Date(ifUnmodifiedSince) < info.mtime
  ) {
    return httpErr(412, "Precondition Failed");
  }
  return null;
}

/**
 * Serve a byte range when the request carries a satisfiable Range header.
 * Returns null when there is no Range header or it does not parse — the caller
 * then serves the full body.
 */
async function serveRange(
  req: Request,
  fsPath: string,
  info: Deno.FileInfo,
  tag: string,
): Promise<Response | null> {
  const rangeHeader = req.headers.get("Range");
  if (!rangeHeader) return null;
  const m = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!m) return null;

  let start = m[1] ? parseInt(m[1]) : undefined;
  let end = m[2] ? parseInt(m[2]) : undefined;
  if (start === undefined) {
    start = Math.max(0, info.size - (end ?? 0));
    end = info.size - 1;
  }
  end = Math.min(end ?? info.size - 1, info.size - 1);
  if (start > end || start >= info.size) {
    return new Response("Range Not Satisfiable", {
      status: 416,
      headers: { "Content-Range": `bytes */${info.size}`, ...corsHeaders() },
    });
  }
  const len = end - start + 1;
  const file = await Deno.open(fsPath, { read: true });
  try {
    await file.seek(start, Deno.SeekMode.Start);
    const buf = new Uint8Array(len);
    let pos = 0;
    while (pos < len) {
      const n = await file.read(buf.subarray(pos));
      if (n === null) break;
      pos += n;
    }
    return new Response(buf, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${info.size}`,
        "Content-Length": String(len),
        "Content-Type": guessMime(fsPath),
        ETag: tag,
        "Last-Modified": xmlDate(info.mtime),
        "Accept-Ranges": "bytes",
        ...corsHeaders(),
      },
    });
  } finally {
    file.close();
  }
}

/** Stream the full file body (200). */
async function serveFullFile(
  fsPath: string,
  info: Deno.FileInfo,
  tag: string,
): Promise<Response> {
  const file = await Deno.open(fsPath, { read: true });
  return new Response(file.readable, {
    status: 200,
    headers: {
      "Content-Type": guessMime(fsPath),
      "Content-Length": String(info.size),
      ETag: tag,
      "Last-Modified": xmlDate(info.mtime),
      "Accept-Ranges": "bytes",
      DAV: "1, 2, 3",
      ...corsHeaders(),
    },
  });
}

export async function handleHead(
  _req: Request,
  fsPath: string,
): Promise<Response> {
  const info = await fsStat(fsPath);
  if (!info) return httpErr(404, "Not Found");
  if (info.isDirectory) {
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": "httpd/unix-directory",
        DAV: "1, 2, 3",
        ...corsHeaders(),
      },
    });
  }
  const tag = await fileEtag(info);
  return new Response(null, {
    status: 200,
    headers: {
      "Content-Type": guessMime(fsPath),
      "Content-Length": String(info.size),
      ETag: tag,
      "Last-Modified": xmlDate(info.mtime),
      "Accept-Ranges": "bytes",
      DAV: "1, 2, 3",
      ...corsHeaders(),
    },
  });
}

export async function handleGet(
  req: Request,
  fsPath: string,
  reqPath: string,
): Promise<Response> {
  const info = await fsStat(fsPath);
  if (!info) return httpErr(404, "Not Found");
  if (info.isDirectory) return renderDirIndex(fsPath, reqPath);

  const tag = await fileEtag(info);
  const conditional = evaluateConditionals(req, info, tag);
  if (conditional) return conditional;

  const ranged = await serveRange(req, fsPath, info, tag);
  if (ranged) return ranged;

  return serveFullFile(fsPath, info, tag);
}
