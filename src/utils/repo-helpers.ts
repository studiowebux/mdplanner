// Shared repository helpers — eliminates repetitive field-by-field mapping
// across People, Milestone, Task, DNS, and other repositories.

import { join } from "@std/path";
import { parseFrontmatter } from "./frontmatter.ts";

/**
 * Read all .md files from a directory, parse each with the provided function.
 * Returns empty array if directory does not exist. Skips non-.md files.
 */
export async function readMarkdownDir<T>(
  dir: string,
  parse: (
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ) => T | null,
): Promise<T[]> {
  const items: T[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (!entry.isFile || !entry.name.endsWith(".md")) continue;
      const content = await Deno.readTextFile(join(dir, entry.name));
      const { frontmatter, body } = parseFrontmatter(content);
      const item = parse(entry.name, frontmatter, body);
      if (item) items.push(item);
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }
  return items;
}

/**
 * Find a single .md file by its frontmatter `id` field (O(n) disk scan).
 * Use for flat-directory repositories (note, people, milestone).
 * Task repository has a multi-section variant and stays separate.
 */
export async function findFileById<T>(
  dir: string,
  parse: (content: string) => T | null,
  id: string,
): Promise<{ file: string | null; entity: T | null }> {
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (!entry.isFile || !entry.name.endsWith(".md")) continue;
      const filePath = join(dir, entry.name);
      const content = await Deno.readTextFile(filePath);
      const entity = parse(content);
      if (entity && (entity as Record<string, unknown>).id === id) {
        return { file: filePath, entity };
      }
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) throw err;
  }
  return { file: null, entity: null };
}

/**
 * Build a frontmatter record from an entity, excluding body-only keys.
 * serializeFrontmatter already strips undefined/null, so no per-field guards needed.
 */
export function buildFrontmatter<T extends Record<string, unknown>>(
  entity: T,
  excludeKeys: readonly string[],
): Record<string, unknown> {
  const fm: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entity)) {
    if (!excludeKeys.includes(key)) {
      fm[key] = value;
    }
  }
  return fm;
}

/**
 * Merge update fields into a target entity.
 * For each key in source that is not undefined, sets target[key] = source[key] ?? undefined.
 * Null values become undefined (clearing the field). Absent keys are skipped.
 */
export function mergeFields<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>,
): T {
  for (const key of Object.keys(source)) {
    if (source[key] !== undefined) {
      (target as Record<string, unknown>)[key] = source[key] ?? undefined;
    }
  }
  return target;
}
