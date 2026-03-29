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
