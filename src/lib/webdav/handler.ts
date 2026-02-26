/**
 * WebDAV Handler — Factory Pattern
 *
 * Adapts the standalone WebDAV server from the webdav POC into a reusable
 * request handler that can be mounted on a Hono router at any path prefix.
 *
 * Usage:
 *   const handler = await createWebDavHandler({ rootDir: "/path/to/project" });
 *   app.all("/webdav/*", (c) => handler(c.req.raw, c.req.path.replace(/^\/webdav/, "") || "/"));
 *
 * WebDAV compliance: RFC 4918 Class 1, 2, 3
 * Methods: OPTIONS HEAD GET PUT DELETE MKCOL COPY MOVE PROPFIND PROPPATCH LOCK UNLOCK
 */

import { basename, dirname, join, normalize, relative, resolve } from "@std/path";
import { ensureDir } from "@std/fs";

// ============================================================================
// Config
// ============================================================================

export interface WebDavConfig {
  rootDir: string;
  authUser?: string | null;
  authPass?: string | null;
  logFormat?: "json" | "pretty";
  lockTimeout?: number;       // seconds, default 3600
  maxUploadBytes?: number;    // 0 = unlimited
  maxDepth?: number;          // default 20
  trashDir?: string;          // default rootDir/.trash
  stateDir?: string;          // default rootDir/.state
}

// ============================================================================
// Pure utilities (no config, no state)
// ============================================================================

class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods":
      "OPTIONS, HEAD, GET, PUT, DELETE, MKCOL, COPY, MOVE, PROPFIND, PROPPATCH, LOCK, UNLOCK",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Depth, Destination, If, Lock-Token, Overwrite, Timeout",
    "Access-Control-Expose-Headers": "DAV, Lock-Token, ETag, Content-Range",
  };
}

function httpErr(
  status: number,
  msg: string,
  extra?: Record<string, string>,
): Response {
  return new Response(msg, {
    status,
    headers: { "Content-Type": "text/plain", ...corsHeaders(), ...extra },
  });
}

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

function guessMime(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

function xe(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xmlDate(d: Date | null | undefined): string {
  return (d ?? new Date()).toUTCString();
}
function iso8601(d: Date | null | undefined): string {
  return (d ?? new Date()).toISOString();
}

function xmlTagValue(xml: string, tag: string): string | undefined {
  return xml.match(
    new RegExp(`<[^/]*?:?${tag}[^>]*>(.*?)<\\/[^>]*?:?${tag}>`, "s"),
  )?.[1];
}

interface PropPatchOp {
  type: "set" | "remove";
  ns: string;
  local: string;
  value: string;
}

function parsePropPatch(body: string): PropPatchOp[] {
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
  for (const r of body.matchAll(/<(?:\w+:)?remove>(.*?)<\/(?:\w+:)?remove>/gs)) {
    for (const p of r[1].matchAll(/<(\w+):(\w+)/g)) {
      ops.push({ type: "remove", ns: ns[p[1]] ?? p[1], local: p[2], value: "" });
    }
  }
  return ops;
}

function safeEqual(a: string, b: string): boolean {
  const ae = new TextEncoder().encode(a);
  const be = new TextEncoder().encode(b);
  let diff = ae.length ^ be.length;
  const len = Math.max(ae.length, be.length);
  for (let i = 0; i < len; i++) diff |= (ae[i] ?? 0) ^ (be[i] ?? 0);
  return diff === 0;
}

async function fsStat(path: string): Promise<Deno.FileInfo | null> {
  try {
    return await Deno.stat(path);
  } catch {
    return null;
  }
}

async function fileEtag(info: Deno.FileInfo): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(`${info.size}-${info.mtime?.getTime() ?? 0}`),
  );
  const bytes = new Uint8Array(hash);
  const b64 = btoa(String.fromCharCode(...bytes));
  return `"${b64.slice(0, 16)}"`;
}

async function atomicWrite(target: string, data: Uint8Array): Promise<void> {
  const tmp = `${target}.tmp.${Math.random().toString(36).slice(2)}`;
  await ensureDir(dirname(target));
  await Deno.writeFile(tmp, data);
  await Deno.rename(tmp, target);
}

async function atomicWriteStream(
  target: string,
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<number> {
  const tmp = `${target}.tmp.${Math.random().toString(36).slice(2)}`;
  await ensureDir(dirname(target));
  const file = await Deno.open(tmp, {
    write: true,
    create: true,
    truncate: true,
  });
  let written = 0;
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      written += value.byteLength;
      if (maxBytes > 0 && written > maxBytes) {
        reader.releaseLock();
        file.close();
        await Deno.remove(tmp).catch(() => {});
        throw new HttpError(413, `Payload too large (limit: ${maxBytes} bytes)`);
      }
      await file.write(value);
    }
    reader.releaseLock();
    file.close();
    await Deno.rename(tmp, target);
    return written;
  } catch (e) {
    try {
      reader.releaseLock();
    } catch { /* already released */ }
    try {
      file.close();
    } catch { /* already closed */ }
    await Deno.remove(tmp).catch(() => {});
    throw e;
  }
}

async function copyResource(
  src: string,
  dest: string,
  depth: string,
  isDir: boolean,
): Promise<void> {
  if (isDir) {
    await ensureDir(dest);
    if (depth === "0") return;
    for await (const e of Deno.readDir(src)) {
      await copyResource(
        join(src, e.name),
        join(dest, e.name),
        depth,
        e.isDirectory,
      );
    }
  } else {
    await ensureDir(dirname(dest));
    await Deno.copyFile(src, dest);
  }
}

async function atomicMove(
  src: string,
  dest: string,
  srcIsDir: boolean,
): Promise<void> {
  try {
    await Deno.rename(src, dest);
    return;
  } catch { /* cross-device */ }
  const tmp = `${dest}.mvtmp.${Math.random().toString(36).slice(2)}`;
  try {
    await copyResource(src, tmp, "infinity", srcIsDir);
    await Deno.rename(tmp, dest);
    await Deno.remove(src, { recursive: true });
  } catch (e) {
    await Deno.remove(tmp, { recursive: true }).catch(() => {});
    throw e;
  }
}

async function streamPropfindDir(
  dirPath: string,
  dirHref: string,
  depth: string,
  emit: (path: string, href: string) => Promise<void>,
): Promise<void> {
  for await (const e of Deno.readDir(dirPath)) {
    const childPath = join(dirPath, e.name);
    const childHref = (dirHref.endsWith("/") ? dirHref : dirHref + "/") +
      e.name;
    await emit(childPath, childHref);
    if (e.isDirectory && depth !== "1") {
      await streamPropfindDir(childPath, childHref + "/", depth, emit);
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

export async function createWebDavHandler(
  opts: WebDavConfig,
): Promise<(req: Request) => Promise<Response>> {
  const cfg = {
    rootDir: resolve(opts.rootDir),
    authUser: opts.authUser ?? null,
    authPass: opts.authPass ?? null,
    logFormat: opts.logFormat ?? "pretty" as const,
    lockTimeout: opts.lockTimeout ?? 3600,
    maxUploadBytes: opts.maxUploadBytes ?? 0,
    maxDepth: opts.maxDepth ?? 20,
    trashDir: resolve(opts.trashDir ?? join(opts.rootDir, ".trash")),
    stateDir: resolve(opts.stateDir ?? join(opts.rootDir, ".state")),
  };

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

  // ── Logger ────────────────────────────────────────────────────────────────

  type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

  function log(level: LogLevel, msg: string, extra?: Record<string, unknown>): void {
    const ts = new Date().toISOString();
    if (cfg.logFormat === "json") {
      console.log(JSON.stringify({ ts, level, msg, ...extra }));
    } else {
      const colors: Record<LogLevel, string> = {
        INFO: "\x1b[32m",
        WARN: "\x1b[33m",
        ERROR: "\x1b[31m",
        DEBUG: "\x1b[36m",
      };
      const extras = extra ? " " + JSON.stringify(extra) : "";
      console.log(
        `[WebDAV] ${colors[level]}[${level}]\x1b[0m ${ts} ${msg}${extras}`,
      );
    }
  }

  // ── Lock store ────────────────────────────────────────────────────────────

  interface Lock {
    token: string;
    path: string;
    depth: string;
    scope: "exclusive" | "shared";
    owner: string;
    timeout: number;
    created: number;
  }

  const locks = new Map<string, Lock>();
  const pathLocks = new Map<string, Set<string>>();

  const locksFile = join(cfg.stateDir, "locks.json");
  const propsFile = join(cfg.stateDir, "props.json");

  async function persistLocks(): Promise<void> {
    try {
      await atomicWrite(
        locksFile,
        new TextEncoder().encode(
          JSON.stringify([...locks.values()], null, 2),
        ),
      );
    } catch (e) {
      log("WARN", "Failed to persist locks", { err: String(e) });
    }
  }

  async function loadLocks(): Promise<void> {
    try {
      const items: Lock[] = JSON.parse(
        await Deno.readTextFile(locksFile),
      );
      const now = Date.now();
      for (const l of items) {
        if (l.timeout > now) {
          locks.set(l.token, l);
          if (!pathLocks.has(l.path)) pathLocks.set(l.path, new Set());
          pathLocks.get(l.path)!.add(l.token);
        }
      }
      log("INFO", `Restored ${locks.size} active lock(s)`);
    } catch { /* first run */ }
  }

  function addLock(lock: Lock): void {
    locks.set(lock.token, lock);
    if (!pathLocks.has(lock.path)) pathLocks.set(lock.path, new Set());
    pathLocks.get(lock.path)!.add(lock.token);
    persistLocks();
  }

  function removeLock(token: string): void {
    const lock = locks.get(token);
    if (!lock) return;
    locks.delete(token);
    pathLocks.get(lock.path)?.delete(token);
    persistLocks();
  }

  function getActiveLocks(path: string): Lock[] {
    const tokens = pathLocks.get(path);
    if (!tokens) return [];
    const now = Date.now();
    const active: Lock[] = [];
    let pruned = false;
    for (const t of [...tokens]) {
      const l = locks.get(t);
      if (!l) continue;
      if (l.timeout < now) {
        locks.delete(t);
        tokens.delete(t);
        pruned = true;
      } else {
        active.push(l);
      }
    }
    if (pruned) persistLocks();
    return active;
  }

  function checkLockConflict(
    fsPath: string,
    method: string,
    ifHeader: string | null,
  ): string | null {
    const active = getActiveLocks(fsPath);
    if (active.length === 0) return null;
    const readOnly = ["GET", "HEAD", "OPTIONS", "PROPFIND"].includes(method);
    if (readOnly) return null;
    const provided = new Set<string>();
    if (ifHeader) {
      for (const m of ifHeader.matchAll(/<(urn:uuid:[^>]+)>/g)) {
        provided.add(m[1]);
      }
    }
    for (const lock of active) {
      if (!provided.has(lock.token)) return lock.token;
    }
    return null;
  }

  // ── Dead properties ───────────────────────────────────────────────────────

  const deadProps = new Map<string, Map<string, string>>();

  async function persistProps(): Promise<void> {
    try {
      const obj: Record<string, Record<string, string>> = {};
      for (const [p, m] of deadProps) obj[p] = Object.fromEntries(m);
      await atomicWrite(
        propsFile,
        new TextEncoder().encode(JSON.stringify(obj, null, 2)),
      );
    } catch (e) {
      log("WARN", "Failed to persist props", { err: String(e) });
    }
  }

  async function loadProps(): Promise<void> {
    try {
      const obj: Record<string, Record<string, string>> = JSON.parse(
        await Deno.readTextFile(propsFile),
      );
      for (const [p, m] of Object.entries(obj)) {
        deadProps.set(p, new Map(Object.entries(m)));
      }
      log(
        "INFO",
        `Restored dead properties for ${deadProps.size} resource(s)`,
      );
    } catch { /* first run */ }
  }

  function setDeadProp(
    path: string,
    ns: string,
    local: string,
    xml: string,
  ): void {
    if (!deadProps.has(path)) deadProps.set(path, new Map());
    deadProps.get(path)!.set(`${ns}:${local}`, xml);
    persistProps();
  }

  function removeDeadProp(path: string, ns: string, local: string): void {
    deadProps.get(path)?.delete(`${ns}:${local}`);
    persistProps();
  }

  function getDeadProps(path: string): Map<string, string> {
    return deadProps.get(path) ?? new Map();
  }

  function cleanDeadPropsUnder(fsPath: string): void {
    for (const key of [...deadProps.keys()]) {
      if (key === fsPath || key.startsWith(fsPath + "/")) {
        deadProps.delete(key);
      }
    }
    persistProps();
  }

  function moveDeadProps(srcPath: string, destPath: string): void {
    for (const [key, val] of [...deadProps.entries()]) {
      if (key === srcPath) {
        deadProps.set(destPath, val);
        deadProps.delete(key);
      } else if (key.startsWith(srcPath + "/")) {
        deadProps.set(destPath + key.slice(srcPath.length), val);
        deadProps.delete(key);
      }
    }
    persistProps();
  }

  // ── Path resolution ───────────────────────────────────────────────────────

  function resolvePath(requestPath: string): string {
    const decoded = decodeURIComponent(requestPath);
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

  function checkAuth(
    req: Request,
    method: string,
  ): "ok" | "unauthorized" {
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

  // ── PROPFIND response builder ─────────────────────────────────────────────

  async function buildPropResponse(
    fsPath: string,
    href: string,
    info: Deno.FileInfo,
    requestedProps: string[] | null,
  ): Promise<string> {
    const isDir = info.isDirectory;
    const disp = isDir && !href.endsWith("/") ? href + "/" : href;
    const tag = await fileEtag(info);
    const dp = getDeadProps(fsPath);
    const all = requestedProps === null;
    const want = (n: string) => all || requestedProps!.includes(n);

    const p200: string[] = [];
    const p404: string[] = [];

    if (want("resourcetype")) {
      p200.push(
        `<D:resourcetype>${isDir ? "<D:collection/>" : ""}</D:resourcetype>`,
      );
    }
    if (want("displayname")) {
      p200.push(`<D:displayname>${xe(basename(fsPath))}</D:displayname>`);
    }
    if (want("getcontentlength") && !isDir) {
      p200.push(
        `<D:getcontentlength>${info.size}</D:getcontentlength>`,
      );
    }
    if (want("getcontenttype")) {
      p200.push(
        `<D:getcontenttype>${
          isDir ? "httpd/unix-directory" : guessMime(fsPath)
        }</D:getcontenttype>`,
      );
    }
    if (want("getlastmodified")) {
      p200.push(
        `<D:getlastmodified>${xmlDate(info.mtime)}</D:getlastmodified>`,
      );
    }
    if (want("creationdate")) {
      p200.push(
        `<D:creationdate>${
          iso8601(info.birthtime ?? info.mtime)
        }</D:creationdate>`,
      );
    }
    if (want("getetag")) p200.push(`<D:getetag>${tag}</D:getetag>`);
    if (want("supportedlock")) {
      p200.push(`<D:supportedlock>
      <D:lockentry><D:lockscope><D:exclusive/></D:lockscope><D:locktype><D:write/></D:locktype></D:lockentry>
      <D:lockentry><D:lockscope><D:shared/></D:lockscope><D:locktype><D:write/></D:locktype></D:lockentry>
    </D:supportedlock>`);
    }
    if (want("lockdiscovery")) {
      const al = getActiveLocks(fsPath);
      p200.push(
        `<D:lockdiscovery>${
          al.map((l) => `
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
      );
    }

    for (const [key, val] of dp) {
      const ci = key.indexOf(":");
      const dpNs = key.slice(0, ci);
      const local = key.slice(ci + 1);
      if (all || requestedProps!.includes(local)) {
        p200.push(`<Z:${local} xmlns:Z="${xe(dpNs)}">${val}</Z:${local}>`);
      }
    }

    if (requestedProps) {
      const known = new Set([
        "resourcetype",
        "displayname",
        "getcontentlength",
        "getcontenttype",
        "getlastmodified",
        "creationdate",
        "getetag",
        "supportedlock",
        "lockdiscovery",
      ]);
      for (const p of requestedProps) {
        if (
          !known.has(p) &&
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
        ? `<D:propstat><D:prop>${p200.join("")}</D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat>`
        : ""
    }
  ${
      p404.length
        ? `<D:propstat><D:prop>${p404.join("")}</D:prop><D:status>HTTP/1.1 404 Not Found</D:status></D:propstat>`
        : ""
    }
</D:response>`;
  }

  // ── Method handlers ───────────────────────────────────────────────────────

  const ALLOWED_METHODS =
    "OPTIONS, HEAD, GET, PUT, DELETE, MKCOL, COPY, MOVE, PROPFIND, PROPPATCH, LOCK, UNLOCK";

  function handleOptions(): Response {
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

  async function handleHead(
    req: Request,
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

  async function handleGet(
    req: Request,
    fsPath: string,
    reqPath: string,
  ): Promise<Response> {
    const info = await fsStat(fsPath);
    if (!info) return httpErr(404, "Not Found");

    if (info.isDirectory) {
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
<tr><th>Name</th></tr>
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

    const tag = await fileEtag(info);
    const ifMatch = req.headers.get("If-Match");
    if (ifMatch && ifMatch !== "*" && ifMatch !== tag) {
      return httpErr(412, "Precondition Failed");
    }
    const ifNoneMatch = req.headers.get("If-None-Match");
    if (ifNoneMatch && (ifNoneMatch === "*" || ifNoneMatch === tag)) {
      return new Response(null, {
        status: 304,
        headers: { ETag: tag, ...corsHeaders() },
      });
    }
    const ifModifiedSince = req.headers.get("If-Modified-Since");
    if (
      ifModifiedSince && info.mtime &&
      new Date(ifModifiedSince) >= info.mtime
    ) {
      return new Response(null, {
        status: 304,
        headers: { ETag: tag, ...corsHeaders() },
      });
    }
    const ifUnmodifiedSince = req.headers.get("If-Unmodified-Since");
    if (
      ifUnmodifiedSince && info.mtime &&
      new Date(ifUnmodifiedSince) < info.mtime
    ) {
      return httpErr(412, "Precondition Failed");
    }

    const rangeHeader = req.headers.get("Range");
    if (rangeHeader) {
      const m = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
      if (m) {
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
            headers: {
              "Content-Range": `bytes */${info.size}`,
              ...corsHeaders(),
            },
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
    }

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

  async function handlePut(
    req: Request,
    fsPath: string,
  ): Promise<Response> {
    const conflict = checkLockConflict(
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
    return withWriteLock(fsPath, async () => {
      if (!req.body) {
        await atomicWrite(fsPath, new Uint8Array(0));
      } else {
        await atomicWriteStream(fsPath, req.body, cfg.maxUploadBytes);
      }
      return new Response(null, {
        status: isNew ? 201 : 204,
        headers: corsHeaders(),
      });
    });
  }

  async function handleDelete(
    req: Request,
    fsPath: string,
  ): Promise<Response> {
    const conflict = checkLockConflict(
      fsPath,
      "DELETE",
      req.headers.get("If"),
    );
    if (conflict) return httpErr(423, "Locked", { "Lock-Token": conflict });
    const info = await fsStat(fsPath);
    if (!info) return httpErr(404, "Not Found");
    await trashResource(fsPath);
    cleanDeadPropsUnder(fsPath);
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  async function handleMkcol(
    bodyText: string,
    fsPath: string,
  ): Promise<Response> {
    if (bodyText.trim().length > 0) {
      return httpErr(415, "Unsupported Media Type: MKCOL body not supported");
    }
    const existing = await fsStat(fsPath);
    if (existing) return httpErr(405, "Method Not Allowed: resource already exists");
    const parent = await fsStat(dirname(fsPath));
    if (!parent?.isDirectory) {
      return httpErr(409, "Conflict: parent collection does not exist");
    }
    await Deno.mkdir(fsPath);
    return new Response(null, { status: 201, headers: corsHeaders() });
  }

  async function handleCopy(
    req: Request,
    fsPath: string,
  ): Promise<Response> {
    const destHeader = req.headers.get("Destination");
    if (!destHeader) {
      return httpErr(400, "Bad Request: missing Destination header");
    }
    let destFsPath: string;
    try {
      destFsPath = resolvePath(new URL(destHeader, req.url).pathname);
    } catch (e) {
      return e instanceof HttpError
        ? httpErr(e.status, e.message)
        : httpErr(400, "Bad Destination");
    }
    const overwrite =
      (req.headers.get("Overwrite") ?? "T").toUpperCase() !== "F";
    const srcInfo = await fsStat(fsPath);
    if (!srcInfo) return httpErr(404, "Not Found");
    const destInfo = await fsStat(destFsPath);
    if (destInfo && !overwrite) return httpErr(412, "Precondition Failed");
    if (destInfo) await trashResource(destFsPath);
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

  async function handleMove(
    req: Request,
    fsPath: string,
  ): Promise<Response> {
    const conflict = checkLockConflict(
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
      destFsPath = resolvePath(new URL(destHeader, req.url).pathname);
    } catch (e) {
      return e instanceof HttpError
        ? httpErr(e.status, e.message)
        : httpErr(400, "Bad Destination");
    }
    if (destFsPath === fsPath) {
      return httpErr(403, "Forbidden: source equals destination");
    }
    const overwrite =
      (req.headers.get("Overwrite") ?? "T").toUpperCase() !== "F";
    const srcInfo = await fsStat(fsPath);
    if (!srcInfo) return httpErr(404, "Not Found");
    const destInfo = await fsStat(destFsPath);
    if (destInfo && !overwrite) return httpErr(412, "Precondition Failed");
    if (destInfo) await trashResource(destFsPath);
    await ensureDir(dirname(destFsPath));
    await atomicMove(fsPath, destFsPath, srcInfo.isDirectory);
    moveDeadProps(fsPath, destFsPath);
    return new Response(null, {
      status: destInfo ? 204 : 201,
      headers: corsHeaders(),
    });
  }

  async function handlePropfind(
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
              (await buildPropResponse(path, href, i, requestedProps)) + "\n",
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

  async function handleProppatch(
    req: Request,
    bodyText: string,
    fsPath: string,
    reqPath: string,
  ): Promise<Response> {
    const conflict = checkLockConflict(
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
      if (op.type === "set") setDeadProp(fsPath, op.ns, op.local, op.value);
      else removeDeadProp(fsPath, op.ns, op.local);
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

  async function handleLock(
    req: Request,
    bodyText: string,
    fsPath: string,
    reqPath: string,
  ): Promise<Response> {
    const depth = req.headers.get("Depth") ?? "infinity";
    const rawTimeout = req.headers.get("Timeout") ??
      `Second-${cfg.lockTimeout}`;
    const timeoutSec = Math.min(
      parseInt(rawTimeout.replace(/^Second-/i, "")) || cfg.lockTimeout,
      cfg.lockTimeout,
    );

    const refreshToken = req.headers
      .get("If")
      ?.match(/<(urn:uuid:[^>]+)>/)?.[1];
    if (!bodyText.trim() && refreshToken) {
      const existing = locks.get(refreshToken);
      if (!existing) {
        return httpErr(412, "Precondition Failed: lock token not found");
      }
      existing.timeout = Date.now() + timeoutSec * 1000;
      locks.set(refreshToken, existing);
      persistLocks();
      return lockXmlResponse(existing, reqPath);
    }

    const info = await fsStat(fsPath);
    if (!info) {
      await withWriteLock(fsPath, () =>
        atomicWrite(fsPath, new Uint8Array(0)));
    }

    const scope: "exclusive" | "shared" = bodyText.includes("exclusive")
      ? "exclusive"
      : "shared";
    const owner = xmlTagValue(bodyText, "owner") ?? "";

    const active = getActiveLocks(fsPath);
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
    addLock(lock);
    log("INFO", "Lock acquired", {
      token: lock.token,
      path: reqPath,
      scope,
      depth,
    });
    return lockXmlResponse(lock, reqPath, true);
  }

  async function handleUnlock(
    req: Request,
    fsPath: string,
  ): Promise<Response> {
    const tokenHeader = req.headers.get("Lock-Token");
    if (!tokenHeader) {
      return httpErr(400, "Bad Request: missing Lock-Token header");
    }
    const token = tokenHeader.replace(/[<>]/g, "").trim();
    const lock = locks.get(token);
    if (!lock) return httpErr(409, "Conflict: unknown lock token");
    if (lock.path !== fsPath) {
      return httpErr(409, "Conflict: token does not match resource");
    }
    removeLock(token);
    log("INFO", "Lock released", { token });
    return new Response(null, { status: 204, headers: corsHeaders() });
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
      switch (method) {
        case "OPTIONS":
          return handleOptions();
        case "HEAD":
          return handleHead(req, fsPath);
        case "GET":
          return handleGet(req, fsPath, url.pathname);
        case "PUT":
          return handlePut(req, fsPath);
        case "DELETE":
          return handleDelete(req, fsPath);
        case "MKCOL":
          return handleMkcol(bodyText, fsPath);
        case "COPY":
          return handleCopy(req, fsPath);
        case "MOVE":
          return handleMove(req, fsPath);
        case "PROPFIND":
          return handlePropfind(req, bodyText, fsPath, url.pathname);
        case "PROPPATCH":
          return handleProppatch(req, bodyText, fsPath, url.pathname);
        case "LOCK":
          return handleLock(req, bodyText, fsPath, url.pathname);
        case "UNLOCK":
          return handleUnlock(req, fsPath);
        default:
          return httpErr(405, "Method Not Allowed", {
            Allow: ALLOWED_METHODS,
          });
      }
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
  await loadLocks();
  await loadProps();

  log("INFO", "WebDAV handler ready", {
    rootDir: cfg.rootDir,
    auth: cfg.authUser ? "enabled" : "disabled",
  });

  return handler;
}
