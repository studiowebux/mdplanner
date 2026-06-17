/**
 * WebDAV method handlers — one function per HTTP/WebDAV method, plus the
 * shared PROPFIND response builder and LOCK XML response. Each handler is a
 * pure function of a `WebDavContext` (config, logger, lock/prop stores, and
 * the handler-owned closures resolvePath/trashResource/withWriteLock) and the
 * request. No behaviour change vs. the original inline closures — the bytes of
 * every response are identical.
 */

import { basename, dirname } from "@std/path";
import { ensureDir } from "@std/fs";
import { ALLOWED_METHODS, corsHeaders, httpErr, HttpError } from "./http.ts";
import {
  atomicMove,
  atomicWrite,
  atomicWriteStream,
  copyResource,
  fileEtag,
  fsStat,
  streamPropfindDir,
} from "./fs-ops.ts";
import {
  guessMime,
  iso8601,
  parsePropPatch,
  xe,
  xmlDate,
  xmlTagValue,
} from "./xml.ts";
import type { Lock, LockStore } from "./locks.ts";
import type { DeadPropStore } from "./props.ts";
import type { Logger, ResolvedWebDavConfig } from "./types.ts";

/** Everything a method handler needs from the enclosing handler factory. */
export interface WebDavContext {
  cfg: ResolvedWebDavConfig;
  log: Logger;
  locks: LockStore;
  props: DeadPropStore;
  resolvePath: (requestPath: string) => string;
  trashResource: (fsPath: string) => Promise<void>;
  withWriteLock: <T>(path: string, fn: () => Promise<T>) => Promise<T>;
}

// ── PROPFIND response builder ───────────────────────────────────────────────

/** Resolved inputs every live-property builder shares. */
interface PropArgs {
  ctx: WebDavContext;
  fsPath: string;
  info: Deno.FileInfo;
  isDir: boolean;
  tag: string;
  disp: string;
}

// Standard DAV live properties, in canonical response order. Each builder
// returns the property's XML, or null when it does not apply to the resource
// (e.g. getcontentlength on a collection). The order of this table IS the wire
// order — independent of the order props were requested in.
const LIVE_PROPS: ReadonlyArray<[string, (a: PropArgs) => string | null]> = [
  [
    "resourcetype",
    ({ isDir }) =>
      `<D:resourcetype>${isDir ? "<D:collection/>" : ""}</D:resourcetype>`,
  ],
  [
    "displayname",
    ({ fsPath }) => `<D:displayname>${xe(basename(fsPath))}</D:displayname>`,
  ],
  [
    "getcontentlength",
    ({ isDir, info }) =>
      isDir ? null : `<D:getcontentlength>${info.size}</D:getcontentlength>`,
  ],
  [
    "getcontenttype",
    ({ isDir, fsPath }) =>
      `<D:getcontenttype>${
        isDir ? "httpd/unix-directory" : guessMime(fsPath)
      }</D:getcontenttype>`,
  ],
  [
    "getlastmodified",
    ({ info }) =>
      `<D:getlastmodified>${xmlDate(info.mtime)}</D:getlastmodified>`,
  ],
  [
    "creationdate",
    ({ info }) =>
      `<D:creationdate>${
        iso8601(info.birthtime ?? info.mtime)
      }</D:creationdate>`,
  ],
  ["getetag", ({ tag }) => `<D:getetag>${tag}</D:getetag>`],
  ["supportedlock", () =>
    `<D:supportedlock>
      <D:lockentry><D:lockscope><D:exclusive/></D:lockscope><D:locktype><D:write/></D:locktype></D:lockentry>
      <D:lockentry><D:lockscope><D:shared/></D:lockscope><D:locktype><D:write/></D:locktype></D:lockentry>
    </D:supportedlock>`],
  [
    "lockdiscovery",
    ({ ctx, fsPath, disp }) =>
      `<D:lockdiscovery>${
        ctx.locks.getActive(fsPath).map((l) => `
      <D:activelock>
        <D:locktype><D:write/></D:locktype><D:lockscope><D:${l.scope}/></D:lockscope>
        <D:depth>${l.depth}</D:depth><D:owner>${xe(l.owner)}</D:owner>
        <D:timeout>Second-${
          Math.max(0, Math.floor((l.timeout - Date.now()) / 1000))
        }</D:timeout>
        <D:locktoken><D:href>${l.token}</D:href></D:locktoken>
        <D:lockroot><D:href>${xe(disp)}</D:href></D:lockroot>
      </D:activelock>`).join("")
      }</D:lockdiscovery>`,
  ],
];

const KNOWN_PROPS = new Set(LIVE_PROPS.map(([name]) => name));

function isPropWanted(requestedProps: string[] | null, name: string): boolean {
  return requestedProps === null || requestedProps.includes(name);
}

async function buildPropResponse(
  ctx: WebDavContext,
  fsPath: string,
  href: string,
  info: Deno.FileInfo,
  requestedProps: string[] | null,
): Promise<string> {
  const isDir = info.isDirectory;
  const disp = isDir && !href.endsWith("/") ? href + "/" : href;
  const tag = await fileEtag(info);
  const dp = ctx.props.get(fsPath);
  const args: PropArgs = { ctx, fsPath, info, isDir, tag, disp };

  const p200: string[] = [];
  for (const [name, build] of LIVE_PROPS) {
    if (!isPropWanted(requestedProps, name)) continue;
    const xml = build(args);
    if (xml !== null) p200.push(xml);
  }

  for (const [key, val] of dp) {
    const ci = key.indexOf(":");
    const dpNs = key.slice(0, ci);
    const local = key.slice(ci + 1);
    if (isPropWanted(requestedProps, local)) {
      p200.push(`<Z:${local} xmlns:Z="${xe(dpNs)}">${val}</Z:${local}>`);
    }
  }

  const p404: string[] = [];
  if (requestedProps) {
    for (const p of requestedProps) {
      if (
        !KNOWN_PROPS.has(p) &&
        ![...dp.keys()].some((k) => k.endsWith(`:${p}`))
      ) {
        p404.push(`<D:${p}/>`);
      }
    }
  }

  return `<D:response>
  <D:href>${xe(disp)}</D:href>
  ${
    p200.length
      ? `<D:propstat><D:prop>${
        p200.join("")
      }</D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat>`
      : ""
  }
  ${
    p404.length
      ? `<D:propstat><D:prop>${
        p404.join("")
      }</D:prop><D:status>HTTP/1.1 404 Not Found</D:status></D:propstat>`
      : ""
  }
</D:response>`;
}

// ── Method handlers ─────────────────────────────────────────────────────────

export function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: ALLOWED_METHODS,
      DAV: "1, 2, 3",
      "MS-Author-Via": "DAV",
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

export async function handlePut(
  ctx: WebDavContext,
  req: Request,
  fsPath: string,
): Promise<Response> {
  const conflict = ctx.locks.checkConflict(
    fsPath,
    "PUT",
    req.headers.get("If"),
  );
  if (conflict) return httpErr(423, "Locked", { "Lock-Token": conflict });

  const existing = await fsStat(fsPath);
  const ifMatch = req.headers.get("If-Match");
  if (ifMatch) {
    if (!existing) return httpErr(412, "Precondition Failed");
    if (ifMatch !== "*" && ifMatch !== (await fileEtag(existing))) {
      return httpErr(412, "Precondition Failed");
    }
  }
  if (req.headers.get("If-None-Match") === "*" && existing) {
    return httpErr(412, "Precondition Failed");
  }
  if (existing?.isDirectory) {
    return httpErr(409, "Conflict: target is a directory");
  }

  const isNew = !existing;
  return ctx.withWriteLock(fsPath, async () => {
    if (!req.body) {
      await atomicWrite(fsPath, new Uint8Array(0));
    } else {
      await atomicWriteStream(fsPath, req.body, ctx.cfg.maxUploadBytes);
    }
    return new Response(null, {
      status: isNew ? 201 : 204,
      headers: corsHeaders(),
    });
  });
}

export async function handleDelete(
  ctx: WebDavContext,
  req: Request,
  fsPath: string,
): Promise<Response> {
  const conflict = ctx.locks.checkConflict(
    fsPath,
    "DELETE",
    req.headers.get("If"),
  );
  if (conflict) return httpErr(423, "Locked", { "Lock-Token": conflict });
  const info = await fsStat(fsPath);
  if (!info) return httpErr(404, "Not Found");
  await ctx.trashResource(fsPath);
  await ctx.props.cleanUnder(fsPath);
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function handleMkcol(
  bodyText: string,
  fsPath: string,
): Promise<Response> {
  if (bodyText.trim().length > 0) {
    return httpErr(415, "Unsupported Media Type: MKCOL body not supported");
  }
  const existing = await fsStat(fsPath);
  if (existing) {
    return httpErr(405, "Method Not Allowed: resource already exists");
  }
  const parent = await fsStat(dirname(fsPath));
  if (!parent?.isDirectory) {
    return httpErr(409, "Conflict: parent collection does not exist");
  }
  await Deno.mkdir(fsPath);
  return new Response(null, { status: 201, headers: corsHeaders() });
}

export async function handleCopy(
  ctx: WebDavContext,
  req: Request,
  fsPath: string,
): Promise<Response> {
  const destHeader = req.headers.get("Destination");
  if (!destHeader) {
    return httpErr(400, "Bad Request: missing Destination header");
  }
  let destFsPath: string;
  try {
    destFsPath = ctx.resolvePath(new URL(destHeader, req.url).pathname);
  } catch (e) {
    return e instanceof HttpError
      ? httpErr(e.status, e.message)
      : httpErr(400, "Bad Destination");
  }
  const overwrite = (req.headers.get("Overwrite") ?? "T").toUpperCase() !== "F";
  const srcInfo = await fsStat(fsPath);
  if (!srcInfo) return httpErr(404, "Not Found");
  const destInfo = await fsStat(destFsPath);
  if (destInfo && !overwrite) return httpErr(412, "Precondition Failed");
  if (destInfo) await ctx.trashResource(destFsPath);
  await copyResource(
    fsPath,
    destFsPath,
    req.headers.get("Depth") ?? "infinity",
    srcInfo.isDirectory,
  );
  return new Response(null, {
    status: destInfo ? 204 : 201,
    headers: corsHeaders(),
  });
}

export async function handleMove(
  ctx: WebDavContext,
  req: Request,
  fsPath: string,
): Promise<Response> {
  const conflict = ctx.locks.checkConflict(
    fsPath,
    "MOVE",
    req.headers.get("If"),
  );
  if (conflict) return httpErr(423, "Locked", { "Lock-Token": conflict });
  const destHeader = req.headers.get("Destination");
  if (!destHeader) {
    return httpErr(400, "Bad Request: missing Destination header");
  }
  let destFsPath: string;
  try {
    destFsPath = ctx.resolvePath(new URL(destHeader, req.url).pathname);
  } catch (e) {
    return e instanceof HttpError
      ? httpErr(e.status, e.message)
      : httpErr(400, "Bad Destination");
  }
  if (destFsPath === fsPath) {
    return httpErr(403, "Forbidden: source equals destination");
  }
  const overwrite = (req.headers.get("Overwrite") ?? "T").toUpperCase() !== "F";
  const srcInfo = await fsStat(fsPath);
  if (!srcInfo) return httpErr(404, "Not Found");
  const destInfo = await fsStat(destFsPath);
  if (destInfo && !overwrite) return httpErr(412, "Precondition Failed");
  if (destInfo) await ctx.trashResource(destFsPath);
  await ensureDir(dirname(destFsPath));
  await atomicMove(fsPath, destFsPath, srcInfo.isDirectory);
  await ctx.props.move(fsPath, destFsPath);
  return new Response(null, {
    status: destInfo ? 204 : 201,
    headers: corsHeaders(),
  });
}

export async function handlePropfind(
  ctx: WebDavContext,
  req: Request,
  bodyText: string,
  fsPath: string,
  reqPath: string,
): Promise<Response> {
  const info = await fsStat(fsPath);
  if (!info) return httpErr(404, "Not Found");

  const depth = req.headers.get("Depth") ?? "1";
  let requestedProps: string[] | null = null;
  if (
    !bodyText || bodyText.includes(":allprop>") ||
    bodyText.includes("<D:allprop>")
  ) {
    requestedProps = null;
  } else if (
    !bodyText.includes(":propname>") &&
    !bodyText.includes("<D:propname>")
  ) {
    requestedProps = [
      ...bodyText.matchAll(/<(?:\w+:)?([a-zA-Z][\w-]+)\s*\/>/g),
    ]
      .map((m) => m[1])
      .filter((p) => p !== "prop");
  }

  const enc = new TextEncoder();
  const { readable, writable } = new TransformStream<
    Uint8Array,
    Uint8Array
  >();
  const writer = writable.getWriter();

  (async () => {
    try {
      await writer.write(
        enc.encode(
          `<?xml version="1.0" encoding="utf-8"?>\n<D:multistatus xmlns:D="DAV:">\n`,
        ),
      );

      const emit = async (path: string, href: string): Promise<void> => {
        const i = await fsStat(path);
        if (!i) return;
        await writer.write(
          enc.encode(
            (await buildPropResponse(ctx, path, href, i, requestedProps)) +
              "\n",
          ),
        );
      };

      const baseHref = info.isDirectory
        ? reqPath.endsWith("/") ? reqPath : reqPath + "/"
        : reqPath;
      await emit(fsPath, baseHref);
      if (info.isDirectory && depth !== "0") {
        await streamPropfindDir(fsPath, baseHref, depth, emit);
      }
      await writer.write(enc.encode("</D:multistatus>"));
      await writer.close();
    } catch (e) {
      await writer.abort(e).catch(() => {});
    }
  })();

  return new Response(readable, {
    status: 207,
    headers: {
      "Content-Type": "application/xml;charset=utf-8",
      DAV: "1, 2, 3",
      ...corsHeaders(),
    },
  });
}

export async function handleProppatch(
  ctx: WebDavContext,
  req: Request,
  bodyText: string,
  fsPath: string,
  reqPath: string,
): Promise<Response> {
  const conflict = ctx.locks.checkConflict(
    fsPath,
    "PROPPATCH",
    req.headers.get("If"),
  );
  if (conflict) return httpErr(423, "Locked", { "Lock-Token": conflict });
  const info = await fsStat(fsPath);
  if (!info) return httpErr(404, "Not Found");

  const ops = parsePropPatch(bodyText);
  const stats: string[] = [];
  for (const op of ops) {
    if (op.type === "set") {
      await ctx.props.set(fsPath, op.ns, op.local, op.value);
    } else {
      await ctx.props.remove(fsPath, op.ns, op.local);
    }
    stats.push(`<D:propstat>
      <D:prop><Z:${op.local} xmlns:Z="${xe(op.ns)}"/></D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>`);
  }

  const href = info.isDirectory
    ? reqPath.endsWith("/") ? reqPath : reqPath + "/"
    : reqPath;

  return new Response(
    `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response><D:href>${xe(href)}</D:href>${stats.join("")}</D:response>
</D:multistatus>`,
    {
      status: 207,
      headers: {
        "Content-Type": "application/xml;charset=utf-8",
        ...corsHeaders(),
      },
    },
  );
}

function lockXmlResponse(
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

export async function handleLock(
  ctx: WebDavContext,
  req: Request,
  bodyText: string,
  fsPath: string,
  reqPath: string,
): Promise<Response> {
  const depth = req.headers.get("Depth") ?? "infinity";
  const rawTimeout = req.headers.get("Timeout") ??
    `Second-${ctx.cfg.lockTimeout}`;
  const timeoutSec = Math.min(
    parseInt(rawTimeout.replace(/^Second-/i, "")) || ctx.cfg.lockTimeout,
    ctx.cfg.lockTimeout,
  );

  const refreshToken = req.headers
    .get("If")
    ?.match(/<(urn:uuid:[^>]+)>/)?.[1];
  if (!bodyText.trim() && refreshToken) {
    const existing = await ctx.locks.refresh(refreshToken, timeoutSec);
    if (!existing) {
      return httpErr(412, "Precondition Failed: lock token not found");
    }
    return lockXmlResponse(existing, reqPath);
  }

  const info = await fsStat(fsPath);
  if (!info) {
    await ctx.withWriteLock(
      fsPath,
      () => atomicWrite(fsPath, new Uint8Array(0)),
    );
  }

  const scope: "exclusive" | "shared" = bodyText.includes("exclusive")
    ? "exclusive"
    : "shared";
  const owner = xmlTagValue(bodyText, "owner") ?? "";

  const active = ctx.locks.getActive(fsPath);
  if (scope === "exclusive" && active.length > 0) {
    return httpErr(423, "Locked");
  }
  if (active.some((l) => l.scope === "exclusive")) {
    return httpErr(423, "Locked");
  }

  const lock: Lock = {
    token: "urn:uuid:" + crypto.randomUUID(),
    path: fsPath,
    depth,
    scope,
    owner,
    timeout: Date.now() + timeoutSec * 1000,
    created: Date.now(),
  };
  await ctx.locks.add(lock);
  ctx.log("INFO", "Lock acquired", {
    token: lock.token,
    path: reqPath,
    scope,
    depth,
  });
  return lockXmlResponse(lock, reqPath, true);
}

export async function handleUnlock(
  ctx: WebDavContext,
  req: Request,
  fsPath: string,
): Promise<Response> {
  const tokenHeader = req.headers.get("Lock-Token");
  if (!tokenHeader) {
    return httpErr(400, "Bad Request: missing Lock-Token header");
  }
  const token = tokenHeader.replace(/[<>]/g, "").trim();
  const lock = ctx.locks.get(token);
  if (!lock) return httpErr(409, "Conflict: unknown lock token");
  if (lock.path !== fsPath) {
    return httpErr(409, "Conflict: token does not match resource");
  }
  await ctx.locks.remove(token);
  ctx.log("INFO", "Lock released", { token });
  return new Response(null, { status: 204, headers: corsHeaders() });
}
