// Frontmatter key mapper — bidirectional snake_case ↔ camelCase conversion.
// All .md frontmatter uses snake_case. All TypeScript entities use camelCase.
// This module is the single boundary between the two naming conventions.

// ---------------------------------------------------------------------------
// Key converters
// ---------------------------------------------------------------------------

/** Convert a snake_case string to camelCase. */
function snakeToCamel(s: string): string {
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
const AUDIT_KEYS: ReadonlyMap<string, string> = new Map([
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

// ---------------------------------------------------------------------------
// Audit field reader — single helper, used by every domain's parse()
// ---------------------------------------------------------------------------

/** Audit fields extracted from raw frontmatter (only set when non-null). */
export interface ParsedAuditFields {
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Extract the four audit fields from raw frontmatter, handling both
 * snake_case (disk shape — standalone repos that bypass mapKeysFromFm) and
 * camelCase (post-mapKeysFromFm shape — cached repos extending
 * BaseMarkdownRepository). Snake_case wins when both are present.
 *
 * Use in every domain's parse() — spread into the returned entity:
 *
 *   return { id, name, ..., ...parseAuditFields(fm) };
 *
 * Eliminates the 4-line per-module duplication that historically drifted
 * between snake_case and camelCase reads. Investigation note
 * `note_1779855618481_n2klqz` identified 14 affected modules.
 */
export function parseAuditFields(
  fm: Record<string, unknown>,
): ParsedAuditFields {
  const result: ParsedAuditFields = {};
  const createdAt = fm.created_at ?? fm.createdAt;
  if (createdAt != null) result.createdAt = String(createdAt);
  const updatedAt = fm.updated_at ?? fm.updatedAt;
  if (updatedAt != null) result.updatedAt = String(updatedAt);
  const createdBy = fm.created_by ?? fm.createdBy;
  if (createdBy != null) result.createdBy = String(createdBy);
  const updatedBy = fm.updated_by ?? fm.updatedBy;
  if (updatedBy != null) result.updatedBy = String(updatedBy);
  return result;
}

/**
 * Derive an entity id from frontmatter, falling back to the filename stem.
 *
 * The canonical preamble of every repository `parse()`: a persisted `fm.id`
 * wins, otherwise the filename without its `.md` extension. Use after the
 * domain's identity guard:
 *
 *   const id = resolveEntityId(filename, fm);
 *
 * Replaces the line-for-line duplication that appeared in 39 repositories.
 */
export function resolveEntityId(
  filename: string,
  fm: Record<string, unknown>,
): string {
  return fm.id ? String(fm.id) : filename.replace(/\.md$/, "");
}

/**
 * Stamp the audit timestamps for a freshly created entity — `createdAt` and
 * `updatedAt` both take the creation instant. The write-side counterpart to
 * `parseAuditFields` (read side); spread into the entity built by a
 * repository's `fromCreateInput`:
 *
 *   return { ...data, id, ...stampAuditFields(now) };
 *
 * Replaces the `createdAt: now, updatedAt: now,` pair duplicated across 44
 * repositories.
 */
export function stampAuditFields(
  now: string,
): { createdAt: string; updatedAt: string } {
  return { createdAt: now, updatedAt: now };
}
