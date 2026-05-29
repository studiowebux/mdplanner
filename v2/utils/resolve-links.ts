/**
 * Resolve a list of entity IDs to their entities via a service `getById`,
 * dropping any nulls (deleted / missing). Used by detail-route handlers that
 * surface a list of links to other entities — see decision note
 * `note_1780091635523_nvyef6`.
 */
export async function resolveLinkedItems<T>(
  ids: string[] | undefined,
  getById: (id: string) => Promise<T | null>,
): Promise<T[]> {
  const resolved: (T | null)[] = await Promise.all((ids ?? []).map(getById));
  return resolved.filter((x): x is T => x !== null);
}
