// Resolve a free-text name (e.g. a retrospective participant, a goal
// contributor) to a Person record. Detail views store these as plain strings,
// but the linked Person record carries a separate `name` field that may not
// match exactly — drift like "Alice Martin" (participant) vs "Alice" (Person)
// is common in real data.

import type { Person } from "../types/person.types.ts";
import { ciEquals } from "./string.ts";

/** Lowercased first whitespace-separated word. Empty string for blank input. */
function firstWord(s: string): string {
  return s.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? "";
}

/**
 * Resolve a name to a Person, in priority order:
 *   1. Exact match on `Person.name`.
 *   2. Case-insensitive match on `Person.name`.
 *   3. First-word match: lowercase first word of `name` equals lowercase
 *      first word of `Person.name`. Skipped when ambiguous (multiple
 *      candidates) so we never mis-link two distinct people sharing a
 *      first name.
 * Returns undefined when no unambiguous match is found.
 */
export function resolvePersonByName(
  name: string,
  people: Person[],
): Person | undefined {
  const exact = people.find((p) => p.name === name);
  if (exact) return exact;

  const ci = people.find((p) => ciEquals(p.name, name));
  if (ci) return ci;

  const fw = firstWord(name);
  if (!fw) return undefined;
  const matches = people.filter((p) => firstWord(p.name) === fw);
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Resolve a stored person field to its display label. Handles both id-backed
 * fields (task.assignee, goal.owner, etc. store a person id) and legacy
 * free-text names: returns the Person's `name` when `value` is a known id or a
 * resolvable name, otherwise the raw value unchanged (never blank for non-empty
 * input). The universal id→name display helper.
 */
export function personLabel(value: string, people: Person[]): string {
  if (!value) return "";
  const byId = people.find((p) => p.id === value);
  if (byId) return byId.name;
  const byName = resolvePersonByName(value, people);
  return byName ? byName.name : value;
}

/**
 * Build a name → personId map for a set of source names against a Person list.
 * Names that resolve unambiguously become keyed entries; unresolved names are
 * omitted so callers can fall back to plain text rendering.
 */
export function buildPersonByNameMap(
  names: Iterable<string>,
  people: Person[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const n of names) {
    const p = resolvePersonByName(n, people);
    if (p) out[n] = p.id;
  }
  return out;
}
