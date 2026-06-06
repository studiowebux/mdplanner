/**
 * Narrow a Hono JSX component result to the `string | Promise<string>` that
 * `c.html()` accepts. Function components widen their return type to include
 * `null` (a component may render nothing); this collapses that to an empty
 * string so call sites render cast-free. `HtmlEscapedString` is already a
 * branded `string`, so no other coercion is needed.
 */
export function toHtml(
  node: string | Promise<string> | null | undefined,
): string | Promise<string> {
  return node ?? "";
}

/** Escape HTML special characters. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Escape HTML in an FTS5 snippet, preserving only `<mark>` highlight tags.
 * FTS5 wraps matches in `<mark>…</mark>` — everything else must be escaped.
 * Used by raw HTML template strings (htmx fragments). For JSX use parseSnippet.
 */
export function escapeSnippetHtml(s: string): string {
  return escapeHtml(s)
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}

/**
 * Parse an FTS5 snippet into text/mark segments for safe JSX rendering.
 * Avoids dangerouslySetInnerHTML — callers render each segment as JSX.
 */
export function parseSnippet(
  s: string,
): Array<{ text: string; mark: boolean }> {
  const segments: Array<{ text: string; mark: boolean }> = [];
  const re = /<mark>(.*?)<\/mark>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) {
      segments.push({ text: s.slice(last, m.index), mark: false });
    }
    segments.push({ text: m[1], mark: true });
    last = re.lastIndex;
  }
  if (last < s.length) segments.push({ text: s.slice(last), mark: false });
  return segments;
}
