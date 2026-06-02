// Resolve action-item owner IDs to person names for detail-page rendering.
// Action owners are stored as person IDs by the autocomplete (source: "people").
// Legacy free-text owners simply won't appear in the returned map — the view
// falls back to rendering the raw string.

import type { MeetingAction } from "../../types/meeting.types.ts";
import { getPeopleService } from "../../singletons/services.ts";

/** Build `id → name` map for the owner IDs referenced by these action items. */
export async function buildActionPersonById(
  actions: MeetingAction[],
): Promise<Record<string, string>> {
  const ownerIds = new Set<string>();
  for (const a of actions) {
    if (a.owner) ownerIds.add(a.owner);
  }
  if (ownerIds.size === 0) return {};
  const all = await getPeopleService().list();
  const map: Record<string, string> = {};
  for (const p of all) {
    if (ownerIds.has(p.id)) map[p.id] = p.name;
  }
  return map;
}
