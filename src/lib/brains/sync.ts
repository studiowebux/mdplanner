/**
 * Brain sync engine — computes diffs and applies file sync between brains.
 */

import { join, relative, resolve } from "@std/path";
import { walk } from "@std/fs";
import { safePath } from "./files.ts";

export type DiffStatus =
  | "added"
  | "modified"
  | "identical"
  | "removed"
  | "skipped";

export interface DiffEntry {
  relPath: string;
  dir: string;
  status: DiffStatus;
  sourceMod?: string;
  targetMod?: string;
  newer: string;
}

const DEFAULT_SYNC_DIRS = [
  ".claude/rules",
  ".claude/hooks",
  ".claude/agents",
  "templates",
];

/**
 * Computes a diff between two brain directories.
 * Walks source and target dirs, classifying each file.
 * Files in selective rule subdirs not matching the target brain's manifest are marked skipped.
 */
export async function computeDiff(
  fromRoot: string,
  toRoot: string,
  dirs?: string[],
  targetManifest?: {
    stacks: string[];
    practices: string[];
    workflows: string[];
  },
): Promise<DiffEntry[]> {
  const syncDirs = dirs ?? DEFAULT_SYNC_DIRS;
  const entries: DiffEntry[] = [];
  const seen = new Set<string>();

  for (const dir of syncDirs) {
    const fromDir = join(fromRoot, dir);
    const toDir = join(toRoot, dir);

    // Walk source side
    try {
      for await (const entry of walk(fromDir, { includeDirs: false })) {
        const rel = relative(fromRoot, entry.path).replaceAll("\\", "/");
        seen.add(rel);

        let status: DiffStatus = "added";
        let sourceMod: string | undefined;
        let targetMod: string | undefined;
        let newer = "";

        const fromInfo = await Deno.stat(entry.path).catch(() => null);
        if (fromInfo?.mtime) {
          sourceMod = fromInfo.mtime.toISOString();
        }

        const toPath = join(toRoot, rel);
        try {
          const toData = await Deno.readFile(toPath);
          const fromData = await Deno.readFile(entry.path);
          status = arraysEqual(fromData, toData) ? "identical" : "modified";

          const toInfo = await Deno.stat(toPath).catch(() => null);
          if (toInfo?.mtime) {
            targetMod = toInfo.mtime.toISOString();
            if (fromInfo?.mtime) {
              if (fromInfo.mtime > toInfo.mtime) newer = "source";
              else if (toInfo.mtime > fromInfo.mtime) newer = "target";
            }
          }
        } catch {
          // File doesn't exist in target — status stays "added"
        }

        entries.push({
          relPath: rel,
          dir,
          status,
          sourceMod,
          targetMod,
          newer,
        });
      }
    } catch {
      // Source dir doesn't exist — skip
    }

    // Walk target side to find removed files
    try {
      for await (const entry of walk(toDir, { includeDirs: false })) {
        const rel = relative(toRoot, entry.path).replaceAll("\\", "/");
        if (seen.has(rel)) continue;

        const fromPath = join(fromRoot, rel);
        try {
          await Deno.stat(fromPath);
        } catch {
          entries.push({
            relPath: rel,
            dir,
            status: "removed",
            newer: "",
          });
        }
      }
    } catch {
      // Target dir doesn't exist — skip
    }
  }

  // Mark files not in target brain's manifest as skipped
  if (targetManifest) {
    const filters: Array<{ prefix: string; items: string[] }> = [
      { prefix: ".claude/rules/stack/", items: targetManifest.stacks },
      { prefix: ".claude/rules/practices/", items: targetManifest.practices },
      { prefix: ".claude/rules/workflow/", items: targetManifest.workflows },
    ];

    for (const f of filters) {
      if (f.items.length === 0) continue;
      const allowed = new Set(f.items);
      for (const entry of entries) {
        if (entry.relPath.startsWith(f.prefix)) {
          const base = entry.relPath.split("/").pop() ?? "";
          const name = base.endsWith(".md") ? base.slice(0, -3) : base;
          if (!allowed.has(name)) {
            entry.status = "skipped";
          }
        }
      }
    }
  }

  return entries;
}

/**
 * Copies selected files from one brain to another.
 * Returns counts of applied and failed files.
 */
export async function applySync(
  fromRoot: string,
  toRoot: string,
  files: string[],
): Promise<{ applied: string[]; failed: string[] }> {
  const applied: string[] = [];
  const failed: string[] = [];

  for (const rel of files) {
    try {
      const src = safePath(fromRoot, rel);
      const dst = safePath(toRoot, rel);

      // Create parent directories
      const parentDir = resolve(dst, "..");
      await Deno.mkdir(parentDir, { recursive: true });

      // Copy file
      await Deno.copyFile(src, dst);
      applied.push(rel);
    } catch (e) {
      failed.push(`${rel}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { applied, failed };
}

/** Byte-level array equality check. */
function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
