/**
 * WebDAV Handler — Factory Pattern
 *
 * Adapts the standalone WebDAV server from the webdav POC into a reusable
 * request handler that can be mounted on a Hono router at any path prefix.
 *
 * Usage:
 *   const handler = await createWebDavHandler({ rootDir: "/path/to/project" });
 *   app.all("/webdav/*", (c) => handler(c.req.raw));
 *
 * WebDAV compliance: RFC 4918 Class 1, 2, 3
 * Methods: OPTIONS HEAD GET PUT DELETE MKCOL COPY MOVE PROPFIND PROPPATCH LOCK UNLOCK
 *
 * This module is the thin router: it resolves config, wires the logger and the
 * lock/dead-property stores, owns the path-resolution / auth / soft-delete /
 * per-path write-mutex closures, then dispatches each request to a handler in
 * `methods.ts`. The pure helpers live in `http.ts`, `xml.ts`, `fs-ops.ts`.
 */

import { dirname, join, normalize, relative, resolve } from "@std/path";
import { ensureDir } from "@std/fs";
import {
  ALLOWED_METHODS,
  corsHeaders,
  httpErr,
  HttpError,
  safeEqual,
} from "./http.ts";
import { copyResource, fsStat } from "./fs-ops.ts";
import { createLogger } from "./log.ts";
import { LockStore } from "./locks.ts";
import { DeadPropStore } from "./props.ts";
import {
  handleCopy,
  handleDelete,
  handleGet,
  handleHead,
  handleLock,
  handleMkcol,
  handleMove,
  handleOptions,
  handlePropfind,
  handleProppatch,
  handlePut,
  handleUnlock,
  type WebDavContext,
} from "./methods.ts";
import type { ResolvedWebDavConfig, WebDavConfig } from "./types.ts";

export type { WebDavConfig } from "./types.ts";

export async function createWebDavHandler(
  opts: WebDavConfig,
): Promise<(req: Request) => Promise<Response>> {
  const cfg: ResolvedWebDavConfig = {
    rootDir: resolve(opts.rootDir),
    authUser: opts.authUser ?? null,
    authPass: opts.authPass ?? null,
    logFormat: opts.logFormat ?? "pretty",
    lockTimeout: opts.lockTimeout ?? 3600,
    maxUploadBytes: opts.maxUploadBytes ?? 0,
    maxDepth: opts.maxDepth ?? 20,
    trashDir: resolve(opts.trashDir ?? join(opts.rootDir, ".trash")),
    stateDir: resolve(opts.stateDir ?? join(opts.rootDir, ".state")),
    pathPrefix: opts.pathPrefix?.replace(/\/$/, "") ?? "",
  };

  const log = createLogger(cfg.logFormat);
  const locks = new LockStore(cfg.stateDir, log);
  const props = new DeadPropStore(cfg.stateDir, log);

  // ── Per-path write mutex ──────────────────────────────────────────────────
  const writeMutexMap = new Map<string, Promise<void>>();

  async function withWriteLock<T>(
    path: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const prev = writeMutexMap.get(path) ?? Promise.resolve();
    let release!: () => void;
    const mine = new Promise<void>((r) => {
      release = r;
    });
    writeMutexMap.set(path, mine);
    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (writeMutexMap.get(path) === mine) writeMutexMap.delete(path);
    }
  }

  // ── Path resolution ───────────────────────────────────────────────────────

  function resolvePath(requestPath: string): string {
    // Strip mount prefix so /webdav/tasks/x.md → /tasks/x.md before fs join
    const stripped = cfg.pathPrefix &&
        requestPath.startsWith(cfg.pathPrefix)
      ? requestPath.slice(cfg.pathPrefix.length) || "/"
      : requestPath;
    const decoded = decodeURIComponent(stripped);
    const full = resolve(join(cfg.rootDir, normalize(decoded)));
    const rootWithSep = cfg.rootDir.endsWith("/")
      ? cfg.rootDir
      : cfg.rootDir + "/";
    if (full !== cfg.rootDir && !full.startsWith(rootWithSep)) {
      throw new HttpError(403, "Forbidden: path escapes root directory");
    }
    const rel = relative(cfg.rootDir, full);
    const depth = rel === "." ? 0 : rel.split("/").length;
    if (depth > cfg.maxDepth) {
      throw new HttpError(
        403,
        `Forbidden: path depth ${depth} exceeds limit ${cfg.maxDepth}`,
      );
    }
    return full;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  function checkAuth(req: Request, method: string): "ok" | "unauthorized" {
    if (method === "OPTIONS") return "ok";
    if (!cfg.authUser) return "ok";
    const header = req.headers.get("Authorization") ?? "";
    if (!header.startsWith("Basic ")) return "unauthorized";
    let decoded: string;
    try {
      decoded = atob(header.slice(6).trim());
    } catch {
      return "unauthorized";
    }
    const ci = decoded.indexOf(":");
    if (ci === -1) return "unauthorized";
    return safeEqual(decoded.slice(0, ci), cfg.authUser) &&
        safeEqual(decoded.slice(ci + 1), cfg.authPass ?? "")
      ? "ok"
      : "unauthorized";
  }

  // ── Soft delete ───────────────────────────────────────────────────────────

  async function trashResource(fsPath: string): Promise<void> {
    const rel = relative(cfg.rootDir, fsPath).replace(/\\/g, "/");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = join(cfg.trashDir, `${ts}__${rel.replace(/\//g, "__")}`);
    await ensureDir(dirname(dest));
    try {
      await Deno.rename(fsPath, dest);
    } catch {
      const info = await fsStat(fsPath);
      if (info) await copyResource(fsPath, dest, "infinity", info.isDirectory);
      await Deno.remove(fsPath, { recursive: true });
    }
    log("INFO", "Resource trashed", { from: fsPath, to: dest });
  }

  const ctx: WebDavContext = {
    cfg,
    log,
    locks,
    props,
    resolvePath,
    trashResource,
    withWriteLock,
  };

  // ── Method dispatcher ─────────────────────────────────────────────────────

  async function dispatchMethod(
    method: string,
    req: Request,
    fsPath: string,
    pathname: string,
    bodyText: string,
  ): Promise<Response> {
    switch (method) {
      case "OPTIONS":
        return handleOptions();
      case "HEAD":
        return handleHead(req, fsPath);
      case "GET":
        return handleGet(req, fsPath, pathname);
      case "PUT":
        return handlePut(ctx, req, fsPath);
      case "DELETE":
        return handleDelete(ctx, req, fsPath);
      case "MKCOL":
        return handleMkcol(bodyText, fsPath);
      case "COPY":
        return handleCopy(ctx, req, fsPath);
      case "MOVE":
        return handleMove(ctx, req, fsPath);
      case "PROPFIND":
        return handlePropfind(ctx, req, bodyText, fsPath, pathname);
      case "PROPPATCH":
        return handleProppatch(ctx, req, bodyText, fsPath, pathname);
      case "LOCK":
        return handleLock(ctx, req, bodyText, fsPath, pathname);
      case "UNLOCK":
        return handleUnlock(ctx, req, fsPath);
      default:
        return httpErr(405, "Method Not Allowed", { Allow: ALLOWED_METHODS });
    }
  }

  // ── Main handler ──────────────────────────────────────────────────────────

  async function handler(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();

    if (checkAuth(req, method) !== "ok") {
      log("WARN", `Auth failed ${method} ${url.pathname}`);
      return new Response("Unauthorized", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="WebDAV", charset="UTF-8"',
          "Content-Type": "text/plain",
          ...corsHeaders(),
        },
      });
    }

    let fsPath: string;
    try {
      fsPath = resolvePath(url.pathname);
    } catch (e) {
      if (e instanceof HttpError) return httpErr(e.status, e.message);
      throw e;
    }

    log("DEBUG", `${method} ${url.pathname}`);

    const needsBody = ["PROPFIND", "PROPPATCH", "LOCK", "MKCOL"].includes(
      method,
    );
    const bodyText = needsBody ? await req.text().catch(() => "") : "";

    try {
      return await dispatchMethod(method, req, fsPath, url.pathname, bodyText);
    } catch (e) {
      if (e instanceof HttpError) return httpErr(e.status, e.message);
      log("ERROR", "Unhandled error", {
        path: url.pathname,
        err: String(e),
      });
      return httpErr(500, "Internal Server Error");
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  await ensureDir(cfg.rootDir);
  await ensureDir(cfg.trashDir);
  await ensureDir(cfg.stateDir);
  await locks.load();
  await props.load();

  log("INFO", "WebDAV handler ready", {
    rootDir: cfg.rootDir,
    auth: cfg.authUser ? "enabled" : "disabled",
  });

  return handler;
}
