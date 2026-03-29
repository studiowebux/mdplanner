// String comparison helpers — case-insensitive match and includes.
// Replaces 35+ inline .toLowerCase() chains across services, repos, and factories.

/** Case-insensitive exact match. Handles undefined/null safely. */
export function ciEquals(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (a == null || b == null) return a === b;
  return a.toLowerCase() === b.toLowerCase();
}

/** Case-insensitive substring match. Returns false if either is nullish. */
export function ciIncludes(
  haystack: string | null | undefined,
  needle: string,
): boolean {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Extract sorted unique non-empty string values from an array of items.
 * Replaces the `[...new Set(items.map(i => i.field).filter(Boolean))].sort()` pattern.
 */
export function uniqueValues<T>(
  items: T[],
  getter: (item: T) => string | null | undefined,
): string[] {
  const set = new Set<string>();
  for (const item of items) {
    const v = getter(item);
    if (v) set.add(v);
  }
  return [...set].sort();
}

/**
 * Check if any string in an array case-insensitively includes the needle.
 * Replaces `(arr ?? []).some(v => v.toLowerCase().includes(q))`.
 */
export function ciSomeIncludes(
  arr: string[] | null | undefined,
  needle: string,
): boolean {
  if (!arr) return false;
  const lower = needle.toLowerCase();
  return arr.some((v) => v.toLowerCase().includes(lower));
}

// ---------------------------------------------------------------------------
// Search predicate factory
// ---------------------------------------------------------------------------

type FieldSpec<T> =
  | { type: "string"; get: (item: T) => string | null | undefined }
  | { type: "array"; get: (item: T) => string[] | null | undefined };

/**
 * Create a search predicate from a field spec list.
 * Replaces hand-written searchPredicate functions in domain configs.
 *
 * Usage:
 * ```ts
 * searchPredicate: createSearchPredicate<Goal>([
 *   { type: "string", get: (g) => g.title },
 *   { type: "array",  get: (g) => g.tags },
 * ]),
 * ```
 */
export function createSearchPredicate<T>(
  fields: FieldSpec<T>[],
): (item: T, q: string) => boolean {
  return (item, q) => {
    const lower = q.toLowerCase();
    return fields.some((f) =>
      f.type === "string"
        ? (f.get(item) ?? "").toLowerCase().includes(lower)
        : ciSomeIncludes(f.get(item) as string[] | null | undefined, q)
    );
  };
}

// ---------------------------------------------------------------------------
// Collection helpers
// ---------------------------------------------------------------------------

/**
 * Extract sorted unique values from an array field on each item.
 * Replaces the flat-map + dedup pattern for tags, departments, etc.
 */
export function uniqueFlatValues<T>(
  items: T[],
  getter: (item: T) => string[] | null | undefined,
): string[] {
  const set = new Set<string>();
  for (const item of items) {
    const arr = getter(item);
    if (arr) { for (const v of arr) if (v) set.add(v); }
  }
  return [...set].sort();
}
