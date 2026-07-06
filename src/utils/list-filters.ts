// Generic list-filter predicates shared by service applyFilters implementations.
//
// The tag / date-range / text-query blocks were copy-pasted verbatim across
// service filters (journal, reflection, ...). These helpers hold the one
// canonical implementation; each service composes them and keeps only its
// entity-specific filters inline.

import { ciIncludes } from "./string.ts";

/** Keep items whose `tags` array contains `tag`. No-op when `tag` is absent. */
export function filterByTag<T extends { tags?: string[] | null }>(
  items: T[],
  tag?: string,
): T[] {
  if (!tag) return items;
  return items.filter((item) => item.tags?.includes(tag));
}

/** Keep items whose ISO `date` falls within [from, to] (either bound optional). */
export function filterByDateRange<T extends { date: string }>(
  items: T[],
  from?: string,
  to?: string,
): T[] {
  let out = items;
  if (from) out = out.filter((item) => item.date >= from);
  if (to) out = out.filter((item) => item.date <= to);
  return out;
}

/**
 * Keep items where `q` case-insensitively matches any string returned by
 * `fields`. No-op when `q` is absent; undefined field values are skipped.
 */
export function filterByQuery<T>(
  items: T[],
  q: string | undefined,
  fields: (item: T) => Array<string | null | undefined>,
): T[] {
  if (!q) return items;
  return items.filter((item) =>
    fields(item).some((value) => value != null && ciIncludes(value, q))
  );
}
