#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * scripts/migrate-v1-to-v2.ts
 *
 * One-time migration: normalize v1 example/project data files for v2 compatibility.
 * Idempotent — safe to run multiple times.
 *
 * Automatically discovers all directories that contain .md files under projectDir.
 * For each discovered directory, per .md file:
 *   1. Ensure `id` frontmatter field exists (derives from filename when missing)
 *   2. Convert camelCase frontmatter keys → snake_case (recursive: nested objects + arrays)
 *   3. Add `created_at` / `updated_at` if missing (falls back to file mtime)
 *   4. Remove duplicate files (same `id`, different filenames)
 *   5. Rename file to `{id}.md` when filename ≠ id
 *
 * Usage:
 *   deno run --allow-read --allow-write scripts/migrate-v1-to-v2.ts [--dry-run] [projectDir]
 *   projectDir defaults to: ./example
 *
 * To skip extra directories, add them to SKIP_DIR_PREFIXES below.
 */

import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../v2/utils/frontmatter.ts";
import { camelToSnake } from "../v2/utils/frontmatter-mapper.ts";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Known directory → id prefix mappings.
 * Directories not listed here get a prefix inferred from their name.
 * Keys are relative paths from projectDir (e.g. "billing/customers").
 */
const PREFIX_MAP: ReadonlyMap<string, string> = new Map([
  ["goals", "goal"],
  ["ideas", "idea"],
  ["milestones", "milestone"],
  ["people", "person"],
  ["notes", "note"],
  ["billing/customers", "customer"],
  ["billing/invoices", "invoice"],
  ["billing/quotes", "quote"],
  ["billing/rates", "rate"],
  ["crm/companies", "company"],
  ["crm/contacts", "contact"],
  ["crm/deals", "deal"],
  ["crm/interactions", "interaction"],
  ["marketing-plans", "mktplan"],
  ["swot", "swot"],
  ["dns", "dns"],
  ["finances", "finance"],
  ["c4", "c4"],
  ["canvas", "sticky"],
  ["habits", "habit"],
  ["journal", "journal"],
  ["kpis", "kpi"],
  ["brief", "brief"],
  ["businessmodel", "bizmodel"],
  ["capacity", "capacity"],
  ["eisenhower", "eisenhower"],
  ["fishbone", "fishbone"],
  ["investors", "investor"],
  ["leancanvas", "leancanvas"],
  ["meetings", "meeting"],
  ["mindmaps", "mindmap"],
  ["moscow", "moscow"],
  ["onboarding", "onboarding"],
  ["onboarding-templates", "onboarding_tmpl"],
  ["portfolio", "portfolio"],
  ["projectvalue", "pjvalue"],
  ["reflection-templates", "reflection_tmpl"],
  ["reflections", "reflection"],
  ["retrospectives", "retro"],
  ["risk", "risk"],
  ["safe", "safe"],
  ["strategiclevels", "strategic"],
  ["timetracking", "timeentry"],
  ["brainstorms", "brainstorm"],
  ["briefs", "brief"],
  ["c4_components", "c4"],
  ["capacity_plans", "capacity"],
  ["companies", "company"],
  ["contacts", "contact"],
  ["customers", "customer"],
  ["deals", "deal"],
  ["invoices", "invoice"],
  ["quotes", "quote"],
  ["lean-canvas", "leancanvas"],
  ["lean_canvas", "leancanvas"],
  ["marketing_plans", "mktplan"],
  ["onboarding_templates", "onboarding_tmpl"],
  ["project_value", "pjvalue"],
  ["risks", "risk"],
  ["sticky_notes", "sticky"],
  ["strategic_levels", "strategic"],
  ["time_entries", "timeentry"],
]);

/**
 * Directory path prefixes to skip entirely (relative to projectDir).
 * "board" skips board/ and all subdirectories (board/todo, board/backlog, etc.)
 * because the task repository uses a subdirectory-per-section structure with
 * its own id scheme.
 */
const SKIP_DIR_PREFIXES: ReadonlyArray<string> = [
  "uploads", // binary/media assets
  "portfolio/orgchart", // intentional cross-reference of people records
];

/**
 * Directories where the filename IS the id (repo ignores frontmatter `id`).
 * For these dirs: normalize keys + add timestamps, but do NOT generate ids
 * or rename files — renaming would change the repo-level identity.
 */
const FILENAME_IS_ID_DIRS: ReadonlySet<string> = new Set([
  "portfolio",
]);

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

interface MigrationStats {
  filesScanned: number;
  filesModified: number;
  idsAdded: number;
  keysNormalized: number;
  timestampsAdded: number;
  filesRenamed: number;
  duplicatesRemoved: number;
  renameSkipped: number;
}

function emptyStats(): MigrationStats {
  return {
    filesScanned: 0,
    filesModified: 0,
    idsAdded: 0,
    keysNormalized: 0,
    timestampsAdded: 0,
    filesRenamed: 0,
    duplicatesRemoved: 0,
    renameSkipped: 0,
  };
}

// ---------------------------------------------------------------------------
// Key normalization — recursive camelCase → snake_case
// ---------------------------------------------------------------------------

function normalizeValue(v: unknown): unknown {
  if (Array.isArray(v)) {
    return v.map((item) =>
      typeof item === "object" && item !== null && !Array.isArray(item)
        ? normalizeKeys(item as Record<string, unknown>)
        : item
    );
  }
  if (typeof v === "object" && v !== null) {
    return normalizeKeys(v as Record<string, unknown>);
  }
  return v;
}

function normalizeKeys(fm: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fm)) {
    result[camelToSnake(key)] = normalizeValue(value);
  }
  return result;
}

// ---------------------------------------------------------------------------
// ID derivation — deterministic slug from filename
// ---------------------------------------------------------------------------

/**
 * Derive a stable, v2-compatible id from a filename when the file has none.
 * Converts kebab-case to snake_case, strips non-alphanumeric characters.
 * If the slug already starts with the correct prefix, the slug is used as-is
 * to avoid double-prefixing.
 * E.g. "product-strategy.md" + prefix "goal" → "goal_product_strategy"
 *      "goal_organic_signups.md" + prefix "goal" → "goal_organic_signups"
 */
function deriveId(filename: string, prefix: string): string {
  const slug = filename
    .replace(/\.md$/, "")
    .replace(/-/g, "_")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
  if (slug.startsWith(`${prefix}_`)) return slug;
  return `${prefix}_${slug}`;
}

/**
 * Infer id prefix from a directory's relative path when not in PREFIX_MAP.
 * Uses the last path segment. Strips a trailing 's' for basic singularization
 * (goals→goal, ideas→idea, contacts→contact) — imperfect but good enough for
 * the minority of files that are actually missing an id.
 */
function inferPrefix(relDir: string): string {
  const segment = (relDir.split("/").pop() ?? relDir)
    .replace(/-/g, "_")
    .toLowerCase();
  // Strip trailing 's' only if result is at least 3 chars (avoids "dns" → "dn").
  if (segment.endsWith("s") && segment.length > 3) {
    return segment.slice(0, -1);
  }
  return segment;
}

// ---------------------------------------------------------------------------
// Directory discovery
// ---------------------------------------------------------------------------

/** Returns all relative subdirectory paths under baseDir that contain .md files. */
async function discoverDirs(
  baseDir: string,
  relPath = "",
): Promise<string[]> {
  const fullPath = relPath ? join(baseDir, relPath) : baseDir;
  const dirs: string[] = [];
  const subdirs: string[] = [];

  try {
    for await (const entry of Deno.readDir(fullPath)) {
      if (entry.isFile && entry.name.endsWith(".md")) {
        // This directory has at least one .md file.
        if (!dirs.includes(relPath)) dirs.push(relPath);
      }
      if (entry.isDirectory) {
        // Skip hidden directories (.obsidian, .state, .trash, etc.).
        if (entry.name.startsWith(".")) continue;
        const sub = relPath ? `${relPath}/${entry.name}` : entry.name;
        subdirs.push(sub);
      }
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }

  for (const sub of subdirs) {
    // Skip configured prefixes.
    const skip = SKIP_DIR_PREFIXES.some(
      (p) => sub === p || sub.startsWith(`${p}/`),
    );
    if (skip) continue;
    dirs.push(...await discoverDirs(baseDir, sub));
  }

  return dirs;
}

// ---------------------------------------------------------------------------
// File I/O helpers
// ---------------------------------------------------------------------------

interface ParsedFile {
  filename: string;
  filePath: string;
  fm: Record<string, unknown>;
  body: string;
  mtime: Date;
}

async function readDirFiles(dir: string): Promise<ParsedFile[]> {
  const files: ParsedFile[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (!entry.isFile || !entry.name.endsWith(".md")) continue;
      // Skip macOS resource fork files (._filename).
      if (entry.name.startsWith("._")) continue;
      const filePath = join(dir, entry.name);
      const [content, stat] = await Promise.all([
        Deno.readTextFile(filePath),
        Deno.stat(filePath),
      ]);
      const { frontmatter, body } = parseFrontmatter(content);
      files.push({
        filename: entry.name,
        filePath,
        fm: frontmatter,
        body,
        mtime: stat.mtime ?? new Date(),
      });
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }
  return files;
}

// ---------------------------------------------------------------------------
// Rename ordering — topological sort to handle chains
// ---------------------------------------------------------------------------

interface RenameOp {
  filePath: string;
  newPath: string;
}

/**
 * Sort rename operations so that if op A's target is op B's source,
 * op B executes first. This handles chains like:
 *   ai-assistant.md → idea_ai.md (blocked by)
 *   idea_ai.md      → idea_idea_ai.md
 * Cycles are impossible in practice (each file gets a unique target derived
 * from a unique id) and are silently skipped.
 */
function sortRenamesByDependency(ops: RenameOp[]): RenameOp[] {
  const bySource = new Map<string, RenameOp>(
    ops.map((op) => [op.filePath, op]),
  );
  const result: RenameOp[] = [];
  const visited = new Set<string>();

  function visit(op: RenameOp) {
    if (visited.has(op.filePath)) return;
    visited.add(op.filePath);
    // If my target is another file's current source, that file must move first.
    const blocker = bySource.get(op.newPath);
    if (blocker) visit(blocker);
    result.push(op);
  }

  for (const op of ops) visit(op);
  return result;
}

// ---------------------------------------------------------------------------
// Core: process one directory
// ---------------------------------------------------------------------------

async function processDir(
  projectDir: string,
  relDir: string,
  prefix: string,
  stats: MigrationStats,
  dryRun: boolean,
  filenameIsId = false,
): Promise<void> {
  const dir = join(projectDir, relDir);
  const files = await readDirFiles(dir);
  if (files.length === 0) return;

  console.log(`\n[${relDir}] ${files.length} file(s)`);
  stats.filesScanned += files.length;

  // --- Phase 1: Normalize frontmatter -------------------------------------

  for (const file of files) {
    let changed = false;

    // 1a. Normalize camelCase keys → snake_case (recursive).
    //     JSON comparison is stable: normalizeKeys preserves key order (just
    //     renames keys), so any name change always produces a string diff.
    const normalizedFm = normalizeKeys(file.fm);
    if (JSON.stringify(file.fm) !== JSON.stringify(normalizedFm)) {
      file.fm = normalizedFm;
      stats.keysNormalized++;
      changed = true;
    }

    // 1b. Ensure id exists — place it first for readability.
    //     Skip for filename-is-id dirs (portfolio) where the repo derives id
    //     from the filename and ignores frontmatter id.
    if (!filenameIsId && !file.fm.id) {
      const derived = deriveId(file.filename, prefix);
      file.fm = { id: derived, ...file.fm };
      stats.idsAdded++;
      changed = true;
      console.log(`  + id: ${derived}  ← ${file.filename}`);
    }

    // 1c. Add created_at if missing (file mtime is the best approximation).
    if (!file.fm.created_at) {
      file.fm.created_at = file.mtime.toISOString();
      stats.timestampsAdded++;
      changed = true;
    }

    // 1d. Add updated_at if missing.
    if (!file.fm.updated_at) {
      file.fm.updated_at = file.fm.created_at as string;
      changed = true;
    }

    if (changed) {
      stats.filesModified++;
      if (!dryRun) {
        await Deno.writeTextFile(
          file.filePath,
          serializeFrontmatter(file.fm, file.body),
        );
      }
    }
  }

  // --- Phase 2 & 3: Skip for filename-is-id dirs (no dedup/rename needed) -
  if (filenameIsId) return;

  // --- Phase 2: Deduplicate (same id, multiple files) ---------------------

  const byId = new Map<string, ParsedFile[]>();
  for (const file of files) {
    const id = String(file.fm.id ?? "");
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id)!.push(file);
  }

  // Track paths we deleted so Phase 3 can safely rename onto them.
  const deletedPaths = new Set<string>();
  const toRemove = new Set<ParsedFile>();

  for (const [id, dupes] of byId) {
    if (dupes.length <= 1) continue;
    // Prefer the file already named {id}.md; otherwise keep the first.
    const canonical = dupes.find((f) => f.filename === `${id}.md`) ?? dupes[0];
    for (const dupe of dupes) {
      if (dupe === canonical) continue;
      toRemove.add(dupe);
      deletedPaths.add(dupe.filePath);
      stats.duplicatesRemoved++;
      console.log(
        `  - duplicate: ${dupe.filename}  (kept: ${canonical.filename})`,
      );
      if (!dryRun) await Deno.remove(dupe.filePath);
    }
  }

  // --- Phase 3: Rename files to {id}.md (topologically sorted) -----------

  // Collect pending renames first, then sort and execute.
  const pendingRenames: RenameOp[] = [];

  for (const file of files) {
    if (toRemove.has(file)) continue;
    const id = String(file.fm.id ?? "");
    if (!id) continue;

    const expectedName = `${id}.md`;
    if (file.filename === expectedName) continue;

    const newPath = join(dir, expectedName);

    // Guard: if target exists and we didn't delete it in Phase 2, skip.
    try {
      await Deno.stat(newPath);
      if (!deletedPaths.has(newPath)) {
        // Check if another pending rename will vacate this path first.
        // This is handled by the topological sort below, so defer the guard.
        pendingRenames.push({ filePath: file.filePath, newPath });
        continue;
      }
    } catch {
      // NotFound — safe to proceed.
    }

    pendingRenames.push({ filePath: file.filePath, newPath });
  }

  const ordered = sortRenamesByDependency(pendingRenames);

  for (const op of ordered) {
    // Re-check target existence after topological ordering.
    // If the target was vacated by a preceding rename in this loop, it's safe.
    const targetName = op.newPath.split("/").pop()!;
    try {
      await Deno.stat(op.newPath);
      // Target still exists after ordering — cannot safely rename.
      console.warn(
        `  ! skip rename ${
          op.filePath.split("/").pop()
        } → ${targetName}: target already exists`,
      );
      stats.renameSkipped++;
      continue;
    } catch {
      // NotFound — safe.
    }

    stats.filesRenamed++;
    console.log(
      `  > rename: ${op.filePath.split("/").pop()} → ${targetName}`,
    );
    if (!dryRun) await Deno.rename(op.filePath, op.newPath);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const rawArgs = Deno.args;
const dryRun = rawArgs.includes("--dry-run");
const positional = rawArgs.filter((a) => !a.startsWith("--"));
const projectDir = positional[0] ?? "./example";

if (dryRun) {
  console.log("=== DRY RUN — no files will be changed ===\n");
}
console.log(`Project directory: ${projectDir}`);
console.log(
  `Skipping: ${SKIP_DIR_PREFIXES.join(", ")}\n`,
);

const stats = emptyStats();

// Discover all directories containing .md files under projectDir.
const allDirs = await discoverDirs(projectDir);
// Root-level .md files (relPath "") are skipped — only entity subdirs matter.
const entityDirs = allDirs.filter((d) => d !== "");

for (const relDir of entityDirs.sort()) {
  // board/* subdirectories are task sections — always use "task" prefix
  // regardless of the section name (todo, backlog, done, qa, custom, …).
  const prefix = PREFIX_MAP.get(relDir) ??
    (relDir.startsWith("board/") ? "task" : inferPrefix(relDir));
  const filenameIsId = FILENAME_IS_ID_DIRS.has(relDir);
  await processDir(projectDir, relDir, prefix, stats, dryRun, filenameIsId);
}

console.log("\n=== Migration Report ===");
console.log(`  Directories scanned: ${entityDirs.length}`);
console.log(`  Files scanned:       ${stats.filesScanned}`);
console.log(`  Files modified:      ${stats.filesModified}`);
console.log(`  IDs added:           ${stats.idsAdded}`);
console.log(`  Keys normalized:     ${stats.keysNormalized}`);
console.log(`  Timestamps added:    ${stats.timestampsAdded}`);
console.log(`  Files renamed:       ${stats.filesRenamed}`);
console.log(`  Duplicates removed:  ${stats.duplicatesRemoved}`);
if (stats.renameSkipped > 0) {
  console.log(
    `  Renames skipped:     ${stats.renameSkipped}  (target already existed — review manually)`,
  );
}
if (dryRun) {
  console.log("\n(dry run — no changes were applied)");
}
