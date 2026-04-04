/** Escape HTML special characters. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Escape HTML in an FTS5 snippet, preserving only `<mark>` highlight tags.
 * FTS5 wraps matches in `<mark>…</mark>` — everything else must be escaped.
 */
export function escapeSnippetHtml(s: string): string {
  return escapeHtml(s)
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}
