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
 * Fold a string for fuzzy matching: lowercase, strip diacritics (NFD + remove
 * combining marks), and drop everything that isn't a latin letter or digit
 * (spaces, punctuation). So "Génie" → "genie" and "MD Planner" → "mdplanner".
 */
export function foldText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Diacritic-, space-, and punctuation-insensitive substring match. Used by
 * autocomplete so "genie" matches "Génie" and "mdplanner" matches "MD Planner".
 * Returns false if the haystack is nullish.
 */
export function foldIncludes(
  haystack: string | null | undefined,
  needle: string,
): boolean {
  if (!haystack) return false;
  return foldText(haystack).includes(foldText(needle));
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
function ciSomeIncludes(
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
