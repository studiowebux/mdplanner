/**
 * Group an array of items by a key, with optional sort order for the groups.
 * Groups not in the order array appear after ordered groups.
 */
export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string,
  order?: string[],
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  if (!order) return groups;

  const sorted: Record<string, T[]> = {};
  for (const key of order) {
    if (groups[key]) {
      sorted[key] = groups[key];
      delete groups[key];
    }
  }
  for (const [key, items] of Object.entries(groups)) {
    sorted[key] = items;
  }
  return sorted;
}
