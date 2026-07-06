// Shared H2-section splitter for keyword-matched markdown bodies. Repositories
// that persist named fields as `## Heading` blocks (Brief, Lean Canvas,
// Retrospective, Brainstorm) walk the body the same way: collect every `## `
// heading, then slice the text between each heading and the next. Each caller
// keeps its own heading→key matching and content parsing; only this identical
// scan-and-slice skeleton is shared.

/** One `## Heading` block: the heading text and its trimmed body content. */
export interface MarkdownSection {
  heading: string;
  content: string;
}

/**
 * Split a markdown body into its `## Heading` sections. Content runs from just
 * after a heading line to the start of the next `## ` heading (or end of body),
 * trimmed. Text before the first heading is ignored.
 */
export function splitH2Sections(body: string): MarkdownSection[] {
  const h2Pattern = /^##\s+(.+)$/gm;
  const matches: { heading: string; start: number }[] = [];

  let match: RegExpExecArray | null;
  while ((match = h2Pattern.exec(body)) !== null) {
    matches.push({
      heading: match[1],
      start: match.index + match[0].length,
    });
  }

  const sections: MarkdownSection[] = [];
  for (let i = 0; i < matches.length; i++) {
    const end = i + 1 < matches.length
      ? body.lastIndexOf("\n##", matches[i + 1].start)
      : body.length;
    sections.push({
      heading: matches[i].heading,
      content: body.slice(matches[i].start, end).trim(),
    });
  }

  return sections;
}
