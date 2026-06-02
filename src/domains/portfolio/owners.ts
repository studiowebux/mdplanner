// Resolve team-member person IDs to names for detail-page + edit-form rendering.
// Team members are stored as person IDs by the autocomplete (source: "people").
// Unresolved IDs simply won't appear in the returned map — callers fall back to
// the empty string (edit form re-picks) or the raw ID (detail view).

import type { TeamMember } from "../../types/portfolio.types.ts";
import { getPeopleService } from "../../singletons/services.ts";

/** Build `id → name` map for the person IDs referenced by these team members. */
export async function buildTeamPersonById(
  team: TeamMember[],
): Promise<Record<string, string>> {
  const personIds = new Set<string>();
  for (const m of team) {
    if (m.personId) personIds.add(m.personId);
  }
  if (personIds.size === 0) return {};
  const all = await getPeopleService().list();
  const map: Record<string, string> = {};
  for (const p of all) {
    if (personIds.has(p.id)) map[p.id] = p.name;
  }
  return map;
}
