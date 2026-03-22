import { marked, Renderer } from "marked";

const renderer = new Renderer();

renderer.image = ({ href, title, text }: {
  href: string;
  title?: string | null;
  text: string;
}) => {
  const titleAttr = title ? ` title="${title}"` : "";
  return `<img src="${href}"${titleAttr} alt="${text}" class="markdown-image">`;
};

renderer.link = ({ href, title, text }: {
  href: string;
  title?: string | null;
  text: string;
}) => {
  const titleAttr = title ? ` title="${title}"` : "";
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
};

renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const langLabel = lang ? `<span class="code-block__lang">${lang}</span>` : "";
  const langClass = lang ? ` class="language-${lang}"` : "";
  return `<div class="code-block"><div class="code-block__header">${langLabel}<button type="button" class="code-block__copy" data-action="copy-code">Copy</button></div><pre class="note-detail__code"><code${langClass}>${escaped}</code></pre></div>`;
};

marked.use({ renderer, gfm: true, breaks: true });

export function markdownToHtml(
  markdown: string | undefined | null,
): string {
  if (!markdown) return "";
  return marked.parse(markdown) as string;
}
