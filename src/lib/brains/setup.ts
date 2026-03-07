/**
 * Brain setup/scaffold — creates new brain directories with selective symlinks.
 */

import { dirname, join, relative, resolve } from "@std/path";
import type { BrainRegistry } from "./registry.ts";

/** Directories created in every new brain. */
const SCAFFOLD_DIRS = [
  ".claude/rules",
  ".claude/hooks",
  ".claude/agents",
  ".planning/iced",
  ".planning/history",
  "specs",
  "context",
  "runbooks",
  "templates",
];

/** Directories copied from core brain (non-rules content). */
const SYNC_SOURCE_DIRS = [
  ".claude/hooks",
  ".claude/agents",
  "templates",
];

/** Directories that get .gitkeep placeholders. */
const GITKEEP_DIRS = [
  "specs",
  "context",
  "runbooks",
  ".planning/iced",
  ".planning/history",
];

export interface SetupOptions {
  name: string;
  parentDir: string;
  codeRepoPath: string;
  stacks: string[];
  practices: string[];
  workflows: string[];
}

/**
 * Scaffolds a new brain directory structure with selective symlinks.
 * Returns the path to the created brain directory.
 */
export async function scaffoldBrain(
  registry: BrainRegistry,
  opts: SetupOptions,
): Promise<string> {
  const brainDir = join(opts.parentDir, opts.name + "-brain");

  // Check if directory already exists
  try {
    await Deno.stat(brainDir);
    throw new Error(`brain directory already exists: ${brainDir}`);
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
  }

  // Create directory structure
  for (const dir of SCAFFOLD_DIRS) {
    await Deno.mkdir(join(brainDir, dir), { recursive: true });
  }

  // Write .gitkeep placeholders
  for (const dir of GITKEEP_DIRS) {
    await Deno.writeTextFile(join(brainDir, dir, ".gitkeep"), "");
  }

  // Copy non-rules content from core brain
  const core = registry.core();
  if (core) {
    for (const dir of SYNC_SOURCE_DIRS) {
      const src = join(core.path, dir);
      try {
        await copyDir(src, join(brainDir, dir));
      } catch {
        // Source dir doesn't exist — skip
      }
    }
  }

  // Build selective rules symlinks
  const protocolRules = registry.protocolRulesDir();
  try {
    await Deno.stat(protocolRules);
    await buildSelectiveRules(
      brainDir,
      protocolRules,
      opts.stacks,
      opts.practices,
      opts.workflows,
    );
  } catch {
    // Protocol rules not found — skip
  }

  // Generate settings.json
  const settings = generateSettings(core, opts.codeRepoPath);
  const settingsFile = join(brainDir, ".claude", "settings.json.template");
  await Deno.writeTextFile(settingsFile, JSON.stringify(settings, null, 2));

  // Copy CLAUDE.md from core if available
  if (core) {
    const srcClaude = join(core.path, ".claude", "CLAUDE.md");
    try {
      await Deno.copyFile(srcClaude, join(brainDir, ".claude", "CLAUDE.md"));
    } catch {
      // No CLAUDE.md in core — skip
    }
  }

  // Write planning templates
  const planningFiles: Record<string, string> = {
    "GOALS.md":
      "# GOALS.md - Goal Registry\n\n## Active Goal\n\n_No active goal._\n\n## Goal Registry\n\n| # | Goal | Milestone | Status | Created | Completed |\n|---|------|-----------|--------|---------|----------|\n| — | — | — | — | — | — |\n",
    "MILESTONES.md":
      "# MILESTONES.md\n\n## Milestones\n\n| # | Milestone | Status |\n|---|-----------|--------|\n| — | — | — |\n",
    "BRANCHES.md":
      "# BRANCHES.md\n\n## Active Branches\n\n| Branch | Repo | Base | Status |\n|--------|------|------|--------|\n| — | — | — | — |\n",
    "TECH_DECISIONS.md":
      "# Technical Decisions\n\n_No decisions recorded yet._\n",
  };
  for (const [fname, content] of Object.entries(planningFiles)) {
    await Deno.writeTextFile(join(brainDir, ".planning", fname), content);
  }

  return brainDir;
}

/**
 * Rebuilds selective rules symlinks for an existing brain.
 * Removes old rules directory and creates fresh symlinks.
 */
export async function rebuildRules(
  brainPath: string,
  protocolRulesDir: string,
  stacks: string[],
  practices: string[],
  workflows: string[],
): Promise<{ stacksLinked: number }> {
  const rulesDir = join(brainPath, ".claude", "rules");

  // Remove old rules
  try {
    const info = await Deno.lstat(rulesDir);
    if (info.isSymlink) {
      await Deno.remove(rulesDir);
    } else if (info.isDirectory) {
      await Deno.remove(rulesDir, { recursive: true });
    }
  } catch {
    // Doesn't exist — fine
  }

  await buildSelectiveRules(
    brainPath,
    protocolRulesDir,
    stacks,
    practices,
    workflows,
  );

  // Count linked stack files
  let linked = 0;
  const stackDir = join(rulesDir, "stack");
  try {
    for await (const entry of Deno.readDir(stackDir)) {
      if (!entry.isDirectory && entry.name.endsWith(".md")) linked++;
    }
  } catch {
    // No stack dir
  }

  return { stacksLinked: linked };
}

/**
 * Creates selective rules symlink structure in a brain.
 * Top-level .md files are always symlinked. Each subdirectory is either
 * linked wholesale (empty filter) or selectively (non-empty filter).
 */
async function buildSelectiveRules(
  brainDir: string,
  protocolRulesDir: string,
  stacks: string[],
  practices: string[],
  workflows: string[],
): Promise<void> {
  const rulesDir = join(brainDir, ".claude", "rules");
  await Deno.mkdir(rulesDir, { recursive: true });

  // Symlink top-level .md files
  try {
    for await (const entry of Deno.readDir(protocolRulesDir)) {
      if (entry.isDirectory || !entry.name.endsWith(".md")) continue;
      await relSymlink(
        join(protocolRulesDir, entry.name),
        join(rulesDir, entry.name),
      );
    }
  } catch {
    // Protocol dir unreadable
  }

  await linkSubdir(rulesDir, protocolRulesDir, "practices", practices);
  await linkSubdir(rulesDir, protocolRulesDir, "workflow", workflows);
  await linkSubdir(rulesDir, protocolRulesDir, "stack", stacks);
}

/**
 * Links files from a protocol subdirectory into the brain's rules dir.
 * Empty filter = wholesale symlink. Non-empty filter = selective per-file links.
 */
async function linkSubdir(
  rulesDir: string,
  protocolRulesDir: string,
  subdir: string,
  filter: string[],
): Promise<void> {
  const src = join(protocolRulesDir, subdir);
  try {
    await Deno.stat(src);
  } catch {
    return; // Source subdir doesn't exist
  }

  if (filter.length === 0) {
    await relSymlink(src, join(rulesDir, subdir));
    return;
  }

  const dstDir = join(rulesDir, subdir);
  await Deno.mkdir(dstDir, { recursive: true });

  const allowed = new Set(filter);
  for await (const entry of Deno.readDir(src)) {
    if (entry.isDirectory || !entry.name.endsWith(".md")) continue;
    const name = entry.name.slice(0, -3);
    if (allowed.has(name)) {
      await relSymlink(join(src, entry.name), join(dstDir, entry.name));
    }
  }
}

/** Creates a relative symlink from src to dst. */
async function relSymlink(src: string, dst: string): Promise<void> {
  const rel = relative(dirname(dst), src);
  try {
    await Deno.symlink(rel, dst);
  } catch {
    // Symlink already exists or permission denied
  }
}

/** Recursively copies a directory. */
async function copyDir(src: string, dst: string): Promise<void> {
  await Deno.mkdir(dst, { recursive: true });
  for await (const entry of Deno.readDir(src)) {
    const srcPath = join(src, entry.name);
    const dstPath = join(dst, entry.name);
    if (entry.isDirectory) {
      await copyDir(srcPath, dstPath);
    } else {
      await Deno.mkdir(dirname(dstPath), { recursive: true });
      await Deno.copyFile(srcPath, dstPath);
    }
  }
}

/** Generates a settings.json object for a new brain. */
function generateSettings(
  core: { path: string } | undefined,
  codeRepoPath: string,
): Record<string, unknown> {
  let raw: Record<string, unknown> = {};

  if (core) {
    const candidates = [
      join(core.path, ".claude", "settings.json.template"),
      join(core.path, ".claude", "settings.json"),
    ];
    for (const candidate of candidates) {
      try {
        const data = Deno.readTextFileSync(candidate);
        raw = JSON.parse(data);
        break;
      } catch {
        continue;
      }
    }
  }

  if (codeRepoPath) {
    raw.additionalDirectories = [codeRepoPath];
    raw.permissions = {
      allow: [`Read(${codeRepoPath}/**)`],
    };
  }

  return raw;
}
