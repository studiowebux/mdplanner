/**
 * WebDAV PROPFIND helpers — live-property table, prop response builder,
 * and the handlePropfind method handler. Extracted from methods.ts to keep
 * that file under 400 LOC.
 */

import { basename } from "@std/path";
import { fileEtag, fsStat, streamPropfindDir } from "./fs-ops.ts";
import { guessMime, iso8601, xe, xmlDate } from "./xml.ts";
import { corsHeaders, httpErr } from "./http.ts";
import type { WebDavContext } from "./methods.ts";

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

export async function buildPropResponse(
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
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
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
