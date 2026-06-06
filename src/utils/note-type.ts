// Note classification by `[type]` title prefix — the shared convention used
// for [decision]/[architecture]/[constraint]/[progress]/... notes. Single
// source of truth so analytics, the context pack, and any future consumer parse
// the prefix identically instead of each re-implementing the regex.

/** The bracket tag a note title starts with, lowercased, or "note" if none.
 * `"[Decision] X"` → `"decision"`; `"plain title"` → `"note"`. */
export function noteType(title: string): string {
  const match = title.match(/^\[([^\]]+)\]/);
  return match ? match[1].toLowerCase() : "note";
}
