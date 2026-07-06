/**
 * WebDAV filesystem primitives — stat, ETag, atomic write (buffered +
 * streamed), recursive copy, cross-device move, and recursive PROPFIND walk.
 * All pure: operate on absolute paths, no config or state.
 */

import { dirname, join } from "@std/path";
import { ensureDir } from "@std/fs";
import { HttpError } from "./http.ts";

export async function fsStat(path: string): Promise<Deno.FileInfo | null> {
  try {
    return await Deno.stat(path);
  } catch {
    return null;
  }
}

export async function fileEtag(info: Deno.FileInfo): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(`${info.size}-${info.mtime?.getTime() ?? 0}`),
  );
  const bytes = new Uint8Array(hash);
  const b64 = btoa(String.fromCharCode(...bytes));
  return `"${b64.slice(0, 16)}"`;
}

export async function atomicWrite(
  target: string,
  data: Uint8Array,
): Promise<void> {
  const tmp = `${target}.tmp.${Math.random().toString(36).slice(2)}`;
  await ensureDir(dirname(target));
  await Deno.writeFile(tmp, data);
  await Deno.rename(tmp, target);
}

export async function atomicWriteStream(
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
        throw new HttpError(
          413,
          `Payload too large (limit: ${maxBytes} bytes)`,
        );
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

export async function copyResource(
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

export async function atomicMove(
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

export async function streamPropfindDir(
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
