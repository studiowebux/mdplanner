// Frontmatter key mapper — bidirectional snake_case ↔ camelCase conversion.
// All .md frontmatter uses snake_case. All TypeScript entities use camelCase.
// This module is the single boundary between the two naming conventions.

// ---------------------------------------------------------------------------
// Key converters
// ---------------------------------------------------------------------------

/** Convert a snake_case string to camelCase. */
export function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Convert a camelCase string to snake_case. Handles consecutive uppercase (e.g. githubPR → github_pr). */
export function camelToSnake(s: string): string {
  return s
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z\d])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Audit fields — every entity gets these automatically
// ---------------------------------------------------------------------------

/** Standard audit field mappings (snake_case → camelCase). */
export const AUDIT_KEYS: ReadonlyMap<string, string> = new Map([
  ["created_at", "createdAt"],
  ["updated_at", "updatedAt"],
  ["created_by", "createdBy"],
  ["updated_by", "updatedBy"],
]);

/** Reverse of AUDIT_KEYS (camelCase → snake_case). */
const AUDIT_KEYS_REVERSE: ReadonlyMap<string, string> = new Map(
  [...AUDIT_KEYS].map(([k, v]) => [v, k]),
);

// ---------------------------------------------------------------------------
// Object key mappers
// ---------------------------------------------------------------------------

/**
 * Map frontmatter keys (snake_case) to entity keys (camelCase).
 * Single-word keys pass through unchanged.
 *
 * @param raw - Parsed frontmatter record
 * @param overrides - Optional snake→camel overrides for non-standard mappings
 * @returns New object with camelCase keys
 */
export function mapKeysFromFm(
  raw: Record<string, unknown>,
  overrides?: Readonly<Record<string, string>>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null) continue;
    const mapped = overrides?.[key] ?? AUDIT_KEYS.get(key) ?? snakeToCamel(key);
    result[mapped] = value;
  }
  return result;
}

/**
 * Map entity keys (camelCase) to frontmatter keys (snake_case).
 * Single-word keys pass through unchanged. Strips undefined/null values.
 *
 * @param entity - Entity record with camelCase keys
 * @param overrides - Optional camel→snake overrides for non-standard mappings
 * @returns New object with snake_case keys, null/undefined removed
 */
export function mapKeysToFm(
  entity: Record<string, unknown>,
  overrides?: Readonly<Record<string, string>>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entity)) {
    if (value === undefined || value === null) continue;
    const mapped = overrides?.[key] ?? AUDIT_KEYS_REVERSE.get(key) ??
      camelToSnake(key);
    result[mapped] = value;
  }
  return result;
}

/**
 * Map keys of each item in an array from snake_case to camelCase.
 * Use for nested structured arrays (campaigns, channels, target_audiences, etc.).
 */
export function mapArrayFromFm(
  items: unknown[],
  overrides?: Readonly<Record<string, string>>,
): Record<string, unknown>[] {
  return items.map((item) =>
    mapKeysFromFm(item as Record<string, unknown>, overrides)
  );
}

/**
 * Map keys of each item in an array from camelCase to snake_case.
 * Use for nested structured arrays when serializing.
 */
export function mapArrayToFm(
  items: Record<string, unknown>[],
  overrides?: Readonly<Record<string, string>>,
): Record<string, unknown>[] {
  return items.map((item) => mapKeysToFm(item, overrides));
}
