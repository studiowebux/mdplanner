// Shared repository helpers — eliminates repetitive field-by-field mapping
// across People, Milestone, and Task repositories.

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
