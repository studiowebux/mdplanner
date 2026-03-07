/**
 * Brain file browser — safe directory listing and file reading.
 */

import { join, resolve } from "@std/path";

/** Directories never shown in the file tree. */
const SKIP_DIRS = new Set([".git", "node_modules", ".DS_Store"]);

export interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
}

/**
 * Resolves `rel` against `root` and verifies no path traversal.
 * Throws if the resolved path escapes the root.
 */
export function safePath(root: string, rel: string): string {
  const abs = resolve(root, rel);
  if (abs !== root && !abs.startsWith(root + "/")) {
    throw new Error("path outside brain root");
  }
  return abs;
}

/**
 * Lists files in a brain directory (single level, lazy loading).
 * Directories first, then files, both sorted alphabetically.
 */
export async function listFiles(
  brainRoot: string,
  rel: string,
): Promise<FileEntry[]> {
  const target = safePath(brainRoot, rel);
  const entries: FileEntry[] = [];

  for await (const entry of Deno.readDir(target)) {
    if (SKIP_DIRS.has(entry.name)) continue;

    const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
    const fe: FileEntry = {
      name: entry.name,
      path: entryRel,
      isDir: entry.isDirectory,
    };

    if (!entry.isDirectory) {
      try {
        const info = await Deno.stat(join(target, entry.name));
        fe.size = info.size;
      } catch {
        // stat failed — omit size
      }
    }

    entries.push(fe);
  }

  entries.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return entries;
}

/**
 * Reads file content as text.
 * Path is validated through safePath before reading.
 */
export async function readFile(
  brainRoot: string,
  rel: string,
): Promise<string> {
  if (!rel) throw new Error("path is required");
  const target = safePath(brainRoot, rel);
  return await Deno.readTextFile(target);
}

export interface DirItem {
  name: string;
  path: string;
}

/**
 * Lists immediate non-hidden subdirectories of an absolute path.
 * Used for path picker autocomplete in setup forms.
 */
export async function listDirs(parent: string): Promise<DirItem[]> {
  let resolved = parent;
  if (resolved.startsWith("~/")) {
    const home = Deno.env.get("HOME");
    if (home) resolved = join(home, resolved.slice(2));
  }

  const dirs: DirItem[] = [];
  for await (const entry of Deno.readDir(resolved)) {
    if (!entry.isDirectory || entry.name.startsWith(".")) continue;
    dirs.push({ name: entry.name, path: join(resolved, entry.name) });
  }
  return dirs;
}
