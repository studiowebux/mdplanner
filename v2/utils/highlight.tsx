import type { FC } from "hono/jsx";

// Wraps matching substring in <mark> for search highlighting.
// Returns the original text if no query or no match.
export const Highlight: FC<{ text: string; q?: string }> = ({ text, q }) => {
  if (!q || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
};

// Highlight matches inside an HTML string. Only replaces text outside of tags.
export function highlightHtml(html: string, q?: string): string {
  if (!q || !html) return html;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
  // Split on HTML tags, only replace in text segments
  return html.replace(/(<[^>]*>)|([^<]+)/g, (match, tag, text) => {
    if (tag) return tag;
    return text.replace(re, "<mark>$1</mark>");
  });
}
