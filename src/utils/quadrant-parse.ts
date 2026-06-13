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
/** Mutable accumulator threaded through the per-line quadrant walk. */
interface QuadrantAcc {
  title: string;
  quadrants: Record<string, string[]>;
  currentSection: string | null;
  extraLines: string[];
  pastQuadrants: boolean;
}

/** First quadrant key whose prefix the lowercased `## heading` starts with. */
function matchQuadrantHeading(
  heading: string,
  sectionMap: Record<string, string>,
): string | null {
  for (const [prefix, key] of Object.entries(sectionMap)) {
    if (heading.startsWith(prefix)) return key;
  }
  return null;
}

/** Apply one body line to the accumulator (heading / item / notes routing). */
function processQuadrantLine(
  line: string,
  sectionMap: Record<string, string>,
  acc: QuadrantAcc,
): void {
  if (line.startsWith("# ")) {
    if (!acc.title) acc.title = line.slice(2).trim();
    return;
  }

  const h2Match = line.match(/^##\s+(.+)$/);
  if (h2Match) {
    const key = matchQuadrantHeading(h2Match[1].toLowerCase(), sectionMap);
    if (key) {
      acc.currentSection = key;
    } else {
      acc.currentSection = null;
      acc.pastQuadrants = true;
      acc.extraLines.push(line);
    }
    return;
  }

  const listMatch = line.match(/^[-*]\s+(.+)$/);
  if (listMatch && acc.currentSection && !acc.pastQuadrants) {
    acc.quadrants[acc.currentSection].push(listMatch[1].trim());
    return;
  }

  if (acc.currentSection === null && !acc.pastQuadrants) {
    if (line.trim()) acc.extraLines.push(line);
    return;
  }

  if (acc.currentSection && !acc.pastQuadrants && line.trim()) {
    acc.pastQuadrants = true;
    acc.extraLines.push(line);
    return;
  }

  if (acc.pastQuadrants) {
    acc.extraLines.push(line);
  }
}

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
  const quadrants: Record<string, string[]> = {};
  for (const key of Object.values(sectionMap)) quadrants[key] = [];
  const acc: QuadrantAcc = {
    title: fmTitle ? String(fmTitle) : "",
    quadrants,
    currentSection: null,
    extraLines: [],
    pastQuadrants: false,
  };

  for (const line of body.split("\n")) {
    processQuadrantLine(line, sectionMap, acc);
  }

  const bodyNotes = acc.extraLines.join("\n").trim();
  const fmNotesStr = fmNotes != null ? String(fmNotes) : "";
  const notes = bodyNotes || fmNotesStr || undefined;
  return { title: acc.title, quadrants, notes };
}
