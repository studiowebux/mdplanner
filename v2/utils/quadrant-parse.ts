// Shared markdown body parser for quadrant-style builders (SWOT, MoSCoW): walks
// the body, matches `## heading` prefixes against a SECTION_MAP, collects list
// items into quadrant buckets, and accumulates any trailing content as notes.
//
// Not used by Business Model Canvas — its parser uses multi-prefix matching and
// allows section re-entry, a deliberately different state machine.

/**
 * Parse a quadrant builder body.
 *
 * @param body       Raw markdown body (frontmatter already stripped).
 * @param sectionMap Lowercase `## heading` prefix → quadrant key. Quadrant
 *                   buckets are initialized from the map's distinct values.
 * @param fmTitle    Frontmatter title; falls back to the first `# heading`.
 * @param fmNotes    Frontmatter notes; used when the body yields no trailing
 *                   notes.
 */
export function parseQuadrantMarkdown(
  body: string,
  sectionMap: Record<string, string>,
  fmTitle: unknown,
  fmNotes: unknown,
): {
  title: string;
  quadrants: Record<string, string[]>;
  notes: string | undefined;
} {
  const lines = body.split("\n");
  let title = fmTitle ? String(fmTitle) : "";
  const quadrants: Record<string, string[]> = {};
  for (const key of Object.values(sectionMap)) quadrants[key] = [];
  let currentSection: string | null = null;
  const extraLines: string[] = [];
  let pastQuadrants = false;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      if (!title) title = line.slice(2).trim();
      continue;
    }

    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      const heading = h2Match[1].toLowerCase();
      let matched = false;
      for (const [prefix, key] of Object.entries(sectionMap)) {
        if (heading.startsWith(prefix)) {
          currentSection = key;
          matched = true;
          break;
        }
      }
      if (!matched) {
        currentSection = null;
        pastQuadrants = true;
        extraLines.push(line);
      }
      continue;
    }

    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch && currentSection && !pastQuadrants) {
      quadrants[currentSection].push(listMatch[1].trim());
      continue;
    }

    if (currentSection === null && !pastQuadrants) {
      if (line.trim()) extraLines.push(line);
      continue;
    }

    if (currentSection && !pastQuadrants && line.trim()) {
      pastQuadrants = true;
      extraLines.push(line);
      continue;
    }

    if (pastQuadrants) {
      extraLines.push(line);
    }
  }

  const bodyNotes = extraLines.join("\n").trim();
  const fmNotesStr = fmNotes != null ? String(fmNotes) : "";
  const notes = bodyNotes || fmNotesStr || undefined;
  return { title, quadrants, notes };
}
