/**
 * WebDAV method handlers — one function per HTTP/WebDAV method.
 * GET/HEAD helpers live in get-helpers.ts; PROPFIND in propfind.ts;
 * lockXmlResponse in xml.ts. Each handler is a pure function of a
 * `WebDavContext` and the request.
 */

import { dirname } from "@std/path";
import { ensureDir } from "@std/fs";
import { ALLOWED_METHODS, corsHeaders, httpErr, HttpError } from "./http.ts";
import {
  atomicMove,
  atomicWrite,
  atomicWriteStream,
  copyResource,
  fileEtag,
  fsStat,
} from "./fs-ops.ts";
import { lockXmlResponse, parsePropPatch, xe, xmlTagValue } from "./xml.ts";
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
