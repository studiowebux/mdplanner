// Resolve action-item owner IDs to person names for detail-page rendering.
// Action owners are stored as person IDs by the autocomplete (source: "people").
// Legacy free-text owners simply won't appear in the returned map — the view
// falls back to rendering the raw string.

import type { MeetingAction } from "../../types/meeting.types.ts";
import { getPeopleService } from "../../singletons/services.ts";
import { resolvePersonByName } from "../../utils/person-name-match.ts";

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

/** A meeting attendee resolved to a real Person record. */
export type ResolvedAttendee = { id: string; name: string };

/**
 * Resolve attendee values to Person records for detail-page rendering.
 * Attendees are stored either as person IDs (the autocomplete `source: "people"`
 * stores IDs) or as legacy free-text names. Each value is matched first by ID,
 * then by the tolerant name resolver. Unresolved values are omitted so the view
 * falls back to rendering the raw string with a people-search link.
 */
export async function buildAttendeePersonMap(
  attendees: string[],
): Promise<Record<string, ResolvedAttendee>> {
  if (attendees.length === 0) return {};
  const all = await getPeopleService().list();
  const byId = new Map(all.map((p) => [p.id, p]));
  const out: Record<string, ResolvedAttendee> = {};
  for (const a of attendees) {
    const p = byId.get(a) ?? resolvePersonByName(a, all);
    if (p) out[a] = { id: p.id, name: p.name };
  }
  return out;
}
