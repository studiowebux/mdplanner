// Renders prose text with inline wiki-links — `[[id|name]]` tokens — as
// clickable links to the referenced entity. JSX equivalent of a renderText
// hook (no dangerouslySetInnerHTML), used by note content rendering.
//
// The entity type (and therefore the detail-page path) is derived from the id
// prefix (task_/person_/portfolio_/note_), so the token stays compact and the
// renderer needs no lookups. An unknown prefix renders the display name as
// plain text rather than a broken link.

// `[[<id>|<display name>]]` — id is `<prefix>_<rest>`, name is any non-`]` run.
const WIKI_RE = /\[\[([a-z]+_[A-Za-z0-9_]+)\|([^\]]+)\]\]/g;

const PATH_BY_PREFIX: Record<string, string> = {
  task: "/tasks",
  person: "/people",
  portfolio: "/portfolio",
  note: "/notes",
};

/** Detail-page href for an entity id, or null when the prefix is unknown. */
export function wikiLinkHref(id: string): string | null {
  const us = id.indexOf("_");
  if (us < 0) return null;
  const base = PATH_BY_PREFIX[id.slice(0, us)];
  return base ? `${base}/${id}` : null;
}

type Seg =
  | { kind: "text"; text: string }
  | { kind: "link"; id: string; name: string };

/** Split text into plain runs and `[[id|name]]` link segments, in order. */
export function tokenizeWikiLinks(text: string): Seg[] {
  const segs: Seg[] = [];
  let pos = 0;
  for (const m of text.matchAll(WIKI_RE)) {
    const start = m.index ?? 0;
    if (start > pos) segs.push({ kind: "text", text: text.slice(pos, start) });
    segs.push({ kind: "link", id: m[1], name: m[2] });
    pos = start + m[0].length;
  }
  if (pos < text.length) segs.push({ kind: "text", text: text.slice(pos) });
  return segs;
}

export function WikiLinkText({ text }: { text: string }) {
  const segs = tokenizeWikiLinks(text);
  return (
    <>
      {segs.map((seg, i) => {
        if (seg.kind === "link") {
          const href = wikiLinkHref(seg.id);
          return href
            ? (
              <a key={i} href={href} class="wiki-link" title={seg.id}>
                {seg.name}
              </a>
            )
            : seg.name;
        }
        return seg.text;
      })}
    </>
  );
}
