#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * scripts/migrate-sticky-notes-to-boards.ts
 *
 * One-time migration: move flat sticky-notes/*.md note files into
 * sticky-notes/default/ and create the default board manifest.
 * Idempotent — safe to run multiple times.
 *
 * Usage:
 *   deno run --allow-read --allow-write scripts/migrate-sticky-notes-to-boards.ts [--dry-run] [projectDir]
 *   projectDir defaults to: ./example
 */

import { join } from "@std/path";

const args = Deno.args;
const dryRun = args.includes("--dry-run");
const projectDir = args.find((a) => !a.startsWith("--")) ?? "./example";

const stickyDir = join(projectDir, "sticky-notes");
const defaultDir = join(stickyDir, "default");
const boardFile = join(stickyDir, "default.md");

console.log(`[migrate] project dir: ${projectDir}`);
console.log(`[migrate] dry-run: ${dryRun}`);

// Collect flat note files
const flatNotes: string[] = [];
try {
  for await (const entry of Deno.readDir(stickyDir)) {
    if (
      entry.isFile &&
      entry.name.startsWith("sticky_") &&
      entry.name.endsWith(".md")
    ) {
      flatNotes.push(entry.name);
    }
  }
} catch {
  console.log("[migrate] sticky-notes/ directory not found — nothing to do.");
  Deno.exit(0);
}

if (flatNotes.length === 0) {
  console.log("[migrate] No flat note files found — already migrated.");
  Deno.exit(0);
}

console.log(`[migrate] Found ${flatNotes.length} flat note(s) to migrate.`);

// Create default/ subdirectory
if (!dryRun) {
  await Deno.mkdir(defaultDir, { recursive: true });
}
console.log(`[migrate] ${dryRun ? "[dry]" : ""} mkdir ${defaultDir}`);

// Create default board manifest if missing
try {
  await Deno.stat(boardFile);
  console.log(`[migrate] Board manifest already exists: ${boardFile}`);
} catch {
  const now = new Date().toISOString();
  const content =
    `---\nid: sboard_default\ntitle: Default\nprojects: []\ncreated_at: "${now}"\nupdated_at: "${now}"\n---\n`;
  if (!dryRun) {
    await Deno.writeTextFile(boardFile, content);
  }
  console.log(`[migrate] ${dryRun ? "[dry]" : ""} created ${boardFile}`);
}

// Move flat note files into default/
for (const name of flatNotes) {
  const src = join(stickyDir, name);
  const dst = join(defaultDir, name);
  if (!dryRun) {
    try {
      await Deno.rename(src, dst);
    } catch {
      // cross-filesystem fallback
      await Deno.copyFile(src, dst);
      await Deno.remove(src);
    }
  }
  console.log(`[migrate] ${dryRun ? "[dry]" : ""} ${src} → ${dst}`);
}

console.log(
  `[migrate] Done. ${flatNotes.length} note(s) moved to sticky-notes/default/`,
);
