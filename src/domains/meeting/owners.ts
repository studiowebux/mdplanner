// Resolve action-item owner IDs to person names for detail-page rendering.
// Action owners are stored as person IDs by the autocomplete (source: "people").
// Legacy free-text owners simply won't appear in the returned map — the view
// falls back to rendering the raw string.

import type { Meeting, MeetingAction } from "../../types/meeting.types.ts";
import type { Person } from "../../types/person.types.ts";
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

/** A meeting with its attendees pre-resolved for list card/table rendering. */
export type MeetingWithAttendees = Meeting & {
  attendeeById?: Record<string, ResolvedAttendee>;
};

/**
 * Resolve a single attendee value (person ID first, then tolerant name match)
 * against a pre-loaded people list. Returns null when no match is found so
 * callers can fall back to a people-search link.
 */
function resolveAttendee(
  value: string,
  byId: Map<string, Person>,
  all: Person[],
): ResolvedAttendee | null {
  const p = byId.get(value) ?? resolvePersonByName(value, all);
  return p ? { id: p.id, name: p.name } : null;
}

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
    const resolved = resolveAttendee(a, byId, all);
    if (resolved) out[a] = resolved;
  }
  return out;
}

/**
 * Attach a resolved `attendeeById` map to each meeting for list rendering,
 * loading the people directory once for the whole batch (not per meeting).
 * Used by the meetings list `listForRequest` so the sync card/table renderers
 * can link attendees to `/people/:id` instead of an invalid `/people?q=<id>`.
 */
export async function attachAttendeeMaps(
  meetings: Meeting[],
): Promise<MeetingWithAttendees[]> {
  const hasAttendees = meetings.some((m) => (m.attendees ?? []).length > 0);
  if (!hasAttendees) {
    return meetings.map((m) => ({ ...m, attendeeById: {} }));
  }
  const all = await getPeopleService().list();
  const byId = new Map(all.map((p) => [p.id, p]));
  return meetings.map((m) => {
    const attendeeById: Record<string, ResolvedAttendee> = {};
    for (const a of m.attendees ?? []) {
      const resolved = resolveAttendee(a, byId, all);
      if (resolved) attendeeById[a] = resolved;
    }
    return { ...m, attendeeById };
  });
}
